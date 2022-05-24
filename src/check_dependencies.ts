import { Config } from './config';
import * as vscode from 'vscode';
import { getTerminal, MessageShower } from './utils';
import { Version } from './version';
import { VersionChecker, javaVersionChecker, pylintVersionChecker } from './version_checker';

type MissingDependency = {
    checker: VersionChecker,
    message: string,
    wrongVersionMessage?: string,
    requiredVersion: Version,
    installLink?: string,
    installCommand?: string,
};

const missingPylint: MissingDependency = {
    checker: pylintVersionChecker,
    message: `Pylint is a recommended linter for Lingua Franca's Python target.`,
    wrongVersionMessage: `The Lingua Franca language server is tested with Pylint version `
        + `${Config.pylintVersion.major}.${Config.pylintVersion.minor} and newer.`,
    requiredVersion: Config.pylintVersion,
    installLink: null,
    installCommand: 'pip install pylint'  // FIXME: Should this start with "python3 -m" ?
}

const missingJava: MissingDependency = {
    checker: javaVersionChecker,
    message: `Java version ${Config.javaVersion.major} is required for Lingua Franca diagrams and `
        + `code analysis.`,
    requiredVersion: Config.javaVersion,
    installLink: `https://www.oracle.com/java/technologies/downloads/#java${Config.javaVersion.major}`,
    installCommand: null
}

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
    const message: string = !checkerResult.isCorrect ? (
        missingDependency.wrongVersionMessage ?? missingDependency.message
    ) : missingDependency.message;
    if (!missingDependency.installCommand && !missingDependency.installLink) {
        messageShower(message);
        return false;
    }
    messageShower(message, 'Install').then((s: string) => {
        if (s === 'Install') {
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
