# Lingua Franca support for Visual Studio Code
[![CI](https://github.com/lf-lang/vscode-lingua-franca/actions/workflows/ci.yml/badge.svg)](https://github.com/lf-lang/vscode-lingua-franca/actions/workflows/ci.yml)
[![Open VSX Downloads](https://img.shields.io/open-vsx/dt/lf-lang/vscode-lingua-franca?label=Open%20VSX%20Registry%20%E2%A4%93)](https://open-vsx.org/extension/lf-lang/vscode-lingua-franca)
[![Visual Studio Marketplace Downloads](https://img.shields.io/visual-studio-marketplace/d/lf-lang.vscode-lingua-franca?label=VS%20Marketplace%20%E2%A4%93)](https://marketplace.visualstudio.com/items?itemName=lf-lang.vscode-lingua-franca)

This extension adds language support for developing [Lingua Franca (LF)](https://www.lf-lang.org/) in [VS Code](https://code.visualstudio.com) and compatible tools such as [Cursor](https://www.cursor.com).

## Automatic Diagram Synthesis

Using [KlighD](https://github.com/kieler/KLighD), interactive diagrams are automatically generated while you edit your LF programs.  You can also manually request a diagram update by clicking on the diagram icon: ![image](https://user-images.githubusercontent.com/33707478/130875545-ad78a9b7-a07b-4eb9-be59-f6c758cc816b.png).

## Lingua Franca Package Explorer

Click on the LF icon in the Activity Bar on the left in VS Code (or in the menu in the left sidebar in Cursor) to access the Lingua Franca Package Explorer.
This will open a tree view, showing:

- *Installed Packages*—library packages installed via the [Lingo package manager](https://github.com/lf-lang/lingo/);
- *Local Libraries*—unpublished libraries located in `./src/lib` within your project; and
- *Source Files*—all `.lf` source files located in the `./src` folder or in subfolders.

## Other features
* find references to symbols
* folding ranges
* get workspace symbols
* hover
* syntax highlighting
* target syntax highlighting
* code validation upon edit
* target code validation upon build or file save
* user-triggered build (<kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>P</kbd>, then `Lingua Franca: Build`) 
* user-triggered build and run (run button or <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>P</kbd>, then `Lingua Franca: Build and Run`) 

## Quick Start
 1. Install this plugin from the [VSCode
    Marketplace](https://marketplace.visualstudio.com/items?itemName=lf-lang.vscode-lingua-franca)/[Open VSX Registry](https://open-vsx.org/extension/lf-lang/vscode-lingua-franca)
    (in the command palette <kbd>Ctrl</kbd> + <kbd>P</kbd>, enter `ext install lf-lang.vscode-lingua-franca`)
 2. (Skip this step if you already have Lingua Franca projects that you'd like
    to work on.) Create a new Lingua Franca project by creating a `<My Project
    Name>/src` folder and putting a file in it that has the `.lf` extension.
 3. Open a Lingua Franca project (`File > Add Folder to Workspace...`). The Explorer (upper left in sidebar) should now show your project files. Open the `.lf` file you created.
 4. (Optional) Show the diagram for this file by clicking on the diagrams icon at the upper right: ![image](https://user-images.githubusercontent.com/33707478/130875545-ad78a9b7-a07b-4eb9-be59-f6c758cc816b.png))
 5. Compile the `.lf` file and run it using the run button at the top or by typing (<kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>P</kbd>, then `Lingua Franca: Build and Run`).

## Requirements
This extension requires **Java 17 or up** in order to run its embedded Lingua Franca language server. You might need to install additional software to be able to build or execute target code produced by the Lingua Franca compiler. The extension reports missing dependencies upon attempting to build or run.

## Settings

To configure automatic code generation, add the following to `.vscode/settings.json` with either true or false to generate code on save:

```json
{
    "linguafranca.generateCodeOnSave": false
}
```

## For Developers and Contributors

See [Contributing](https://github.com/lf-lang/vscode-lingua-franca/blob/main/CONTRIBUTING.md) for hints on modifying this extension.
We very much appreciate contributions in the form of 
[pull requests](https://github.com/lf-lang/vscode-lingua-franca/pulls) for code, tests, and documentation, as well as [bug reports and feature requests](https://github.com/lf-lang/vscode-lingua-franca/issues). 

### Join us!
<a href="https://github.com/lf-lang/vscode-lingua-franca/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=lf-lang/vscode-lingua-franca" />
</a>

# Configuration
## Diagrams
To enable diagram-based code navigation, go to `Settings > Extensions > KLighD
Diagram` and deactivate `Initial Should Select Diagram` and activate `Initial
Should Select Text` instead.
