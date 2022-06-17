/**
 * @file Integration tests for the dependency checking mechanism.
 * @author Peter Donovan <peterdonovan@berkeley.edu>
 */

import * as os from 'os';
import * as checkDependencies from '../check_dependencies';
import { Dependency } from '../check_dependencies';
import * as vscode from 'vscode';
import chai from 'chai';
import spies from 'chai-spies';
import { expect } from 'chai';
import { after, Context } from 'mocha';
import { MessageShower } from '../utils';

chai.use(spies);

enum DependencyStatus {
    Missing0 = 'missing0',  // Missing even the most basic dependencies
    Missing1 = 'missing1',  // Missing semi-optional dependencies
    Outdated = 'outdated',
    Present = 'present',
}

type Test = () => Promise<void>;

const basicTimeoutMilliseconds = 10 * 1000;
const extendedTimeoutMilliseconds = 60 * 1000;
const maxInstallationTimeMilliseconds = 20 * 1000;

suite('test dependency checking',  () => {
    after(() => { vscode.window.showInformationMessage('dependency checking tests complete!') });

    const dependencies: DependencyStatus = (() => {
        const dependenciesString = process.env.dependencies.toLowerCase();
        for (const v in DependencyStatus) {
            if (v.toLowerCase() === dependenciesString) return DependencyStatus[v];
        }
        throw new Error(
            `"${dependenciesString}" is not a valid dependency state.
            Acceptable values are "${Object.keys(DependencyStatus).join('", "')}"`
        );
    })();

    type Spy = ChaiSpies.SpyFunc1Proxy<string, Thenable<string>>;

    function getMockMessageShower(): Spy {
        const mock: MessageShower = (message: string, ...items: string[]) =>
            Promise.resolve(items.find(
                it => it.toLowerCase().includes('update') || it.toLowerCase().includes('install')
            ));
        return chai.spy(mock);
    };

    function checkBasicDependency(
        dependency: Dependency,
        depMissingMessage: string,
        context?: Context
    ): Test {
        return async function () {
            (context ?? this).timeout(basicTimeoutMilliseconds);
            const spy = getMockMessageShower();
            switch (dependencies) {
            case DependencyStatus.Present:
                await expectSuccess(dependency, spy);
                break;
            case DependencyStatus.Missing0:
            case DependencyStatus.Outdated:
                await expectFailure(dependency, spy);
                expect(spy).to.have.been.called.with(depMissingMessage);
                break;
            case DependencyStatus.Missing1:
                (context ?? this).test.skip();
            default:
                throw new Error('unreachable');
            }
        };
    }

    const expectSuccess = async (dependency: Dependency, spy: Spy) => {
        expect(await checkDependencies.checkerFor(dependency)(spy)()).to.be.true;
        expect(spy).not.to.have.been.called;
    };
    const expectFailure = async (dependency: Dependency, spy: Spy) => {
        expect(await checkDependencies.checkerFor(dependency)(spy)()).to.be.false;
        expect(spy).to.have.been.called;
    };

    test('java', checkBasicDependency(Dependency.Java, checkDependencies.javaMessage));

    test('python3', checkBasicDependency(Dependency.Python3, checkDependencies.python3Message));

    test('cmake', checkBasicDependency(Dependency.Cmake, checkDependencies.cmakeMessage));

    test('pylint', async function() {
        this.timeout(extendedTimeoutMilliseconds);
        const spy = getMockMessageShower();
        switch (dependencies) {
        case DependencyStatus.Present:
            await expectSuccess(Dependency.Pylint, spy);
            break;
        case DependencyStatus.Missing0:
            this.test.skip();
        case DependencyStatus.Missing1:
            await expectFailure(Dependency.Pylint, spy);
            expect(spy).to.have.been.called.with(checkDependencies.pylintMessage);
            await new Promise(resolve => setTimeout(resolve, maxInstallationTimeMilliseconds));
            await expectSuccess(Dependency.Pylint, spy);
            break;
        case DependencyStatus.Outdated:
            throw new Error('unreachable');
            // FIXME: Dead code
            // await expectFailure(checkDependencies.checkPylint, spy);
            // expect(spy).to.have.been.called.with(
            //     `The Lingua Franca language server is tested with Pylint version `
            //     + `${config.pylintVersion.major}.${config.pylintVersion.minor} and newer.`
            // );
            // await expectSuccess(checkDependencies.checkPylint, spy);
            break;
        default:
            throw new Error('unreachable');
        }
    });

    test('node', checkBasicDependency(Dependency.Node, checkDependencies.nodeMessage));

    test('pnpm', async function() {
        this.timeout(extendedTimeoutMilliseconds);
        const spy = getMockMessageShower();
        switch (dependencies) {
        case DependencyStatus.Present:
            await expectSuccess(Dependency.Pnpm, spy);
            break;
        case DependencyStatus.Missing0:
            await expectFailure(Dependency.Pnpm, spy);
            expect(spy).to.have.been.called.with(checkDependencies.pnpmMessage);
            // The following will fail because PNPM's installation script requires you to open a new
            // terminal in order for PNPM to be on your PATH. I have attempted to source the
            // ~/.bashrc to work around this, without success.
            // sendNewline();
            // await new Promise(resolve => setTimeout(resolve, maxInstallationTime));
            // await expectSuccess(checkDependencies.checkPnpm, spy);
            break;
        case DependencyStatus.Missing1:
            await expectFailure(Dependency.Pnpm, spy);
            expect(spy).to.have.been.called.with(
                'To prevent an accumulation of replicated dependencies when compiling LF programs '
                + 'with the TypeScript target, it is highly recommended to install pnpm globally.'
            );
            await new Promise(resolve => setTimeout(resolve, maxInstallationTimeMilliseconds));
            await expectSuccess(Dependency.Pnpm, spy);
            break;
        case DependencyStatus.Outdated:
            throw new Error('This feature (checking for an outdated pnpm) is not yet implemented.');
        default:
            throw new Error('unreachable');
        }
    });

    test('rust', checkBasicDependency(Dependency.Rust, checkDependencies.rustMessage));

    test('rti', async function () {
        if (os.platform() == 'win32') this.test.skip();  // No Windows federated support.
        this.timeout(basicTimeoutMilliseconds);
        const spy = getMockMessageShower();
        switch (dependencies) {
        case DependencyStatus.Present:
            await expectSuccess(Dependency.Rti, spy);
            break;
        case DependencyStatus.Missing0:
        case DependencyStatus.Outdated:
            this.test.skip();
        case DependencyStatus.Missing1:
            await expectFailure(Dependency.Rti, spy);
            expect(spy).to.have.been.called.with(checkDependencies.rtiMessage);
            break;
        default:
            throw new Error('unreachable');
        }
    });
});
