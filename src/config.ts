/**
 * @file File holding configuration settings.
 * @author Marten Lohstroh <marten@berkeley.edu>
 */

import * as path from 'path'
import { Version } from './version';

const defaultDict = (defaultValue: any) => (dict: Object) => new Proxy(dict, {
    get: (target: Object, name: string) => name in target ? target[name] : defaultValue
});

/** Executables that have to be on the PATH in order to build. */
export const buildDeps = ['code', 'jar', 'javac', 'mvn', 'python3'];

/** The name of the built-in terminal used to install dependencies. */
export const installDependenciesTerminalName  = 'Lingua Franca: Install dependencies';

/** Java version required for building. */
export const javacVersion: Version = new Version('17.0.0');

/** Java version required for running the language server. */
export const javaVersion: Version = javacVersion;

/** CMake version required for compiling LF programs with the C and C++ targets. */
export const cmakeVersion: Version = new Version('3.5.0');

/** Pylint version required for linting generated Python code. */
export const pylintVersion: Version = new Version('2.12.0');

/** The minimum Python version required for compiling LF programs with the Python target. */
export const pythonVersion: Version = new Version('3.0.0');

// TODO: Determine the following minimum version numbers.

/** The minimum Node version required for executing LF programs with the TypeScript target. */
export const nodeVersion: Version = new Version('0.0.0');

/** The minimum NPM version required for compiling LF programs with the TypeScript target. */
export const npmVersion: Version = new Version('0.0.0');

/** The minimum PNPM version required for compiling LF programs with the TypeScript target. */
export const pnpmVersion: Version = new Version('0.0.0');

/** The latest PNPM version known to be compatible with our toolchain. */
export const pnpmLatestKnownGoodVersion: Version = new Version('7.2.1');

/** The minimum Rust version required for compiling LF programs with the Rust target. */
export const rustVersion: Version = new Version('1.59.0');  // FIXME: Actually nightly, but this may be fixed by #1218 in lf-lang/lingua-franca.

/** The latest Rust version known to be compatible with our toolchain. */
export const rustLatestKnownGoodVersion: Version = new Version('1.61.0');

/** The minimum RTI version required for executing federated LF programs. */
export const rtiVersion: Version = new Version('0.0.0');

/** Name of the Language and Diagram Server jar. */
export const ldsJarName = 'lflang-lds.jar';

/** Name of the Lingua Franca repo. */
export const repoName = 'lingua-franca';

/** Name of the directory in which the extension locates the jars. */
export const libDirName = 'lib';

/** URL of the Lingua Franca repo. */
export const repoURL = 'https://github.com/lf-lang/lingua-franca.git';

/** Absolute path to the root directory of the vscode-lingua-franca repo. */
export const baseDirPath = path.resolve(path.dirname(require.main.filename), '..');

/** Absolute path to the directory in which to put the jar files. */
export const libDirPath = path.resolve(baseDirPath, libDirName);

/** Absolute path to the language and diagram server jar. */
export const sourceLdsJarFile = path.resolve(baseDirPath,
    path.join(repoName, 'org.lflang', 'build', 'libs', 'org.lflang-+(?).+(?).+(?)?(-SNAPSHOT)-lds.jar'));
