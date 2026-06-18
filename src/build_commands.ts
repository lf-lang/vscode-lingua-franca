import * as vscode from 'vscode';
import * as path from 'path';
import which from 'which';
import { LanguageClient } from 'vscode-languageclient';
import { getTerminal, MessageDisplayHelper } from './utils';

/** The repository that provides the `ulfc` compiler for the reactor-uc target. */
const REACTOR_UC_REPO = 'https://github.com/lf-lang/reactor-uc';

/**
 * Return whether the given document is a reactor-uc Lingua Franca file (i.e. has a `.ulf`
 * extension), which is compiled with `ulfc` rather than the standard build pipeline.
 * @param textDocument A document in the user's editor.
 */
function isUlfDocument(textDocument: vscode.TextDocument): boolean {
    return textDocument.uri.toString().endsWith('.ulf');
}

/**
 * Return the URI of the given document, if the document is a Lingua Franca file; else, return
 * undefined.
 * @param textDocument A document in the user's editor.
 * @param failSilently Whether to swallow any warnings that the given document is not an LF file.
 * @returns The URI of the given document, or undefined if the given document is not an LF file.
 */
function getLfUri(textDocument: vscode.TextDocument, failSilently = false): string | undefined {
    const uri: string = textDocument.uri.toString();
    if (!uri.endsWith('.lf') && !uri.endsWith('.ulf')) {
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

const getAst =
  (withLogs: MessageShowerTransformer, client: LanguageClient) =>
  async () => {
    const current_file = vscode.window.activeTextEditor?.document;
    if (!current_file) {
        return "There is no currently active file, so it is not clear which AST to return.";
    }
    const uri = getLfUri(current_file);
    if (!uri) {
      return "The currently active file is not a Lingua Franca source file.";
    }
    let ret = await client.sendRequest("parser/ast", uri);
    if (ret === undefined) {
      withLogs(vscode.window.showErrorMessage)("Failed to get AST.");
      return;
    }
    return ret;
  };

const getWorkspace =
  (withLogs: MessageShowerTransformer, client: LanguageClient) =>
  async () => {
    const roots = vscode.workspace.workspaceFolders;
    let lf_files: vscode.Uri[] = [];
    let lingo_tomls: vscode.Uri[] = [];
    if (roots) {
      for (const root of roots) {
        const files: vscode.Uri[] = await vscode.workspace.findFiles(
            new vscode.RelativePattern(root, "**/*.{lf,ulf}")
        );
        lf_files = lf_files.concat(files);
        lingo_tomls = lingo_tomls.concat(await vscode.workspace.findFiles(
            new vscode.RelativePattern(root, "**/Lingo.toml")
        ));
        lingo_tomls = lingo_tomls.concat(await vscode.workspace.findFiles(
            new vscode.RelativePattern(root, "**/lingo.toml")
        ));
      }
    }
    lf_files.sort((a, b) => a.fsPath.localeCompare(b.fsPath));
    lingo_tomls.sort((a, b) => a.fsPath.localeCompare(b.fsPath));
    let lf_asts = [];
    for (const lf_file of lf_files) {
      await client.onReady();
      const ast = await client.sendRequest("parser/ast", lf_file.fsPath);
      lf_asts.push(ast);
    }
    let toml_contents = [];
    for (const toml of lingo_tomls) {
      const content = await vscode.workspace.fs.readFile(toml);
      toml_contents.push(content);
    }
    const ret = {
        lf: lf_asts,
        config: toml_contents
    };
    return ret;
  };

const fsReadCapability = (p: string) => {
    try {
        return require('node:fs').readFileSync(p, {encoding: "utf-8"});
    } catch {
        return undefined;
    };
};

async function getJson(uri: string): Promise<string> {
    let json: string | undefined = (await import('lfwasm')).lfc_json(vscode.Uri.parse(uri).fsPath, fsReadCapability);
    if (!json) {
        json = "";
    }
    return json;
}

/**
 * Verify that the environment required to build reactor-uc (`.ulf`) programs is available.
 * Specifically, this checks that the `ulfc` compiler is on the PATH and that the
 * `REACTOR_UC_PATH` environment variable points to a clone of the reactor-uc repository.
 * If either is missing, an error message is shown that points to the repository.
 * @param withLogs A messageShowerTransformer that lets the user request to view logs.
 * @returns Whether the reactor-uc build environment is satisfied.
 */
async function checkReactorUcEnvironment(withLogs: MessageShowerTransformer): Promise<boolean> {
    let ulfc: string | undefined;
    try {
        ulfc = await which('ulfc');
    } catch {
        ulfc = undefined;
    }
    const reactorUcPath = process.env.REACTOR_UC_PATH;
    const problems: string[] = [];
    if (!ulfc) {
        problems.push('the `ulfc` compiler could not be found on your PATH');
    }
    if (!reactorUcPath) {
        problems.push('the `REACTOR_UC_PATH` environment variable is not set');
    }
    if (problems.length > 0) {
        withLogs(vscode.window.showErrorMessage)(
            `Cannot build this reactor-uc (.ulf) program because ${problems.join(' and ')}. `
            + `Install the reactor-uc compiler and set REACTOR_UC_PATH to a clone of `
            + `${REACTOR_UC_REPO}.`
        );
        return false;
    }
    return true;
}

/**
 * Build (and, if requested, run) a reactor-uc (`.ulf`) program using the `ulfc` compiler.
 * @param withLogs A messageShowerTransformer that lets the user request to view logs.
 * @param textEditor The editor containing the `.ulf` file to build.
 */
async function buildReactorUc(withLogs: MessageShowerTransformer, textEditor: vscode.TextEditor) {
    const successful = vscode.workspace.saveAll();
    if (!successful) return;
    if (!(await checkReactorUcEnvironment(withLogs))) return;
    const filePath = textEditor.document.uri.fsPath;
    const cwd = path.dirname(filePath);
    const terminal = getTerminal('Lingua Franca: Run', cwd);
    terminal.show(true);
    terminal.sendText(`cd "${cwd}"`);
    terminal.sendText(`ulfc "${filePath}"`);
}

/**
 * Return the action that should be taken in case of a request to build.
 * @param withLogs A messageShowerTransformer that lets the user request to view logs.
 * @param client The language client.
 * @returns The action that should be taken in case of a request to build.
 */
const build = (withLogs: MessageShowerTransformer, client: LanguageClient) =>
        async (textEditor: vscode.TextEditor) => {
    const uri = getLfUri(textEditor.document);
    if (!uri) return;
    if (isUlfDocument(textEditor.document)) {
        await buildReactorUc(withLogs, textEditor);
        return;
    }
    const successful = vscode.workspace.saveAll();
    if (!successful) return;
    const args = {"uri": uri, "json": await getJson(uri)};
    // const args = [ uri, await getJson(uri)];
    client.sendRequest('generator/build', args).then((messageAny: any) => {
        const message: string = messageAny;
        if (message) withLogs(vscode.window.showInformationMessage)(message);
        else withLogs(vscode.window.showErrorMessage)('Build failed.');
    });
};

/**
 * Return the action that should be taken in case of a request to build and run.
 * @param withLogs A messageShowerTransformer that lets the user request to view logs.
 * @param client The language client.
 * @returns The action that should be taken in case of a request to build and run.
 */
const buildAndRun = (withLogs: MessageShowerTransformer, client: LanguageClient) =>
        async (textEditor: vscode.TextEditor) => {
    const uri = getLfUri(textEditor.document);
    if (!uri) return;
    if (isUlfDocument(textEditor.document)) {
        await buildReactorUc(withLogs, textEditor);
        return;
    }
    const successful = vscode.workspace.saveAll();
    if (!successful) {
        return;
    }
    const args = {"uri": uri, "json": await getJson(uri)};
    // const args = [ uri, await getJson(uri)];
    client.sendRequest('generator/buildAndRun', args).then((commandAny: any) => {
        const command: string[] = commandAny;
        if (!command || !command.length) {
            withLogs(vscode.window.showErrorMessage)('Build failed.');
            return;
        }
        const terminal = getTerminal('Lingua Franca: Run', command[0]);
        terminal.sendText(`cd "${command[0]}"`);
        terminal.show(true);
        terminal.sendText(command.slice(1).join(' '));
    });
};

function buildOnSaveEnabled() {
    let zerothFolder = vscode.workspace?.workspaceFolders?.[0];
    if (!zerothFolder) {
        return false;
    }
    const configuration: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration(
        'linguafranca', zerothFolder.uri
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
    context.subscriptions.push(vscode.commands.registerCommand(
        "linguafranca.getAst", getAst(withLogs, client)
    ));
    context.subscriptions.push(vscode.commands.registerCommand(
        "linguafranca.getWorkspace", getWorkspace(withLogs, client)
    ));
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
        // reactor-uc (.ulf) files are built with `ulfc`, not the standard build pipeline.
        if (isUlfDocument(textDocument)) return;
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
