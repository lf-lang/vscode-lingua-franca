import * as vscode from 'vscode';
import * as path from 'path';
import { LanguageClient } from 'vscode-languageclient';

/**
 * Defines the different roles of nodes that can be displayed in the LFDataProvider tree view.
 * 
 * @property PROJECT - Represents the project node of the tree view.
 * @property ROOT - Represents the root node of a lingo library
 * @property SUB - Represents a sub-directory within the project, which may contain local libraries, Lingo packages, or source files.
 * @property SRC - Represents a Lingua Franca file located in the project’s `src` directory.
 * @property FILE - Represents a file node in the tree view.
 * @property REACTOR - Represents a reactor node in the tree view.
 */
export enum LFDataProviderNodeRole {
    PROJECT = 'project',
    ROOT = 'root',
    SUB = 'sub',
    SRC = 'src',
    FILE = 'file',
    REACTOR = 'reactor'
}

/**
 * Defines the different types of nodes that can be displayed in the LFDataProvider tree view.
 * 
 * @property LOCAL - Represents a local library node.
 * @property LIBRARY - Represents a library node.
 * @property SOURCE - Represents a source file node.
 */
export enum LFDataProviderNodeType {
    LOCAL = 1,
    LIBRARY = 2, 
    SOURCE = 3
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
    type: LFDataProviderNodeType | undefined;

    /**
     * Represents the URI of the data provider node.
     * Avoid using TreeItem.resourceUri to maintain a clear separation between error detection and Tree Item rendering.
     */
    uri: vscode.Uri;

    constructor(label: string, uri: string, role: string,
        type?: LFDataProviderNodeType | undefined,
        children?: LFDataProviderNode[] | undefined, 
        position?: NodePosition | undefined) {
        let newLabel = type === LFDataProviderNodeType.SOURCE ? label : label.replace('.lf', '');
        super(newLabel, role === LFDataProviderNodeRole.REACTOR || 
            (role === LFDataProviderNodeRole.FILE && type === LFDataProviderNodeType.SOURCE) 
        ? vscode.TreeItemCollapsibleState.None : vscode.TreeItemCollapsibleState.Collapsed);
        this.uri = vscode.Uri.parse(uri);
        this.children = children;
        this.role = role;
        this.type = type;
        this.updateIcon(role, type);
        this.updateContextValue(role, type);
        if (position) { this.position = position; }
        if(role === LFDataProviderNodeRole.FILE && type === LFDataProviderNodeType.SOURCE){
            this.command = {
                title: "Go to File",
                command: "vscode.open",
                arguments: [this.uri]
            }
        }
    }

    /**
     * Determines the appropriate icon to display for a node in the LFDataProvider tree based on its role and type.
     *
     * @param role - The role of the node (e.g. project, root, file, reactor, sub).
     * @param type - The type of the node (e.g. local, library, source).
     * @returns The name of the icon to display for the node.
     */
    updateIcon(role: string, type?: LFDataProviderNodeType): void {
        const sameRootAsEditor = this.haveSameRootWithActiveEditor();
        let newIcon = '';
    
        switch (role) {
            case LFDataProviderNodeRole.PROJECT:
                newIcon = 'project';
                break;
            case LFDataProviderNodeRole.ROOT:
                newIcon = 'root-folder';
                break;
            case LFDataProviderNodeRole.FILE:
                newIcon = 'file-code';
                break;
            case LFDataProviderNodeRole.REACTOR:
                newIcon = 'json';
                break;
            case LFDataProviderNodeRole.SUB:
                switch (type) {
                    case LFDataProviderNodeType.LOCAL:
                        newIcon = 'book';
                        break;
                    case LFDataProviderNodeType.LIBRARY:
                        newIcon = 'library';
                        break;
                    case LFDataProviderNodeType.SOURCE:
                        newIcon = 'circuit-board';
                        break;
                    default:
                        newIcon = 'default-icon'; // fallback for unknown types
                }
                break;
            default:
                newIcon = 'default-icon'; // fallback for unknown roles
        }
    
        this.iconPath = new vscode.ThemeIcon(
            newIcon, 
            sameRootAsEditor 
                ? new vscode.ThemeColor('editorIcon.currentProject') 
                : new vscode.ThemeColor('editorIcon.notCurrentProject')
        );
    }
    
    /**
     * Updates the context value of the LFDataProviderNode based on its role and type.
     * The context value is used to determine the appropriate visual representation of the node in the tree view.
     *
     * @param role - The role of the node (e.g. project, root, file, reactor, sub).
     * @param type - The type of the node (e.g. local, library, source).
     */
    updateContextValue(role: string, type?: LFDataProviderNodeType): void {
        const sameRootAsEditor = this.haveSameRootWithActiveEditor();
    
        let value: string = role;
    
        switch (role) {
            case LFDataProviderNodeRole.ROOT:
                value = sameRootAsEditor ? 'root-included' : 'root';
                break;
            case LFDataProviderNodeRole.SUB:
                if (type === LFDataProviderNodeType.LIBRARY) {
                    value = 'lingo';
                }
                break;
            case LFDataProviderNodeRole.FILE:
                if (type === LFDataProviderNodeType.LOCAL) {
                    value = sameRootAsEditor ? 'file-local-included' : 'file-local';
                } else if (type === LFDataProviderNodeType.LIBRARY) {
                    value = 'file-lingo';
                }
                break;
            case LFDataProviderNodeRole.REACTOR:
                value = sameRootAsEditor ? 'reactor-included' : 'reactor';
                break;
        }
    
        this.contextValue = value;
    }
    
    /**
     * Determines whether the current node's root path is the same as the active editor's root path.
     * This is used to determine the appropriate context value for the node in the tree view.
     *
     * @returns `true` if the current node's root path is the same as the active editor's root path, `false` otherwise.
     */
    haveSameRootWithActiveEditor(): boolean {
        const editor = vscode.window.activeTextEditor;
    
        if (!editor || !editor.document) {
            return false;
        }
        if(this.role === LFDataProviderNodeRole.PROJECT){
            return editor.document.uri.fsPath.startsWith(this.uri.fsPath);
        }
        const pathSegments = this.uri.fsPath.split('/');
        const srcOrBuildIndex = pathSegments.lastIndexOf(this.type === LFDataProviderNodeType.LIBRARY ? 'build' : 'src');
        
        if (srcOrBuildIndex === -1) {
            return false;
        }
    
        const rootPath = pathSegments.slice(0, srcOrBuildIndex).join('/');
        return editor.document.uri.fsPath.startsWith(rootPath);
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

    // LF libraries data
    private data: LFDataProviderNode[] = [];

    // Utility properties
    private searchSourceFiles: string = 'src/*.lf';
    private searchPathLocal: string = 'src/lib/*.lf';
    private searchPathLibrary: vscode.GlobPattern  = 'build/lfc_include/**/src/lib/*.lf';
    private exclude_path_local: vscode.GlobPattern = '**/build/**'; // only for local LF libraries
    private exclude_path_src: vscode.GlobPattern = `{${this.exclude_path_local},**/fed-gen/**,**/src-gen/***}`

    // Event emitter for tree data change
    private _onDidChangeTreeData: vscode.EventEmitter<LFDataProviderNode | undefined | null | void> = new vscode.EventEmitter<LFDataProviderNode | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<LFDataProviderNode | undefined | null | void> = this._onDidChangeTreeData.event;

    // Watches for changes to .lf files
    private watcher: vscode.FileSystemWatcher | undefined;

    /**
     * Constructs a new LFDataProvider instance with the given type, client, and extension context.
     * The constructor sets up the necessary file system watcher and subscribes to file change events,
     * refreshing the tree view when changes are detected. It also initializes the search path and
     * path offset based on the provided data provider type.
     *
     * @param client - The LanguageClient instance used by the LFDataProvider.
     * @param context - The extension context used to manage the subscriptions.
     */
    constructor(
        private client: LanguageClient,
        private context: vscode.ExtensionContext,
    ) {
        // Register to file system changes: Create, Delete, Rename, Change
        this.watchFileChanges(this.context);

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
     * Subscribes to various file change events (delete, rename, create) and refreshes the LF data provider tree when an .lf file is affected.
     * Also subscribes to changes in the LF watcher and refreshes the tree when a change is detected.
     * @param context - The extension context, used to manage the subscriptions.
     */
    watchFileChanges(context: vscode.ExtensionContext): void {
        this.watcher = vscode.workspace.createFileSystemWatcher(`**/*.lf`, false, false, false);
        this.watcher.onDidChange(() => {
            this.refreshTree();
        }),
        this.watcher.onDidCreate(() => {
            this.refreshTree();
        }),
        this.watcher.onDidDelete(() => {
            this.refreshTree();
        })
        context.subscriptions.push(this.watcher);
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
            if (element.iconPath instanceof vscode.ThemeIcon) {
                element.iconPath = new vscode.ThemeIcon('root-folder-opened', element.iconPath.color);
            } else {
                element.iconPath = new vscode.ThemeIcon('root-folder-opened');
            }
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
            if (element.iconPath instanceof vscode.ThemeIcon) {
                element.iconPath = new vscode.ThemeIcon('root-folder', element.iconPath.color);
            } else {
                element.iconPath = new vscode.ThemeIcon('root-folder');
            }
            this._onDidChangeTreeData.fire(element);
        }
    }

    /**
     * Updates the context value for the active editor's LF data provider nodes.
     * This method iterates through the root nodes and updates the context value
     * for any sub-nodes of type LOCAL or LIBRARY that have children.
     * After the updates, it fires the onDidChangeTreeData event to notify
     * the tree view of the changes.
     */
    onChangeActiveEditor(): void {
        this.data.forEach((root: LFDataProviderNode) => {
            if (root.children?.length) {
                root.updateIcon(root.role, root.type);
                const updateIfExists = (type: LFDataProviderNodeType) => {
                    const node = root.children?.find(n => n.role === LFDataProviderNodeRole.SUB && n.type === type);
                    node?.updateIcon(node.role, node.type);
                    if (node?.children?.length) {
                        this.updateContextValueAndIcon(node.children);
                    }
                };
    
                updateIfExists(LFDataProviderNodeType.LOCAL);
                updateIfExists(LFDataProviderNodeType.LIBRARY);
                updateIfExists(LFDataProviderNodeType.SOURCE);
            }
        });
        this._onDidChangeTreeData.fire(undefined);
    }
    
    /**
     * Recursively updates the context value for the given LFDataProviderNode elements.
     * This method iterates through the provided elements and updates the context value
     * for each node based on its role and type. If a node has children, the method
     * is called recursively to update the context value for the child nodes as well.
     *
     * @param elements - An array of LFDataProviderNode elements to update.
     */
    updateContextValueAndIcon(elements: LFDataProviderNode[]): void {
        elements.forEach((node: LFDataProviderNode) => {
            node.updateContextValue(node.role, node.type);
            node.updateIcon(node.role, node.type);
            if (node.children?.length) {
                this.updateContextValueAndIcon(node.children);
            }
        });
    }

    /**
     * Refreshes the LF libraries tree view by fetching the latest library reactor information from the Language Server.
     */
    public refreshTree() {
        console.log("Refreshing LF libraries...");
        this.data = [];
        if (vscode.workspace.workspaceFolders) {
            this.client.onReady().then(() => {
                // Find all source files
                this.findFiles(this.searchSourceFiles, this.exclude_path_src, LFDataProviderNodeType.SOURCE);
                // Find all local reusable reactor libraries
                this.findFiles(this.searchPathLocal, this.exclude_path_local, LFDataProviderNodeType.LOCAL);
                // Find all lingo downloaded reactor libraries
                this.findFiles(this.searchPathLibrary, null, LFDataProviderNodeType.LIBRARY);
            });
        }
        this._onDidChangeTreeData.fire(undefined);
    }
    findFiles(searchPath: string | vscode.GlobPattern, exclude_path: vscode.GlobPattern | null, type: LFDataProviderNodeType): void {
        vscode.workspace.findFiles(searchPath, exclude_path ? exclude_path : null).then(uris => {
            uris.forEach(uri => {
                this.client.sendRequest('generator/getLibraryReactors', uri.toString()).then(node => {
                    if(node){
                        this.addDataItem(node as LFDataProviderNode, type);
                    }
                    else if(node === null){
                        vscode.window.showErrorMessage('Error retrieving data from the Language Server');
                        return;
                    }
                });
            });
        });
    }

    /**
     * Adds a new data item to the LFDataProvider tree.
     * @param dataNode - The data node to add to the tree.
     * @param type - The type of the node (e.g., LOCAL, LIBRARY, SOURCE).
     */
    addDataItem(dataNode: LFDataProviderNode, type: LFDataProviderNodeType) {
        const root = this.buildRoot(dataNode.uri.toString(), type);
        const node = this.createNode(dataNode, type, LFDataProviderNodeRole.FILE);

        // Add child nodes if applicable
        this.addChildNodes(dataNode, node, type);

        switch (type) {
            case LFDataProviderNodeType.LIBRARY:
                this.handleLibraryNode(root, node, dataNode);
                break;
            case LFDataProviderNodeType.LOCAL:
                this.handleLocalNode(root, node, dataNode);
                break;
            case LFDataProviderNodeType.SOURCE:
                this.handleSourceNode(root, node, dataNode);
                break;
        }

        // Sort data after adding the new node
        this.sortData();
    }

    /**
     * Creates a new LFDataProviderNode.
     * @param dataNode - The data node to create.
     * @param type - The type of the node.
     * @param role - The role of the node (e.g., FILE, REACTOR).
     */
    createNode(dataNode: LFDataProviderNode, type: LFDataProviderNodeType, role: LFDataProviderNodeRole): LFDataProviderNode {
        return new LFDataProviderNode(
            dataNode.label!.toString(),
            dataNode.uri.toString(),
            role,
            type,
            [],
            dataNode.position
        );
    }

    /**
     * Adds child nodes to a given node if applicable.
     * @param dataNode - The parent data node.
     * @param node - The node to which children will be added.
     * @param type - The type of the parent node.
     */
    addChildNodes(dataNode: LFDataProviderNode, node: LFDataProviderNode, type: LFDataProviderNodeType) {
        if (type !== LFDataProviderNodeType.SOURCE && dataNode.children?.length) {
            dataNode.children.forEach((child: LFDataProviderNode) => {
                node.children!.push(this.createNode(child, type, LFDataProviderNodeRole.REACTOR));
            });
        }
    }

    /**
     * Handles the addition of a LIBRARY type node.
     * @param root - The root node of the tree.
     * @param node - The node to add to the tree.
     * @param dataNode - The data node being added.
     */
    handleLibraryNode(root: LFDataProviderNode, node: LFDataProviderNode, dataNode: LFDataProviderNode) {
        const libraryRoot = this.buildLibraryRoot(dataNode.uri.toString(), root, dataNode);
        if (!libraryRoot.children?.some(n => n.label === node.label)) {
            libraryRoot.children!.push(node);
        }
    }

    /**
     * Handles the addition of a LOCAL type node.
     * @param root - The root node of the tree.
     * @param node - The node to add to the tree.
     * @param dataNode - The data node being added.
     */
    handleLocalNode(root: LFDataProviderNode, node: LFDataProviderNode, dataNode: LFDataProviderNode) {
        let localNode = this.findOrCreateSubNode(root, "Local Libraries", LFDataProviderNodeRole.SUB, LFDataProviderNodeType.LOCAL, dataNode);
        if(!localNode.children?.some(n => n.label === node.label))
            localNode.children!.push(node);
    }

    /**
     * Handles the addition of a SOURCE type node.
     * @param root - The root node of the tree.
     * @param node - The node to add to the tree.
     * @param dataNode - The data node being added.
     */
    handleSourceNode(root: LFDataProviderNode, node: LFDataProviderNode, dataNode: LFDataProviderNode) {
        let srcNode = this.findOrCreateSubNode(root, "Source Files", LFDataProviderNodeRole.SUB, LFDataProviderNodeType.SOURCE, dataNode);
        if(!srcNode.children?.some(n => n.label === node.label))
            srcNode.children!.push(node);
    }

    /**
     * Finds or creates a sub-node with a given label, role, and type.
     * @param root - The root node to search in.
     * @param label - The label of the sub-node to find or create.
     * @param role - The role of the sub-node.
     * @param type - The type of the sub-node.
     * @param dataNode - The data node associated with the sub-node.
     * @returns The found or newly created sub-node.
     */
    findOrCreateSubNode(root: LFDataProviderNode, label: string, role: LFDataProviderNodeRole, type: LFDataProviderNodeType, dataNode: LFDataProviderNode): LFDataProviderNode {
        let subNode = root.children?.find(n => n.role === role && n.type === type);

        if (!subNode) {
            subNode = new LFDataProviderNode(
                label,
                dataNode.uri.toString(),
                role,
                type,
                []
            );
            root.children!.push(subNode);
        }

        return subNode;
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
        if (node.children!.length > 0) {
            node.children!.sort((a, b) => {
                const labelA = typeof a.label === 'string' ? a.label : a.uri.fsPath.split('/').pop() || '';
                const labelB = typeof b.label === 'string' ? b.label : b.uri.fsPath.split('/').pop() || '';
                return labelA.localeCompare(labelB);
            });
            node.children!.forEach(n => this.sortNodes(n));
        }
    }

    /**
     * Builds the root node of the LFDataProviderNode tree in the Local Libraries view based on the provided URI.
     * @param uri The URI of the project to build the root node for.
     * @returns The root `LFDataProviderNode` for the project.
     */
    buildRoot(uri: string, type: LFDataProviderNodeType | null): LFDataProviderNode {
        const splittedUri = uri.split('/');
            const srcIdx = splittedUri.lastIndexOf(!type || type == LFDataProviderNodeType.LIBRARY ? 'build' : 'src');
            const projectLabel = splittedUri[srcIdx - 1];

            const existingProject = this.data.find(item => item.label === projectLabel);
            if (!existingProject) {
                const projectUri = splittedUri.slice(0, srcIdx).join('/') + '/';
                const root = new LFDataProviderNode(projectLabel, projectUri, LFDataProviderNodeRole.PROJECT, type!, []);
                this.data.push(root);
                return root;
            }
            return existingProject;
    }
    
    /**
     * Builds or retrieves the root node for a library project based on the URI.
     * @param uri - The URI of the data node.
     * @param root - The root node of the tree.
     * @returns The root node for the library project.
     */
    buildLibraryRoot(uri: string, root: LFDataProviderNode, dataNode: LFDataProviderNode): LFDataProviderNode {
        const splittedUri = uri.split('/');
        const srcIdx = splittedUri.lastIndexOf('src');
        const projectLabel = splittedUri[srcIdx - 1];

        let lingo = this.findOrCreateSubNode(root, "Lingo Packages", LFDataProviderNodeRole.SUB, LFDataProviderNodeType.LIBRARY, dataNode);
        const existingProject = lingo.children!.find(item => item.label === projectLabel);
        if (!existingProject) {
            const projectUri = splittedUri.slice(0, srcIdx).join('/') + '/';
            const root = new LFDataProviderNode(projectLabel, projectUri, LFDataProviderNodeRole.ROOT, LFDataProviderNodeType.LIBRARY, []);
            lingo.children!.push(root);
            return root;
        }
        return existingProject;
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
     * Imports the reactor from the locally defined libraries associated with the selected LFDataProviderNode 
     * into the active Lingua Franca program.
     *
     * @param node - The node representing the reactor to import.
     * @returns A Promise that resolves when the import text has been added to the active editor and the document saved.
     */
    async importReactorCommand(node: LFDataProviderNode) {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            if (!editor.document.uri.fsPath.endsWith('.lf')) {
                vscode.window.showErrorMessage('The active editor must be a Ligua Franca program.');
                return;
            }
            const relativePath = this.getRelativePath(editor.document.uri.fsPath, node.uri.fsPath);
            const importText = `import ${node.label!.toString()} from "${relativePath}"\n`;
            const position = await this.getTargetPosition(editor.document.uri);
            this.addTextOnActiveEditor(editor, position!.end, importText);
        }
    }

    /**
     * Imports the reactor downloaded via Lingo, associated with the selected LFDataProviderNode into the active 
     * Lingua Franca program.
     *
     * @param node - The node representing the reactor to import.
     * @returns A Promise that resolves when the import text has been added to the active editor and the document saved.
     */
    async importLibraryReactorCommand(node: LFDataProviderNode) {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            if (!editor.document.uri.fsPath.endsWith('.lf')) {
                vscode.window.showErrorMessage('The active editor must be a Ligua Franca program.');
                return;
            }
            const relativePath = this.getLibraryPath(node.uri.fsPath);
            const importText = `import ${node.label!.toString()} from <${relativePath}>\n`;
            const position = await this.getTargetPosition(editor.document.uri);
            this.addTextOnActiveEditor(editor, position!.end, importText);
        }
    }

    /**
     * Gets the selection to highlight in the editor for the node.
     * @param node - The node for which to get the selection.
     * @returns The selection to highlight.
     */
    getHighlightSelection(node: LFDataProviderNode): vscode.Selection {
        return new vscode.Selection(node.position!.start - 1, 0, node.position!.end, 0);
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
     * Gets the path to a library file from the provided path.
     * 
     * @param path - The path to the library file.
     * @returns The path to the library file, or an empty string if the path is invalid.
     */
    getLibraryPath(path: string) {
        const segments = path.split('/');
        const srcIndex = segments.lastIndexOf('src');

        // Check if the 'src' directory was found and there's at least one segment before it
        if (srcIndex === -1 || srcIndex === 0) {
            vscode.window.showErrorMessage('Invalid path or src directory not found');
            return '';
        }

        // The project name is the segment before 'src'
        const libraryName = segments[srcIndex - 1];
        // The file name is the last segment of the path
        const fileName = segments[segments.length - 1];
        return `${libraryName}/${fileName}`;
    }

    /**
     * Adds the specified text to the active text editor at the given index.
     *
     * @param editor - The active text editor.
     * @param idx - The index at which to insert the text.
     * @param importText - The text to insert.
     * @returns A Promise that resolves when the text has been added and the document saved.
     */
    async addTextOnActiveEditor(editor: vscode.TextEditor, idx: number, importText: string): Promise<void> {
        try {
            await editor.edit(editBuilder => {
                editBuilder.insert(new vscode.Position(idx, 0), importText);
            });
        } catch (error) {
            console.error('Failed to add text or save document:', error);
        }
    }

    /**
     * Retrieves the target position for the specified URI.
     * @param uri - The URI for which to retrieve the target position.
     * @returns A Promise that resolves to the {@code NodePosition} for the target, or {@code undefined} if the target position could not be determined.
     */
    async getTargetPosition(uri: vscode.Uri): Promise<NodePosition | undefined> {
        return this.client.onReady().then(() => {
            return this.client.sendRequest('generator/getTargetPosition', uri.toString()).then(position => {
                if (!position) {
                    vscode.window.showErrorMessage('Error retrieving data from the Language Server', ...['Try Again', 'Cancel']).then(selection => {
                        if (selection == 'Try Again') {
                            return this.getTargetPosition(uri);
                        }
                    });
                    return undefined;
                }
                return position as NodePosition;
            });
        });
    }

    /**
     * Opens the Lingo.toml file associated with the given LFDataProviderNode.
     *
     * @param node - The LFDataProviderNode for which to open the Lingo.toml file.
     */
    goToLingoTomlCommand(node: LFDataProviderNode) {
        const segments = node.uri.fsPath.split('/');
        const srcIdx = segments.lastIndexOf('build');
        let newUri = segments.slice(0, srcIdx).join('/').concat('/Lingo.toml');
        vscode.workspace.openTextDocument(vscode.Uri.parse(newUri)).then(doc => {
            vscode.window.showTextDocument(doc);
        });
    }

}