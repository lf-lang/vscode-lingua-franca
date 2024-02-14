/**
 * @file Specification of how dependencies should be checked.
 * @author Peter Donovan <peterdonovan@berkeley.edu>
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import which from 'which';
import * as config from './config';
import { Version } from './version';
const runCmd = promisify(exec);

export type VersionCheckResult = {
    version: Version
    isCorrect: boolean | null
};

export type VersionChecker = () => Promise<VersionCheckResult>;

type VersionCheckerMaker = (
    desiredVersion: Version,
    command: string,
    sameMajor: boolean,
    permissive?: boolean
) => VersionChecker;

type VersionCheckerCombiner = (check0: VersionChecker, check1: VersionChecker) => VersionChecker;

/**
 * Create a basic version checker. Note that this assumes that the first valid version number
 * appearing in stdout is the version number of interest.
 * @param desiredVersion The desired minimal version number.
 * @param command A command that will print the desired version number, as well as perhaps some
 * other text.
 * @param sameMajor Whether versions with a different major version number should be considered
 * incompatible, even if they are more recent then the required version.
 * @param permissive Whether the version number parsing strategy should be permissive in the
 * version number formats that it accepts.
 * @returns A VersionChecker that checks the desired version number.
 */
const basicChecker: VersionCheckerMaker = (
    desiredVersion: Version,
    command: string,
    sameMajor: boolean,
    permissive: boolean
) => async () => {
    const nullResult = { version: new Version('0.0.0'), isCorrect: null };
    let stdout: string;
    try {
        stdout = (await runCmd(command)).stdout;
    } catch (error) {
        console.error(`Failed to run "${command}": ${error}`);
        return nullResult;
    }
    let version: Version;
    try {
        version = new Version(stdout, permissive);
    } catch (error) {
        console.error(error);
        return nullResult;
    }
    return {
        version: version,
        isCorrect: version.isAtLeast(desiredVersion) && (
            !sameMajor || version.isCompatibleWith(desiredVersion)
        )
    };
}

/**
 * Return the version checker that returns the version check result that is correct, or the first
 * version check result if both or neither are correct.
 */
const theBetterOfEither: VersionCheckerCombiner = (check0, check1) => async () => {
    const zeroth: VersionCheckResult = await check0();
    if (zeroth.isCorrect) return zeroth;
    const first: VersionCheckResult = await check1();
    if (first.isCorrect) return first;
    return zeroth;
};

export const javaVersionChecker = basicChecker(config.javaVersion, 'java -version 2>&1', false, true);
export const javacVersionChecker = basicChecker(config.javacVersion, 'javac -version 2>&1', false, true);
export const python3AliasVersionChecker = basicChecker(config.pythonVersion, 'python3 -V', false);
export const pythonAliasVersionChecker = basicChecker(config.pythonVersion, 'python -V', false);
export const python3VersionChecker = theBetterOfEither(
    python3AliasVersionChecker,
    pythonAliasVersionChecker
);
export const nodeVersionChecker = basicChecker(config.nodeVersion, 'node -v', false);
export const pylintVersionChecker = basicChecker(config.pylintVersion, 'pip3 show pylint', false);
export const npmVersionChecker = basicChecker(config.npmVersion, 'npm --version', false);
export const pnpmVersionChecker = basicChecker(config.pnpmVersion, 'pnpm --version', false);
export const brewVersionChecker = basicChecker(new Version('0.0.0'), 'brew -v', false);
export const corepackVersionChecker = basicChecker(new Version('0.0.0'), 'corepack -v', false);
export const curlVersionChecker = basicChecker(new Version('0.0.0'), 'curl -V', false);
export const rustVersionChecker = basicChecker(config.rustVersion, 'rustc --version', false);
export const cmakeVersionChecker = basicChecker(config.rustVersion, 'cmake --version', false);
export const nvmVersionChecker = basicChecker(new Version('0.0.0'), 'nvm --version', false);
export const snapVersionChecker = basicChecker(new Version('0.0.0'), 'snap --version', false);
export const aptGetVersionChecker = basicChecker(new Version('0.0.0'), 'apt-get -v', false);
export const chocolateyVersionChecker = basicChecker(new Version('0.0.0'), 'choco -v', false);
export const rtiVersionChecker = async () => {
    // TODO: Update when #76 is addressed: https://github.com/lf-lang/reactor-c/issues/76
    let exists: boolean;
    try {
        exists = (await which('RTI')).length > 0;
    } catch (e) {
        return { version: new Version('0.0.0'), isCorrect: null };
    }
    return { version: new Version('0.0.0'), isCorrect: exists };
};
export const dockerVersionChecker = basicChecker(config.dockerVersion, 'docker -v', false);
