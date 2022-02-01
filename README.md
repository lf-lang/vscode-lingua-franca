# Lingua Franca support for Visual Studio Code

This extension adds language support for [Lingua Franca](https://www.lf-lang.org/). It is based on a Language and Diagram Server and provides:
* find references
* folding ranges
* get workspace symbols
* hover
* [KlighD](https://github.com/kieler/KLighD)-based interactive diagrams (click on diagrams icon: ![image](https://user-images.githubusercontent.com/33707478/130875545-ad78a9b7-a07b-4eb9-be59-f6c758cc816b.png))
* syntax highlighting
* target syntax highlighting
* code validation upon edit
* target code validation upon build (error highlighting currently for C++ only)
* user-triggered build (<kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>P</kbd>, then `Build Lingua Franca`) 

## Quick Start

### Downloading from the VSCode Marketplace
 1. Install this plugin from the [the VSCode
    Marketplace](https://marketplace.visualstudio.com/items?itemName=lf-lang.vscode-lingua-franca)
    (or by entering `ext install lf-lang.vscode-lingua-franca` at the command palette
    <kbd>Ctrl</kbd> + <kbd>P</kbd>)
 2. (Skip this step if you already have Lingua Franca projects that you'd like
    to work on.) Create a new Lingua Franca project by creating a `<My Project
    Name>/src` folder and putting a file in it that has the `.lf` extension.
 3. Open a Lingua Franca project (`File > Add Folder to Workspace...`). Open the
    folder for the whole project (i.e., the folder containing the `src` folder).

### Building locally
Do `npm install` at the root of this repo. 

## Contributing
We very much appreciate contributions in the form of 
[code, tests, documentation](https://github.com/lf-lang/vscode-lingua-franca/issues), [bug reports, and feature requests](https://github.com/lf-lang/vscode-lingua-franca/issues). 
For more details see 
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
