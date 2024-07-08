# Lingua Franca support for Visual Studio Code
[![CI](https://github.com/lf-lang/vscode-lingua-franca/actions/workflows/ci.yml/badge.svg)](https://github.com/lf-lang/vscode-lingua-franca/actions/workflows/ci.yml)

This extension adds language support for [Lingua Franca (LF)](https://www.lf-lang.org/). It is based on the LF Language and Diagram Server and provides:
* find references
* folding ranges
* get workspace symbols
* hover
* [KlighD](https://github.com/kieler/KLighD)-based interactive diagrams (click on diagrams icon: ![image](https://user-images.githubusercontent.com/33707478/130875545-ad78a9b7-a07b-4eb9-be59-f6c758cc816b.png))
* syntax highlighting
* target syntax highlighting
* code validation upon edit
* target code validation upon build or file save
* user-triggered build (<kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>P</kbd>, then `Lingua Franca: Build`) 
* user-triggered build and run (<kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>P</kbd>, then `Lingua Franca: Build and Run`) 
* Lingua Franca Package Explorer (click on the LF icon in the Activity Bar on the left), which features two distinct tree-view sections:
   * **Local Libraries:** This section showcases a catalog of Local Libraries, which are libraries personally defined by the programmer.
   * **Lingo Libraries:** Here, you'll find a catalog of all libraries downloaded in the personal workspace using the Lingo package manager.

## Quick Start
 1. Install this plugin from the [VSCode
    Marketplace](https://marketplace.visualstudio.com/items?itemName=lf-lang.vscode-lingua-franca)/[Open VSX Registry](https://open-vsx.org/extension/lf-lang/vscode-lingua-franca)
    (in the command palette <kbd>Ctrl</kbd> + <kbd>P</kbd>, enter `ext install lf-lang.vscode-lingua-franca`)
 2. (Skip this step if you already have Lingua Franca projects that you'd like
    to work on.) Create a new Lingua Franca project by creating a `<My Project
    Name>/src` folder and putting a file in it that has the `.lf` extension.
 3. Open a Lingua Franca project (`File > Add Folder to Workspace...`). The Explorer (upper left in sidebar) should now show your project files. Open the `.lf` file you created.
 4. (Optional) Show the diagram for this file by clicking on the diagrams icon at the upper right: ![image](https://user-images.githubusercontent.com/33707478/130875545-ad78a9b7-a07b-4eb9-be59-f6c758cc816b.png))
 5. Compile the `.lf` file and run it using (<kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>P</kbd>, then `Lingua Franca: Build and Run`).

## Requirements
This extension requires **Java 17 or up** in order to run its embedded Lingua Franca language server. You might need to install additional software to be able to build or execute target code produced by the Lingua Franca compiler. The extension reports missing dependencies upon attempting to build or run.

## Settings

Automatic code generation is enabled by default to allow target code to be validated on save. To disable automatic code generation, add the following to `.vscode/settings.json`:
```json
{
    "linguafranca.generateCodeOnSave": false
}
```

## Contributing
We very much appreciate contributions in the form of 
[code, tests, documentation](https://github.com/lf-lang/vscode-lingua-franca/pulls), [bug reports, and feature requests](https://github.com/lf-lang/vscode-lingua-franca/issues). 
For more details, see
[CONTRIBUTING.md](https://github.com/lf-lang/vscode-lingua-franca/blob/main/CONTRIBUTING.md).

### Join us!
<a href="https://github.com/lf-lang/vscode-lingua-franca/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=lf-lang/vscode-lingua-franca" />
</a>

# Configuration
## Diagrams
To enable diagram-based code navigation, go to `Settings > Extensions > KLighD
Diagram` and deactivate `Initial Should Select Diagram` and activate `Initial
Should Select Text` instead.
