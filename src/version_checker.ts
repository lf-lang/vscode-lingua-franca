import { exec } from "child_process";
import { promisify } from "util";
import { Config } from "./config";
import { Version } from "./version";
const runCmd = promisify(exec);

export type VersionCheckResult = {
    version: Version
    isCorrect: boolean | null
};

export type VersionChecker = () => Promise<VersionCheckResult>;

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
