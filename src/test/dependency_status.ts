export enum DependencyStatus {
    Missing0 = 'missing0',  // Missing even the most basic dependencies
    Missing1 = 'missing1',  // Missing semi-optional dependencies
    Outdated = 'outdated',
    Present = 'present',
}
export default () => {
    if (!process.env.dependencies) return DependencyStatus.Present
    const dependenciesString = process.env.dependencies.toLowerCase();
    for (const v in DependencyStatus) {
        if (v === undefined) return DependencyStatus.Present
        if (v.toLowerCase() === dependenciesString) return (DependencyStatus as any)[v];
    }
    throw new Error(
        `"${dependenciesString}" is not a valid dependency state.
        Acceptable values are "${Object.keys(DependencyStatus).join('", "')}"`
    );
}
