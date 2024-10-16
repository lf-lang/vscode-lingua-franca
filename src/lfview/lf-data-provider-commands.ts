import * as vscode from 'vscode';
import { LFDataProvider, LFDataProviderNode, LFDataProviderNodeType } from './lf-data-provider';
import { getTerminal } from '../utils';

/**
 * Registers a command to refresh the local LF libraries tree view.
 * @param context - The extension context.
 * @param provider - The LFDataProvider instance.
 */
export function registerRefreshCommand(context: vscode.ExtensionContext, provider: LFDataProvider) {
    context.subscriptions.push(vscode.commands.registerCommand(
        'linguafranca.refreshEntries', () => {
            provider.refreshTree();
        }
    ));
}

/**
 * Registers a command to navigate to a file in the local LF libraries tree view.
 * @param context - The extension context.
 * @param provider - The LFDataProvider instance.
 */
export function registerGoToFileCommand(context: vscode.ExtensionContext, provider: LFDataProvider) {
    context.subscriptions.push(vscode.commands.registerCommand(
        'linguafranca.goToFile', (node: LFDataProviderNode) => {
            provider.goToFileCommand(node, false);
        }
    ));
}

/**
 * Registers a command to open a file in split view in the local LF libraries tree view.
 * @param context - The extension context.
 * @param provider - The LFDataProvider instance.
 */
export function registerOpenInSplitViewCommand(context: vscode.ExtensionContext, provider: LFDataProvider) {
    context.subscriptions.push(vscode.commands.registerCommand(
        'linguafranca.openInSplitView', (node: LFDataProviderNode) => {
            provider.goToFileCommand(node, true);
        }
    ));
}

/**
 * Registers a command to import a reactor from the local LF libraries into the active LF program.
 * @param context - The extension context.
 * @param provider - The LFDataProvider instance.
 */
export function registerImportReactorCommand(context: vscode.ExtensionContext, provider: LFDataProvider) {
    context.subscriptions.push(vscode.commands.registerCommand(
        'linguafranca.importReactor', async (node: LFDataProviderNode) => {
            if(node.type === LFDataProviderNodeType.LOCAL) {
                await provider.importReactorCommand(node);
            }
            else {
                await provider.importLibraryReactorCommand(node);
            }
        }
    ));
}

/**
 * Registers a command to collapse all nodes in the local LF libraries tree view.
 * @param context - The extension context.
 */
export function registerCollapseAllCommand(context: vscode.ExtensionContext) {
    context.subscriptions.push(vscode.commands.registerCommand(
        'linguafranca.collapseAll', () => {
            vscode.commands.executeCommand('workbench.actions.treeView.lf-lang-projects.collapseAll');
        }
    ));
}

export function registerGoToLingoTomlCommand(context: vscode.ExtensionContext, provider: LFDataProvider) {
    context.subscriptions.push(vscode.commands.registerCommand(
        'linguafranca.goToLingoToml', (node: LFDataProviderNode) => {
            provider.goToLingoTomlCommand(node);
        }
    ));
}

export function registerIncludeProjectCommand(context: vscode.ExtensionContext, provider: LFDataProvider) {
    context.subscriptions.push(vscode.commands.registerCommand(
        'linguafranca.includeProject', (node: LFDataProviderNode) => {
            vscode.window.showInformationMessage('The "Include Project" feature is not implemented yet.', 'Details').then(selection => {
                if (selection === "Details") {
                vscode.window.showInformationMessage('Please use the Lingo command line to include the selected library in your current project. Once included, the library will appear under the "Lingo Packages" section.');
                }
            });
        }
    ));
}

export function registerOpenInTerminalCommand(context: vscode.ExtensionContext) {
    context.subscriptions.push(vscode.commands.registerCommand(
        'linguafranca.openInTerminal', (node: LFDataProviderNode) => {
            const terminal = getTerminal("Lingua Franca")
            if (terminal) {
                terminal.show(true);
                terminal.sendText(`cd ${node.uri.fsPath} && clear`);
            }
        }
    ));
}

export function registerOpenFolderCommand(context: vscode.ExtensionContext) {
    context.subscriptions.push(vscode.commands.registerCommand(
        'linguafranca.openFolder', async ( ) => {
            // Prompt the user to select a folder
            const folderUri = await vscode.window.showOpenDialog({
                canSelectFolders: true, // Allow folder selection
                canSelectFiles: false,  // Disallow file selection
                canSelectMany: false,   // Allow only a single folder
                openLabel: 'Select Folder'
            });
    
            if (folderUri && folderUri[0]) {
                // Use vscode.openFolder to open the selected folder
                vscode.commands.executeCommand('vscode.openFolder', folderUri[0], false);
            }
        }
    ));
}

