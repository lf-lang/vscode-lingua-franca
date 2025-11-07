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
import { after } from 'mocha';
import { MessageDisplayHelper } from '../utils';
import * as http from 'http';
import * as url from 'url';
import * as config from '../config';
import dependency_status from './dependency_status';

chai.use(spies);

enum DependencyStatus {
    Missing0 = 'missing0',  // Missing even the most basic dependencies
    Missing1 = 'missing1',  // Missing semi-optional dependencies
    Outdated = 'outdated',
    Present = 'present',
}

type Test = () => Promise<void>;

const basicTimeoutMilliseconds = 60 * 1000;
const extendedTimeoutMilliseconds = 240 * 1000;
const maxInstallationTimeMilliseconds = 120 * 1000;
const linkCheckingTimeoutMilliseconds = 60 * 1000;

suite('test dependency checking',  () => {
    after(() => { vscode.window.showInformationMessage('dependency checking tests complete!') });

    const dependencies: DependencyStatus = dependency_status();

    type Spy = ChaiSpies.SpyFunc1Proxy<string, Thenable<string | undefined>>;

    function getMockMessageShower(): Spy {
        const mock: MessageDisplayHelper = (message: string, ...items: string[]) =>
            Promise.resolve(items.find(
                it => it.toLowerCase().includes('update') || it.toLowerCase().includes('install')
            ));
        return chai.spy(mock);
    };

    function checkBasicDependency(dependency: Dependency, depMissingMessage: string): Test {
        return async function (this: any) {
            this.timeout(basicTimeoutMilliseconds);
            const spy = getMockMessageShower();
            switch (dependencies) {
            case DependencyStatus.Present:
                await expectSuccess(dependency, spy);
                break;
            case DependencyStatus.Outdated:
                this.test?.skip();
            case DependencyStatus.Missing0:
                await expectFailure(dependency, spy);
                expect(spy).to.have.been.called.with(depMissingMessage + " " + checkDependencies.caveat);
                break;
            case DependencyStatus.Missing1:
                this.test?.skip();
            default:
                throw new Error('unreachable');
            }
        };
    }

    const expectSuccess = async (dependency: Dependency, spy: Spy) => {
        expect(await checkDependencies.checkerFor(dependency)!(spy)()).to.be.true;
        expect(spy).not.to.have.been.called;
    };
    const expectFailure = async (dependency: Dependency, spy: Spy) => {
        expect(await checkDependencies.checkerFor(dependency)!(spy)()).to.be.false;
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
            this.test?.skip();
        case DependencyStatus.Missing1:
            await expectFailure(Dependency.Pylint, spy);
            expect(spy).to.have.been.called.with(checkDependencies.pylintMessage + " " + checkDependencies.caveat);
            await new Promise(resolve => setTimeout(resolve, maxInstallationTimeMilliseconds));
            await expectSuccess(Dependency.Pylint, spy);
            break;
        case DependencyStatus.Outdated:
            await expectFailure(Dependency.Pylint, spy);
            expect(spy).to.have.been.called.with(
                `The Lingua Franca language server is tested with Pylint version `
                    + `${config.pylintVersion.major}.${config.pylintVersion.minor} and newer, but `
                    + `the version detected on your system is 2.10.0. ${checkDependencies.caveat}`
            );
            await new Promise(resolve => setTimeout(resolve, maxInstallationTimeMilliseconds));
            await expectSuccess(Dependency.Pylint, spy);
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
            expect(spy).to.have.been.called.with(checkDependencies.pnpmMessage + " " + checkDependencies.caveat);
            break;
        case DependencyStatus.Missing1:
            await expectFailure(Dependency.Pnpm, spy);
            expect(spy).to.have.been.called.with(
                'To prevent an accumulation of replicated dependencies when compiling LF programs '
                + 'with the TypeScript target, it is highly recommended to install pnpm globally.' + " " + checkDependencies.caveat
            );
            await new Promise(resolve => setTimeout(resolve, maxInstallationTimeMilliseconds));
            await expectSuccess(Dependency.Pnpm, spy);
            break;
        case DependencyStatus.Outdated:
            this.test?.skip();
        default:
            throw new Error('unreachable');
        }
    });

    test('rust', async function () {
        this.timeout(extendedTimeoutMilliseconds);
        const spy = getMockMessageShower();
        switch (dependencies) {
        case DependencyStatus.Present:
            await expectSuccess(Dependency.Rust, spy);
            break;
        case DependencyStatus.Outdated:
            await expectFailure(Dependency.Rust, spy);
            await new Promise(resolve => setTimeout(resolve, maxInstallationTimeMilliseconds));
            await expectSuccess(Dependency.Rust, spy);
            break;
        case DependencyStatus.Missing0:
            await expectFailure(Dependency.Rust, spy);
            expect(spy).to.have.been.called.with(checkDependencies.rustMessage + " " + checkDependencies.caveat);
            break;
        case DependencyStatus.Missing1:
            this.test?.skip();
        default:
            throw new Error('unreachable');
        }
    });

    test('hyperlinks', async function() {
        this.timeout(linkCheckingTimeoutMilliseconds);
        if (dependencies != DependencyStatus.Present) this.test?.skip();
        for (const checkset of checkDependencies.watcherConfig) {
            for (const check of checkset.checks) {
                if (check.installLink) {
                    console.log(`Checking that the link "${check.installLink}" is not broken...`);
                    const installUrl = new url.URL(check.installLink);
                    expect((await new Promise<number>(function(resolve) {
                        const req = http.request(
                            { host: installUrl.host, path: installUrl.pathname },
                            res => {
                                console.log(`Got status=${res.statusCode}`);
                                resolve(res.statusCode!);
                            }
                        ).end();
                    }))).to.be.lessThan(400);
                }
            }
        }
    });
});
