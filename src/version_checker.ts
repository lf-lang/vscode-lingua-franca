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
    VersionChecker;

type VersionCheckerCombiner = (check0: VersionChecker, check1: VersionChecker) => VersionChecker;

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
        console.error(`Failed to run "${command}": ${error}`);
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

const theBetterOfEither: VersionCheckerCombiner = (check0, check1) => async () => {
    const zeroth: VersionCheckResult = await check0();
    if (zeroth.isCorrect) return zeroth;
    const first: VersionCheckResult = await check1();
    if (first.isCorrect) return first;
    return zeroth;
};

export const javaVersionChecker: VersionChecker = basicVersionChecker(config.javaVersion, 'java -version 2>&1', true);
export const javacVersionChecker: VersionChecker = basicVersionChecker(config.javacVersion, 'javac -version 2>&1', true);
export const python3VersionChecker: VersionChecker = theBetterOfEither(
    basicVersionChecker(config.pythonVersion, 'python3 -V', false),
    basicVersionChecker(config.pythonVersion, 'python -V', false)
);
export const nodeVersionChecker: VersionChecker = basicVersionChecker(config.nodeVersion, 'node -v', false);
export const pylintVersionChecker: VersionChecker = basicVersionChecker(config.pylintVersion, 'pip3 show pylint', false);
export const npmVersionChecker: VersionChecker = basicVersionChecker(config.npmVersion, 'npm --version', false);
export const pnpmVersionChecker: VersionChecker = basicVersionChecker(config.pnpmVersion, 'pnpm --version', false);
export const brewVersionChecker: VersionChecker = basicVersionChecker(new Version('0.0.0'), 'brew -v', false);
export const corepackVersionChecker: VersionChecker = basicVersionChecker(new Version('0.0.0'), 'corepack -v', false);
export const curlVersionChecker: VersionChecker = basicVersionChecker(new Version('0.0.0'), 'curl -V', false);
export const rustVersionChecker: VersionChecker = basicVersionChecker(config.rustVersion, 'rustc --version', false);
export const cmakeVersionChecker: VersionChecker = basicVersionChecker(config.rustVersion, 'cmake --version', false);
