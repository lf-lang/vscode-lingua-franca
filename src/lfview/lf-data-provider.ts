import * as vscode from 'vscode'
import { TreeItemCollapsibleState } from 'vscode'
import { LanguageClient } from 'vscode-languageclient'

export class LFDataProvider implements vscode.TreeDataProvider<LFDataProviderNode> {
    constructor(
        private client: LanguageClient,
        private context: vscode.ExtensionContext
    ) {
        // vscode.workspace.onDidChangeWorkspaceFolders(()
    }
    onDidChangeTreeData?: vscode.Event<void | LFDataProviderNode | LFDataProviderNode[]>
    getTreeItem(element: LFDataProviderNode): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return element
    }
    getChildren(element?: LFDataProviderNode): vscode.ProviderResult<LFDataProviderNode[]> {
        if (!element) {
            let result = []
            return vscode.workspace.findFiles('**/lib/*.lf').then(files => {
                files.forEach(file => {
                    result.push(new LFDataProviderNode(file))
                })
                return result
            })
        }
        return []
    }
    getParent?(element: LFDataProviderNode): vscode.ProviderResult<LFDataProviderNode> {
        throw new Error('Method not implemented.')
    }
    resolveTreeItem?(item: vscode.TreeItem, element: LFDataProviderNode, token: vscode.CancellationToken): vscode.ProviderResult<vscode.TreeItem> {
        throw new Error('Method not implemented.')
    }
}

export class LFDataProviderNode extends vscode.TreeItem {
    constructor(resourceUri: vscode.Uri) {
        if (resourceUri.path.endsWith('.lf')) {
            super(resourceUri, TreeItemCollapsibleState.None)
        } else {
            super(resourceUri, TreeItemCollapsibleState.Collapsed)
        }
    }
}
