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
    installCommand: (v: versionChecker.VersionCheckResult) => string | null | Promise<string>,
};

const missingPylint: MissingDependency = {
    checker: versionChecker.pylintVersionChecker,
    message: () => `Pylint is a recommended linter for Lingua Franca's Python target.`,
    wrongVersionMessage: () => `The Lingua Franca language server is tested with Pylint version `
        + `${config.pylintVersion.major}.${config.pylintVersion.minor} and newer.`,
    requiredVersion: config.pylintVersion,
    installLink: null,
    installCommand: () => 'pip3 install pylint' // TODO: Check for pip3.
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
    message: () => `Python version ${config.pythonVersion} or higher is required for compiling LF programs with the Python target.`,
    requiredVersion: config.pythonVersion,
    installLink: `https://www.python.org/downloads/`,
    installCommand: () => null
};

const missingNode: MissingDependency = {
    checker: versionChecker.nodeVersionChecker,
    message: () => 'Node.js is required for executing LF programs with the TypeScript target.',
    requiredVersion: config.nodeVersion,
    installLink: 'https://nodejs.org/en/download/',
    installCommand: () => null  // TODO: https://nodejs.org/en/download/package-manager/ and/or `pnpm env use --global lts`
};

const missingPnpm: MissingDependency = {
    checker: versionChecker.pnpmVersionChecker,
    message: async () => (
        (await versionChecker.npmVersionChecker()).isCorrect ?
        'To prevent an accumulation of replicated dependencies when compiling LF programs with a '
        + 'TypeScript target, it is highly recommended to install pnpm globally.'
        : 'In order to compile LF programs with a TypeScript target, it is necessary to install pnpm.'
    ),
    requiredVersion: config.pnpmVersion,
    installLink: null,
    installCommand: async v => (
        // The following steps are derived from https://pnpm.io/installation
        v.isCorrect ? 'npm install -g pnpm' : (
            // FIXME: 'corepack enable' might not install the latest PNPM version.
            (await versionChecker.corepackVersionChecker()).isCorrect ? 'corepack enable' : (
                // FIXME: PowerShell is the default terminal in Windows VS Code, but if the user has
                //  set a different terminal as the default, then 'iwr' will fail.
                os.platform() == 'win32' ? 'iwr https://get.pnpm.io/install.ps1 -useb | iex' : (
                    (await versionChecker.curlVersionChecker()).isCorrect ?
                    'curl -fsSL https://get.pnpm.io/install.sh | sh -'
                    : 'wget -qO- https://get.pnpm.io/install.sh | sh -'
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
        os.platform() == 'win32' ? null : (
            (await versionChecker.curlVersionChecker()).isCorrect ?
            'curl --proto \'=https\' --tlsv1.2 -sSf https://sh.rustup.rs | sh' : (
                null
            )
        )
    )
}

export type UserFacingVersionChecker = (shower: MessageShower) => () => Promise<boolean>;
type UserFacingVersionCheckerMaker = (dependency: MissingDependency) => UserFacingVersionChecker;

function toPromise<T>(v: T | Promise<T>): Promise<T> {
    if (v instanceof Promise) return v;
    return Promise.resolve(v);
}

/**
 * Return a dependency checker that returns whether the given dependency is satisfied and, as a side
 * effect, warns the user if not.
 * @returns true if the given dependency is satisfied.
 */
const checkDependency: UserFacingVersionCheckerMaker = (missingDependency: MissingDependency) =>
        (messageShower: MessageShower) => async () => {
    const checkerResult = await missingDependency.checker();
    if (checkerResult.isCorrect) return true;
    const message: string = await toPromise(checkerResult.isCorrect === false ? (
        missingDependency.wrongVersionMessage?.() ?? missingDependency.message(checkerResult)
    ) : missingDependency.message(checkerResult));
    if (!missingDependency.installCommand?.(checkerResult) && !missingDependency.installLink) {
        messageShower(message);
        return false;
    }
    messageShower(message, 'Install').then(async (response) => {
        if (response === 'Install') {
            if (missingDependency.installCommand) {
                getTerminal('Lingua Franca: Install dependencies')
                    .sendText(await toPromise(missingDependency.installCommand(checkerResult)));
            } else if (missingDependency.installLink) {
                vscode.env.openExternal(vscode.Uri.parse(missingDependency.installLink));
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

export function registerDependencyWatcher() {
    type LanguageConfig = {
        regexp: RegExp,
        checks: { checker: UserFacingVersionChecker, isEssential: boolean, alreadyChecked?: boolean }[]
    };
    const watcherConfig: LanguageConfig[] = [
        {
            regexp: /(?=\\btarget\\s+C\\b)/,
            checks: []
        },
        {
            regexp: /(?=\\btarget\\s+C?Cpp\\b)/,
            checks: []
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
            checks: []
        }
    ];
    const detectTarget = (text: string) => {
        for (const line of text.match(/[^\r\n]+/g)) {
            const target = watcherConfig.find(target => target.regexp.test(line));
            if (target) return target;
        }
    }
    const doDependencyCheck = (document: vscode.TextDocument) => {
        if (document.languageId != "lflang") return;
        const target = detectTarget(document.getText());
        if (!target) return;
        for (const check of target.checks.filter(it => !it.alreadyChecked)) {
            check.alreadyChecked = true;
            check.checker(
                check.isEssential ?
                vscode.window.showErrorMessage : vscode.window.showInformationMessage
            );
        }
    };
    vscode.workspace.onDidOpenTextDocument(doDependencyCheck);
    vscode.workspace.onDidSaveTextDocument(doDependencyCheck);
}
