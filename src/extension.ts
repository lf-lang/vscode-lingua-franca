'use strict';

import * as path from 'path';
import * as fs from 'fs';

import { Trace } from 'vscode-jsonrpc';
import * as vscode from 'vscode';
import { connect, NetConnectOpts, Socket } from 'net';
import { LanguageClient, LanguageClientOptions, ServerOptions, StreamInfo } from 'vscode-languageclient';
import { legend, semanticTokensProvider } from './highlight';
import * as config from './config';
import { registerBuildCommands, registerNewFileCommand } from './build_commands';
import * as checkDependencies from './check_dependencies';
import { LFDataProvider, LFDataProviderNode, LFDataProviderNodeType} from './lfview/lf-data-provider';
import { registerCollapseAllCommand,
    registerGoToFileCommand,
    registerGoToLingoTomlCommand,
    registerImportReactorCommand,
    registerIncludeProjectCommand,
    registerOpenInSplitViewCommand,
    registerOpenInTerminalCommand,
    registerRefreshCommand} from './lfview/lf-data-provider-commands';
import * as extensionVersion from './extension_version';

let client: LanguageClient;
let socket: Socket;

/**
 * Activates the LF Language extension.
 * Registers semantic tokens provider, checks dependencies, sets up language client,
 * registers commands, and creates tree views for local and library components.
 * @param context The extension context.
 */
export async function activate(context: vscode.ExtensionContext) {

    // Register semantic tokens provider
    context.subscriptions.push(vscode.languages.registerDocumentSemanticTokensProvider(
        { language: 'lflang', scheme: 'file' },
        semanticTokensProvider,
        legend
    ));

    // Check dependencies and register dependency watcher
    checkDependencies.registerDependencyWatcher();

    // Check Java dependency
    if (!(
        await checkDependencies.checkerFor
        (checkDependencies.Dependency.Java)!
        (vscode.window.showErrorMessage)
        ()
    )) {
        return;
    }

    // Set up language client
    const serverOptions: ServerOptions = createServerOptions(context);
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

    // Register build commands and new file command
    registerBuildCommands(context, client);
    registerNewFileCommand(context);

    // Registers a tree data provider and creates a tree view for the 'lf-lang-local' view
    const lfDataProvider = new LFDataProvider(client, context);
    context.subscriptions.push(vscode.window.registerTreeDataProvider('lf-lang-projects', lfDataProvider));
    const projectsTreeView = vscode.window.createTreeView('lf-lang-projects', { treeDataProvider: lfDataProvider });
    context.subscriptions.push(projectsTreeView);
    projectsTreeView.onDidExpandElement(element => {
        lfDataProvider.onExpandEvent(element.element);
    });
    projectsTreeView.onDidCollapseElement(element => {
        lfDataProvider.onCollapseEvent(element.element);
    });

    // // Register all the commands
    registerRefreshCommand(context, lfDataProvider);
    registerGoToFileCommand(context, lfDataProvider);
    registerOpenInSplitViewCommand(context, lfDataProvider);
    registerImportReactorCommand(context, lfDataProvider);
    registerCollapseAllCommand(context);
    registerGoToLingoTomlCommand(context, lfDataProvider);
    registerIncludeProjectCommand(context, lfDataProvider);
    registerOpenInTerminalCommand(context);

    context.subscriptions.push(vscode.commands.registerCommand(
        "linguafranca.checkDocker", checkDependencies.checkDocker
    ));
    context.subscriptions.push(vscode.commands.registerCommand(
        "linguafranca.getVersion", () => extensionVersion.version
    ));

    vscode.window.onDidChangeActiveTextEditor( editor => {
        if (editor){
            lfDataProvider.onChangeActiveEditor();
        }
    })
}

/**
 * Depending on the launch configuration, returns {@link ServerOptions} that either
 * connects to a socket or starts the LS as a process. It uses a socket if the
 * environment variable `LF_LS_PORT` is present. Otherwise it runs the jar located
 * at `lib/lflang-lds.jar`.
 */
 function createServerOptions(context: vscode.ExtensionContext): ServerOptions {
    // Connect to language server via socket if a port is specified as an env variable
    if (typeof process.env.LF_LS_PORT !== 'undefined') {
        const connectionInfo: NetConnectOpts = {
            port: parseInt(process.env.LF_LS_PORT, 10),
        };
        console.log('Connecting to language server on port: ', connectionInfo.port);

        return async () => {
            socket = connect(connectionInfo);
            const result: StreamInfo = {
                writer: socket,
                reader: socket,
            };
            return result;
        };
    } else { // Start LDS Jar
        const ldsJar = context.asAbsolutePath(path.join(config.libDirName, config.ldsJarName));

        console.log('Spawning the language server as a process.');
        console.assert(fs.existsSync(ldsJar));

        return {
            run: {
                command: 'java',
                args: ['-Djava.awt.headless=true', '-jar', ldsJar]
            },
            debug: {
                command: 'java',
                args: ['-Djava.awt.headless=true', '-jar', ldsJar],
                options: { env: createDebugEnv() }
            },
        };
    }
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
    if (socket) {
        // Don't call client.stop when we are connected via socket for development.
        // That call will end the LS server, leading to a bad dev experience.
        socket.end();
        return;
    } else {
        return client.stop();
    }
}
