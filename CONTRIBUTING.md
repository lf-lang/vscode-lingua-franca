# Contributing

This repo provides the [Lingua Franca](https://www.lf-lang.org/) (LF) [Visual
Studio Code](https://code.visualstudio.com/) (VSCode) extension built around the
LF Language and Diagram Server (LDS).

This file contains information for building and using the extension in a
developer setup. If you just want to use the extension, then you can download it
from the VSCode marketplace. See
[README.md](https://github.com/lf-lang/vscode-lingua-franca/) for more info.

## Getting started

To check out the repository, build from source, and install the VS Code plugin, make sure you have the following dependencies:

- `rust`. Rust versions preceding 1.76.0 are not guaranteed to work. See [this web page](https://www.rust-lang.org/tools/install) for instructions on installing Rust.
- `npm`. `npm` versions preceding 10.4.0 are not guaranteed to work. We are currently using npm v18.17.0.

Then, run the following command to install the required NPM packages:

```
git clone --recurse-submodules git@github.com:lf-lang/vscode-lingua-franca.git \
&& cd vscode-lingua-franca \
&& npm install
```

If you do not have a public key set up for authentication with GitHub, you can also use HTTPS:

```
git clone --recurse-submodules https://github.com/lf-lang/vscode-lingua-franca.git \
&& cd vscode-lingua-franca \
&& npm install
```

Install the VS Code extension by calling `npm run install-extension`.
If you want to debug the extension with the language server bundled in a jar see [here](#suggested-debugging-workflow).
If you want to debug the extension together with the language server see [below](#debugging-interactions-between-the-language-server-and-vs-code).

### Trouble Shooting

#### VS Code is not detected on Mac OS X

If you have VS Code installed, it might not get recognized if it is not on your `PATH`.
To add `code` to your `PATH` and allow our install script to find it, open the command pallete in VS Code (<kbd>ctrl</kbd>+<kbd>p</kbd>) and type `Install 'code' command in PATH`.

#### Maven uses an incompatible JDK

Maven may come with an OpenJDK, depending on how it is installed. If this JDK is not the right version, the build process will fail.
To point `mvn` to the correct JDK, set the `JAVA_HOME` environment variable accordingly. To see which version of Java is used, run `mvn --version`.

## Running the tests

To run integration tests with the assumption that the correct dependencies are installed, run:

```bash
npm run test
```

To test the Textmate syntax highlighting only, run

```bash
npm run test-syntax
```

To save the current Textmate syntax highlighting as the correct "known good" behavior, run

```bash
npm run update-known-good
```

## Adding tests

Tests are located in the `src` directory and are marked using the `.test.ts` extension. We use [Mocha](https://mochajs.org/) as our testing framework.

## Submitting a Pull Request (PR)

Please keep your PRs manageable and easy to review.

- Provide a clear title and description of the proposed changes;
- Keep the changes limited to a particular feature, fix, or enhancement;
- Mark the PR as "draft" until it is ready for review;
- Provide tests along with your code; and
- Follow the [TypeScript style
  guide](https://google.github.io/styleguide/tsguide.html) to avoid trivial
  review feedback.

## Suggested debugging workflow

For development purposes, it is possible to manually perform an incremental build simply by bypassing Maven and Gradle entirely and
instead running the Python script `./uf.py`. This script will re-compile Java and Kotlin files and add them to the fat jar using
the `jar` command with the `-uf` flag.

We suggest the following workflow for debugging the extension (implemented in TypeScript):

1. Run the command `npm run compile` to generate JavaScript together with a source map (in the `out` directory). The source map is necessary for breakpoints to work.
2. Set breakpoints in the TypeScript source files.
3. Open `./src/extension.ts` in Visual Studio Code.
4. Press <kbd>F5</kbd> to run the extension in a new Extension Development Host window.

We suggest the following workflow for debugging the language server (implemented in Java/Kotlin):

1. Ensure that the appropriate compiler is on your PATH.

- To build Java files, `javac` is required.
- To build Kotlin files, [the Kotlin JVM compiler](https://github.com/JetBrains/kotlin/releases/tag/v1.5.30) `kotlinc` is required. It must be the JVM compiler, not the native compiler.

2. Ensure that the language and diagram server fat JAR exists. This file is called `./lib/lflang-lds.jar`. If it does not exist, then it is necessary to build it using the build task: `npm run build`.
3. Run the command: `./uf.py <CANONICAL_NAME>` or `npm run amend-jar -- <CANONICAL_NAME>`, where <CANONICAL_NAME> is either:

- the canonical name of a package that you would like to update, or
- the canonical name of the class that you would like to update. An example would be: `./uf.py org.lflang.FileConfig`. This will also update any nested classes, and it should work as you would expect even for Kotlin files that do not include exactly one top-level class.

4. Open `./src/extension.ts` in Visual Studio Code.
5. Press <kbd>F5</kbd> to run the extension in a new Extension Development Host window.

## Debugging interactions between the language server and VS Code

1. Run the command `npm run compile` to generate JavaScript together with a source map (in the `out` directory). The source map is necessary for breakpoints to work. You can also use `npm run watch` if you expect to change the VS Code extension code quite often as part of your development.
2. Start the language server as detailed [here](https://www.lf-lang.org/docs/next/developer/developer-intellij-setup/#starting-and-debugging-the-language-server) with VM option `-Dport=7670` (this is the default behavior).
3. Go to the `Run and Debug` view and select the `"Launch VS Code Extension (Socket) LF` launch configuration and run it. If you need to update the launch configuration, you can find it in `.vscode/launch.config`. Here the launch configuration also defines the port the extension and the server will connect.
4. A new VS Code instance will open with the locally build Lingua Franca VS Code extension installed. Once a `.lf` files is opened, the language server will connect and you can debug normally.
5. All TypeScript files that are not directly started by the `extension.ts` everything in a webview, e.g. the diagram or other webviews cannot be debugged by setting breakpoints in the development VS Code. You have to do that in the development tools of your runtime VS Code.
