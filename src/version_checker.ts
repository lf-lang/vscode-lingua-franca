import { exec } from 'child_process';
import { promisify } from 'util';
import * as config from './config';
import { Version } from './version';
const runCmd = promisify(exec);

export type VersionCheckResult = {
    version: Version
    isCorrect: boolean | null
};

export type VersionChecker = () => Promise<VersionCheckResult>;

type VersionCheckerMaker = (desiredVersion: Version, command: string, sameMajor: boolean) =>
    VersionChecker

/**
 * Create a basic version checker. Note that this assumes that the first valid version number
 * appearing in stdout is the version number of interest.
 * @param command A command that will print the desired version number, as well as perhaps some
 * other text.
 * @returns A VersionChecker that checks the desired version number.
 */
const basicVersionChecker: VersionCheckerMaker = (desiredVersion, command, sameMajor) => async () => {
    const nullResult = { version: new Version('0.0.0'), isCorrect: null };
    let stdout: string;
    try {
        stdout = (await runCmd(command)).stdout;
    } catch (error) {
        console.error(error);
        return nullResult;
    }
    const found = stdout.match(Version.regex);
    if (found === null) return nullResult;
    const version = new Version(stdout);
    return {
        version: version,
        isCorrect: version.isAtLeast(desiredVersion) && (
            !sameMajor || version.isCompatibleWith(desiredVersion)
        )
    };
}

export const javaVersionChecker: VersionChecker = basicVersionChecker(config.javaVersion, 'java -version 2>&1', true);
export const javacVersionChecker: VersionChecker = basicVersionChecker(config.javacVersion, 'javac -version 2>&1', true);
export const python3VersionChecker: VersionChecker = basicVersionChecker(config.pythonVersion, 'python3 -V', false);
export const pylintVersionChecker: VersionChecker = basicVersionChecker(config.pylintVersion, 'pip3 show pylint', false);
