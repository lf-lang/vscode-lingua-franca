import * as vscode from 'vscode'
import * as path from 'path';
import { TreeItemCollapsibleState } from 'vscode'
import { LanguageClient } from 'vscode-languageclient'

export class LFDataProvider implements vscode.TreeDataProvider<LFDataProviderNode> {

    // Local library list to display in the tree view. 
    // This will contain LFDataProviderNode elements representing the LF libraries.
    data: LFDataProviderNode[] = []

    /// An event emitter and event that is fired when the tree data changes.
    /// This event can be used to notify the tree view that the data has changed and it should refresh.
    private _onDidChangeTreeData: vscode.EventEmitter<LFDataProviderNode | undefined | null | void> = new vscode.EventEmitter<LFDataProviderNode | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<LFDataProviderNode | undefined | null | void> = this._onDidChangeTreeData.event;

    private watcher = vscode.workspace.createFileSystemWatcher('**/lib/*.lf')
    

    constructor(
        private client: LanguageClient,
        private context: vscode.ExtensionContext,
    ) {
        // Register commands
        vscode.commands.registerCommand('linguafranca.refreshEntry', async () => await this.refreshTree())

        // Register to file system changes: Create, Delete, Rename, Change
        this.onLFFileChanges(this.context);

        // vscode.workspace.onDidChangeWorkspaceFolders(()
        
        client.onReady().then(() => {
            client.onNotification('notify/sendLibraryReactors', (node) => {
                this.addDataItem(node);
            })
        })

    }
    
    getTreeItem(element: LFDataProviderNode): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return element
    }
    getChildren(element?: LFDataProviderNode): vscode.ProviderResult<LFDataProviderNode[]> {
        if (!element) {
            return this.data
        }
        else {
            return element.children
        }
    }
    getParent?(element: LFDataProviderNode): vscode.ProviderResult<LFDataProviderNode> {
        throw new Error('Method not implemented.')
    }
    resolveTreeItem?(item: vscode.TreeItem, element: LFDataProviderNode, token: vscode.CancellationToken): vscode.ProviderResult<vscode.TreeItem> {
        if (element.children.length > 0) {
            element.collapsibleState = 
              element.collapsibleState === vscode.TreeItemCollapsibleState.Collapsed
                ? vscode.TreeItemCollapsibleState.Expanded
                : vscode.TreeItemCollapsibleState.Collapsed;
          
            if (element.role == 'root') {
              const imagePathOpen = element.collapsibleState === vscode.TreeItemCollapsibleState.Expanded ? '-open' : '';
              element.iconPath = {
                light: path.join(__filename, '..', '..', 'images', 'icons', element.role, `${element.role}${imagePathOpen}-light.svg`),
                dark: path.join(__filename, '..', '..', 'images', 'icons', element.role, `${element.role}${imagePathOpen}-dark.svg`)
              };
            }
            
            this._onDidChangeTreeData.fire(element);
            return element;
          }
    }

    onLFFileChanges(context: vscode.ExtensionContext): void {
        context.subscriptions.push(
            vscode.workspace.onDidDeleteFiles(async (e) => {
                if(e.files.length > 0){
                    e.files.forEach(async (file) => {
                        if(file.path.endsWith('.lf')) {
                            await this.refreshTree()
                        }
                    })
                }
            }),
            vscode.workspace.onDidRenameFiles(async (e) => {
                if(e.files.length > 0){
                    e.files.forEach(async (file) => {
                        if(file.newUri.path.endsWith('.lf')) {
                            await this.refreshTree()
                        }
                    })
                }
            }),
            vscode.workspace.onDidCreateFiles(async (e) => {
                if(e.files.length > 0){
                    e.files.forEach(async (file) => {
                        if(file.path.endsWith('.lf')) {
                            await this.refreshTree()
                        }
                    })
                }
            })
        )
        context.subscriptions.push(
            this.watcher.onDidChange(async uri => {
                await this.refreshTree()
            })
        )
    }
    
    // public async refreshTree() {
    //     console.log("Fetching LF libraries...")
    //     if (vscode.workspace.workspaceFolders) {
    //         this.data = [];
    //         vscode.workspace.findFiles('**/lib/*.lf').then(files => {
    //             files.forEach(file => {
    //                 this.data.push(new LFDataProviderNode(file.toString()))
    //             })
    //             this.data.sort((a: LFDataProviderNode, b: LFDataProviderNode) => {
    //                 const labelA = typeof a.label === 'string' ? a.label : a.resourceUri.fsPath.split('/').pop() || '';
    //                 const labelB = typeof b.label === 'string' ? b.label : b.resourceUri.fsPath.split('/').pop() || '';
    //                 return labelB.localeCompare(labelA);
    //             });
    //             this._onDidChangeTreeData.fire(undefined);
    //         })
    //     } 
    // }

    public async refreshTree(){
        console.log("Refreshing LF libraries...")
        this.data = [];
        if (vscode.workspace.workspaceFolders) {
            this.client.onReady().then(() => {
                vscode.workspace.findFiles('**/lib/*.lf').then(uris => {
                    uris.forEach(uri => {
                        this.client.sendRequest('generator/getLibraryReactors',uri.toString()).then(message => {
                            console.log(message)
                        })
                    })
                })
            })
        }
    }

    public async addDataItem(data: any) {
        // Build Root Node
        const root = this.buildRoot(data.uri);
        let node = new LFDataProviderNode(data.label,data.uri,'file',[]);
        root.children.push(node);
        if(data.children.length > 0){
            data.children.forEach(child => {
                node.children.push(new LFDataProviderNode(child.label,child.uri,'reactor',[]));
            });
        }
        this.data.sort((a: LFDataProviderNode, b: LFDataProviderNode) => {
            const labelA = typeof a.label === 'string' ? a.label : a.resourceUri.fsPath.split('/').pop() || '';
            const labelB = typeof b.label === 'string' ? b.label : b.resourceUri.fsPath.split('/').pop() || '';
            return labelA.localeCompare(labelB);
        });
        this._onDidChangeTreeData.fire(undefined);
    }

    public buildRoot(uri: string) : LFDataProviderNode {
        const splittedUri = uri.split('/');
        const projectLabel = splittedUri[splittedUri.length - 3];

        // Check if the project already exists in the data
        const existingProject = this.data.find(item => item.label === projectLabel);
        if (!existingProject) {
            // Construct projectUri
            const projectUri = splittedUri.slice(0, -3).join('/') + '/';
            // Create the root
            const root = new LFDataProviderNode(projectLabel, projectUri, 'root', []);
            // Construct project node
            this.data.push(root);
            return root;
        }
        return existingProject;
    }
}

export class LFDataProviderNode extends vscode.TreeItem {

    children: LFDataProviderNode[] | undefined
    role: string

    constructor(label: string, uri: string, role: string, children?: LFDataProviderNode[] | undefined) {
        let newLabel = label.replace('.lf','');
        super(newLabel, role === 'reactor'? vscode.TreeItemCollapsibleState.None : vscode.TreeItemCollapsibleState.Collapsed);
        this.resourceUri = vscode.Uri.parse(uri);
        this.children = children;
        this.role = role;
        let folder = role === 'root'? 'root' : role === 'file' ? 'file' : 'code';
        this.iconPath = {
            light: path.join(__filename, '..','..', 'images', 'icons', folder,folder + '-light.svg'),
            dark: path.join(__filename, '..','..', 'images', 'icons', folder, folder + '-dark.svg')
        }
        this.contextValue = role;

    }
}

export function registerGoToFileCommand(context: vscode.ExtensionContext) {
    context.subscriptions.push(vscode.commands.registerCommand(
        'linguafranca.goToFile', (node: LFDataProviderNode) => {
            vscode.workspace.openTextDocument(node.resourceUri).then(doc => {
                vscode.window.showTextDocument(doc);
            });
        }
    ));
}
