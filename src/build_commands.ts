import * as vscode from 'vscode';
import * as path from 'path';
import { existsSync } from 'fs';
import which from 'which';
import { execFile } from 'child_process';
import { LanguageClient } from 'vscode-languageclient';
import { getTerminal, MessageDisplayHelper } from './utils';

/** Relative path from a reactor-uc clone to the development compiler. */
const REACTOR_UC_ULFC_DEV = path.join('ulf', 'bin', 'ulfc-dev');

/** Relative path from a reactor-uc clone to the release compiler. */
const REACTOR_UC_ULFC = path.join('ulf', 'bin', 'ulfc');

/** The repository that provides the `ulfc` compiler for the micro-LF. */
const REACTOR_UC_REPO = 'https://github.com/lf-lang/reactor-uc';

/**
 * Return a shell-ready path to `ulfc-dev` or `ulfc` under the given reactor-uc clone,
 * preferring `ulfc-dev`.
 */
function resolveUlfcInReactorUc(reactorUcPath: string): string | undefined {
    const ulfcDev = path.join(reactorUcPath, REACTOR_UC_ULFC_DEV);
    if (existsSync(ulfcDev)) {
        return `"${ulfcDev}"`;
    }
    const ulfc = path.join(reactorUcPath, REACTOR_UC_ULFC);
    if (existsSync(ulfc)) {
        return `"${ulfc}"`;
    }
    return undefined;
}

/**
 * Return whether the given document is a micro-LF Lingua Franca file (i.e. has a `.ulf`
 * extension), which is compiled with `ulfc` rather than the standard build pipeline.
 * @param textDocument A document in the user's editor.
 */
function isUlfDocument(textDocument: vscode.TextDocument): boolean {
    return textDocument.uri.toString().endsWith('.ulf');
}

/**
 * Return the package root for a micro-LF source file, mirroring `FileConfig.findPackageRoot`.
 * If an ancestor directory named `src` exists, the package root is its parent; otherwise the
 * source file's directory is the package root.
 */
function getUlfPackageRoot(filePath: string): string {
    let dir = path.dirname(filePath);
    while (true) {
        if (path.basename(dir) === 'src') {
            return path.dirname(dir);
        }
        const parent = path.dirname(dir);
        if (parent === dir) {
            return path.dirname(filePath);
        }
        dir = parent;
    }
}

/** Return the path to the generated binary, relative to the package root. */
function getUlfBinaryRelativePath(filePath: string): string {
    const binaryName = path.basename(filePath, path.extname(filePath));
    return path.join('bin', binaryName);
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
 * Probe the user's interactive login shell for the micro-LF build environment. Running an
 * interactive shell ensures that aliases, shell functions, and variables defined in startup
 * files (e.g. `.zshrc`) are resolved, which is not the case for the extension host's
 * environment. This mirrors what the integrated terminal will see when it runs the build.
 * @returns The resolved `ulfc-dev` or `ulfc` command, if any, and the value of
 * `REACTOR_UC_PATH`, if set.
 */
function probeReactorUcShellEnvironment(): Promise<{ ulfcCommand: string | undefined, reactorUcPath: string | undefined }> {
    return new Promise((resolve) => {
        const shell = vscode.env.shell || process.env.SHELL;
        if (!shell) {
            resolve({ ulfcCommand: undefined, reactorUcPath: undefined });
            return;
        }
        // `command -v` resolves aliases, functions, and executables; the marker lines let us
        // parse the result unambiguously.
        const script =
            'if command -v ulfc-dev >/dev/null 2>&1; then echo __ULFC_DEV_FOUND__; '
            + 'elif command -v ulfc >/dev/null 2>&1; then echo __ULFC_FOUND__; '
            + 'elif [ -n "$REACTOR_UC_PATH" ] && [ -x "$REACTOR_UC_PATH/ulf/bin/ulfc-dev" ]; then '
            + 'echo __ULFC_DEV_REACTOR_UC__; '
            + 'elif [ -n "$REACTOR_UC_PATH" ] && [ -x "$REACTOR_UC_PATH/ulf/bin/ulfc" ]; then '
            + 'echo __ULFC_REACTOR_UC__; fi; '
            + 'echo "__REACTOR_UC_PATH__=$REACTOR_UC_PATH"';
        execFile(shell, ['-ic', script], { timeout: 8000 }, (_error, stdout) => {
            const out = stdout ?? '';
            let ulfcCommand: string | undefined;
            if (out.includes('__ULFC_DEV_FOUND__')) {
                ulfcCommand = 'ulfc-dev';
            } else if (out.includes('__ULFC_FOUND__')) {
                ulfcCommand = 'ulfc';
            } else if (out.includes('__ULFC_DEV_REACTOR_UC__')) {
                ulfcCommand = '"$REACTOR_UC_PATH/ulf/bin/ulfc-dev"';
            } else if (out.includes('__ULFC_REACTOR_UC__')) {
                ulfcCommand = '"$REACTOR_UC_PATH/ulf/bin/ulfc"';
            }
            const match = out.match(/__REACTOR_UC_PATH__=(.*)/);
            const value = match ? match[1].trim() : '';
            resolve({ ulfcCommand, reactorUcPath: value.length > 0 ? value : undefined });
        });
    });
}

/**
 * Verify that the environment required to build micro-LF (`.ulf`) programs is available.
 * Specifically, this checks that `ulfc-dev` or `ulfc` is available, preferring `ulfc-dev` on
 * the PATH and falling back to `${REACTOR_UC_PATH}/ulf/bin/ulfc-dev` (or `ulfc`), and that
 * `REACTOR_UC_PATH` points to a clone of the micro-LF repository.
 * @param withLogs A messageShowerTransformer that lets the user request to view logs.
 * @returns The compiler command to invoke, or undefined if the environment is not satisfied.
 */
async function checkReactorUcEnvironment(withLogs: MessageShowerTransformer): Promise<string | undefined> {
    let ulfcCommand: string | undefined;
    try {
        await which('ulfc-dev');
        ulfcCommand = 'ulfc-dev';
    } catch {
        try {
            await which('ulfc');
            ulfcCommand = 'ulfc';
        } catch {
            ulfcCommand = undefined;
        }
    }
    let reactorUcPath = process.env.REACTOR_UC_PATH;

    // `ulfc` is frequently provided as a shell alias or function, and `REACTOR_UC_PATH` may be
    // exported only in shell startup files. Neither is visible to the extension host's PATH/env,
    // so fall back to probing the user's interactive login shell (which is also what the
    // integrated terminal uses to actually run the build).
    if (!ulfcCommand || !reactorUcPath) {
        const probe = await probeReactorUcShellEnvironment();
        ulfcCommand = ulfcCommand || probe.ulfcCommand;
        reactorUcPath = reactorUcPath || probe.reactorUcPath;
    }

    if (!ulfcCommand && reactorUcPath) {
        ulfcCommand = resolveUlfcInReactorUc(reactorUcPath);
    }

    const problems: string[] = [];
    if (!ulfcCommand) {
        problems.push(
            'neither `ulfc-dev` nor `ulfc` could be found on the PATH '
            + 'nor under `$REACTOR_UC_PATH/ulf/bin/`'
        );
    }
    if (!reactorUcPath) {
        problems.push('the `REACTOR_UC_PATH` environment variable is not set');
    }
    if (problems.length > 0) {
        withLogs(vscode.window.showErrorMessage)(
            `Cannot build this micro-LF (.ulf) program because ${problems.join(' and ')}. `
            + `Install the micro-LF compiler and set REACTOR_UC_PATH to a clone of `
            + `${REACTOR_UC_REPO}.`
        );
        return undefined;
    }
    return ulfcCommand;
}

/**
 * Build a micro-LF (`.ulf`) program using `ulfc-dev` or `ulfc`, optionally running the
 * generated binary afterward.
 * @param withLogs A messageShowerTransformer that lets the user request to view logs.
 * @param textEditor The editor containing the `.ulf` file to build.
 * @param runAfterBuild Whether to run the generated binary if the build succeeds.
 */
async function buildReactorUc(
    withLogs: MessageShowerTransformer,
    textEditor: vscode.TextEditor,
    runAfterBuild: boolean
) {
    const successful = await vscode.workspace.saveAll();
    if (!successful) return;
    const ulfcCommand = await checkReactorUcEnvironment(withLogs);
    if (!ulfcCommand) return;
    const filePath = textEditor.document.uri.fsPath;
    const packageRoot = getUlfPackageRoot(filePath);
    const ulfRelPath = path.relative(packageRoot, filePath).split(path.sep).join('/');
    const binaryRelPath = getUlfBinaryRelativePath(filePath);
    const terminal = getTerminal('Lingua Franca: Run', packageRoot);
    terminal.show(true);
    let command = `cd "${packageRoot}" && ${ulfcCommand} "${ulfRelPath}"`;
    if (runAfterBuild) {
        // Only run if ulfc produced a host-native binary (e.g. with @platform("Native")).
        command += ` && test -x "./${binaryRelPath}" && "./${binaryRelPath}"`;
    }
    terminal.sendText(command);
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
        await buildReactorUc(withLogs, textEditor, false);
        return;
    }
    const successful = await vscode.workspace.saveAll();
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
        await buildReactorUc(withLogs, textEditor, true);
        return;
    }
    const successful = await vscode.workspace.saveAll();
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
        // micro-LF (.ulf) files are built with `ulfc`, not the standard build pipeline.
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
