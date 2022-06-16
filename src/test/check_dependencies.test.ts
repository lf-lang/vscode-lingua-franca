import * as os from 'os';
import * as checkDependencies from '../check_dependencies';
import * as vscode from 'vscode';
import chai from 'chai';
import spies from 'chai-spies';
import { expect } from 'chai';
import { after, Context } from 'mocha';
import { MessageShower } from '../utils';
import * as config from '../config';

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

    test('python3', checkBasicDependency(
        checkDependencies.checkPython3,
        `Python version ${config.pythonVersion} or higher is required for compiling LF programs with the Python target.`
    ));

    test('cmake', checkBasicDependency(
        checkDependencies.checkCmake,
        `CMake version ${config.cmakeVersion} or higher is recommended for compiling LF `
        + `programs with the C or C++ target.`
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

    test('node', checkBasicDependency(
        checkDependencies.checkNode,
        'Node.js is required for executing LF programs with the TypeScript target.'
    ));

    test('pnpm', async function() {
        this.timeout(extendedDependencyTestTimeout);
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
            // The following will fail because PNPM's installation script requires you to open a new
            // terminal in order for PNPM to be on your PATH. I have attempted to source the
            // ~/.bashrc to work around this, without success.
            // await new Promise(resolve => setTimeout(resolve, maxInstallationTime));
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

    test('rust', checkBasicDependency(
        checkDependencies.checkRust,
        'The Rust compiler is required for compiling LF programs with the Rust target.'
    ));

    test('rti', async function () {
        this.timeout(basicDependencyTestTimeout);
        const spy = getMockMessageShower();
        switch (dependencies) {
        case Dependencies.Present:
            await expectSuccess(checkDependencies.checkRti, spy);
            break;
        case Dependencies.Missing0:
        case Dependencies.Outdated:
            this.test.skip();
        case Dependencies.Missing1:
            await expectFailure(checkDependencies.checkRti, spy);
            expect(spy).to.have.been.called.with('The Lingua Franca runtime infrastructure (RTI) '
                + 'is required for executing federated LF programs.');
            break;
        default:
            throw new Error('unreachable');
        }
    });
});
