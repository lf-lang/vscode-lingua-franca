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

/** Java version required for building. */
export const javacVersion: Version = new Version('17.0.0');

/** Java version required for running the language server. */
export const javaVersion: Version = javacVersion;

/** Pylint version required for linting generated Python code. */
export const pylintVersion: Version = new Version('2.12.0');

/** The minimum Python version required for compiling LF programs with the Python target. */
export const pythonVersion: Version = new Version('3.0.0');

/** The minimum Node version required for executing LF programs with the TypeScript target. */
export const nodeVersion: Version = new Version('0.0.0');

/** The minimum NPM version required for compiling LF programs with the TypeScript target. */
export const npmVersion: Version = new Version('0.0.0');

/** The minimum PNPM version required for compiling LF programs with the TypeScript target. */
export const pnpmVersion: Version = new Version('0.0.0');

/** Name of the Language and Diagram Server jar. */
export const ldsJarName = 'lflang-lds.jar';

/** Regex for matching SWT jars and capturing their version number. */
export const swtJarRegex = /org\.eclipse\.swt\..+(?<version>\.x86.+)\.jar$/;

/** Name of the Language and Diagram Server package. */
export const pkgName = 'org.lflang.lds';

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

/** Absolute path to the directory in which to find the SWT jar files. */
export const swtJarsDirPath = path.resolve(baseDirPath,
    path.join(repoName, pkgName, 'target', 'repository', 'plugins'));

/** Absolute path to the language and diagram server jar. */
export const ldsJarFile = path.resolve(baseDirPath,
    path.join(repoName, pkgName, 'target', 'exe', ldsJarName));

/** Dictionary mapping OSes to the names of their corresponding SWT jars. */
export const swtJarsByOs = defaultDict('org.eclipse.swt.gtk.linux.jar')({
    'win32': 'org.eclipse.swt.win32.win32.jar',
    'darwin': 'org.eclipse.swt.cocoa.macosx.jar'
});

/** Dictionary mapping OSes to their corresponding classpath separators. */
export const classPathSeparatorsByOs = defaultDict(':')({
    'win32': ';',
});
