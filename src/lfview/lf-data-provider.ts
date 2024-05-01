import * as vscode from 'vscode'
import * as path from 'path';
import { TreeItemCollapsibleState } from 'vscode'
import { LanguageClient } from 'vscode-languageclient'

export class LFDataProvider implements vscode.TreeDataProvider<LFDataProviderNode> {

    // Local library list to display in the tree view. 
    // This will contain LFDataProviderNode elements representing the LF libraries.
    data: LFDataProviderNode[] = []

    // An event emitter and event that is fired when the tree data changes.
    // This event can be used to notify the tree view that the data has changed and it should refresh.
    private _onDidChangeTreeData: vscode.EventEmitter<LFDataProviderNode | undefined | null | void> = new vscode.EventEmitter<LFDataProviderNode | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<LFDataProviderNode | undefined | null | void> = this._onDidChangeTreeData.event;

    private watcher = vscode.workspace.createFileSystemWatcher('**/lib/*.lf')


    constructor(
        private client: LanguageClient,
        private context: vscode.ExtensionContext,
    ) {
        // Register commands
        this.registerRefreshCommand(context)
        this.registerGoToFileCommand(context)
        this.registerImportReactorCommand(context)
        this.registerOpenInSplitViewCommand(context)

        // Register to file system changes: Create, Delete, Rename, Change
        this.onLFFileChanges(this.context);

        // vscode.workspace.onDidChangeWorkspaceFolders(()

        /**
        * Registers a notification handler for the 'notify/sendLibraryReactors' event, which is used to add a new data item to the tree.
        * This code is executed when the Language Server is ready, and it listens for the 'notify/sendLibraryReactors' notification from the server.
        * When the notification is received, the `addDataItem` method is called with the received node data.
        */
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

    /**
    * Subscribes to various file change events (delete, rename, create) and refreshes the LF data provider tree when an .lf file is affected.
    * Also subscribes to changes in the LF watcher and refreshes the tree when a change is detected.
    * @param context - The extension context, used to manage the subscriptions.
    */
    onLFFileChanges(context: vscode.ExtensionContext): void {
        context.subscriptions.push(
            vscode.workspace.onDidDeleteFiles(async (e) => {
                if (e.files.length > 0) {
                    e.files.forEach(async (file) => {
                        if (file.path.endsWith('.lf')) {
                            await this.refreshTree()
                        }
                    })
                }
            }),
            vscode.workspace.onDidRenameFiles(async (e) => {
                if (e.files.length > 0) {
                    e.files.forEach(async (file) => {
                        if (file.newUri.path.endsWith('.lf')) {
                            await this.refreshTree()
                        }
                    })
                }
            }),
            vscode.workspace.onDidCreateFiles(async (e) => {
                if (e.files.length > 0) {
                    e.files.forEach(async (file) => {
                        if (file.path.endsWith('.lf')) {
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

    /**
    * Refreshes the LF libraries tree view by fetching the latest library reactor information from the Language Server.
    * This method is called at the very beginning when a LFDataProvider object is instaciated in {@code enxtension.ts} and when
    * the user triggers the {@code'linguafranca.refreshEntries'} command.
    */
    public async refreshTree() {
        console.log("Refreshing LF libraries...")
        this.data = [];
        if (vscode.workspace.workspaceFolders) {
            this.client.onReady().then(() => {
                vscode.workspace.findFiles('**/lib/*.lf').then(uris => {
                    uris.forEach(uri => {
                        this.client.sendRequest('generator/getLibraryReactors', uri.toString()).then(message => {
                            console.log(message)
                        })
                    })
                })
            })
        }
    }

    /**
    * Adds a new data item to the LFDataProvider tree.
    * 
    * This method constructs the root node for the data item, creates a new node for the data item, and adds it to the root node's children. 
    * If the data item has any child items, it also creates nodes for those and adds them to the data item's node.
    * The data is then sorted alphabetically by the node label or resource URI path, and the tree data change event is fired to update the UI.
    *
    * @param dataNode - The data node to add to the tree.
    */
    async addDataItem(dataNode: any) {
        // Build Root Node
        const root = this.buildRoot(dataNode.uri);
        let node = new LFDataProviderNode(dataNode.label, dataNode.uri, 'file', []);
        root.children.push(node);
        if (dataNode.children.length > 0) {
            dataNode.children.forEach(child => {
                node.children.push(new LFDataProviderNode(child.label, child.uri, 'reactor', [], child.position));
            });
        }
        this.data.sort((a: LFDataProviderNode, b: LFDataProviderNode) => {
            const labelA = typeof a.label === 'string' ? a.label : a.resourceUri.fsPath.split('/').pop() || '';
            const labelB = typeof b.label === 'string' ? b.label : b.resourceUri.fsPath.split('/').pop() || '';
            return labelA.localeCompare(labelB);
        });
        this._onDidChangeTreeData.fire(undefined);
    }

    /**
    * Builds the root node of the LFDataProviderNode tree based on the provided URI.
    * 
    * If the project represented by the URI does not exist in the `data` array, a new
    * `LFDataProviderNode` is created with the project label and URI, and added to the `data` array.
    * If the project already exists, the existing `LFDataProviderNode` is returned.
    *
    * @param uri The URI of the project to build the root node for.
    * @returns The root `LFDataProviderNode` for the project.
    */
    buildRoot(uri: string): LFDataProviderNode {
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

    /**
    * Registers a command to refresh the entries in the Lingua Franca view.
    * @param context The extension context.
    */
    registerRefreshCommand(context: vscode.ExtensionContext) {
        context.subscriptions.push(vscode.commands.registerCommand(
            'linguafranca.refreshEntries', () => {
                this.refreshTree();
            }
        ));
    }

    /**
    * Registers a command that allows the user to navigate to a file associated with a node in the LFDataProvider.
    *
    * When the {@code'linguafranca.goToFile'} command is executed, it will open the text document associated with the
    * provided {@code LFDataProviderNode} and position the editor at the start of the node's position, if available.
    *
    * @param context The extension context, used to register the command.
    */
    registerGoToFileCommand(context: vscode.ExtensionContext) {
        context.subscriptions.push(vscode.commands.registerCommand(
            'linguafranca.goToFile', (node: LFDataProviderNode) => {
                vscode.workspace.openTextDocument(node.resourceUri).then(doc => {
                    vscode.window.showTextDocument(doc /*, vscode.ViewColumn.Beside*/).then(e => {
                        if (node.position) {
                            e.selection = new vscode.Selection(node.position.start - 1, 0, node.position.end, 0);
                            e.revealRange(new vscode.Range(node.position.start - 1, 0, node.position.end, 0), vscode.TextEditorRevealType.InCenter);
                        }
                    });
                });
            }
        ));
    }

    /**
    * Registers a command to open a Lingua Franca resource in a split view.
    *
    * When the command is executed, it opens the Lingua Franca resource associated with the
    * provided {@code LFDataProviderNode} in a new editor view, positioned beside the current active
    * editor view.
    *
    * @param context - The extension context.
    */
    registerOpenInSplitViewCommand(context: vscode.ExtensionContext) {
        context.subscriptions.push(vscode.commands.registerCommand(
            'linguafranca.openInSplitView', (node: LFDataProviderNode) => {
                vscode.workspace.openTextDocument(node.resourceUri).then(doc => {
                    vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside)
                });
            }
        ));
    }

    /**
    * Registers a command to import a Reactor from the LFDataProviderNode.
    * When the command is executed, it finds the relative path of the Reactor's resource URI
    * compared to the active editor's document URI, and inserts an import statement for the
    * Reactor at the appropriate position in the active editor.
    *
    * @param context - The extension context.
    */
    registerImportReactorCommand(context: vscode.ExtensionContext) {
        context.subscriptions.push(vscode.commands.registerCommand(
            'linguafranca.importReactor', async (node: LFDataProviderNode) => {
                const editor = vscode.window.activeTextEditor;
                if (editor) {
                    if(!editor.document.uri.fsPath.endsWith('.lf')) {
                        vscode.window.showErrorMessage('The active editor must be a Ligua Franca program.');
                        return;
                    }
                    const relativePath = this.getRelativePath(editor.document.uri.fsPath, node.resourceUri.fsPath);
                    const importText = `import ${node.label.toString()} from "${relativePath}"\n`;
                    const position = await this.getTargetPosition(node.resourceUri);
                    this.addTextOnActiveEditor(editor, position.end, importText);
                }

            }
        ));
    }

    /**
    * Gets the relative path between a source and target file.
    * @param source The path to the source file.
    * @param target The path to the target file.
    * @returns The relative path between the source and target files.
    */
    getRelativePath(source: string, target: string) {
        return path.relative(path.dirname(source), target);
    }

    /**
    * Adds the provided text to the active editor at the specified end position, inserting it on the next empty line.
    *
    * @param editor - The active text editor to add the text to.
    * @param end - The position to start searching for the next empty line from.
    * @param importText - The text to insert on the next empty line.
    */
    addTextOnActiveEditor(editor: vscode.TextEditor, end: number, importText: string): void {
        const document = editor.document;
        const totalLines = document.lineCount;

        let startIndex = end;
        let foundEmptyLine = false;

        while (startIndex < totalLines) {
            const line = document.lineAt(startIndex);
            if (line.isEmptyOrWhitespace) {
                foundEmptyLine = true;
                break;
            }
            startIndex++;
        }

        if (foundEmptyLine) {
            editor.edit(editBuilder => {
                editBuilder.insert(new vscode.Position(startIndex, 0), importText);
            });
        }
    }

    /**
    * Retrieves the target position for the specified URI.
    *
    * @param uri - The URI for which to retrieve the target position.
    * @returns A Promise that resolves to the {@code NodePosition} for the target, or {@code undefined} if the target position could not be determined.
    */
    async getTargetPosition(uri: vscode.Uri): Promise<NodePosition | undefined> {
        return this.client.onReady().then(() => {
            return this.client.sendRequest('generator/getTargetPosition', uri.toString());
        });
    }
}

/**
* Represents a node in the LFDataProvider tree.
* 
* @param label - The label to display for the node.
* @param uri - The URI of the resource associated with the node.
* @param role - The role of the node, such as 'reactor', 'file', or 'root'.
* @param children - The child nodes of this node, if any.
* @param position - The start and end positions of the node in the source code, if available.
*/
export class LFDataProviderNode extends vscode.TreeItem {

    children: LFDataProviderNode[] | undefined
    role: string
    position: NodePosition | undefined

    constructor(label: string, uri: string, role: string,
        children?: LFDataProviderNode[] | undefined, position?: NodePosition | undefined) {
        let newLabel = label.replace('.lf', '');
        super(newLabel, role === 'reactor' ? vscode.TreeItemCollapsibleState.None : vscode.TreeItemCollapsibleState.Collapsed);
        this.resourceUri = vscode.Uri.parse(uri);
        this.children = children;
        this.role = role;
        let folder = role === 'root' ? 'root' : role === 'file' ? 'file' : 'code';
        this.iconPath = {
            light: path.join(__filename, '..', '..', 'images', 'icons', folder, folder + '-light.svg'),
            dark: path.join(__filename, '..', '..', 'images', 'icons', folder, folder + '-dark.svg')
        }
        this.contextValue = role;
        if (position) { this.position = position; }
    }
}

/**
* Represents the start and end positions of a node in the source code.
* 
* @param start - The starting position of the node.
* @param end - The ending position of the node.
*/
class NodePosition {
    start: number;
    end: number;

    constructor(start: number, end: number) {
        this.start = start;
        this.end = end;
    }
}
