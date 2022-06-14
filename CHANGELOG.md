# Changelog
 
## [v0.2.1](https://github.com/lf-lang/vscode-lingua-franca/tree/v0.2.1) (2022-05-19)

**Highlights:**

This release includes bug fixes in the Lingua Franca compiler as well as minor enhancements of the user experience in VS Code.

[Full Changelog](https://github.com/lf-lang/vscode-lingua-franca/compare/v0.2.0...v0.2.1)

**Implemented enhancements:**

- Cmake errors need to show more details [\#42](https://github.com/lf-lang/vscode-lingua-franca/issues/42)
- Any automatic builds should be configurable [\#24](https://github.com/lf-lang/vscode-lingua-franca/issues/24)

**Merged pull requests:**

- Allow users to disable target language validation on save. [\#51](https://github.com/lf-lang/vscode-lingua-franca/pull/51) ([petervdonovan](https://github.com/petervdonovan))
- Add button to view output from build [\#47](https://github.com/lf-lang/vscode-lingua-franca/pull/47) ([petervdonovan](https://github.com/petervdonovan))
- Style updates [\#17](https://github.com/lf-lang/vscode-lingua-franca/pull/17) ([petervdonovan](https://github.com/petervdonovan))
 
## [v0.2.0](https://github.com/lf-lang/vscode-lingua-franca/tree/v0.2.0) (2022-05-02)

**Highlights:**

Upgrade to Lingua Franca v0.2.0, which runs on Java 17. Most relevant to the VS Code extension is a fix for an issue that prevented some of the diagram options from showing up in the menu.

[Full Changelog](https://github.com/lf-lang/vscode-lingua-franca/compare/v0.1.1...v0.2.0)

**Fixed bugs:**

- "Build and Run" should use full path [\#43](https://github.com/lf-lang/vscode-lingua-franca/issues/43)

**Closed issues:**

- Strange rendering artifacts in diagrams [\#31](https://github.com/lf-lang/vscode-lingua-franca/issues/31)

**Merged pull requests:**

- Make "Build and Run" action work irrespective of current working directory [\#45](https://github.com/lf-lang/vscode-lingua-franca/pull/45) ([petervdonovan](https://github.com/petervdonovan))
- Bump to Java 17 and allow building on Mac [\#44](https://github.com/lf-lang/vscode-lingua-franca/pull/44) ([lhstrh](https://github.com/lhstrh))
 
## [v0.1.1](https://github.com/lf-lang/vscode-lingua-franca/tree/v0.1.1) (2022-04-11)

**Highlights:**

Upgrade to Lingua Franca v0.1.0.

[Full Changelog](https://github.com/lf-lang/vscode-lingua-franca/compare/v0.1.0...v0.1.1)

**Closed issues:**

- Enable CI [\#4](https://github.com/lf-lang/vscode-lingua-franca/issues/4)

**Merged pull requests:**

- Update README.md [\#40](https://github.com/lf-lang/vscode-lingua-franca/pull/40) ([edwardalee](https://github.com/edwardalee))
- Submodule update [\#28](https://github.com/lf-lang/vscode-lingua-franca/pull/28) ([lhstrh](https://github.com/lhstrh))

## [v0.1.0](https://github.com/lf-lang/vscode-lingua-franca/tree/v0.1.0) (02/01/2022)

### Features
1. KLIghD Diagrams integration, allowing interactive diagrams of Lingua Franca programs.
1. Syntax highlighting for Lingua Franca and C, C++, Python, TypeScript, and Rust code blocks.
1. Semantic highlighting for Lingua Franca.
1. Syntax checking and/or linting for C++, Python, TypeScript, and Rust.
1. In-editor build command.
