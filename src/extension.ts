'use strict';

import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

import { Trace } from 'vscode-jsonrpc';
import * as vscode from 'vscode';
import { LanguageClient, LanguageClientOptions, ServerOptions } from 'vscode-languageclient';
import { legend, semanticTokensProvider } from './highlight';
import * as config from './config';
import { registerBuildCommands } from './build_commands';
import * as checkDependencies from './check_dependencies';

let client: LanguageClient;

export async function activate(context: vscode.ExtensionContext) {

    context.subscriptions.push(vscode.languages.registerDocumentSemanticTokensProvider(
        { language: 'lflang', scheme: 'file' },
        semanticTokensProvider,
        legend
    ));

    checkDependencies.registerDependencyWatcher();

    if (!(
        await checkDependencies.checkerFor
        (checkDependencies.Dependency.Java)
        (vscode.window.showErrorMessage)
        ()
    )) return;

    const ldsJar = context.asAbsolutePath(path.join(config.libDirName, config.ldsJarName));
    console.assert(fs.existsSync(ldsJar));
    const javaArgs = [
        '-cp',
        ldsJar + config.classPathSeparatorsByOs[os.platform()] + config.swtJarsByOs[os.platform()],
        'org.lflang.diagram.lsp.LanguageDiagramServer'
    ];

    const serverOptions: ServerOptions = {
        run : { command: 'java', args: javaArgs },
        debug: { command: 'java', args: javaArgs, options: { env: createDebugEnv() } }
    };

    const clientOptions: LanguageClientOptions = {
        documentSelector: ['lflang'],
        synchronize: {
            fileEvents: vscode.workspace.createFileSystemWatcher('**/*.*')
        }
    };

    client = new LanguageClient('LF Language Server', serverOptions, clientOptions);
    // enable tracing (.Off, .Messages, Verbose)
    client.trace = Trace.Verbose;

    // Register with Klighd Diagram extension
    const refId = await vscode.commands.executeCommand(
        'klighd-vscode.setLanguageClient',
        client,
        ['lf']
    );

    client.start();

    registerBuildCommands(context, client);
}

function createDebugEnv() {
    return Object.assign({
        JAVA_OPTS:'-Xdebug -Xrunjdwp:server=y,transport=dt_socket,address=8000,suspend=n,quiet=y'
    }, process.env);
}

export function deactivate(): Thenable<void> | undefined {
    if (!client) {
        return undefined;
    }
    return client.stop();
}
