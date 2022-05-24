import * as path from 'path'
import { Version } from './version';

const defaultDict = (defaultValue: any) => (dict: Object) => new Proxy(dict, {
    get: (target: Object, name: string) => name in target ? target[name] : defaultValue
});

/**
 * Class that holds configuration settings.
 * @author Marten Lohstroh <marten@berkeley.edu>
 */
 export class Config {

    /**
     * Executables that have to be on the PATH in order to build.
     */
    static readonly buildDeps = ['code', 'jar', 'javac', 'mvn', 'python3']

    /**
     * Java version required for building.
     */
    static readonly javacVersion: Version = new Version("17.0.0")

    /**
     * Java version required for running the language server.
     */
    static readonly javaVersion: Version = Config.javacVersion;

    /**
     * Pylint version required for linting generated Python code.
     */
    static readonly pylintVersion: Version = new Version("2.12.0");

    /**
     * Name of the Language and Diagram Server jar.
     */
    static readonly ldsJarName = 'lflang-lds.jar'

    /**
     * Regex for matching SWT jars and capturing their version number.
     */
    static readonly swtJarRegex = /org\.eclipse\.swt\..+(?<version>\.x86.+)\.jar$/

    /**
     * Name of the Language and Diagram Server package.
     */
    static readonly pkgName = 'org.lflang.lds'

    /**
     * Name of the Lingua Franca repo.
     */
    static readonly repoName = 'lingua-franca'

    /**
     * Name of the directory in which the extension locates the jars.
     */
    static readonly libDirName = 'lib'

    /**
     * URL of the Lingua Franca repo.
     */
    static readonly repoURL = 'https://github.com/lf-lang/lingua-franca.git'

    /**
     * Absolute path to the root directory of the vscode-lingua-franca repo.
     */
    static readonly baseDirPath = path.resolve(path.dirname(require.main.filename), '..')

    /**
     * Absolute path to the directory in which to put the jar files.
     */
    static readonly libDirPath = path.resolve(Config.baseDirPath, Config.libDirName)

    /**
     * Absolute path to the directory in which to find the SWT jar files.
     */
    static readonly swtJarsDirPath = path.resolve(Config.baseDirPath, 
        path.join(Config.repoName, Config.pkgName, 'target', 'repository', 'plugins'))

    /**
     * Absolute path to the language and diagram server jar.
     */
    static readonly ldsJarFile = path.resolve(Config.baseDirPath, 
        path.join(Config.repoName, Config.pkgName, 'target', 'exe', Config.ldsJarName))

    /**
     * Dictionary mapping OSes to the names of their corresponding SWT jars.
     */
    static readonly swtJarsByOs = defaultDict('org.eclipse.swt.gtk.linux.jar')({
        'win32': 'org.eclipse.swt.win32.win32.jar',
        'darwin': 'org.eclipse.swt.cocoa.macosx.jar'
    })

    /**
     * Dictionary mapping OSes to their corresponding classpath separators.
     */
    static readonly classPathSeparatorsByOs = defaultDict(':')({
        'win32': ';',
    })
}
