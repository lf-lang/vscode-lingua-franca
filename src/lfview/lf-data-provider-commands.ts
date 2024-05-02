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
 * Registers a command to refresh the remote LF libraries tree view.
 * @param context - The extension context.
 * @param remote - The LFDataProvider instance managing remote LF libraries.
 */
export function registerRefreshRemoteCommand(context: vscode.ExtensionContext, remote: LFDataProvider) {
    context.subscriptions.push(vscode.commands.registerCommand(
        'linguafranca.refreshRemoteEntries', () => {
            remote.refreshTree();
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
            local.goToFileCommand(node,false);
        }
    ));
}

/**
 * Registers a command to navigate to a file in the remote LF libraries tree view.
 * @param context - The extension context.
 * @param remote - The LFDataProvider instance managing remote LF libraries.
 */
export function registerGoToRemoteFileCommand(context: vscode.ExtensionContext, remote: LFDataProvider) {
    context.subscriptions.push(vscode.commands.registerCommand(
        'linguafranca.goToRemoteFile', (node: LFDataProviderNode) => {
            remote.goToFileCommand(node,false);
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
            local.goToFileCommand(node,true);
        } 
    ));
}

/**
 * Registers a command to open a file in split view in the remote LF libraries tree view.
 * @param context - The extension context.
 * @param remote - The LFDataProvider instance managing remote LF libraries.
 */
export function registerOpenRemoteInSplitViewCommand(context: vscode.ExtensionContext, remote: LFDataProvider) {
    context.subscriptions.push(vscode.commands.registerCommand(
        'linguafranca.openRemoteInSplitView', (node: LFDataProviderNode) => {
            remote.goToFileCommand(node,true);
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
 * Registers a command to import a reactor from the remote LF libraries into the active LF program.
 * @param context - The extension context.
 * @param remote - The LFDataProvider instance managing remote LF libraries.
 */
export function registerImportRemoteReactorCommand(context: vscode.ExtensionContext, remote: LFDataProvider) {
    context.subscriptions.push(vscode.commands.registerCommand(
        'linguafranca.importRemoteReactor', async (node: LFDataProviderNode) => {
            await remote.importReactorCommand(node);
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
 * Registers a command to collapse all nodes in the remote LF libraries tree view.
 * @param context - The extension context.
 * @param remote - The LFDataProvider instance managing remote LF libraries.
 */
export function registerCollapseAllRemoteCommand(context: vscode.ExtensionContext) {
    context.subscriptions.push(vscode.commands.registerCommand(
        'linguafranca.collapseAllRemote', () => {
            vscode.commands.executeCommand('workbench.actions.treeView.lf-lang-remote.collapseAll');
        }
    ));
}
