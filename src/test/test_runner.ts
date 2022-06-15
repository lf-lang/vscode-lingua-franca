import * as path from 'path';
import * as fs from 'fs';
import { runTests } from '@vscode/test-electron';
import * as os from 'os';
import which from 'which';
import { execSync } from 'child_process';

const minimalDependencies = ['brew', 'curl', 'apt-get', 'choco', 'readlink', 'dirname'];
const minimalDependenciesPath = 'temporary_test_deps_please_remove';

async function main() {
    try {
        const extensionDevelopmentPath = path.resolve(__dirname, '../../');
        const extensionTestsPath = path.resolve(__dirname, './index.js');
        const extensionTestsEnv: {dependencies: string, PATH?: string} = {
            dependencies: require('minimist')(process.argv)['dependencies']
        };
        if (extensionTestsEnv.dependencies == 'missing0') {
            extensionTestsEnv.PATH = path.resolve(minimalDependenciesPath);
            fs.mkdirSync(minimalDependenciesPath);
            for (const d of minimalDependencies) {
                try {
                    const currentLocation = await which(d);
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
                } catch (e) {
                    console.log(e);
                }
            }
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
