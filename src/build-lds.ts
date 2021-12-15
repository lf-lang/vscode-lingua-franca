'use strict';

import * as fs from 'fs'
import * as path from 'path'
import * as rimraf from 'rimraf'
import simpleGit, { SimpleGit } from 'simple-git'
import { Command, OptionValues } from 'commander'
import { Config } from './config'
import { exit } from 'process';
import { bold, green, red } from 'colorette'
import { exec } from 'child_process'
import { promisify } from 'util'
import which from 'which'

/**
 * Utility for running command that returns a promise.
 * @author Marten Lohstroh <marten@berkeley.edu>
 */
const runCmd = promisify(exec);

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
 * Copy jars produced by the Maven build.
 */
function copyJars() {
    if (fs.existsSync(Config.libDirPath)) {
        rimraf.sync(Config.libDirPath);
    }
    fs.mkdirSync(Config.libDirPath);

    // Copy the LDS jar.
    fs.copyFileSync(Config.ldsJarFile, 
        path.join(Config.libDirPath, Config.ldsJarName))

    // Copy SWT plugins, needed by LDS.
    fs.readdirSync(Config.swtJarsDirPath).forEach(
        (name: string) => {
            let found = name.match(Config.swtJarRegex)
            if (found !== null) {
                // Copy file, strip version numbers.
                fs.copyFileSync(path.join(Config.swtJarsDirPath, name),
                    path.join(Config.libDirPath, 
                        name.replace(found.groups.version, '')))
            }
        }
    )
}

/**
 * Check out the Lingua Franca repo.
 * @param options CLI options
 */
async function fetchDeps(options: OptionValues) {
    console.log("> fetching Lingua Franca sources...")
    if (!fs.existsSync(Config.repoName)
        || fs.readdirSync(Config.repoName).length === 0) {
        console.log("> cloning lingua-franca repo: " + Config.repoURL)
        await simpleGit(Config.baseDirPath)
        .clone(Config.repoURL)
        .catch((err) => console.log("> error: clone failed: " + err))
    }

    const git: SimpleGit = simpleGit(
        path.resolve(Config.baseDirPath, Config.repoName));

    if (options.ref) {
        console.log("> using lingua-franca ref: " + options.ref)
        await git.checkout(options.ref)
        .catch((err) => console.log("> error: checkout failed: " + err))
    } else {
        let branch = options.branch ? options.branch : 'master'
        console.log("> using lingua-franca branch: " + branch)
        await git.checkout(branch).pull()
        .catch((err) => console.log("> error: checkout failed: " + err))
    }
    console.log("> updating Git submodules...")
    await git.submoduleUpdate(["--init"])
    .catch((err) => console.log("> error: submodule updates failed: " + err))
}

/**
 * Check whether version of installed Java is correct.
 */
async function checkJavaVersion() {
    console.log("> verifying Java compiler version...")
    try {
        const {stdout} = await runCmd('javac --version')
        const found = stdout.match(Config.javacRegex)
        if (found) {
            if (found.groups?.version == Config.javacVersion) {
                console.log("> Java compiler version is "
                    + Config.javacVersion)
                return
            }
            // Not the required version.
            console.log("> Java compiler version is " + found.groups?.version)
            console.log(red("> incompatible version of Java compiler (must be "
                + Config.javacVersion + "); aborting"))
            exit(1)
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
    await checkInstalled(Config.buildDeps)
    await checkJavaVersion()
    const opts = getOpts()
    let co = Config.repoName
    if (opts.local) {
        console.log("> using repo located in " + opts.local)
        co = opts.local
    } else {
        await fetchDeps(opts)
    }
    const mvn = (require('maven')).create({
        cwd: co
    });
    console.log("> starting Maven build...")
    mvn.execute(['clean', 'package', '-P', 'lds', '-U'], { 'skipTests' : 'true' })
    .then(() => {
        copyJars()
    });    
}

/**
 * Check whether the given dependencies are installed.
 * @param deps Array of dependencies.
 */
async function checkInstalled(deps: string[]) {
    let missing = [];
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
