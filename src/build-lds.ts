'use strict';

import * as fs from 'fs'
import * as path from 'path'
import * as rimraf from 'rimraf'

const lsDir = 'ls'
const ldsJar = 'lflang-lds.jar'
const swtJarRegex = /org\.eclipse\.swt\..+(?<version>\.x86.+)\.jar$/
const pluginsPath = path.join('lingua-franca', 'org.lflang.lds', 'target', 'repository', 'plugins')
const ldsPath = path.join('lingua-franca', 'org.lflang.lds', 'target', 'exe', ldsJar)

const mvn = (require('maven')).create({
    cwd: 'lingua-franca'
});

// mvn.execute(['clean', 'package', '-P', 'lds'], { 'skipTests' : 'true' }).then(() => {

// });

if (fs.existsSync(lsDir)) {
    rimraf.sync(lsDir);
}
fs.mkdirSync(lsDir);

// Copy the LDS jar.
fs.copyFileSync(ldsPath, path.join(lsDir, ldsJar))

// Copy swt plugins, needed by LDS.
fs.readdirSync(pluginsPath).forEach(
    (name: string) => {
        let found = name.match(swtJarRegex);
        if (found !== null) {
            fs.copyFileSync(path.join(pluginsPath, name), 
                    path.join(lsDir, name.replace(found.groups.version, '')))
        }
    }
)

// npm run compile && npm run build
