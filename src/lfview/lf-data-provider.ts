import * as vscode from 'vscode';
import * as path from 'path';
import { LanguageClient } from 'vscode-languageclient';

/**
 * Defines the different roles of nodes that can be displayed in the LFDataProvider tree view.
 * {@code ROOT}: Represents the root node of the tree view.
 * {@code FILE}: Represents a file node in the tree view.
 * {@code REACTOR}: Represents a reactor node in the tree view.
 */
export enum LFDataProviderNodeRole {
    ROOT = 'root',
    FILE = 'file',
    REACTOR = 'reactor'
}

/**
 * Defines the types of the displayed data provider tree view.
 * 
 * {@code LOCAL} represents nodes for local LF libraries.
 * {@code LIBRARY} represents nodes for LF libraries downloaded using Lingo.
 */
export enum LFDataProviderNodeType {
    LOCAL = 1,
    LIBRARY = 2
}

/**
 * Represents a node in the LFDataProvider tree.
 * 
 * @param label - The label to display for the node.
 * @param uri - The URI of the resource associated with the node.
 * @param role - The role of the node, such as LFDataProviderNodeType.REACTOR, LFDataProviderNodeType.FILE, or LFDataProviderNodeType.ROOT.
 * @param children - The child nodes of this node, if any.
 * @param position - The start and end positions of the node in the source code, if available.
 */
export class LFDataProviderNode extends vscode.TreeItem {

    children: LFDataProviderNode[] | undefined;
    role: string;
    position: NodePosition | undefined;
    type: LFDataProviderNodeType;

    /**
     * Represents the URI of the data provider node.
     * Avoid using TreeItem.resourceUri to maintain a clear separation between error detection and Tree Item rendering.
     */
    uri: vscode.Uri;

    constructor(label: string, uri: string, role: string, type: LFDataProviderNodeType,
        children?: LFDataProviderNode[] | undefined, position?: NodePosition | undefined) {
        let newLabel = label.replace('.lf', '');
        super(newLabel, role === LFDataProviderNodeRole.REACTOR ? vscode.TreeItemCollapsibleState.None : vscode.TreeItemCollapsibleState.Collapsed);
        this.uri = vscode.Uri.parse(uri);
        this.children = children;
        this.role = role;
        this.type = type;
        let icon = role === LFDataProviderNodeRole.ROOT ? 'root-folder' : role === LFDataProviderNodeRole.FILE ? 'file-code' : 'json';
        this.iconPath = new vscode.ThemeIcon(icon);
        this.contextValue = role;
        if (position) { this.position = position; }

        this.registerNodeCommand();

    }

    /**
     * Registers a command for the node based on its role and type.
     */
    registerNodeCommand(): void {
        this.command = this.role === LFDataProviderNodeRole.REACTOR ? {
            title: "",
            command: this.type == LFDataProviderNodeType.LOCAL ? "linguafranca.goToFile" : "linguafranca.goToLibraryFile",
            arguments: [this]
        } : undefined;
    }
}

/**
 * Represents the start and end positions of a node in the source code.
 * 
 * @param start - The starting position of the node.
 * @param end - The ending position of the node.
 */
export class NodePosition {
    start: number;
    end: number;

    constructor(start: number, end: number) {
        this.start = start;
        this.end = end;
    }
}

/**
 * Represents the LFDataProvider tree view.
 */
export class LFDataProvider implements vscode.TreeDataProvider<LFDataProviderNode> {

    // Offset used to highlight text in goToFile Command
    private HIGHLIGHT_OFFSET = 100;

    // LF libraries data
    private data: LFDataProviderNode[] = [];
    // Type of the data provider
    private type: LFDataProviderNodeType;

    // Utility properties
    private searchPath: string;
    private path_offset: number;
    private exclude_path: vscode.GlobPattern = null;

    // Event emitter for tree data change
    private _onDidChangeTreeData: vscode.EventEmitter<LFDataProviderNode | undefined | null | void> = new vscode.EventEmitter<LFDataProviderNode | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<LFDataProviderNode | undefined | null | void> = this._onDidChangeTreeData.event;

    // Watches for changes to .lf files
    private watcher: vscode.FileSystemWatcher;

    /**
     * Constructs a new LFDataProvider instance with the given type, client, and extension context.
     * The constructor sets up the necessary file system watcher and subscribes to file change events,
     * refreshing the tree view when changes are detected. It also initializes the search path and
     * path offset based on the provided data provider type.
     *
     * @param type - The type of the LFDataProvider instance.
     * @param client - The LanguageClient instance used by the LFDataProvider.
     * @param context - The extension context used to manage the subscriptions.
     */
    constructor(
        type: LFDataProviderNodeType,
        private client: LanguageClient,
        private context: vscode.ExtensionContext,
    ) {

        this.type = type;
        this.path_offset = type === LFDataProviderNodeType.LOCAL ? 3 : 6;
        this.searchPath = type === LFDataProviderNodeType.LOCAL ? '**/lib/*.lf' : '**/target/lfc_include/**/lib/*.lf';
        this.exclude_path = type === LFDataProviderNodeType.LOCAL ? '**/target/**' : null;
        this.watcher = vscode.workspace.createFileSystemWatcher(this.searchPath);

        // Register to file system changes: Create, Delete, Rename, Change
        this.onLFFileChanges(this.context);

        // Refresh the tree view
        this.refreshTree();
    }

    /**
     * Gets the tree item representation of the node.
     */
    getTreeItem(element: LFDataProviderNode): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return element;
    }

    /**
     * Gets the children of a node.
     */
    getChildren(element?: LFDataProviderNode): vscode.ProviderResult<LFDataProviderNode[]> {
        if (!element) {
            return this.data;
        } else {
            return element.children;
        }
    }

    getParent?(element: LFDataProviderNode): vscode.ProviderResult<LFDataProviderNode> {
        throw new Error('Method not implemented.');
    }

    resolveTreeItem?(item: vscode.TreeItem, element: LFDataProviderNode, token: vscode.CancellationToken): vscode.ProviderResult<vscode.TreeItem> {
        return item;
    }

    /**
     * Gets the type of the data provider.
     */
    getType(): LFDataProviderNodeType {
        return this.type;
    }

    /**
     * Subscribes to various file change events (delete, rename, create) and refreshes the LF data provider tree when an .lf file is affected.
     * Also subscribes to changes in the LF watcher and refreshes the tree when a change is detected.
     * @param context - The extension context, used to manage the subscriptions.
     */
    onLFFileChanges(context: vscode.ExtensionContext): void {
        context.subscriptions.push(
            this.watcher.onDidChange(() => {
                this.refreshTree();
            }),
            this.watcher.onDidCreate(() => {
                this.refreshTree();
            }),
            this.watcher.onDidDelete(() => {
                this.refreshTree();
            })
        );
    }

    /**
     * Handles the expand event for a node in the LFDataProvider tree.
     * When the root node is expanded, its collapsible state is set to Expanded,
     * the icon path is updated to the root folder icon opened, and the tree data is refreshed.
     * @param element - The LFDataProviderNode that was expanded.
     */
    onExpandEvent(element: LFDataProviderNode): void {
        if (element.collapsibleState === vscode.TreeItemCollapsibleState.Collapsed &&
            element.role === LFDataProviderNodeRole.ROOT
        ) {
            element.collapsibleState = vscode.TreeItemCollapsibleState.Expanded;
            element.iconPath = new vscode.ThemeIcon('root-folder-opened');
            this._onDidChangeTreeData.fire(element);
        }
    }

    /**
     * Handles the collapse event for a node in the LFDataProvider tree.
     * When the root node is collapsed, its collapsible state is set to Collapsed,
     * the icon path is updated to the root folder icon, and the tree data is refreshed.
     * @param element - The LFDataProviderNode that was collapsed.
     */
    onCollapseEvent(element: LFDataProviderNode): void {
        if (element.collapsibleState === vscode.TreeItemCollapsibleState.Expanded &&
            element.role === LFDataProviderNodeRole.ROOT
        ) {
            element.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
            element.iconPath = new vscode.ThemeIcon('root-folder');
            this._onDidChangeTreeData.fire(element);
        }
    }

    /**
     * Refreshes the LF libraries tree view by fetching the latest library reactor information from the Language Server.
     */
    public refreshTree() {
        console.log("Refreshing LF libraries...");
        this.data = [];
        if (vscode.workspace.workspaceFolders) {
            this.client.onReady().then(() => {
                vscode.workspace.findFiles(this.searchPath, this.exclude_path ? this.exclude_path : null).then(uris => {
                    uris.forEach(uri => {
                        this.client.sendRequest('generator/getLibraryReactors', uri.toString()).then(node => {
                            this.addDataItem(node);
                        });
                    });
                });
            });
        }
        this._onDidChangeTreeData.fire(undefined);
    }

    /**
     * Adds a new data item to the LFDataProvider tree.
     * @param dataNode - The data node to add to the tree.
     */
    addDataItem(dataNode: any) {
        if (this.type === LFDataProviderNodeType.LOCAL) {
            this.addDataItemLocal(dataNode);
        } else {
            this.addDataItemLibrary(dataNode);
        }
    }

    /**
     * Adds a data item to the Local Libraries view.
     * @param dataNode - The data node to add.
     */
    addDataItemLocal(dataNode: any) {
        const root = this.buildRoot(dataNode.uri);
        let node = new LFDataProviderNode(dataNode.label, dataNode.uri, LFDataProviderNodeRole.FILE, this.type, []);
        root.children.push(node);
        if (dataNode.children.length > 0) {
            dataNode.children.forEach(child => {
                node.children.push(new LFDataProviderNode(child.label,
                    child.uri,
                    LFDataProviderNodeRole.REACTOR,
                    this.type, [],
                    child.position
                ));
            });
        }
        this.sortData();
    }

    /**
     * Adds a data item to the Lingo Libraries view.
     * @param dataNode - The data node to add.
     */
    addDataItemLibrary(dataNode: any) {
        const root = this.buildRoot(dataNode.uri);
        const library_root = this.buildLibraryRoot(dataNode.uri, root);
        let node = new LFDataProviderNode(dataNode.label, dataNode.uri, LFDataProviderNodeRole.FILE, this.type, []);
        if (dataNode.children.length > 0) {
            dataNode.children.forEach(child => {
                node.children.push(new LFDataProviderNode(child.label,
                    child.uri,
                    LFDataProviderNodeRole.REACTOR,
                    this.type, [],
                    child.position
                ));
            });
        }
        if (library_root.children.find(n => n.label === node.label) === undefined) {
            library_root.children.push(node);
        }
        this.sortData();
    }

    /**
     * Sorts the data nodes in the LFDataProvider tree and fires a change event.
     * The nodes are sorted alphabetically by their label or the last segment of their URI path.
     * After sorting the data nodes, the children of each node are also recursively sorted.
     */
    sortData() {
        this.data.sort((a: LFDataProviderNode, b: LFDataProviderNode) => {
            const labelA = typeof a.label === 'string' ? a.label : a.uri.fsPath.split('/').pop() || '';
            const labelB = typeof b.label === 'string' ? b.label : b.uri.fsPath.split('/').pop() || '';
            return labelA.localeCompare(labelB);
        });
        this.data.forEach(n => this.sortNodes(n));
        this._onDidChangeTreeData.fire(undefined);
    }

    /**
     * Recursively sorts the children of a node.
     * @param node - The node whose children need to be sorted.
     */
    sortNodes(node: LFDataProviderNode) {
        if (node.children.length > 0) {
            node.children.sort((a, b) => {
                const labelA = typeof a.label === 'string' ? a.label : a.uri.fsPath.split('/').pop() || '';
                const labelB = typeof b.label === 'string' ? b.label : b.uri.fsPath.split('/').pop() || '';
                return labelA.localeCompare(labelB);
            });
            node.children.forEach(n => this.sortNodes(n));
        }
    }

    /**
     * Builds the root node of the LFDataProviderNode tree in the Local Libraries view based on the provided URI.
     * @param uri The URI of the project to build the root node for.
     * @returns The root `LFDataProviderNode` for the project.
     */
    buildRoot(uri: string): LFDataProviderNode {
        const splittedUri = uri.split('/');
        const projectLabel = splittedUri[splittedUri.length - this.path_offset];

        const existingProject = this.data.find(item => item.label === projectLabel);
        if (!existingProject) {
            const projectUri = splittedUri.slice(0, - this.path_offset).join('/') + '/';
            const root = new LFDataProviderNode(projectLabel, projectUri, LFDataProviderNodeRole.ROOT, this.type, []);
            this.data.push(root);
            return root;
        }
        return existingProject;
    }

    /**
     * Builds the root node of the Lingo Library tree for the given URI.
     * @param uri - The URI of the item to build.
     * @param root - The root node of the library tree.
     * @returns The root node of the library tree, either a new node or an existing one.
     */
    buildLibraryRoot(uri: string, root: LFDataProviderNode): LFDataProviderNode {
        const splittedUri = uri.split('/');
        const projectLabel = splittedUri[splittedUri.length - this.path_offset + 3];

        const existingLibraryRoot = root.children.find(item => item.label === projectLabel);
        if (!existingLibraryRoot) {
            const projectUri = splittedUri.slice(0, - this.path_offset + 3).join('/') + '/';
            const library_root = new LFDataProviderNode(projectLabel, projectUri, LFDataProviderNodeRole.ROOT, this.type, []);
            root.children.push(library_root);
            return library_root;
        }
        return existingLibraryRoot;
    }

    /**
     * Opens the file associated with the node in the Tree View.
     * @param node - The node whose file is to be opened.
     * @param beside - Whether to open the file beside the current editor.
     */
    goToFileCommand(node: LFDataProviderNode, beside: boolean) {
        vscode.workspace.openTextDocument(node.uri).then(doc => {
            vscode.window.showTextDocument(doc, beside == false ? undefined : vscode.ViewColumn.Beside).then(e => {
                if (node.position) {
                    const selection = this.getHighlightSelection(node);
                    e.selection = selection;
                    e.revealRange(new vscode.Range(
                        selection.anchor.line,
                        selection.anchor.character,
                        selection.active.line,
                        selection.active.character),
                        vscode.TextEditorRevealType.InCenter);
                }
            });
        });
    }

    /**
     * Imports the reactor associated with the selected LFDataProviderNode.
     * @param node - The node representing the reactor to import.
     */
    async importReactorCommand(node: LFDataProviderNode) {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            if (!editor.document.uri.fsPath.endsWith('.lf')) {
                vscode.window.showErrorMessage('The active editor must be a Ligua Franca program.');
                return;
            }
            const relativePath = this.getRelativePath(editor.document.uri.fsPath, node.uri.fsPath);
            const importText = `import ${node.label.toString()} from "${relativePath}"\n`;
            const position = await this.getTargetPosition(node.uri);
            this.addTextOnActiveEditor(editor, position.end, importText);
        }
    }

    /**
     * Gets the selection to highlight in the editor for the node.
     * @param node - The node for which to get the selection.
     * @returns The selection to highlight.
     */
    getHighlightSelection(node: LFDataProviderNode): vscode.Selection {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const sel = new vscode.Selection(node.position.start - 1, 0, node.position.start - 1, this.HIGHLIGHT_OFFSET);
            const selectionRange = new vscode.Range(sel.start.line, sel.start.character, sel.end.line, sel.end.character);
            const highlighted = editor.document.getText(selectionRange);
            const idx = highlighted.indexOf(node.label.toString());
            const endIdx = idx + node.label.toString().length;
            return new vscode.Selection(node.position.start - 1, idx, node.position.start - 1, endIdx);
        }
        return new vscode.Selection(node.position.start - 1, 0, node.position.start - 1, this.HIGHLIGHT_OFFSET);
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
     * Adds text to the active editor at the specified position.
     * @param editor - The active text editor.
     * @param end - The position to start searching for the next empty line from.
     * @param importText - The text to insert.
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
     * @param uri - The URI for which to retrieve the target position.
     * @returns A Promise that resolves to the {@code NodePosition} for the target, or {@code undefined} if the target position could not be determined.
     */
    async getTargetPosition(uri: vscode.Uri): Promise<NodePosition | undefined> {
        return this.client.onReady().then(() => {
            return this.client.sendRequest('generator/getTargetPosition', uri.toString());
        });
    }

}