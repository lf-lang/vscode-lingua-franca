/**
 * @file Build script for the language server.
 * @author Marten Lohstroh <marten@berkeley.edu>
 */

'use strict';

import * as fs from 'fs'
import * as path from 'path'
import * as rimraf from 'rimraf'
import simpleGit, { SimpleGit } from 'simple-git'
import { Command, OptionValues } from 'commander'
import * as config from './config'
import { exit } from 'process';
import { execSync } from 'child_process'
import { bold, green, red } from 'colorette'
import which from 'which'
import { javacVersionChecker, VersionCheckResult } from './version_checker';
import { glob } from 'glob';

/**
 * Return passed in CLI options.
 */
function getOpts() {
    const program = new Command();
    program
        .option('-r, --ref <ref>',
        'check out a particular commit')
        .option('-b, --branch <branch>',
            'check out the HEAD of a particular branch')
        .option('-l, --local <path>',
            'build from existing local lingua-franca repo')

    program.parse(process.argv);
    return program.opts();
}

/**
 * Copy jar produced by the Gradle build.
 */
function copyJar() {
    if (fs.existsSync(config.libDirPath)) {
        rimraf.sync(config.libDirPath);
    }
    fs.mkdirSync(config.libDirPath);
    const ldsJarMatches = glob.sync(config.sourceLdsJarFile);
    if (ldsJarMatches.length > 1) {
        throw Error(`Multiple matches to ${config.sourceLdsJarFile} were found. `
         + `Please delete the jars that you do not want to use.`);
    } else if (ldsJarMatches.length == 0) {
        throw Error(`Failed to find the LDS fat jar because there were no matches to `
         + `${config.sourceLdsJarFile} in the file system.`);
    } else {
        fs.copyFileSync(ldsJarMatches[0], path.join(config.libDirPath, config.ldsJarName));
    }
}

/**
 * Check out the Lingua Franca repo.
 * @param options CLI options
 */
async function fetchDeps(options: OptionValues) {
    if (!fs.existsSync(config.repoName)
        || fs.readdirSync(config.repoName).length === 0) {
        console.log("> cloning lingua-franca repo: " + config.repoURL)
        await simpleGit(config.baseDirPath).submoduleUpdate(["--init"])
        .catch((err) => { throw Error(`Unable to initialize lingua-franca submodule: ${err}.`) })
    }

    const nestedGit: SimpleGit = simpleGit(
        path.resolve(config.baseDirPath, config.repoName));
    if (options.ref) {
        console.log("> using lingua-franca ref: " + options.ref)
        await nestedGit.checkout(options.ref)
        .catch((err) => { throw Error(`Unable to check out lingua-franca: ${err}.`) })
    } else if (options.branch) {
        console.log("> using lingua-franca branch: " + options.branch)
        await nestedGit.checkout(options.branch).pull()
        .catch((err) => { throw Error(`Unable to check out lingua-franca: ${err}.`) })
    }
    console.log("> updating Git submodules...")
    await nestedGit.submoduleUpdate(["--init"])
    .catch((err) => { throw Error(`Unable to update submodules of lingua-franca: ${err}.`) })
}

/**
 * Check whether version of installed Java is correct.
 */
async function checkJavaVersion() {
    console.log("> verifying Java compiler version...")
    try {
        const result: VersionCheckResult = await javacVersionChecker()
        switch (result.isCorrect) {
        case true:
            console.log(`> Java compiler version is ${result.version}`)
            return
        case false:
            console.log(`> Java compiler version is ${result.version}`)
            console.log(red("> incompatible version of Java compiler (must be "
                + config.javacVersion + "); aborting"))
            exit(1)
        case null:
            break
        }
    } catch(e) {
        console.error(e)
    }

    console.log(red("> cannot verify version of Java compiler; aborting"))
    exit(1)
}

/**
 * Build dependencies and collects produced jars.
 */
async function build() {
    await checkInstalled(config.buildDeps)
    await checkJavaVersion()
    const opts = getOpts()
    let repo = config.repoName
    if (opts.local) {
        console.log("> using repo located in " + opts.local)
        repo = opts.local
    } else {
        await fetchDeps(opts).catch((err) => { console.log(err); process.exit(1)})
    }
    console.log("> starting Gradle build...")
    try {
        execSync("./gradlew lsp:assemble", { cwd: repo, stdio: 'inherit' });
        copyJar();
    } catch(e) {
        console.error(e);
    }
}

/**
 * Check whether the given dependencies are installed.
 * @param deps Array of dependencies.
 */
async function checkInstalled(deps: string[]) {
    let missing: string[] = [];
    console.log("> checking dependencies...")
    for (let dep of deps) {
        await which(dep)
            .then(() => { console.log("> " + dep + green(" [found]")) })
            .catch(() => {
                console.log("> " + dep + red(" [not found]"));
                missing.push(dep)
            })
    }
    if (missing.length > 0) {
        console.log("> " + bold("> please install: " + missing.toString()))
        console.error("> " + red("> missing dependencies; aborting"))
        exit(1)
    }
}

build()
