/**
 * @file Setup for the integration tests.
 *
 * See https://code.visualstudio.com/api/working-with-extensions/testing-extension#the-test-runner-script
 * for background.
 *
 * @author Peter Donovan <peterdonovan@berkeley.edu>
 */

import * as path from 'path';
import * as fs from 'fs';
import { runTests } from '@vscode/test-electron';
import * as os from 'os';
import which from 'which';
import { execSync } from 'child_process';

const minimalDependencies = ['brew', 'curl', 'apt-get', 'choco', 'readlink', 'dirname'];
const minimalDependenciesPath = 'temporary_test_deps_please_remove';

/** Return a path from which the minimal dependencies can be accessed, but nothing else. */
async function getFreshPath(): Promise<string> {
    fs.mkdirSync(minimalDependenciesPath);
    for (const d of minimalDependencies) {
        let currentLocation: string | undefined;
        try {
            currentLocation = await which(d);
        } catch (e) { /* Do nothing */ }
        if (currentLocation) {
            if (os.platform() === 'win32') {
                console.log(execSync(
                    `mklink "${path.resolve(minimalDependenciesPath, d)}" "${currentLocation}"`
                ));
            } else {
                const newLocation = path.resolve(minimalDependenciesPath, d);
                console.log(execSync(
                    `printf '#!/bin/bash\\n${currentLocation} $@' > ${newLocation} && chmod +x ${newLocation}`
                ));
            }
        }
    }
    return path.resolve(minimalDependenciesPath);
}

async function main() {
    try {
        const extensionDevelopmentPath = path.resolve(__dirname, '../../');
        const extensionTestsPath = path.resolve(__dirname, './index.js');
        const extensionTestsEnv: {dependencies: string, PATH?: string} = {
            dependencies: require('minimist')(process.argv)['dependencies']
        };
        if (extensionTestsEnv.dependencies === 'missing0') {
            extensionTestsEnv.PATH = await getFreshPath();
        }
        await runTests({
            extensionDevelopmentPath,
            extensionTestsPath,
            extensionTestsEnv,
			launchArgs: [
				'--disable-extensions',
				`--user-data-dir=${extensionDevelopmentPath}/.user-data-dir-test`,
				// https://github.com/microsoft/vscode/issues/115794#issuecomment-774283222
				'--force-disable-user-env'
			]
        });
    } catch (err) {
        console.error(err);
        console.error('Failed to run tests');
        process.exit(1);
    }
}

main();
