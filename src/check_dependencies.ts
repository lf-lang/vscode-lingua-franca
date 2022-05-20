import { exec } from "child_process";
import { promisify } from "util";
import { Config } from "./config";
import * as vscode from 'vscode'
import { getTerminal } from "./utils";

const runCmd = promisify(exec);

export type VersionCheckResult = {
    version: Version
    isCorrect: boolean | null
};

type VersionChecker = () => Promise<VersionCheckResult>;

/**
 * Define a SemVer-style version number.
 */
export class Version {
    public static readonly regex = /\b(?<major>\d+)\.(?<minor>\d+)\.(?<patch>\d+)/;
    readonly major: number;
    readonly minor: number;
    readonly patch: number;

    constructor(version: string) {
        if (!Version.regex.test(version)) {
            throw new Error(version + " does not describe a valid version number.");
        }
        const result = version.match(Version.regex);
        this.major = parseInt(result.groups.major, 10);
        this.minor = parseInt(result.groups.minor, 10);
        this.patch = parseInt(result.groups.patch);
    }

    isAtLeast(version: Version | string): boolean {
        if (typeof version === 'string') version = new Version(version);
        if (this.major > version.major) return true;
        if (this.major < version.major) return false;
        if (this.minor > version.minor) return true;
        if (this.minor < version.minor) return false;
        return this.patch >= version.patch;
    }

    isCompatibleWith(version: Version | string): boolean {
        if (typeof version == 'string') version = new Version(version);
        return this.major === version.major;
    }

    toString(): string {
        return `${this.major}.${this.minor}.${this.patch}`;
    }
}

type VersionCheckerMaker = (command: string, sameMajor: boolean) => VersionChecker

/**
 * Create a basic version checker. Note that this assumes that the first valid version number
 * appearing in stdout is the version number of interest.
 * @param command A command that will print the desired version number, as well as perhaps some
 * other text.
 * @returns A VersionChecker that checks the desired version number.
 */
const basicVersionChecker: VersionCheckerMaker = (command, sameMajor) => async () => {
    const {stdout} = await runCmd(command);
    const found = stdout.match(Version.regex);
    if (found === null) return { version: new Version("0.0.0"), isCorrect: null };
    const version = new Version(stdout);
    return {
        version: version,
        isCorrect: version.isAtLeast(Config.javaVersion) && (
            !sameMajor || version.isCompatibleWith(Config.javaVersion)
        )
    };
}

export const javaVersionChecker: VersionChecker = basicVersionChecker('java --version', true);
export const javacVersionChecker: VersionChecker = basicVersionChecker('javac --version', true);
export const pylintVersionChecker: VersionChecker = basicVersionChecker('pylint --version', false);

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
    installCommand: 'python3 -m pip install pylint'  // FIXME: Some machines use `python`, not `python3`
}

const missingJava: MissingDependency = {
    checker: javaVersionChecker,
    message: `Java version ${Config.javaVersion.major} is required for Lingua Franca diagrams and `
        + `code analysis.`,
    requiredVersion: Config.javaVersion,
    installLink: `https://www.oracle.com/java/technologies/downloads/#java${Config.javaVersion.major}`,
    installCommand: null
}

/**
 * Return a dependency checker that returns whether the given dependency is satisfied and, as a side
 * effect, warns the user if not.
 * @returns true if the given dependency is satisfied.
 */
const checkDependency = (missingDependency: MissingDependency) => async () => {
    const checkerResult = await missingDependency.checker();
    if (checkerResult.isCorrect) return true;
    const message: string = checkerResult.isCorrect === false ? (
        missingDependency.wrongVersionMessage ?? missingDependency.message
    ) : missingDependency.message;
    if (!missingDependency.installCommand && !missingDependency.installLink) {
        vscode.window.showInformationMessage(message);
        return;
    }
    vscode.window.showInformationMessage(message, "Install").then((s: string) => {
        if (s === "Install") {
            if (missingDependency.installCommand) {
                getTerminal("Lingua Franca: Install dependencies")
                    .sendText(missingDependency.installCommand);
            } else if (missingDependency.installLink) {
                vscode.env.openExternal(vscode.Uri.parse(missingDependency.installLink));
            }
        }
    });
    return false;
}

export const checkJava = checkDependency(missingJava);
export const checkPylint = checkDependency(missingPylint);
