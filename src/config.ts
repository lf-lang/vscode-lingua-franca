import * as path from 'path'

/**
 * Class that holds configuration settings.
 */
 export class Config {
    
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
    
}