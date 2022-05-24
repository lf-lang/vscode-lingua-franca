import * as path from 'path';

import { runTests } from '@vscode/test-electron';

async function main() {
    try {
        const extensionDevelopmentPath = path.resolve(__dirname, '../../');
        const extensionTestsPath = path.resolve(__dirname, './index.js');
        const extensionTestsEnv = { dependencies: require('minimist')(process.argv)['dependencies'] };
        await runTests({ extensionDevelopmentPath, extensionTestsPath, extensionTestsEnv });
    } catch (err) {
        console.error(err);
        console.error('Failed to run tests');
        process.exit(1);
    }
}

main();
