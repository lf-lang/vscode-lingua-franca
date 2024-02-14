/**
 * @file Specification of user-visible behavior in response for missing dependencies.
 * @author Peter Donovan <peterdonovan@berkeley.edu>
 */

import * as config from './config';
import * as vscode from 'vscode';
import * as os from 'os';
import { getTerminal, MessageDisplayHelper } from './utils';
import { Version } from './version';
import * as versionChecker from './version_checker';

// The following are exported solely for testing purposes.
export const pylintMessage = 'Pylint is a recommended linter for Lingua Franca\'s Python target.';
export const javaMessage = `Java version ${config.javaVersion.major} is required for Lingua Franca `
    + `diagrams and code analysis.`;
export const python3Message = `Python version ${config.pythonVersion} or higher is required for `
    + `compiling LF programs with the Python target.`;
export const nodeMessage = 'Node.js is required for executing LF programs with the TypeScript '
    + 'target.';
export const rtiMessage = 'The Lingua Franca runtime infrastructure (RTI) is required for executing'
    + ' federated LF programs.';
export const pnpmMessage = 'In order to compile LF programs with the TypeScript target, it is '
    + 'necessary to install PNPM.';
export const rustMessage = 'The Rust compiler is required for compiling LF programs with the Rust '
    + 'target.';
export const cmakeMessage = `CMake version ${config.cmakeVersion} or higher is recommended for `
    + `compiling LF programs with the C or C++ target.`;
export const dockerMessage = 'Docker is required for running LF programs in a container.';

export enum Dependency { Pylint, Java, Python3, Node, Rti, Docker, Pnpm, Rust, Cmake }

const wrongVersionMessageOf = (originalMessage: string) =>
    (badResult: versionChecker.VersionCheckResult) =>
        `${originalMessage.substring(0, originalMessage.length - 1)}, but the version detected `
            + `on your system is ${badResult.version}.`;

export type UserFacingVersionChecker = (shower: MessageDisplayHelper) => () => Promise<boolean>;
type UserFacingVersionCheckerMaker = (dependency: DependencyInfo) => UserFacingVersionChecker;

type InstallCommand = {
    description: string,  // Must be a noun phrase!
    command: string
}

type DependencyInfo = {
    name: Dependency,
    checker: versionChecker.VersionChecker,
    message: (v: versionChecker.VersionCheckResult) => string | Promise<string>,
    wrongVersionMessage?: (v: versionChecker.VersionCheckResult) => string,
    requiredVersion: Version,
    installLink: string | null,
    installCommand: (v: versionChecker.VersionCheckResult) => Promise<InstallCommand> | null,
    isEssential: boolean,
    alreadyChecked?: boolean,
    satisfied?: boolean
};

type CheckSet = {
    regexp: RegExp,
    checks: DependencyInfo[]
};

export const watcherConfig: CheckSet[] = [
    {
        regexp: /./,
        checks: [
            {
                name: Dependency.Java,
                checker: versionChecker.javaVersionChecker,
                message: () => javaMessage,
                wrongVersionMessage: wrongVersionMessageOf(javaMessage),
                requiredVersion: config.javaVersion,
                installLink: `https://www.oracle.com/java/technologies/downloads/#java${config.javaVersion.major}`,
                installCommand: () => null,
                isEssential: true
            }
        ]
    },
    {
        regexp: /(?=\btarget\s+(C|Cpp|CCpp)\b)/,
        checks: [
            {
                name: Dependency.Cmake,
                checker: versionChecker.cmakeVersionChecker,
                message: () => cmakeMessage,
                wrongVersionMessage: wrongVersionMessageOf(cmakeMessage),
                requiredVersion: config.cmakeVersion,
                installLink: 'https://cmake.org/download/',
                installCommand: () => null,
                isEssential: false
            },
        ]
    },
    {
        regexp: /(?=\btarget\s+TypeScript\b)/,
        checks: [
            {
                name: Dependency.Pnpm,
                checker: versionChecker.pnpmVersionChecker,
                message: async () => (
                    (await versionChecker.npmVersionChecker()).isCorrect ?
                    'To prevent an accumulation of replicated dependencies when compiling LF '
                        + 'programs with the TypeScript target, it is highly recommended to install'
                        + ' pnpm globally.'
                    : pnpmMessage
                ),
                requiredVersion: config.pnpmVersion,
                installLink: null,
                installCommand: async v => (
                    v.isCorrect === false ? (
                        (await versionChecker.corepackVersionChecker()).isCorrect ?
                        {
                            description: 'Corepack',
                            command: `corepack prepare pnpm@${config.pnpmLatestKnownGoodVersion}`
                        } : null
                    ) : (
                        // The following steps are derived from https://pnpm.io/installation
                        (await versionChecker.npmVersionChecker()).isCorrect ?
                        {description: 'NPM', command: 'npm install -g pnpm' } : (
                            // WARNING: 'corepack enable' might not install the latest PNPM version.
                            (await versionChecker.corepackVersionChecker()).isCorrect ?
                            { description: 'Corepack', command: 'corepack enable' } : (
                                // WARNING: PowerShell is the default terminal in Windows VS Code,
                                //  but if a different terminal is set as the default, then 'iwr'
                                //  will fail.
                                os.platform() == 'win32' ?
                                {
                                    description: 'a Powershell script',
                                    command: 'iwr https://get.pnpm.io/install.ps1 -useb | iex'
                                } : (
                                    (await versionChecker.curlVersionChecker()).isCorrect ?
                                    {
                                        description: 'a Bash script',
                                        command: 'curl -fsSL https://get.pnpm.io/install.sh | sh -'
                                    } : {
                                        description: 'a bash script',
                                        command: 'wget -qO- https://get.pnpm.io/install.sh | sh -'
                                    }
                                )
                            )
                        )
                    )
                ),
                isEssential: false
            },
            {
                name: Dependency.Node,
                checker: versionChecker.nodeVersionChecker,
                message: () => nodeMessage,
                requiredVersion: config.nodeVersion,
                installLink: 'https://nodejs.org/en/download/',
                installCommand: async v => (
                    (await versionChecker.pnpmVersionChecker()).isCorrect ?
                    { description: 'PNPM', command: 'pnpm env use --global lts' } : (
                        v.isCorrect === false ?
                        { description: 'NPM', command: 'npm update -g npm' } : (
                            // Source: https://nodejs.org/en/download/package-manager/
                            (await versionChecker.brewVersionChecker()).isCorrect ?
                            { description: 'Homebrew', command: 'brew install node' } : (
                                (await versionChecker.nvmVersionChecker()).isCorrect ?
                                { description: 'NVM', command: 'nvm install --lts' } : (
                                    (await versionChecker.snapVersionChecker()).isCorrect ?
                                    {
                                        description: 'Snap',
                                        command: 'sudo snap install node --classic'
                                    } : (
                                        (await versionChecker.aptGetVersionChecker()).isCorrect ?
                                        {
                                            description: 'apt-get',
                                            command: 'sudo apt-get install nodejs'
                                         } : (
                                            (await versionChecker.chocolateyVersionChecker()).isCorrect ?
                                            {
                                                description: 'Chocolatey',
                                                command: 'choco install nodejs'
                                            } : null
                                        )
                                    )
                                )
                            )
                        )
                    )
                ),
                isEssential: true
            },
        ]
    },
    {
        regexp: /(?=\btarget\s+Python\b)/,
        checks: [
            {
                name: Dependency.Python3,
                checker: versionChecker.python3VersionChecker,
                message: () => python3Message,
                wrongVersionMessage: wrongVersionMessageOf(python3Message),
                requiredVersion: config.pythonVersion,
                installLink: 'https://www.python.org/downloads/',
                installCommand: () => null,
                isEssential: true
            },
            {
                name: Dependency.Pylint,
                checker: versionChecker.pylintVersionChecker,
                message: () => pylintMessage,
                wrongVersionMessage: wrongVersionMessageOf(
                    `The Lingua Franca language server is tested with Pylint version `
                    + `${config.pylintVersion.major}.${config.pylintVersion.minor} and newer.`
                ),
                requiredVersion: config.pylintVersion,
                installLink: null,
                installCommand: async () => (
                    (await versionChecker.python3AliasVersionChecker()).isCorrect ?
                    { description: 'Pip', command: 'python3 -m pip install pylint --upgrade' } : (
                        (await versionChecker.pythonAliasVersionChecker()).isCorrect ?
                        { description: 'Pip', command: 'python -m pip install pylint --upgrade' }
                        : null
                    )
                ),
                isEssential: false
            },
        ]
    },
    {
        regexp: /(?=\btarget\s+Rust\b)/,
        checks: [
            {
                name: Dependency.Rust,
                checker: versionChecker.rustVersionChecker,
                message: () => rustMessage,
                wrongVersionMessage: wrongVersionMessageOf(rustMessage),
                requiredVersion: config.rustVersion,
                installLink: 'https://www.rust-lang.org/tools/install',
                installCommand: async v => (
                    // If someone has rustc, they *should* also have rustup.
                    (v.isCorrect === false) ?
                    {
                        description: 'Rustup',
                        command: `rustup default ${config.rustLatestKnownGoodVersion}`
                    } : (
                        (
                            os.platform() != 'win32'
                            && (await versionChecker.curlVersionChecker()).isCorrect
                        ) ?
                        {
                            description: 'an interactive shell script',
                            command: 'curl --proto \'=https\' --tlsv1.2 -sSf https://sh.rustup.rs | sh'
                        } :
                        null
                    )
                ),
                isEssential: true
            },
        ]
    },
    {
        regexp: /(?=\bfederated\s+(realtime\s+)?reactor\b)/,
        checks: [
            {
                name: Dependency.Rti,
                checker: versionChecker.rtiVersionChecker,
                message: () => rtiMessage,
                requiredVersion: config.rtiVersion,
                installLink: 'https://www.lf-lang.org/docs/handbook/distributed-execution#installation-of-the-rti',
                installCommand: () => null,
                isEssential: true
            },
        ]
    },
    {
        regexp: /docker\s*:/,
        checks: [
            {
                name: Dependency.Docker,
                checker: versionChecker.dockerVersionChecker,
                message: () => dockerMessage,
                requiredVersion: config.dockerVersion,
                installLink: 'https://docs.docker.com/engine/install/',
                installCommand: () => null,
                isEssential: true
            },
        ]
    }
];

export const caveat = 'If this dependency is already on your system, start VS Code from a terminal emulator so that VS Code sees the same value of your PATH that you see in your terminal.'

/**
 * Return a dependency checker that returns whether the given dependency is satisfied and, as a side
 * effect, warns the user if not.
 * @returns true if the given dependency is satisfied.
 */
const checkDependency: UserFacingVersionCheckerMaker = (dependency: DependencyInfo) =>
        (MessageDisplayHelper: MessageDisplayHelper) => async () => {
    const checkerResult: versionChecker.VersionCheckResult = await dependency.checker();
    if (checkerResult.isCorrect) return true;
    const message: string = (await (checkerResult.isCorrect === false ? (
        dependency.wrongVersionMessage?.(checkerResult)
        ?? dependency.message(checkerResult)
    ) : dependency.message(checkerResult))) + ' ' + caveat;
    const installCommand: InstallCommand = await dependency.installCommand?.(checkerResult);
    if (!installCommand && !dependency.installLink) {
        MessageDisplayHelper(message);
        return false;
    }
    const buttonText: string = !installCommand ? 'View download page' : (
        `${(checkerResult.isCorrect === false) ? 'Update' : 'Install'} using
${installCommand.description}`
    );
    MessageDisplayHelper(message, buttonText).then(async (response) => {
        if (response === buttonText) {
            if (installCommand) {
                const terminal = getTerminal(config.installDependenciesTerminalName);
                terminal.sendText(installCommand.command, true);
                terminal.show();
            } else if (dependency.installLink) {
                // Related issue: https://github.com/microsoft/vscode/issues/69608
                vscode.commands.executeCommand(
                    'vscode.open',
                    vscode.Uri.parse(dependency.installLink)
                );
            }
        }
    });
    return false;
};

type CheckerGetter = (name: Dependency) => UserFacingVersionChecker;

export const checkerFor: CheckerGetter = (name: Dependency) => {
    for (const cs of watcherConfig) {
        for (const check of cs.checks) {
            if (check.name === name) return checkDependency(check);
        }
    }
    return undefined;
};

const doDependencyCheck = (document: vscode.TextDocument) => {
    if (document.languageId != 'lflang') return;
    for (const checkSet of watcherConfig.filter(it => it.regexp.test(document.getText()))) {
        for (const check of checkSet.checks.filter(
            it => !it.alreadyChecked || (it.isEssential && !it.satisfied))
        ) {
            check.alreadyChecked = true;
            checkDependency(check)(
                check.isEssential ?
                vscode.window.showErrorMessage : vscode.window.showInformationMessage
            )().then(satisfied => check.satisfied = satisfied);
        }
    }
};

export function checkDocker(message: string) {
    checkDependency({
        name: Dependency.Docker,
        checker: versionChecker.dockerVersionChecker,
        message: () => message || dockerMessage,
        requiredVersion: config.dockerVersion,
        installLink: 'https://docs.docker.com/engine/install/',
        installCommand: () => null,
        isEssential: true
    })(vscode.window.showErrorMessage)();
}

export function registerDependencyWatcher() {
    vscode.workspace.onDidOpenTextDocument(doDependencyCheck);
    vscode.workspace.onDidSaveTextDocument(doDependencyCheck);
}
