import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
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
    REACTOR = 'reactor',
    README = 'readme'
}

/**
 * Defines the different types of nodes that can be displayed in the LFDataProvider tree view.
 * 
 * @property LOCAL - Represents a local library node (`src/lib`).
 * @property LIBRARY - Represents a Lingo-installed package node (`build/lfc_include`).
 * @property SOURCE - Represents a source file node.
 * @property LOCAL_PACKAGE - Represents a local package node (`lf-packages`).
 * @property GLOBAL_PACKAGE - Represents a global package node (`LF_PACKAGES`).
 */
export enum LFDataProviderNodeType {
    LOCAL = 1,
    LIBRARY = 2,
    SOURCE = 3,
    LOCAL_PACKAGE = 4,
    GLOBAL_PACKAGE = 5
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
    parent: LFDataProviderNode | undefined;
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
        const isLeaf = role === LFDataProviderNodeRole.REACTOR
            || role === LFDataProviderNodeRole.README
            || (role === LFDataProviderNodeRole.FILE && type === LFDataProviderNodeType.SOURCE);
        let newLabel = (type === LFDataProviderNodeType.SOURCE || role === LFDataProviderNodeRole.README)
            ? label
            : label.replace(/\.u?lf$/, '');
        super(newLabel, isLeaf
            ? vscode.TreeItemCollapsibleState.None
            : vscode.TreeItemCollapsibleState.Collapsed);
        this.uri = vscode.Uri.parse(uri);
        this.children = children;
        this.role = role;
        this.type = type;
        // Keep parent pointers in sync when children are provided at construction time.
        this.children?.forEach(child => { child.parent = this; });
        this.updateIcon(role, type);
        this.updateContextValue(role, type);
        if (position) { this.position = position; }
        if (role === LFDataProviderNodeRole.README) {
            // Open rendered Markdown preview (tree views invoke this on click).
            this.command = {
                title: "Open README Preview",
                command: "markdown.showPreview",
                arguments: [this.uri]
            };
        } else if (role === LFDataProviderNodeRole.FILE && type === LFDataProviderNodeType.SOURCE) {
            this.command = {
                title: "Go to File",
                command: "vscode.open",
                arguments: [this.uri]
            };
        }
    }

    /**
     * Appends a child node and records the parent link used by {@link LFDataProvider.getParent}.
     */
    addChild(child: LFDataProviderNode): void {
        if (!this.children) {
            this.children = [];
        }
        child.parent = this;
        this.children.push(child);
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
                if (type === LFDataProviderNodeType.SOURCE) {
                    newIcon = this.collapsibleState === vscode.TreeItemCollapsibleState.Expanded
                        ? 'folder-opened' : 'folder';
                } else {
                    newIcon = this.collapsibleState === vscode.TreeItemCollapsibleState.Expanded
                        ? 'root-folder-opened' : 'root-folder';
                }
                break;
            case LFDataProviderNodeRole.FILE:
                newIcon = 'file-code';
                break;
            case LFDataProviderNodeRole.README:
                newIcon = 'markdown';
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
                    case LFDataProviderNodeType.LOCAL_PACKAGE:
                        newIcon = 'package';
                        break;
                    case LFDataProviderNodeType.GLOBAL_PACKAGE:
                        newIcon = 'globe';
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
                : undefined
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
                } else if (type === LFDataProviderNodeType.LIBRARY
                    || type === LFDataProviderNodeType.LOCAL_PACKAGE
                    || type === LFDataProviderNodeType.GLOBAL_PACKAGE) {
                    value = 'file-lingo';
                }
                break;
            case LFDataProviderNodeRole.REACTOR:
                value = sameRootAsEditor ? 'reactor-included' : 'reactor';
                break;
            case LFDataProviderNodeRole.README:
                value = 'readme';
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
    
        if (this.role === LFDataProviderNodeRole.PROJECT) {
            return editor.document.uri.fsPath.startsWith(this.uri.fsPath);
        }
    
        // Global packages are available to any Lingua Franca file in the workspace.
        if (this.type === LFDataProviderNodeType.GLOBAL_PACKAGE) {
            return (vscode.workspace.workspaceFolders ?? []).some(folder =>
                editor.document.uri.fsPath.startsWith(folder.uri.fsPath));
        }

        const pathSegments = this.uri.path.split('/');
        let marker: string;
        if (this.type === LFDataProviderNodeType.LIBRARY) {
            marker = 'build';
        } else if (this.type === LFDataProviderNodeType.LOCAL_PACKAGE) {
            marker = 'lf-packages';
        } else {
            marker = 'src';
        }
        const markerIndex = pathSegments.lastIndexOf(marker);

        if (markerIndex === -1) {
            return false;
        }

        const rootPath = pathSegments.slice(0, markerIndex).join('/');
        return editor.document.uri.path.startsWith(rootPath);
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
    private searchSourceFiles: vscode.GlobPattern = 'src/**/*.{lf,ulf}';
    private searchPathLocal: vscode.GlobPattern = 'src/lib/*.{lf,ulf}';
    private searchPathLibrary: vscode.GlobPattern = 'build/lfc_include/**/src/lib/*.{lf,ulf}';
    private searchPathLocalPackage: vscode.GlobPattern = 'lf-packages/**/src/lib/**/*.{lf,ulf}';
    private exclude_private: vscode.GlobPattern = '**/private/**';
    private exclude_path_local: vscode.GlobPattern = `{**/{build,lf-packages}/**,${this.exclude_private}}`; // only for local LF libraries
    private exclude_path_src: vscode.GlobPattern = `{${this.exclude_path_local},src/lib/**,**/fed-gen/**,**/src-gen/**}`
    // Generated and non-source trees should not contribute README entries.
    // Note: do not exclude `build` here — Lingo packages live under `build/lfc_include`.
    private exclude_path_readme: vscode.GlobPattern = `{**/{src-gen,fed-gen,include,bin,node_modules}/**,${this.exclude_private}}`

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

    /**
     * Returns the parent of a node. VS Code calls this when restoring selection/expansion
     * after {@link onDidChangeTreeData} (e.g. when a click opens a file and refreshes icons).
     * Throwing here corrupts tree indentation, so this must return a real parent link.
     */
    getParent(element: LFDataProviderNode): vscode.ProviderResult<LFDataProviderNode> {
        return element.parent;
    }

    resolveTreeItem?(item: vscode.TreeItem, element: LFDataProviderNode, token: vscode.CancellationToken): vscode.ProviderResult<vscode.TreeItem> {
        return item;
    }

    /**
     * Subscribes to various file change events (delete, rename, create) and refreshes the LF data provider tree when an 
     * .lf or .ulf file is affected.
     * Also subscribes to changes in the LF watcher and refreshes the tree when a change is detected.
     * @param context - The extension context, used to manage the subscriptions.
     */
    watchFileChanges(context: vscode.ExtensionContext): void {
        const refresh = () => this.refreshTree();
        this.watcher = vscode.workspace.createFileSystemWatcher(`**/*.{lf,ulf}`, false, false, false);
        this.watcher.onDidChange(refresh);
        this.watcher.onDidCreate(refresh);
        this.watcher.onDidDelete(refresh);
        context.subscriptions.push(this.watcher);

        const readmeWatcher = vscode.workspace.createFileSystemWatcher(`**/README.md`, false, false, false);
        readmeWatcher.onDidChange(refresh);
        readmeWatcher.onDidCreate(refresh);
        readmeWatcher.onDidDelete(refresh);
        context.subscriptions.push(readmeWatcher);
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
            const openedIcon = element.type === LFDataProviderNodeType.SOURCE
                ? 'folder-opened' : 'root-folder-opened';
            if (element.iconPath instanceof vscode.ThemeIcon) {
                element.iconPath = new vscode.ThemeIcon(openedIcon, element.iconPath.color);
            } else {
                element.iconPath = new vscode.ThemeIcon(openedIcon);
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
            const closedIcon = element.type === LFDataProviderNodeType.SOURCE
                ? 'folder' : 'root-folder';
            if (element.iconPath instanceof vscode.ThemeIcon) {
                element.iconPath = new vscode.ThemeIcon(closedIcon, element.iconPath.color);
            } else {
                element.iconPath = new vscode.ThemeIcon(closedIcon);
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
                updateIfExists(LFDataProviderNodeType.LOCAL_PACKAGE);
                updateIfExists(LFDataProviderNodeType.GLOBAL_PACKAGE);
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
                this.findFiles(this.searchPathLibrary, this.exclude_private, LFDataProviderNodeType.LIBRARY);
                // Find all local packages under lf-packages
                this.findFiles(this.searchPathLocalPackage, this.exclude_private, LFDataProviderNodeType.LOCAL_PACKAGE);
                // Find all global packages under LF_PACKAGES, if set
                this.findGlobalPackages();
                // Find README.md files in the same directory trees
                this.findReadmeFiles();
            });
        }
        this._onDidChangeTreeData.fire(undefined);
    }

    /**
     * Finds README.md files under the same roots as source files and packages and adds them to the tree.
     * Package searches are limited to the package root and `src/` (not generated dirs like `src-gen`).
     * Also includes a README.md at the workspace/project root.
     */
    findReadmeFiles(): void {
        // Project-root README (e.g. ./README.md)
        this.findReadmes('README.md', this.exclude_private, LFDataProviderNodeType.SOURCE);
        this.findReadmes('src/**/README.md', this.exclude_path_src, LFDataProviderNodeType.SOURCE);
        this.findReadmes('src/lib/**/README.md', `{${this.exclude_path_local},${this.exclude_path_readme}}`, LFDataProviderNodeType.LOCAL);
        // Package root README plus any under the package's src/ tree.
        this.findReadmes('build/lfc_include/*/README.md', this.exclude_private, LFDataProviderNodeType.LIBRARY);
        this.findReadmes('build/lfc_include/*/src/**/README.md', this.exclude_path_readme, LFDataProviderNodeType.LIBRARY);
        this.findReadmes('lf-packages/*/README.md', this.exclude_private, LFDataProviderNodeType.LOCAL_PACKAGE);
        this.findReadmes('lf-packages/*/src/**/README.md', this.exclude_path_readme, LFDataProviderNodeType.LOCAL_PACKAGE);

        const lfPackages = process.env.LF_PACKAGES;
        if (!lfPackages) {
            return;
        }
        try {
            if (!fs.existsSync(lfPackages) || !fs.statSync(lfPackages).isDirectory()) {
                return;
            }
        } catch {
            return;
        }
        const base = vscode.Uri.file(lfPackages);
        vscode.workspace.findFiles(
            new vscode.RelativePattern(base, '*/README.md'),
            this.exclude_private
        ).then(uris => {
            uris.forEach(uri => this.addReadmeItem(uri, LFDataProviderNodeType.GLOBAL_PACKAGE));
        });
        vscode.workspace.findFiles(
            new vscode.RelativePattern(base, '*/src/**/README.md'),
            this.exclude_path_readme
        ).then(uris => {
            uris.forEach(uri => this.addReadmeItem(uri, LFDataProviderNodeType.GLOBAL_PACKAGE));
        });
    }

    /**
     * Returns true if the URI is under a directory named `private`.
     */
    isUnderPrivateDirectory(uri: vscode.Uri | string): boolean {
        const normalized = (typeof uri === 'string'
            ? (uri.startsWith('file:') ? vscode.Uri.parse(uri).fsPath : uri)
            : uri.fsPath).replace(/\\/g, '/');
        return /(^|\/)private(\/|$)/.test(normalized);
    }

    /**
     * Returns true if the URI is a README.md located at a workspace folder root.
     */
    isProjectRootReadme(uri: vscode.Uri): boolean {
        if (path.basename(uri.fsPath).toLowerCase() !== 'readme.md') {
            return false;
        }
        const dir = path.dirname(uri.fsPath);
        return (vscode.workspace.workspaceFolders ?? []).some(
            folder => folder.uri.fsPath.replace(/[/\\]+$/, '') === dir.replace(/[/\\]+$/, ''));
    }

    /**
     * Finds README.md files matching a glob and adds them under the given category type.
     */
    findReadmes(
        searchPath: string | vscode.GlobPattern,
        excludePath: vscode.GlobPattern | null,
        type: LFDataProviderNodeType
    ): void {
        vscode.workspace.findFiles(searchPath, excludePath).then(uris => {
            if (!vscode.workspace.workspaceFolders?.[0]) {
                return;
            }
            let filteredUris = uris.filter(file => !this.isUnderPrivateDirectory(file));
            if (type === LFDataProviderNodeType.SOURCE) {
                filteredUris = filteredUris.filter(file => {
                    // Project-root README is handled separately and should not be filtered out.
                    if (this.isProjectRootReadme(file)) {
                        return true;
                    }
                    const relativePath = vscode.workspace.asRelativePath(file, false);
                    const srcCount = (relativePath.match(/\/src\//g) || []).length;
                    return srcCount === 0;
                });
            }
            filteredUris.forEach(uri => this.addReadmeItem(uri, type));
        });
    }

    /**
     * Adds a README.md file node to the appropriate place in the tree hierarchy.
     */
    addReadmeItem(uri: vscode.Uri, type: LFDataProviderNodeType): void {
        if (this.isUnderPrivateDirectory(uri)) {
            return;
        }
        // Skip generated/non-source README files (e.g. under src-gen) that may still match a glob.
        const normalized = uri.fsPath.replace(/\\/g, '/');
        if (/(^|\/)(src-gen|fed-gen|include|bin|node_modules)(\/|$)/.test(normalized)) {
            return;
        }

        const node = new LFDataProviderNode(
            path.basename(uri.fsPath),
            uri.toString(),
            LFDataProviderNodeRole.README,
            type,
            []
        );

        // Place workspace-root README.md directly under the project node.
        if (this.isProjectRootReadme(uri)) {
            const dir = path.dirname(uri.fsPath).replace(/[/\\]+$/, '');
            let projectRoot = this.data.find(item =>
                item.role === LFDataProviderNodeRole.PROJECT
                && item.uri.fsPath.replace(/[/\\]+$/, '') === dir);
            if (!projectRoot) {
                projectRoot = this.ensureWorkspaceProjectRoots().find(item =>
                    item.uri.fsPath.replace(/[/\\]+$/, '') === dir);
            }
            if (projectRoot
                && !projectRoot.children?.some(n => n.role === LFDataProviderNodeRole.README
                    && n.uri.toString() === node.uri.toString())) {
                projectRoot.addChild(node);
            }
            this.sortData();
            return;
        }

        if (type === LFDataProviderNodeType.GLOBAL_PACKAGE) {
            this.handleGlobalReadmeNode(node, uri);
            this.sortData();
            return;
        }

        const root = this.buildRoot(uri.toString(), type);
        switch (type) {
            case LFDataProviderNodeType.LIBRARY: {
                const libraryRoot = this.buildLibraryRoot(uri.toString(), root, node);
                const parent = this.parentForPackageReadme(libraryRoot, uri.toString(), type);
                if (!parent.children?.some(n => n.role === LFDataProviderNodeRole.README
                    && n.uri.toString() === node.uri.toString())) {
                    parent.addChild(node);
                }
                break;
            }
            case LFDataProviderNodeType.LOCAL: {
                const localNode = this.findOrCreateSubNode(
                    root, "Local Libraries", LFDataProviderNodeRole.SUB, LFDataProviderNodeType.LOCAL, node);
                const parent = this.ensurePackageLibPath(localNode, uri.toString(), type);
                if (!parent.children?.some(n => n.role === LFDataProviderNodeRole.README
                    && n.uri.toString() === node.uri.toString())) {
                    parent.addChild(node);
                }
                break;
            }
            case LFDataProviderNodeType.LOCAL_PACKAGE: {
                const localPackages = this.findOrCreateSubNode(
                    root, "Local Packages", LFDataProviderNodeRole.SUB, LFDataProviderNodeType.LOCAL_PACKAGE, node);
                const packageRoot = this.buildLocalPackageRoot(uri.toString(), localPackages);
                const parent = this.parentForPackageReadme(packageRoot, uri.toString(), type);
                if (!parent.children?.some(n => n.role === LFDataProviderNodeRole.README
                    && n.uri.toString() === node.uri.toString())) {
                    parent.addChild(node);
                }
                break;
            }
            case LFDataProviderNodeType.SOURCE: {
                const srcNode = this.findOrCreateSubNode(
                    root, "Source Files", LFDataProviderNodeRole.SUB, LFDataProviderNodeType.SOURCE, node);
                const parent = this.ensureSourceFilePath(srcNode, uri.toString());
                if (!parent.children?.some(n => n.role === LFDataProviderNodeRole.README
                    && n.uri.toString() === node.uri.toString())) {
                    parent.addChild(node);
                }
                break;
            }
        }
        this.sortData();
    }

    /**
     * Places a README under a package root, or under `src/lib` subdirectories when present.
     */
    parentForPackageReadme(
        packageRoot: LFDataProviderNode,
        uri: string,
        type: LFDataProviderNodeType
    ): LFDataProviderNode {
        const filePath = (uri.startsWith('file:') ? vscode.Uri.parse(uri).fsPath : uri)
            .replace(/\\/g, '/');
        if (filePath.includes('/src/lib/') || filePath.endsWith('/src/lib/README.md')) {
            return this.ensurePackageLibPath(packageRoot, uri, type);
        }
        return packageRoot;
    }

    /**
     * Handles adding a README under Global Packages for each workspace project.
     */
    handleGlobalReadmeNode(node: LFDataProviderNode, uri: vscode.Uri): void {
        const lfPackages = process.env.LF_PACKAGES;
        if (!lfPackages) {
            return;
        }
        const roots = this.ensureWorkspaceProjectRoots();
        roots.forEach((root, index) => {
            const globalPackages = this.findOrCreateSubNode(
                root, "Global Packages", LFDataProviderNodeRole.SUB,
                LFDataProviderNodeType.GLOBAL_PACKAGE, node);
            const packageRoot = this.buildExternalPackageRoot(
                uri.toString(), globalPackages, lfPackages, LFDataProviderNodeType.GLOBAL_PACKAGE);
            const parent = this.parentForPackageReadme(
                packageRoot, uri.toString(), LFDataProviderNodeType.GLOBAL_PACKAGE);
            const readmeNode = index === 0
                ? node
                : new LFDataProviderNode(
                    node.label!.toString(), node.uri.toString(),
                    LFDataProviderNodeRole.README, LFDataProviderNodeType.GLOBAL_PACKAGE, []);
            if (!parent.children?.some(n => n.role === LFDataProviderNodeRole.README
                && n.uri.toString() === readmeNode.uri.toString())) {
                parent.addChild(readmeNode);
            }
        });
    }

    /**
     * Finds files matching the provided search path and excludes files matching the exclude path. Processes the found files and adds them to the LFDataProvider tree.
     *
     * @param searchPath - The search path pattern to use for finding files.
     * @param excludePath - The exclude path pattern to use for filtering out files.
     * @param type - The type of the node (e.g., LOCAL, LIBRARY, SOURCE).
     */
    findFiles(
        searchPath: string | vscode.GlobPattern,
        excludePath: vscode.GlobPattern | null,
        type: LFDataProviderNodeType
    ): void {
        vscode.workspace.findFiles(searchPath, excludePath).then(uris => {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];

            if (!workspaceFolder) {
                vscode.window.showErrorMessage('No workspace folder is open.');
                return;
            }

            // Process each URI found and get relative path
            let filteredUris = uris.filter(file => !this.isUnderPrivateDirectory(file));
            if (type === LFDataProviderNodeType.SOURCE) {
                filteredUris = filteredUris.filter(file => {
                    const relativePath = vscode.workspace.asRelativePath(file, false);
                    // Count occurrences of nested '/src/'
                    const srcCount = (relativePath.match(/\/src\//g) || []).length;
                    // Exclude paths with more than one 'src'
                    return srcCount == 0;
                });
            }

            // Process each URI found
            filteredUris.forEach(uri => {
                this.client.sendRequest('generator/getLibraryReactors', uri.toString()).then(node => {
                    if (node) {
                        this.addDataItem(node as LFDataProviderNode, type);
                    } else {
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
        if (this.isUnderPrivateDirectory(dataNode.uri.toString())) {
            return;
        }

        const node = this.createNode(dataNode, type, LFDataProviderNodeRole.FILE);

        // Add child nodes if applicable
        this.addChildNodes(dataNode, node, type);

        if (type === LFDataProviderNodeType.GLOBAL_PACKAGE) {
            this.handleGlobalPackageNode(node, dataNode);
            this.sortData();
            return;
        }

        const root = this.buildRoot(dataNode.uri.toString(), type);

        switch (type) {
            case LFDataProviderNodeType.LIBRARY:
                this.handleLibraryNode(root, node, dataNode);
                break;
            case LFDataProviderNodeType.LOCAL:
                this.handleLocalNode(root, node, dataNode);
                break;
            case LFDataProviderNodeType.LOCAL_PACKAGE:
                this.handleLocalPackageNode(root, node, dataNode);
                break;
            case LFDataProviderNodeType.SOURCE:
                this.handleSourceNode(root, node, dataNode);
                break;
        }

        // Sort data after adding the new node
        this.sortData();
    }

    /**
     * Finds library files under the directory pointed to by the `LF_PACKAGES` environment variable
     * and adds them under the "Global Packages" category. The category is created whenever
     * `LF_PACKAGES` is set and refers to an existing directory.
     */
    findGlobalPackages(): void {
        const lfPackages = process.env.LF_PACKAGES;
        if (!lfPackages) {
            return;
        }
        try {
            if (!fs.existsSync(lfPackages) || !fs.statSync(lfPackages).isDirectory()) {
                return;
            }
        } catch {
            return;
        }

        // Ensure the category is visible even before any package files are discovered.
        this.ensureGlobalLibrariesCategory(lfPackages);

        const pattern = new vscode.RelativePattern(
            vscode.Uri.file(lfPackages), '**/src/lib/**/*.{lf,ulf}');
        vscode.workspace.findFiles(pattern, this.exclude_private).then(uris => {
            uris.filter(uri => !this.isUnderPrivateDirectory(uri)).forEach(uri => {
                this.client.sendRequest('generator/getLibraryReactors', uri.toString()).then(node => {
                    if (node) {
                        this.addDataItem(node as LFDataProviderNode, LFDataProviderNodeType.GLOBAL_PACKAGE);
                    } else {
                        vscode.window.showErrorMessage('Error retrieving data from the Language Server');
                    }
                });
            });
        });
    }

    /**
     * Ensures each workspace project has a "Global Packages" category node.
     * @param lfPackagesPath - Absolute path from the `LF_PACKAGES` environment variable.
     */
    ensureGlobalLibrariesCategory(lfPackagesPath: string): void {
        const placeholder = new LFDataProviderNode(
            "Global Packages",
            vscode.Uri.file(lfPackagesPath).toString(),
            LFDataProviderNodeRole.SUB,
            LFDataProviderNodeType.GLOBAL_PACKAGE,
            []
        );
        for (const root of this.ensureWorkspaceProjectRoots()) {
            this.findOrCreateSubNode(
                root, "Global Packages", LFDataProviderNodeRole.SUB,
                LFDataProviderNodeType.GLOBAL_PACKAGE, placeholder);
        }
        this.sortData();
    }

    /**
     * Ensures a project root node exists for each workspace folder.
     * @returns The project root nodes corresponding to open workspace folders.
     */
    ensureWorkspaceProjectRoots(): LFDataProviderNode[] {
        return (vscode.workspace.workspaceFolders ?? []).map(folder => {
            const folderPath = folder.uri.fsPath.replace(/[/\\]+$/, '');
            const existing = this.data.find(item =>
                item.role === LFDataProviderNodeRole.PROJECT
                && item.uri.fsPath.replace(/[/\\]+$/, '') === folderPath);
            if (existing) {
                return existing;
            }
            const root = new LFDataProviderNode(
                path.basename(folderPath),
                folder.uri.toString(),
                LFDataProviderNodeRole.PROJECT,
                LFDataProviderNodeType.SOURCE,
                []
            );
            this.data.push(root);
            return root;
        });
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
                node.addChild(this.createNode(child, type, LFDataProviderNodeRole.REACTOR));
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
        if (!libraryRoot.children?.some(n => n.label === node.label && n.uri.toString() === node.uri.toString())) {
            libraryRoot.addChild(node);
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
        if (!localNode.children?.some(n => n.label === node.label))
            localNode.addChild(node);
    }

    /**
     * Handles the addition of a LOCAL_PACKAGE type node under "Local Packages".
     * Builds a hierarchy of package → optional subpackages → file → reactors.
     * @param root - The project root node of the tree.
     * @param node - The file node to add to the tree.
     * @param dataNode - The data node being added.
     */
    handleLocalPackageNode(root: LFDataProviderNode, node: LFDataProviderNode, dataNode: LFDataProviderNode) {
        const localPackages = this.findOrCreateSubNode(
            root, "Local Packages", LFDataProviderNodeRole.SUB, LFDataProviderNodeType.LOCAL_PACKAGE, dataNode);
        const packageRoot = this.buildLocalPackageRoot(dataNode.uri.toString(), localPackages);
        const parent = this.ensurePackageLibPath(
            packageRoot, dataNode.uri.toString(), LFDataProviderNodeType.LOCAL_PACKAGE);
        if (!parent.children?.some(n => n.label === node.label && n.uri.toString() === node.uri.toString())) {
            parent.addChild(node);
        }
    }

    /**
     * Handles the addition of a GLOBAL_PACKAGE type node under "Global Packages".
     * Attaches the package hierarchy to each workspace project root.
     * @param node - The file node to add to the tree.
     * @param dataNode - The data node being added.
     */
    handleGlobalPackageNode(node: LFDataProviderNode, dataNode: LFDataProviderNode) {
        const lfPackages = process.env.LF_PACKAGES;
        if (!lfPackages) {
            return;
        }

        const roots = this.ensureWorkspaceProjectRoots();
        roots.forEach((root, index) => {
            const globalLibraries = this.findOrCreateSubNode(
                root, "Global Packages", LFDataProviderNodeRole.SUB,
                LFDataProviderNodeType.GLOBAL_PACKAGE, dataNode);
            const packageRoot = this.buildExternalPackageRoot(
                dataNode.uri.toString(), globalLibraries, lfPackages, LFDataProviderNodeType.GLOBAL_PACKAGE);
            const parent = this.ensurePackageLibPath(
                packageRoot, dataNode.uri.toString(), LFDataProviderNodeType.GLOBAL_PACKAGE);

            // Reuse the created node for the first project; clone for additional roots.
            const fileNode = index === 0
                ? node
                : (() => {
                    const clone = this.createNode(dataNode, LFDataProviderNodeType.GLOBAL_PACKAGE, LFDataProviderNodeRole.FILE);
                    this.addChildNodes(dataNode, clone, LFDataProviderNodeType.GLOBAL_PACKAGE);
                    return clone;
                })();

            if (!parent.children?.some(n => n.label === fileNode.label && n.uri.toString() === fileNode.uri.toString())) {
                parent.addChild(fileNode);
            }
        });
    }

    /**
     * Handles the addition of a SOURCE type node under "Source Files".
     * Builds a hierarchy of directories under `src` → file.
     * @param root - The root node of the tree.
     * @param node - The node to add to the tree.
     * @param dataNode - The data node being added.
     */
    handleSourceNode(root: LFDataProviderNode, node: LFDataProviderNode, dataNode: LFDataProviderNode) {
        const srcNode = this.findOrCreateSubNode(
            root, "Source Files", LFDataProviderNodeRole.SUB, LFDataProviderNodeType.SOURCE, dataNode);
        const parent = this.ensureSourceFilePath(srcNode, dataNode.uri.toString());
        if (!parent.children?.some(n => n.label === node.label && n.uri.toString() === node.uri.toString())) {
            parent.addChild(node);
        }
    }

    /**
     * Ensures intermediate directory nodes exist under "Source Files" for path segments
     * between `src` and the source file.
     * @param sourceFilesRoot - The "Source Files" category node.
     * @param uri - The URI of the source file.
     * @returns The parent node under which the file node should be attached.
     */
    ensureSourceFilePath(sourceFilesRoot: LFDataProviderNode, uri: string): LFDataProviderNode {
        const filePath = (uri.startsWith('file:') ? vscode.Uri.parse(uri).fsPath : uri)
            .replace(/\\/g, '/');
        const segments = filePath.split('/');
        const srcIdx = segments.lastIndexOf('src');
        if (srcIdx === -1) {
            return sourceFilesRoot;
        }

        // Directory segments under src, excluding the file name
        let current = sourceFilesRoot;
        for (let i = srcIdx + 1; i < segments.length - 1; i++) {
            const segment = segments[i];
            let child = current.children?.find(
                n => n.label === segment && n.role === LFDataProviderNodeRole.ROOT);
            if (!child) {
                const segmentUri = vscode.Uri.file(
                    segments.slice(0, i + 1).join('/')
                ).toString() + '/';
                child = new LFDataProviderNode(
                    segment, segmentUri, LFDataProviderNodeRole.ROOT, LFDataProviderNodeType.SOURCE, []);
                current.addChild(child);
            }
            current = child;
        }
        return current;
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
            root.addChild(subNode);
        }

        return subNode;
    }

    /**
     * Display order for top-level categories under a project root.
     */
    private static readonly CATEGORY_ORDER: string[] = [
        "Global Packages",
        "Local Packages",
        "Lingo Packages",
        "Local Libraries",
        "Source Files",
    ];

    /**
     * Sorts the data nodes in the LFDataProvider tree and fires a change event.
     * Project roots are sorted alphabetically; category nodes use a fixed order;
     * other nodes are sorted alphabetically by label.
     */
    sortData() {
        this.data.sort((a: LFDataProviderNode, b: LFDataProviderNode) => {
            return this.compareLabels(a, b);
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
            if (node.role === LFDataProviderNodeRole.PROJECT) {
                node.children!.sort((a, b) => this.compareCategoryNodes(a, b));
            } else {
                node.children!.sort((a, b) => this.compareLabels(a, b));
            }
            node.children!.forEach(n => this.sortNodes(n));
        }
    }

    /**
     * Compares two top-level category nodes using {@link CATEGORY_ORDER}.
     */
    compareCategoryNodes(a: LFDataProviderNode, b: LFDataProviderNode): number {
        // Project-root README.md appears above the category folders.
        const rankOf = (node: LFDataProviderNode): number => {
            if (node.role === LFDataProviderNodeRole.README) {
                return -1;
            }
            const order = LFDataProvider.CATEGORY_ORDER.indexOf(
                typeof node.label === 'string' ? node.label : '');
            return order === -1 ? LFDataProvider.CATEGORY_ORDER.length : order;
        };
        const rankA = rankOf(a);
        const rankB = rankOf(b);
        if (rankA !== rankB) {
            return rankA - rankB;
        }
        return this.compareLabels(a, b);
    }

    /**
     * Compares two nodes alphabetically by label (falling back to the URI basename).
     */
    compareLabels(a: LFDataProviderNode, b: LFDataProviderNode): number {
        // Keep README.md at the top within each directory listing.
        const aReadme = a.role === LFDataProviderNodeRole.README;
        const bReadme = b.role === LFDataProviderNodeRole.README;
        if (aReadme !== bReadme) {
            return aReadme ? -1 : 1;
        }
        const labelA = typeof a.label === 'string'
            ? a.label
            : path.basename(a.uri.fsPath);
        const labelB = typeof b.label === 'string'
            ? b.label
            : path.basename(b.uri.fsPath);
        return labelA.localeCompare(labelB);
    }

    /**
     * Builds the root node of the LFDataProviderNode tree based on the provided URI.
     * @param uri The URI of the project to build the root node for.
     * @returns The root `LFDataProviderNode` for the project.
     */
    buildRoot(uri: string, type: LFDataProviderNodeType | null): LFDataProviderNode {
        const splittedUri = uri.split('/');
        let markerIdx: number;
        if (!type || type === LFDataProviderNodeType.LIBRARY) {
            markerIdx = splittedUri.lastIndexOf('build');
        } else if (type === LFDataProviderNodeType.LOCAL_PACKAGE) {
            markerIdx = splittedUri.lastIndexOf('lf-packages');
        } else {
            markerIdx = splittedUri.lastIndexOf('src');
        }
        const projectLabel = markerIdx === -1 ? "Unknown" : splittedUri[markerIdx - 1];

        const existingProject = this.data.find(item => item.label === projectLabel);
        if (!existingProject) {
            const projectUri = markerIdx === -1
                ? uri
                : splittedUri.slice(0, markerIdx).join('/') + '/';
            const root = new LFDataProviderNode(projectLabel, projectUri, LFDataProviderNodeRole.PROJECT, type!, []);
            this.data.push(root);
            return root;
        }
        return existingProject;
    }

    /**
     * Builds or retrieves the root node for a Lingo-installed package based on the URI.
     * @param uri - The URI of the data node.
     * @param root - The root node of the tree.
     * @returns The root node for the library project.
     */
    buildLibraryRoot(uri: string, root: LFDataProviderNode, dataNode: LFDataProviderNode): LFDataProviderNode {
        const splittedUri = uri.replace(/\\/g, '/').split('/');
        const srcIdx = splittedUri.lastIndexOf('src');
        const lfcIdx = splittedUri.lastIndexOf('lfc_include');

        let projectLabel: string;
        let projectUri: string;
        // Prefer the package directory that owns `src/` when present; otherwise use the
        // directory directly under `lfc_include` (e.g. package-root README.md).
        if (srcIdx !== -1 && (lfcIdx === -1 || srcIdx > lfcIdx)) {
            projectLabel = splittedUri[srcIdx - 1];
            projectUri = splittedUri.slice(0, srcIdx).join('/') + '/';
        } else if (lfcIdx !== -1 && lfcIdx + 1 < splittedUri.length) {
            projectLabel = splittedUri[lfcIdx + 1];
            projectUri = splittedUri.slice(0, lfcIdx + 2).join('/') + '/';
        } else {
            projectLabel = path.basename(uri);
            projectUri = uri;
        }

        let lingo = this.findOrCreateSubNode(root, "Lingo Packages", LFDataProviderNodeRole.SUB, LFDataProviderNodeType.LIBRARY, dataNode);
        const existingProject = lingo.children!.find(item => item.label === projectLabel);
        if (!existingProject) {
            const pkgRoot = new LFDataProviderNode(projectLabel, projectUri, LFDataProviderNodeRole.ROOT, LFDataProviderNodeType.LIBRARY, []);
            lingo.addChild(pkgRoot);
            return pkgRoot;
        }
        return existingProject;
    }

    /**
     * Builds or retrieves the package node under "Local Packages" for a file in `lf-packages`.
     * @param uri - The URI of the data node.
     * @param localPackages - The "Local Packages" category node.
     * @returns The package root node.
     */
    buildLocalPackageRoot(uri: string, localPackages: LFDataProviderNode): LFDataProviderNode {
        const splittedUri = uri.replace(/\\/g, '/').split('/');
        const lfPackagesIdx = splittedUri.lastIndexOf('lf-packages');
        if (lfPackagesIdx === -1 || lfPackagesIdx + 1 >= splittedUri.length) {
            return localPackages;
        }
        const packageLabel = splittedUri[lfPackagesIdx + 1];
        const existingPackage = localPackages.children!.find(item => item.label === packageLabel);
        if (!existingPackage) {
            const packageUri = splittedUri.slice(0, lfPackagesIdx + 2).join('/') + '/';
            const pkgRoot = new LFDataProviderNode(
                packageLabel, packageUri, LFDataProviderNodeRole.ROOT, LFDataProviderNodeType.LOCAL_PACKAGE, []);
            localPackages.addChild(pkgRoot);
            return pkgRoot;
        }
        return existingPackage;
    }

    /**
     * Builds or retrieves a package node under a category for packages rooted at an absolute directory
     * (used for `LF_PACKAGES` / Global Packages).
     * @param uri - The URI of the library file.
     * @param categoryNode - The category node (e.g. "Global Packages").
     * @param packagesRootPath - Absolute filesystem path of the packages root directory.
     * @param type - The node type for created package nodes.
     * @returns The package root node.
     */
    buildExternalPackageRoot(
        uri: string,
        categoryNode: LFDataProviderNode,
        packagesRootPath: string,
        type: LFDataProviderNodeType
    ): LFDataProviderNode {
        const filePath = uri.startsWith('file:')
            ? vscode.Uri.parse(uri).fsPath
            : uri;
        const relative = path.relative(packagesRootPath, filePath);
        if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
            return categoryNode;
        }
        const packageLabel = relative.split(path.sep)[0];
        const existingPackage = categoryNode.children!.find(item => item.label === packageLabel);
        if (!existingPackage) {
            const packageUri = vscode.Uri.file(path.join(packagesRootPath, packageLabel)).toString() + '/';
            const pkgRoot = new LFDataProviderNode(
                packageLabel, packageUri, LFDataProviderNodeRole.ROOT, type, []);
            categoryNode.addChild(pkgRoot);
            return pkgRoot;
        }
        return existingPackage;
    }

    /**
     * Ensures intermediate subpackage directory nodes exist under a package for the path
     * segments between `src/lib` and the library file.
     * @param packageRoot - The package root node.
     * @param uri - The URI of the library file.
     * @param type - The node type for created subpackage nodes.
     * @returns The parent node under which the file node should be attached.
     */
    ensurePackageLibPath(
        packageRoot: LFDataProviderNode,
        uri: string,
        type: LFDataProviderNodeType
    ): LFDataProviderNode {
        const filePath = (uri.startsWith('file:') ? vscode.Uri.parse(uri).fsPath : uri)
            .replace(/\\/g, '/');
        const splittedUri = filePath.split('/');
        let libIdx = -1;
        for (let i = 0; i < splittedUri.length - 1; i++) {
            if (splittedUri[i] === 'src' && splittedUri[i + 1] === 'lib') {
                libIdx = i + 1;
                break;
            }
        }
        if (libIdx === -1) {
            return packageRoot;
        }

        // Directory segments under src/lib, excluding the file name
        let current = packageRoot;
        for (let i = libIdx + 1; i < splittedUri.length - 1; i++) {
            const segment = splittedUri[i];
            let child = current.children?.find(
                n => n.label === segment && n.role === LFDataProviderNodeRole.ROOT);
            if (!child) {
                const segmentUri = vscode.Uri.file(
                    splittedUri.slice(0, i + 1).join('/')
                ).toString() + '/';
                child = new LFDataProviderNode(
                    segment, segmentUri, LFDataProviderNodeRole.ROOT, type, []);
                current.addChild(child);
            }
            current = child;
        }
        return current;
    }

    /**
     * Opens the file associated with the node in the Tree View.
     * @param node - The node whose file is to be opened.
     * @param beside - Whether to open the file beside the current editor.
     */
    goToFileCommand(node: LFDataProviderNode, beside: boolean) {
        if (node.role === LFDataProviderNodeRole.README) {
            const command = beside ? 'markdown.showPreviewToSide' : 'markdown.showPreview';
            vscode.commands.executeCommand(command, node.uri);
            return;
        }
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
    async importReactorCommand(node: LFDataProviderNode, editor: vscode.TextEditor): Promise<void> {
        if (!editor.document.uri.path.endsWith('.lf') && !editor.document.uri.path.endsWith('.ulf')) {
            vscode.window.showErrorMessage('The active editor must be a Lingua Franca program.');
            return;
        }
        const relativePath = this.getRelativePath(editor.document.uri.path, node.uri.path);
        const importText = `import ${node.label!.toString()} from "${relativePath}"\n`;
        const position = await this.getTargetPosition(editor.document.uri);
        this.addTextOnActiveEditor(editor, position!.end, importText);
    }

    /**
     * Imports the reactor downloaded via `Lingo`, associated with the selected LFDataProviderNode into the active 
     * Lingua Franca program.
     *
     * @param node - The node representing the reactor to import.
     * @returns A Promise that resolves when the import text has been added to the active editor and the document saved.
     */
    async importLibraryReactorCommand(node: LFDataProviderNode, editor: vscode.TextEditor): Promise<void> {
        if (!editor.document.uri.fsPath.endsWith('.lf') && !editor.document.uri.fsPath.endsWith('.ulf')) {
            vscode.window.showErrorMessage('The active editor must be a Lingua Franca program.');
            return;
        }
        const relativePath = this.getLibraryPath(node.uri.path);
        const importText = `import ${node.label!.toString()} from <${relativePath}>\n`;
        const position = await this.getTargetPosition(editor.document.uri);
        this.addTextOnActiveEditor(editor, position!.end, importText);
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
        return path.relative(path.dirname(source), target).replace(/\\/g, '/');
    }

    /**
     * Gets the path to a library file from the provided path.
     * 
     * @param uri - The path to the library file.
     * @returns The path to the library file, or an empty string if the path is invalid.
     */
    getLibraryPath(uri: string) {
        const segments = uri.replace(/\\/g, '/').split('/');
        const srcIndex = segments.lastIndexOf('src');

        // Check if the 'src' directory was found and there's at least one segment before it
        if (srcIndex === -1 || srcIndex === 0) {
            vscode.window.showErrorMessage('Invalid path or src directory not found');
            return '';
        }

        // The package name is the segment before 'src'
        const libraryName = segments[srcIndex - 1];
        // Preserve subdirectory segments under src/lib (e.g. package/subdir/File.lf)
        if (segments[srcIndex + 1] === 'lib') {
            const relativeUnderLib = segments.slice(srcIndex + 2).join('/');
            return `${libraryName}/${relativeUnderLib}`;
        }

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
     * @returns A Promise that resolves to the `NodePosition` for the target, or `undefined` if the target position could not be determined.
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
     * Opens the `Lingo.toml` file associated with the given LFDataProviderNode.
     *
     * @param node - The LFDataProviderNode for which to open the Lingo.toml file.
     */
    goToLingoTomlCommand(node: LFDataProviderNode) {
        const segments = node.uri.path.split('/');
        const srcIdx = segments.lastIndexOf('build');
    
        if (srcIdx === -1) {
            vscode.window.showErrorMessage('Invalid URI: "build" directory not found.');
            return;
        }
    
        let newUri = segments.slice(0, srcIdx).join(path.sep).concat(`${path.sep}Lingo.toml`);
        
        vscode.workspace.openTextDocument(vscode.Uri.file(newUri))
            .then(doc => {
                vscode.window.showTextDocument(doc);
            }, (error: Error) => {
                vscode.window.showErrorMessage(`Failed to open Lingo.toml: ${error.message}`);
            });
    }

}
