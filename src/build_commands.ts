import * as vscode from 'vscode';
import { LanguageClient } from 'vscode-languageclient';

/**
 * Return the URI of the given document, if the document is a Lingua Franca file; else, return
 * undefined.
 * @param textDocument A document in the user's editor.
 * @param failSilently Whether to swallow any warnings that the given document is not an LF file.
 * @returns The URI of the given document, or undefined if the given document is not an LF file.
 */
function getLfUri(textDocument: vscode.TextDocument, failSilently = false): string | undefined {
    const uri: string = textDocument.uri.toString();
    if (!uri.endsWith('.lf')) {
        if (!failSilently) {
            vscode.window.showErrorMessage(
                'The currently active file is not a Lingua Franca source file.'
            );
        }
        return undefined;
    }
    return uri;
}

type messageShower = (message: string, ...items: string[]) => Thenable<string | undefined>;
type messageShowerTransformer = (messageShower: messageShower) => ((message: string) => void);

/**
 * Return the action that should be taken in case of a request to build.
 * @param withLogs A messageShowerTransformer that lets the user request to view logs.
 * @param client The language client.
 * @returns The action that should be taken in case of a request to build.
 */
const build = (withLogs: messageShowerTransformer, client: LanguageClient) =>
    (textEditor: vscode.TextEditor) => {
        const uri = getLfUri(textEditor.document);
        if (!uri) return;
        vscode.workspace.saveAll().then((successful: boolean) => {
            if (!successful) return;
            client.sendRequest('generator/build', uri).then((message: string) => {
                if (message) withLogs(vscode.window.showInformationMessage)(message);
                else withLogs(vscode.window.showErrorMessage)('Build failed.');
            });
        });
    }

/**
 * Return the action that should be taken in case of a request to build and run.
 * @param withLogs A messageShowerTransformer that lets the user request to view logs.
 * @param client The language client.
 * @returns The action that should be taken in case of a request to build and run.
 */
const buildAndRun = (withLogs: messageShowerTransformer, client: LanguageClient) =>
    (textEditor: vscode.TextEditor) => {
        const uri = getLfUri(textEditor.document);
        if (!uri) return;
        vscode.workspace.saveAll().then((successful: boolean) => {
            if (!successful) return;
            client.sendRequest('generator/buildAndRun', uri).then((command: string[]) => {
                if (!command || !command.length) {
                    withLogs(vscode.window.showErrorMessage)('Build failed.');
                    return;
                }
                const runTerminalName = 'Lingua Franca: Run';
                let terminal: vscode.Terminal = vscode.window.terminals.find(
                    t => t.name === runTerminalName
                );
                if (!terminal) terminal = vscode.window.createTerminal({
                    name: runTerminalName,
                    cwd: command[0]
                });
                terminal.sendText('cd ' + command[0]);
                terminal.show(true);
                terminal.sendText(command.slice(1).join(' '));
            });
        });
    }

/**
 * Register any build commands in the environment.
 * @param context The context of this VS Code extension.
 * @param client The language client.
 */
export function registerBuildCommands(context: vscode.ExtensionContext, client: LanguageClient) {
    const withLogs = (showMessage: messageShower) => (message: string) => showMessage(
        message, 'Show output'
    ).then(choice => {
        if (choice === 'Show output') client.outputChannel.show();
    });

    context.subscriptions.push(vscode.commands.registerTextEditorCommand(
        'linguafranca.build', build(withLogs, client)
    ));
    context.subscriptions.push(vscode.commands.registerTextEditorCommand(
        'linguafranca.buildAndRun', buildAndRun(withLogs, client)
    ));
    vscode.workspace.onDidSaveTextDocument(function(textDocument: vscode.TextDocument) {
        const uri = getLfUri(textDocument, true);
        if (!uri) return; // This is not an LF document, so do nothing.
        client.sendNotification('generator/partialBuild', uri);
    })
}
