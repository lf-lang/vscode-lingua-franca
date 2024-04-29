import * as vscode from 'vscode';
import { LanguageClient } from 'vscode-languageclient';
import { getTerminal, MessageDisplayHelper } from './utils';
import { LFDataProvider } from './lfview/lf-data-provider';

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

type MessageShowerTransformer = (MessageDisplayHelper: MessageDisplayHelper) => ((message: string) => void);

/**
 * Return the action that should be taken in case of a request to build.
 * @param withLogs A messageShowerTransformer that lets the user request to view logs.
 * @param client The language client.
 * @returns The action that should be taken in case of a request to build.
 */
const build = (withLogs: MessageShowerTransformer, client: LanguageClient) =>
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
};

/**
 * Return the action that should be taken in case of a request to build and run.
 * @param withLogs A messageShowerTransformer that lets the user request to view logs.
 * @param client The language client.
 * @returns The action that should be taken in case of a request to build and run.
 */
const buildAndRun = (withLogs: MessageShowerTransformer, client: LanguageClient) =>
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
            const terminal = getTerminal('Lingua Franca: Run', command[0]);
            terminal.sendText(`cd "${command[0]}"`);
            terminal.show(true);
            terminal.sendText(command.slice(1).join(' '));
        });
    });
};

function buildOnSaveEnabled() {
    const configuration: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration(
        'linguafranca', vscode.workspace.workspaceFolders[0].uri
    );
    return configuration.get('generateCodeOnSave');
}

/**
 * Register any build commands in the environment.
 * @param context The context of this VS Code extension.
 * @param client The language client.
 */
export function registerBuildCommands(context: vscode.ExtensionContext, client: LanguageClient) {
    const withLogs = (showMessage: MessageDisplayHelper) => (message: string) => showMessage(
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
    let enabled = buildOnSaveEnabled();
    vscode.workspace.onDidSaveTextDocument((textDocument: vscode.TextDocument) => {
        if (!enabled) return;
        const uri = getLfUri(textDocument, true);
        if (!uri) return; // This is not an LF document, so do nothing.
        client.sendNotification('generator/partialBuild', uri);
    });
    vscode.workspace.onDidChangeConfiguration(() => {
        enabled = buildOnSaveEnabled();
    });
}

/**
 * Open a new untitled Lingua Franca file.
 * @returns The current active textEditor window containing the new file.
 */
const createNewFile = () => async (textEditor: vscode.TextEditor) => {
    let newFile = await vscode.workspace.openTextDocument({language: "lflang"});
    vscode.window.showTextDocument(newFile);
    return vscode.window.activeTextEditor;
}

/**
 * Register the "New File" command in the environment to add LF
 * as an option in the file menu.
 * @param context The context of this VSCode extension.
 */
export async function registerNewFileCommand(context: vscode.ExtensionContext) {
    context.subscriptions.push(vscode.commands.registerCommand(
        'linguafranca.createNewFile', await createNewFile()
    ));
}
