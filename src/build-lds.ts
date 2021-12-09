'use strict';

import * as fs from 'fs'
import * as path from 'path'
import * as rimraf from 'rimraf'
import simpleGit, { SimpleGit } from 'simple-git';
import { Command } from 'commander';

const program = new Command();

program
    .option('-r, --ref <ref>', 'check out a particular commit')
    .option('-b, --branch <branch>', 'check out the HEAD of a particular branch');

program.parse(process.argv);
const options = program.opts();

export class Config {
    static readonly baseDir = path.resolve(path.dirname(require.main.filename), '..')
    static readonly lsDir = path.resolve(Config.baseDir, 'ls')
    static readonly ldsJar = 'lflang-lds.jar'
    static readonly swtJarRegex = /org\.eclipse\.swt\..+(?<version>\.x86.+)\.jar$/
    static readonly pkgName = 'org.lflang.lds'
    static readonly repoName = 'lingua-franca'
    static readonly swtJarsDir = path.resolve(Config.baseDir, path.join(Config.repoName, Config.pkgName, 'target', 'repository', 'plugins'))
    static readonly ldsJarFile = path.resolve(Config.baseDir, path.join(Config.repoName, Config.pkgName, 'target', 'exe', Config.ldsJar))
    static readonly repoURL = 'https://github.com/lf-lang/lingua-franca.git'
}

function copyJars() {
    if (fs.existsSync(Config.lsDir)) {
        rimraf.sync(Config.lsDir);
    }
    fs.mkdirSync(Config.lsDir);

    // Copy the LDS jar.
    fs.copyFileSync(Config.ldsJarFile, path.join(Config.lsDir, Config.ldsJar))

    // Copy swt plugins, needed by LDS.
    fs.readdirSync(Config.swtJarsDir).forEach(
        (name: string) => {
            let found = name.match(Config.swtJarRegex);
            if (found !== null) {
                fs.copyFileSync(path.join(Config.swtJarsDir, name),
                    path.join(Config.lsDir, name.replace(found.groups.version, '')))
            }
        }
    )
}

async function fetchDeps() {

    if (!fs.existsSync(Config.repoName) || fs.readdirSync(Config.repoName).length === 0) {
        console.log("> cloning lingua-franca repo: " + Config.repoURL)
        await simpleGit(Config.baseDir)
        .clone(Config.repoURL)
        .catch((err) => console.log("> error: clone failed: " + err))
    }

    const git: SimpleGit = simpleGit(path.resolve(Config.baseDir, Config.repoName));

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

async function build() {
    await fetchDeps()
    const mvn = (require('maven')).create({
        cwd: Config.repoName
    });

    mvn.execute(['clean', 'package', '-P', 'lds'], { 'skipTests' : 'true' }).then(() => {
    copyJars()
    });    
}

build()