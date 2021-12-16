# Developer Notes

## Development Build
For development purposes, it is possible to manually perform an incremental build simply by bypassing Maven and Gradle entirely and instead running the Python script `./lingua-franca/org.lflang.lds/uf.py`. This script will re-compile Java and Kotlin files and add them to the fat jar using the `jar` command with the `-uf` flag.

1. Ensure that the appropriate compiler is on your PATH.
  * To build Java files, `javac` is required.
  * To build Kotlin files, [the Kotlin JVM compiler](https://github.com/JetBrains/kotlin/releases/tag/v1.5.30) `kotlinc` is required. It must be the JVM compiler, not the native compiler.
2. Ensure that the language and diagram server fat JAR exists. This file is called `./lib/lflang-lds.jar`. If it does not exist, then it is necessary to build it using the build task: `npm install`.
3. `cd` into the `org.lflang.lds` directory and run the command: ```python3 uf.py <CANONICAL_NAME>``` where <CANONICAL_NAME> is either:
  * the canonical name of a package that you would like to update, or
  * the canonical name of the class that you would like to update. An example would be: ```python3 uf.py org.lflang.FileConfig```. This will also update any nested classes, and it should work as you would expect even for Kotlin files that do not include exactly one top-level class.
4. Open `./src/extension.ts` in Visual Studio Code.
5. Press <kbd>F5</kbd> to run the extension in a new Extension Development Host window.

