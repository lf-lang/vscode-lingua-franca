'use strict';

import * as fs from 'fs'
import * as path from 'path'
import * as rimraf from 'rimraf'
import simpleGit, { SimpleGit } from 'simple-git'
import { Command, OptionValues } from 'commander'
import { Config } from './config'
import { exit } from 'process';
import { bold, green, red } from 'colorette'

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
}

/**
 * Check whether version of installed Java is correct.
 */
function checkJavaVersion() {
    // FIXME
}

/**
 * Build dependencies and collects produced jars. 
 */
async function build() {
    await checkInstalled(Config.buildDeps)
    checkJavaVersion()
    await fetchDeps(getOpts())
    const mvn = (require('maven')).create({
        cwd: Config.repoName
    });
    console.log("> starting Maven build...")
    mvn.execute(['clean', 'package', '-P', 'lds'], { 'skipTests' : 'true' })
    .then(() => {
        copyJars()
    });    
}

/**
 * Check whether the given dependencies are installed.
 * 
 * @param deps Array of dependencies.
 */
async function checkInstalled(deps: string[]) {
    const which = require('which')
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
        console.log("> " + bold("please install: " + missing.toString()))
        console.error("> " + red("missing dependencies; aborting"))
        exit(1)
    }
}

build()
