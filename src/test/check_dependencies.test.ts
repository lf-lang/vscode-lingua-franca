import * as os from 'os';
import * as checkDependencies from '../check_dependencies';
import * as vscode from 'vscode';
import chai from 'chai';
import spies from 'chai-spies';
import { expect } from 'chai';
import { after, Context } from 'mocha';
import { MessageShower } from '../utils';
import * as config from '../config';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
const runCmd = promisify(exec);

chai.use(spies);

enum Dependencies {
    Missing0 = 'missing0',  // Missing even the most basic dependencies
    Missing1 = 'missing1',  // Missing semi-optional dependencies
    Outdated = 'outdated',
    Present = 'present',
}

type Test = () => Promise<void>;

const basicDependencyTestTimeout = 10 * 1000;  // Time is given in milliseconds.
const extendedDependencyTestTimeout = 60 * 1000;
const maxInstallationTime = 20 * 1000;

suite('test dependency checking',  () => {
    after(() => { vscode.window.showInformationMessage('dependency checking tests complete!') });

    const dependencies: Dependencies = (() => {
        const dependenciesString = process.env.dependencies.toLowerCase();
        for (const v in Dependencies) {
            if (v.toLowerCase() === dependenciesString) return Dependencies[v];
        }
        throw new Error(
            `"${dependenciesString}" is not a valid dependency state.
            Acceptable values are "${Object.keys(Dependencies).join('", "')}"`
        );
    })();

    type Spy = ChaiSpies.SpyFunc1Proxy<string, Thenable<string>>;

    function getMockMessageShower(buttonClicked?: string): Spy {
        const mock: MessageShower = (message: string, ...items: string[]) =>
            Promise.resolve(buttonClicked);
        return chai.spy(mock);
    };

    function checkBasicDependency(
        checker: checkDependencies.UserFacingVersionChecker,
        depMissingMessage: string,
        context?: Context
    ): Test {
        return async function () {
            (context ?? this).timeout(basicDependencyTestTimeout);
            const spy = getMockMessageShower();
            switch (dependencies) {
            case Dependencies.Present:
                await expectSuccess(checker, spy);
                break;
            case Dependencies.Missing0:
            case Dependencies.Outdated:
                await expectFailure(checker, spy);
                expect(spy).to.have.been.called.with(depMissingMessage);
                break;
            case Dependencies.Missing1:
                (context ?? this).test.skip();
            default:
                throw new Error('unreachable');
            }
        };
    }

    const expectSuccess = async (checker: checkDependencies.UserFacingVersionChecker, spy: Spy) => {
        expect(await checker(spy)()).to.be.true;
        expect(spy).not.to.have.been.called;
    };
    const expectFailure = async (checker: checkDependencies.UserFacingVersionChecker, spy: Spy) => {
        expect(await checker(spy)()).to.be.false;
        expect(spy).to.have.been.called;
    };

    test('java', checkBasicDependency(
        checkDependencies.checkJava,
        `Java version ${config.javaVersion.major} is required for Lingua Franca diagrams and code analysis.`
    ));

    test('python3', async function() {
        // At least some popular Linux distros (including the one used in CI) require Python to
        // function.
        if (os.platform() == 'linux') this.test.skip();
        return await checkBasicDependency(
            checkDependencies.checkPython3,
            `Python version ${config.pythonVersion} or higher is required for compiling LF programs with the Python target.`,
            this
        )();
    });

    test('node', checkBasicDependency(
        checkDependencies.checkNode,
        'Node.js is required for executing LF programs with the TypeScript target.'
    ));

    test('pylint', async function() {
        this.timeout(extendedDependencyTestTimeout);
        const spy = getMockMessageShower('Install');
        switch (dependencies) {
        case Dependencies.Present:
            await expectSuccess(checkDependencies.checkPylint, spy);
            break;
        case Dependencies.Missing0:
            this.test.skip();
        case Dependencies.Missing1:
            await expectFailure(checkDependencies.checkPylint, spy);
            expect(spy).to.have.been.called.with(
                `Pylint is a recommended linter for Lingua Franca's Python target.`
            );
            await new Promise(resolve => setTimeout(resolve, maxInstallationTime));
            await expectSuccess(checkDependencies.checkPylint, spy);
            break;
        case Dependencies.Outdated:
            await expectFailure(checkDependencies.checkPylint, spy);
            expect(spy).to.have.been.called.with(
                `The Lingua Franca language server is tested with Pylint version `
                + `${config.pylintVersion.major}.${config.pylintVersion.minor} and newer.`
            );
            await expectSuccess(checkDependencies.checkPylint, spy);
            break;
        default:
            throw new Error('unreachable');
        }
    });

    test('pnpm', async function() {
        this.timeout(extendedDependencyTestTimeout * 10);
        const spy = getMockMessageShower('Install');
        switch (dependencies) {
        case Dependencies.Present:
            await expectSuccess(checkDependencies.checkPnpm, spy);
            break;
        case Dependencies.Missing0:
            await expectFailure(checkDependencies.checkPnpm, spy);
            expect(spy).to.have.been.called.with(
                'In order to compile LF programs with a TypeScript target, it is necessary to install pnpm.'
            );
            await new Promise(resolve => setTimeout(resolve, maxInstallationTime * 10));
            // The following will fail because PNPM's installation script requires you to open a new
            // terminal in order for PNPM to be on your PATH. I have attempted to source the
            // ~/.bashrc to work around this, without success.
            // await expectSuccess(checkDependencies.checkPnpm, spy);
            break;
        case Dependencies.Missing1:
            await expectFailure(checkDependencies.checkPnpm, spy);
            expect(spy).to.have.been.called.with(
                'To prevent an accumulation of replicated dependencies when compiling LF programs with a '
                + 'TypeScript target, it is highly recommended to install pnpm globally.'
            );
            await new Promise(resolve => setTimeout(resolve, maxInstallationTime));
            await expectSuccess(checkDependencies.checkPnpm, spy);
            break;
        case Dependencies.Outdated:
            throw new Error('This feature (checking for an outdated pnpm) is not yet implemented.');
        default:
            throw new Error('unreachable');
        }
    });
});