import * as config from './config';
import * as vscode from 'vscode';
import { getTerminal, MessageShower } from './utils';
import { Version } from './version';
import * as versionChecker from './version_checker';

type MissingDependency = {
    checker: versionChecker.VersionChecker,
    message: string,
    wrongVersionMessage?: string,
    requiredVersion: Version,
    installLink?: string,
    installCommand?: string,
};

const missingPylint: MissingDependency = {
    checker: versionChecker.pylintVersionChecker,
    message: `Pylint is a recommended linter for Lingua Franca's Python target.`,
    wrongVersionMessage: `The Lingua Franca language server is tested with Pylint version `
        + `${config.pylintVersion.major}.${config.pylintVersion.minor} and newer.`,
    requiredVersion: config.pylintVersion,
    installLink: null,
    installCommand: 'pip3 install pylint'
};

const missingJava: MissingDependency = {
    checker: versionChecker.javaVersionChecker,
    message: `Java version ${config.javaVersion.major} is required for Lingua Franca diagrams and `
        + `code analysis.`,
    requiredVersion: config.javaVersion,
    installLink: `https://www.oracle.com/java/technologies/downloads/#java${config.javaVersion.major}`,
    installCommand: null
};

const missingPython3: MissingDependency = {
    checker: versionChecker.python3VersionChecker,
    message: `Python version ${config.javaVersion.major} or higher is required for compiling LF `
        + `programs with the Python target.`,
    requiredVersion: config.pythonVersion,
    installLink: `https://www.python.org/downloads/`,
    installCommand: null
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
    const message: string = checkerResult.isCorrect === false ? (
        missingDependency.wrongVersionMessage ?? missingDependency.message
    ) : missingDependency.message;
    if (!missingDependency.installCommand && !missingDependency.installLink) {
        messageShower(message);
        return false;
    }
    messageShower(message, 'Install').then((response) => {
        if (response === 'Install') {
            if (missingDependency.installCommand) {
                getTerminal('Lingua Franca: Install dependencies')
                    .sendText(missingDependency.installCommand);
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
