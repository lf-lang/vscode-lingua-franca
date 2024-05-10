import * as vscode from 'vscode';
import { LFDataProvider, LFDataProviderNode, LFDataProviderNodeType } from './lf-data-provider';

/**
 * Registers a command to refresh the local LF libraries tree view.
 * @param context - The extension context.
 * @param local - The LFDataProvider instance managing local LF libraries.
 */
export function registerRefreshCommand(context: vscode.ExtensionContext, local: LFDataProvider) {
    context.subscriptions.push(vscode.commands.registerCommand(
        'linguafranca.refreshEntries', () => {
            local.refreshTree();
        }
    ));
}


/**
* Registers a command to refresh the Lingo downloaded LF libraries tree view.
* @param context - The extension context.
* @param library - The LFDataProvider instance managing Lingo downloaded LF libraries.
*/
export function registerRefreshLibraryCommand(context: vscode.ExtensionContext, library: LFDataProvider) {
    context.subscriptions.push(vscode.commands.registerCommand(
        'linguafranca.refreshLibraryEntries', () => {
            library.refreshTree();
        }
    ));
}

/**
 * Registers a command to navigate to a file in the local LF libraries tree view.
 * @param context - The extension context.
 * @param local - The LFDataProvider instance managing local LF libraries.
 */
export function registerGoToFileCommand(context: vscode.ExtensionContext, local: LFDataProvider) {
    context.subscriptions.push(vscode.commands.registerCommand(
        'linguafranca.goToFile', (node: LFDataProviderNode) => {
            local.goToFileCommand(node, false);
        }
    ));
}

/**
 * Registers a command to navigate to a file in the Lingo downloaded LF libraries tree view.
 * @param context - The extension context.
 * @param library - The LFDataProvider instance managing Lingo downloaded LF libraries.
 */
export function registerGoToLibraryFileCommand(context: vscode.ExtensionContext, library: LFDataProvider) {
    context.subscriptions.push(vscode.commands.registerCommand(
        'linguafranca.goToLibraryFile', (node: LFDataProviderNode) => {
            library.goToFileCommand(node, false);
        }
    ));
}

/**
 * Registers a command to open a file in split view in the local LF libraries tree view.
 * @param context - The extension context.
 * @param local - The LFDataProvider instance managing local LF libraries.
 */
export function registerOpenInSplitViewCommand(context: vscode.ExtensionContext, local: LFDataProvider) {
    context.subscriptions.push(vscode.commands.registerCommand(
        'linguafranca.openInSplitView', (node: LFDataProviderNode) => {
            local.goToFileCommand(node, true);
        }
    ));
}

/**
 * Registers a command to open a file in split view in the Lingo downloaded LF libraries tree view.
 * @param context - The extension context.
 * @param library - The LFDataProvider instance managing Lingo downloaded LF libraries.
 */
export function registerOpenLibraryInSplitViewCommand(context: vscode.ExtensionContext, library: LFDataProvider) {
    context.subscriptions.push(vscode.commands.registerCommand(
        'linguafranca.openLibraryInSplitView', (node: LFDataProviderNode) => {
            library.goToFileCommand(node, true);
        }
    ));
}

/**
 * Registers a command to import a reactor from the local LF libraries into the active LF program.
 * @param context - The extension context.
 * @param local - The LFDataProvider instance managing local LF libraries.
 */
export function registerImportReactorCommand(context: vscode.ExtensionContext, local: LFDataProvider) {
    context.subscriptions.push(vscode.commands.registerCommand(
        'linguafranca.importReactor', async (node: LFDataProviderNode) => {
            await local.importReactorCommand(node);
        }
    ));
}

/**
 * Registers a command to import a reactor from the Lingo downloaded LF libraries into the active LF program.
 * @param context - The extension context.
 * @param library - The LFDataProvider instance managing Lingo downloaded LF libraries.
 */
export function registerImportLibraryReactorCommand(context: vscode.ExtensionContext, library: LFDataProvider) {
    context.subscriptions.push(vscode.commands.registerCommand(
        'linguafranca.importLibraryReactor', async (node: LFDataProviderNode) => {
            await library.importReactorCommand(node);
        }
    ));
}

/**
 * Registers a command to collapse all nodes in the local LF libraries tree view.
 * @param context - The extension context.
 * @param local - The LFDataProvider instance managing local LF libraries.
 */
export function registerCollapseAllCommand(context: vscode.ExtensionContext) {
    context.subscriptions.push(vscode.commands.registerCommand(
        'linguafranca.collapseAll', () => {
            vscode.commands.executeCommand('workbench.actions.treeView.lf-lang-local.collapseAll');
        }
    ));
}

/**
 * Registers a command to collapse all nodes in the Lingo downloaded LF libraries tree view.
 * @param context - The extension context.
 */
export function registerCollapseAllLibraryCommand(context: vscode.ExtensionContext) {
    context.subscriptions.push(vscode.commands.registerCommand(
        'linguafranca.collapseAllLibrary', () => {
            vscode.commands.executeCommand('workbench.actions.treeView.lf-lang-library.collapseAll');
        }
    ));
}

