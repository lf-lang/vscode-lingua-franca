/**
 * @file Specification of user-visible behavior in response for missing dependencies.
 * @author Peter Donovan <peterdonovan@berkeley.edu>
 */

import * as config from './config';
import * as vscode from 'vscode';
import * as os from 'os';
import { getTerminal, MessageShower } from './utils';
import { Version } from './version';
import * as versionChecker from './version_checker';

type MissingDependency = {
    checker: versionChecker.VersionChecker,
    message: (v: versionChecker.VersionCheckResult) => string | Promise<string>,
    wrongVersionMessage?: () => string,
    requiredVersion: Version,
    installLink: string | null,
    installCommand: (v: versionChecker.VersionCheckResult) => Promise<string> | null,
};

const missingPylint: MissingDependency = {
    checker: versionChecker.pylintVersionChecker,
    message: () => `Pylint is a recommended linter for Lingua Franca's Python target.`,
    wrongVersionMessage: () => `The Lingua Franca language server is tested with Pylint version `
        + `${config.pylintVersion.major}.${config.pylintVersion.minor} and newer.`,
    requiredVersion: config.pylintVersion,
    installLink: null,
    installCommand: async () => (
        (await versionChecker.python3AliasVersionChecker()).isCorrect ?
        'python3 -m pip install pylint' : (
            (await versionChecker.pythonAliasVersionChecker()).isCorrect ?
            'python -m pip install pylint' : null
        )
    )
};

const missingJava: MissingDependency = {
    checker: versionChecker.javaVersionChecker,
    message: () => `Java version ${config.javaVersion.major} is required for Lingua Franca diagrams`
        + ` and code analysis.`,
    requiredVersion: config.javaVersion,
    installLink: `https://www.oracle.com/java/technologies/downloads/#java${config.javaVersion.major}`,
    installCommand: () => null
};

const missingPython3: MissingDependency = {
    checker: versionChecker.python3VersionChecker,
    message: () => `Python version ${config.pythonVersion} or higher is required for compiling LF`
        + ` programs with the Python target.`,
    requiredVersion: config.pythonVersion,
    installLink: 'https://www.python.org/downloads/',
    installCommand: () => null
};

const missingNode: MissingDependency = {
    checker: versionChecker.nodeVersionChecker,
    message: () => 'Node.js is required for executing LF programs with the TypeScript target.',
    requiredVersion: config.nodeVersion,
    installLink: 'https://nodejs.org/en/download/',
    installCommand: async v => (
        (await versionChecker.pnpmVersionChecker()).isCorrect ? 'pnpm env use --global lts' : (
            v.isCorrect === false ? 'npm update -g npm' : (
                // Source: https://nodejs.org/en/download/package-manager/
                (await versionChecker.brewVersionChecker()).isCorrect ? 'brew install node' : (
                    (await versionChecker.nvmVersionChecker()).isCorrect ? 'nvm install --lts' : (
                        (await versionChecker.snapVersionChecker()).isCorrect ?
                        'sudo snap install node --classic' : (
                            (await versionChecker.aptGetVersionChecker()).isCorrect ?
                            'sudo apt-get install nodejs' : (
                                (await versionChecker.chocolateyVersionChecker()).isCorrect ?
                                'choco install nodejs' : null
                            )
                        )
                    )
                )
            )
        )
    )
};

const missingRti: MissingDependency = {
    checker: versionChecker.rtiVersionChecker,
    message: () => 'The Lingua Franca runtime infrastructure (RTI) is required for executing '
        + 'federated LF programs.',
    requiredVersion: config.rtiVersion,
    installLink: 'https://www.lf-lang.org/docs/handbook/distributed-execution#installation-of-the-rti',
    installCommand: () => null
};

const missingPnpm: MissingDependency = {
    checker: versionChecker.pnpmVersionChecker,
    message: async () => (
        (await versionChecker.npmVersionChecker()).isCorrect ?
        'To prevent an accumulation of replicated dependencies when compiling LF programs with the '
            + 'TypeScript target, it is highly recommended to install pnpm globally.'
        : 'In order to compile LF programs with the TypeScript target, it is necessary to install '
            + 'pnpm.'
    ),
    requiredVersion: config.pnpmVersion,
    installLink: null,
    installCommand: async v => (
        v.isCorrect === false ? (
            (await versionChecker.corepackVersionChecker()).isCorrect ?
            `corepack prepare pnpm@${config.pnpmLatestKnownGoodVersion}` : null
        ) : (
            // The following steps are derived from https://pnpm.io/installation
            (await versionChecker.npmVersionChecker()).isCorrect ? 'npm install -g pnpm' : (
                // WARNING: 'corepack enable' might not install the latest PNPM version.
                (await versionChecker.corepackVersionChecker()).isCorrect ? 'corepack enable' : (
                    // WARNING: PowerShell is the default terminal in Windows VS Code, but if
                    //  a different terminal is set as the default, then 'iwr' will fail.
                    os.platform() == 'win32' ? 'iwr https://get.pnpm.io/install.ps1 -useb | iex' : (
                        (await versionChecker.curlVersionChecker()).isCorrect ?
                        'curl -fsSL https://get.pnpm.io/install.sh | sh -'
                        : 'wget -qO- https://get.pnpm.io/install.sh | sh -'
                    )
                )
            )
        )
    )
};

const missingRust: MissingDependency = {
    checker: versionChecker.rustVersionChecker,
    message: () => 'The Rust compiler is required for compiling LF programs with the Rust target.',
    requiredVersion: config.rustVersion,
    installLink: 'https://www.rust-lang.org/tools/install',
    installCommand: async v => (
        (v.isCorrect === null) ? null : // Their install script is interactive :(
            'rustup update'  // If someone has rustc, they *should* also have rustup.
    )
};

const missingCmake: MissingDependency = {
    checker: versionChecker.cmakeVersionChecker,
    message: () => `CMake version ${config.cmakeVersion} or higher is recommended for compiling LF `
        + `programs with the C or C++ target.`,
    requiredVersion: config.cmakeVersion,
    installLink: 'https://cmake.org/download/',
    installCommand: () => null
};

export type UserFacingVersionChecker = (shower: MessageShower) => () => Promise<boolean>;
type UserFacingVersionCheckerMaker = (dependency: MissingDependency) => UserFacingVersionChecker;

/**
 * Return a dependency checker that returns whether the given dependency is satisfied and, as a side
 * effect, warns the user if not.
 * @returns true if the given dependency is satisfied.
 */
const checkDependency: UserFacingVersionCheckerMaker = (missingDependency: MissingDependency) =>
        (messageShower: MessageShower) => async () => {
    const checkerResult = await missingDependency.checker();
    if (checkerResult.isCorrect) return true;
    const message: string = await (checkerResult.isCorrect === false ? (
        missingDependency.wrongVersionMessage?.() ?? missingDependency.message(checkerResult)
    ) : missingDependency.message(checkerResult));
    const installCommand: string = await missingDependency.installCommand?.(checkerResult);
    if (!installCommand && !missingDependency.installLink) {
        messageShower(message);
        return false;
    }
    const buttonText = !installCommand ? 'View download page' : (
        (checkerResult.isCorrect === false) ? 'Update' : 'Install'
    );
    messageShower(message, buttonText).then(async (response) => {
        if (response === buttonText) {
            if (installCommand) {
                const terminal = getTerminal(config.installDependenciesTerminalName);
                // If a command was previously sitting in the terminal, run it to clear it out. This
                //  is a dangerous policy, but we should not simply append the new command to the
                //  one that was already sitting in the terminal.
                terminal.sendText(os.EOL);
                terminal.sendText(await missingDependency.installCommand(checkerResult), false);
                terminal.show();
            } else if (missingDependency.installLink) {
                // Related issue: https://github.com/microsoft/vscode/issues/69608
                vscode.commands.executeCommand(
                    "vscode.open",
                    vscode.Uri.parse(missingDependency.installLink)
                );
            }
        }
    });
    return false;
};

export const checkJava: UserFacingVersionChecker = checkDependency(missingJava);
export const checkPylint: UserFacingVersionChecker = checkDependency(missingPylint);
export const checkPython3: UserFacingVersionChecker = checkDependency(missingPython3);
export const checkNode: UserFacingVersionChecker = checkDependency(missingNode);
export const checkPnpm: UserFacingVersionChecker = checkDependency(missingPnpm);
export const checkRust: UserFacingVersionChecker = checkDependency(missingRust);
export const checkCmake: UserFacingVersionChecker = checkDependency(missingCmake);
export const checkRti: UserFacingVersionChecker = checkDependency(missingRti);

type CheckSet = {
    regexp: RegExp,
    checks: {
        checker: UserFacingVersionChecker,
        isEssential: boolean,
        alreadyChecked?: boolean,
        satisfied?: boolean
    }[]
};
const watcherConfig: CheckSet[] = [
    {
        regexp: /(?=\\btarget\\s+C\\b)/,
        checks: [
            { checker: checkCmake, isEssential: false },
        ]
    },
    {
        regexp: /(?=\\btarget\\s+C?Cpp\\b)/,
        checks: [
            { checker: checkCmake, isEssential: true },
        ]
    },
    {
        regexp: /(?=\\btarget\\s+TypeScript\\b)/,
        checks: [
            { checker: checkPnpm, isEssential: false },
            { checker: checkNode, isEssential: true },
        ]
    },
    {
        regexp: /(?=\\btarget\\s+Python\\b)/,
        checks: [
            { checker: checkPython3, isEssential: true },
            { checker: checkPylint, isEssential: false },
        ]
    },
    {
        regexp: /(?=\\btarget\\s+Rust\\b)/,
        checks: [
            { checker: checkRust, isEssential: true },
        ]
    },
    {
        regexp: /(?=\\bfederated\\s+(realtime\\s+)?reactor\\b)/,
        checks: [
            { checker: checkRti, isEssential: true },
        ]
    },
];
const doDependencyCheck = (document: vscode.TextDocument) => {
    if (document.languageId != "lflang") return;
    for (const checkSet of watcherConfig.filter(it => it.regexp.test(document.getText()))) {
        for (const check of checkSet.checks.filter(
            it => !it.alreadyChecked || (it.isEssential && !it.satisfied))
        ) {
            check.alreadyChecked = true;
            check.checker(
                check.isEssential ?
                vscode.window.showErrorMessage : vscode.window.showInformationMessage
            )().then(satisfied => check.satisfied = satisfied);
        }
    }
};

export function registerDependencyWatcher() {
    vscode.workspace.onDidOpenTextDocument(doDependencyCheck);
    vscode.workspace.onDidSaveTextDocument(doDependencyCheck);
}
