'use strict';

import * as path from 'path';
import Mocha from 'mocha';
import glob from 'glob';

export function run(): Promise<void> {
    const mocha = new Mocha({
        ui: 'tdd',
        color: true,
        reporterOptions: {
            maxDiffSize: 0
        }
    });

    const testsRoot = path.resolve(__dirname, '..');

    return new Promise((c, e) => {
        glob('**/**.test.js', { cwd: testsRoot }, (err, files) => {
            if (err) return e(err);
            files.forEach(f => mocha.addFile(path.resolve(testsRoot, f)));
            try {
                mocha.run((failures: number) => {
                    if (failures) e(new Error(`${failures} test${failures == 1 ? '' : 's'} failed.`));
                    else c();
                });
            } catch (err) {
                e(err);
            }
        })
    });
}
