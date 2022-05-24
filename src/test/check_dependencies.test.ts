
import { checkJava, checkPylint, UserFacingVersionChecker } from '../check_dependencies';
import * as vscode from 'vscode';
const chai = require('chai');
const spies = require('chai-spies');
import { expect } from 'chai';
import { after } from 'mocha';
import { MessageShower } from '../utils';

chai.use(spies);

enum Dependencies {
    Present = "present",
    Missing = "missing",
    Outdated = "outdated"
}

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

    const getMockMessageShower = () => {
        const fn = (message: string, ...items: string[]) => Promise.resolve("");
        return { mockMessageShower: fn, spy: chai.spy(fn) }
    };
    
    const expectSuccess = async (checker: UserFacingVersionChecker, mockMessageShower: MessageShower, spy) => {
        expect(await checker(mockMessageShower)()).to.be.true;
        expect(spy).not.to.have.been.called;
    };
    const expectFailure = async (checker: UserFacingVersionChecker, mockMessageShower: MessageShower, spy) => {
        expect(await checker(mockMessageShower)()).to.be.false;
        expect(spy).to.have.been.called;
        expect(spy.arguments.join()).to.contain("Install");
    };

    test('java', () => {
        const { mockMessageShower, spy } = getMockMessageShower();
        switch (dependencies) {
        case Dependencies.Present:
            expectSuccess(checkJava, mockMessageShower, spy);
            break;
        case Dependencies.Missing:
        case Dependencies.Outdated:
            expectFailure(checkJava, mockMessageShower, spy);
            expect(spy.arguments.join()).to.contain("Java");
            break;
        }
    });

    // it('pylint', () => {
    //     const mockMessageShower = getMockMessageShower();
    //     switch (dependencies) {
    //     case Dependencies.Present:
    //         expectSuccess(checkPylint, mockMessageShower);
    //         break;
    //     case Dependencies.Missing:
    //         expectFailure(checkPylint, mockMessageShower);
    //         expect(mockMessageShower.mock.calls[0][0])
    //             .toEqual(expect.stringContaining('recommended'));
    //         break;
    //     case Dependencies.Outdated:
    //         expectFailure(checkPylint, mockMessageShower);
    //         expect(mockMessageShower.mock.calls[0][0])
    //             .toEqual(expect.stringContaining('version'));
    //         break;
    //     }
    // });
});
