# Changelog
 
## [v0.8.1](https://github.com/lf-lang/vscode-lingua-franca/tree/v0.8.1) (2024-07-14)

**Highlights**

This patch release includes several minor bugfixes and enhancements, improving Docker support for the C++ target and providing a more complete implementation of watchdogs.
 
## [v0.8.0](https://github.com/lf-lang/vscode-lingua-franca/tree/v0.8.0) (2024-07-02)

**Highlights**

This release includes [Lingua Franca 0.8.0](https://github.com/lf-lang/lingua-franca/releases/tag/v0.8.0).
 
## [v0.7.3](https://github.com/lf-lang/vscode-lingua-franca/tree/v0.7.3) (2024-05-26)

**Highlights**

This release fixes an issue that rendered it unresponsive to commands.

- Proprietary extension support [\#162](https://github.com/lf-lang/vscode-lingua-franca/pull/162) (@petervdonovan)
- Handle case when wasm-pack is not installed [\#165](https://github.com/lf-lang/vscode-lingua-franca/pull/165) (@petervdonovan)

 
## [v0.7.2](https://github.com/lf-lang/vscode-lingua-franca/tree/v0.7.2) (2024-05-20)

**Highlights**

This release includes patches of the C runtime only.
 
## [v0.7.1](https://github.com/lf-lang/vscode-lingua-franca/tree/v0.7.1) (2024-05-17)

**Highlights**

This patch release includes bugfixes that address imports, tracing plugins, clock synchronization, and code generation issues.
 
## [v0.7.0](https://github.com/lf-lang/vscode-lingua-franca/tree/v0.7.0) (2024-05-01)

**Highlights**

This release includes an updated Lingua Franca compiler and updates of several tests and dependencies.

**✨ Enhancements**

- Launch configuration for the LF extension on a socket without a locally developed klighd extension [\#157](https://github.com/lf-lang/vscode-lingua-franca/pull/157) (@soerendomroes)

**🧪 Tests**

- Update lingua-franca and known-good [\#154](https://github.com/lf-lang/vscode-lingua-franca/pull/154) (@petervdonovan)

**⬆️ Updated Dependencies**

- Dependency `get-func-name` bumped to 2.0.2 [\#149](https://github.com/lf-lang/vscode-lingua-franca/pull/149) (@lhstrh)


 
## [v0.6.0](https://github.com/lf-lang/vscode-lingua-franca/tree/v0.6.0) (2024-01-26)

**Highlights**

This release features an updated compiler core but includes no major changes to the extension itself.

**⬆️ Updated Dependencies**

- Package `vsce` renamed to `@vscode/vsce` [\#141](https://github.com/lf-lang/vscode-lingua-franca/pull/141) (@lhstrh)


 
## [v0.5.1](https://github.com/lf-lang/vscode-lingua-franca/tree/v0.5.1) (2023-09-12)

**Highlights**

This release features an updated Lingua Franca compiler.

**⬆️ Updated Dependencies**

- `vsce` bumped from `2.7.0` to `2.15.0` [\#137](https://github.com/lf-lang/vscode-lingua-franca/pull/137) (@lhstrh)


 
## [v0.5.0](https://github.com/lf-lang/vscode-lingua-franca/tree/v0.5.0) (2023-09-01)

**Highlights**

This release comes with an updated Lingua Franca compiler, improved syntax highlighting, and support for nightly pre-releases.

**🚀 New Features**

- Support for "New LF file" [\#112](https://github.com/lf-lang/vscode-lingua-franca/pull/112) ([@jesslin02](https://github.com/jesslin02))
- Nightly publication of pre-release [\#130](https://github.com/lf-lang/vscode-lingua-franca/pull/130) ([@lhstrh](https://github.com/lhstrh))

**✨ Enhancements**

- Compatibility with Linguist [\#111](https://github.com/lf-lang/vscode-lingua-franca/pull/111) ([@jesslin02](https://github.com/jesslin02))
- Highlighting improvements [\#8](https://github.com/lf-lang/vscode-lingua-franca/pull/8) ([@petervdonovan](https://github.com/petervdonovan))
- Faster indexing during gradle build [\#125](https://github.com/lf-lang/vscode-lingua-franca/pull/125) ([@petervdonovan](https://github.com/petervdonovan))
- Updated message for missing dependencies [\#123](https://github.com/lf-lang/vscode-lingua-franca/pull/123) ([@petervdonovan](https://github.com/petervdonovan))

**🔧 Fixes**

- Diagram bug fixed [\#116](https://github.com/lf-lang/vscode-lingua-franca/pull/116) ([@petervdonovan](https://github.com/petervdonovan))

**🚧 Maintenance and Refactoring**

- Update according to the gradle configuration [\#120](https://github.com/lf-lang/vscode-lingua-franca/pull/120) ([@petervdonovan](https://github.com/petervdonovan))
- Added .gitattributes file to let Linguist ignore known-good HTML files [\#129](https://github.com/lf-lang/vscode-lingua-franca/pull/129) ([@lhstrh](https://github.com/lhstrh))
- Ability to create pre-release package [\#132](https://github.com/lf-lang/vscode-lingua-franca/pull/132) ([@lhstrh](https://github.com/lhstrh))

**📖 Documentation**

- Updated README [\#107](https://github.com/lf-lang/vscode-lingua-franca/pull/107) ([@petervdonovan](https://github.com/petervdonovan))
- Updated debug configuration and CONTRIBUTING.md [\#121](https://github.com/lf-lang/vscode-lingua-franca/pull/121) ([@petervdonovan](https://github.com/petervdonovan))

**🧪 Tests**

- Tests for syntax highlighting [\#105](https://github.com/lf-lang/vscode-lingua-franca/pull/105) ([@petervdonovan](https://github.com/petervdonovan))
- Dependency tests ran only if relevant files change [\#117](https://github.com/lf-lang/vscode-lingua-franca/pull/117) ([@petervdonovan](https://github.com/petervdonovan))
- Updated debug configuration and CONTRIBUTING.md [\#121](https://github.com/lf-lang/vscode-lingua-franca/pull/121) ([@petervdonovan](https://github.com/petervdonovan))

**⬆️ Updated Dependencies**

- Upgrade to `@vscode/vsce` 2.19.0 [\#114](https://github.com/lf-lang/vscode-lingua-franca/pull/114) ([@lhstrh](https://github.com/lhstrh))
- VS code engine bumped to `1.63.0` [\#128](https://github.com/lf-lang/vscode-lingua-franca/pull/128) ([@lhstrh](https://github.com/lhstrh))


 
## [v0.4.2](https://github.com/lf-lang/vscode-lingua-franca/tree/v0.4.2) (2023-03-04)

**Highlights**

This patch release provides a fix for lf-lang/lingua-franca#1619.

- No changes 
## [v0.4.1](https://github.com/lf-lang/vscode-lingua-franca/tree/v0.4.1) (2023-03-01)

**Highlights**

This patch release is to satisfy the VS Marketplace requirements for publication.

- Removal of bad links [\#98](https://github.com/lf-lang/vscode-lingua-franca/pull/98) ([lhstrh](https://github.com/lhstrh))

 
## [v0.4.0](https://github.com/lf-lang/vscode-lingua-franca/tree/v0.4.0) (2023-03-01)

**Highlights**

This release comes with an updated Lingua Franca compiler, a code formatting feature (Ctrl + Shift + I), and built-in checks for dependencies.

**🚀 New Features**

- Formatting [\#70](https://github.com/lf-lang/vscode-lingua-franca/pull/70) ([petervdonovan](https://github.com/petervdonovan))
- Support for Java versions > 17 [\#83](https://github.com/lf-lang/vscode-lingua-franca/pull/83) ([lhstrh](https://github.com/lhstrh))

**✨ Enhancements**

- Language and diagram server built using Gradle [\#85](https://github.com/lf-lang/vscode-lingua-franca/pull/85) ([a-sr](https://github.com/a-sr))
- Up-to-date types for NodeJS [\#95](https://github.com/lf-lang/vscode-lingua-franca/pull/95) ([lhstrh](https://github.com/lhstrh))

**🔧 Fixes**

- Removal of hardcoded LDS jar versions [\#87](https://github.com/lf-lang/vscode-lingua-franca/pull/87) ([petervdonovan](https://github.com/petervdonovan))
- Fix "Build and Run" command with paths that contain spaces [\#89](https://github.com/lf-lang/vscode-lingua-franca/pull/89) ([a-sr](https://github.com/a-sr))


 
## [v0.3.1](https://github.com/lingua-franca/vscode-lingua-franca/tag/v0.3.1) (2022-07-23)

**Highlights** This is a patch release to correct faulty artifacts that were released on the VS Code Marketplace/Open VSX Registry on 07-22-2022. Version 0.3.0 of the VS Code extension may experience runtime errors that are due to uncaught (and now corrected) build errors in our release workflow on GitHub Actions.

[Full Changelog](https://github.com/lf-lang/vscode-lingua-franca/compare/v0.3.0...v0.3.1)

**🔧 Fixes**

- Fix to npm `clean` script [\#74](https://github.com/lf-lang/vscode-lingua-franca/pull/74) ([lhstrh](https://github.com/lhstrh))
- Exit when unable to checkout lingua-franca and its submodules [\#75](https://github.com/lf-lang/vscode-lingua-franca/pull/75) ([lhstrh](https://github.com/lhstrh))


 
## [v0.3.0](https://github.com/lf-lang/vscode-lingua-franca/tree/v0.3.0) (2022-07-22)

**Highlights** This release builds on [Lingua Franca v0.3.0](https://github.com/lf-lang/lingua-franca/releases/tag/v0.3.0) and [KLighD 2.2.0](https://github.com/kieler/KLighD/releases/tag/release-2022-07-2.2.0). The extension is now also checks whether necessary dependencies are installed and assists users in setting up their environment.

[Full Changelog](https://github.com/lf-lang/vscode-lingua-franca/compare/v0.2.1...v0.3.0)

**✨ Enhancements**

- Syntax highlighting for modes [\#62](https://github.com/lf-lang/vscode-lingua-franca/pull/62) ([a-sr](https://github.com/a-sr))

**🔧 Fixes**

- Correction of import statement highlighting [\#66](https://github.com/lf-lang/vscode-lingua-franca/pull/66) ([petervdonovan](https://github.com/petervdonovan))

**🚧 Maintenance and Refactoring**

- Enable invocation of uf.py via npm run [\#61](https://github.com/lf-lang/vscode-lingua-franca/pull/61) ([petervdonovan](https://github.com/petervdonovan))

- Dependency checks and environment setup assistance [\#55](https://github.com/lf-lang/vscode-lingua-franca/pull/55) ([petervdonovan](https://github.com/petervdonovan))

 
## [v0.2.1](https://github.com/lf-lang/vscode-lingua-franca/tree/v0.2.1) (2022-05-19)

**Highlights**

This release includes bug fixes in the Lingua Franca compiler as well as minor enhancements of the user experience in VS Code.

[Full Changelog](https://github.com/lf-lang/vscode-lingua-franca/compare/v0.2.0...v0.2.1)

**Implemented enhancements**

- Cmake errors need to show more details [\#42](https://github.com/lf-lang/vscode-lingua-franca/issues/42)
- Any automatic builds should be configurable [\#24](https://github.com/lf-lang/vscode-lingua-franca/issues/24)

**Merged pull requests**

- Allow users to disable target language validation on save. [\#51](https://github.com/lf-lang/vscode-lingua-franca/pull/51) ([petervdonovan](https://github.com/petervdonovan))
- Add button to view output from build [\#47](https://github.com/lf-lang/vscode-lingua-franca/pull/47) ([petervdonovan](https://github.com/petervdonovan))
- Style updates [\#17](https://github.com/lf-lang/vscode-lingua-franca/pull/17) ([petervdonovan](https://github.com/petervdonovan))
 
## [v0.2.0](https://github.com/lf-lang/vscode-lingua-franca/tree/v0.2.0) (2022-05-02)

**Highlights**

Upgrade to Lingua Franca v0.2.0, which runs on Java 17. Most relevant to the VS Code extension is a fix for an issue that prevented some of the diagram options from showing up in the menu.

[Full Changelog](https://github.com/lf-lang/vscode-lingua-franca/compare/v0.1.1...v0.2.0)

**Fixed bugs**

- "Build and Run" should use full path [\#43](https://github.com/lf-lang/vscode-lingua-franca/issues/43)

**Closed issues**

- Strange rendering artifacts in diagrams [\#31](https://github.com/lf-lang/vscode-lingua-franca/issues/31)

**Merged pull requests**

- Make "Build and Run" action work irrespective of current working directory [\#45](https://github.com/lf-lang/vscode-lingua-franca/pull/45) ([petervdonovan](https://github.com/petervdonovan))
- Bump to Java 17 and allow building on Mac [\#44](https://github.com/lf-lang/vscode-lingua-franca/pull/44) ([lhstrh](https://github.com/lhstrh))
 
## [v0.1.1](https://github.com/lf-lang/vscode-lingua-franca/tree/v0.1.1) (2022-04-11)

**Highlights**

Upgrade to Lingua Franca v0.1.0.

[Full Changelog](https://github.com/lf-lang/vscode-lingua-franca/compare/v0.1.0...v0.1.1)

**Closed issues**

- Enable CI [\#4](https://github.com/lf-lang/vscode-lingua-franca/issues/4)

**Merged pull requests**

- Update README.md [\#40](https://github.com/lf-lang/vscode-lingua-franca/pull/40) ([edwardalee](https://github.com/edwardalee))
- Submodule update [\#28](https://github.com/lf-lang/vscode-lingua-franca/pull/28) ([lhstrh](https://github.com/lhstrh))

## [v0.1.0](https://github.com/lf-lang/vscode-lingua-franca/tree/v0.1.0) (02/01/2022)

### Features
1. KLIghD Diagrams integration, allowing interactive diagrams of Lingua Franca programs.
1. Syntax highlighting for Lingua Franca and C, C++, Python, TypeScript, and Rust code blocks.
1. Semantic highlighting for Lingua Franca.
1. Syntax checking and/or linting for C++, Python, TypeScript, and Rust.
1. In-editor build command.
