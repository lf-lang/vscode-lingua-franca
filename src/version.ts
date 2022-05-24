/**
 * Define a SemVer-style version number.
 */
export class Version {
    public static readonly regex = /\b(?<major>\d+)\.(?<minor>\d+)\.(?<patch>\d+)/;
    readonly major: number;
    readonly minor: number;
    readonly patch: number;

    constructor(version: string) {
        if (!Version.regex.test(version)) {
            throw new Error(`${version} does not describe a valid version number.`);
        }
        const result = version.match(Version.regex);
        this.major = parseInt(result.groups.major, 10);
        this.minor = parseInt(result.groups.minor, 10);
        this.patch = parseInt(result.groups.patch);
    }

    isAtLeast(version: Version | string): boolean {
        if (typeof version === 'string') version = new Version(version);
        if (this.major > version.major) return true;
        if (this.major < version.major) return false;
        if (this.minor > version.minor) return true;
        if (this.minor < version.minor) return false;
        return this.patch >= version.patch;
    }

    isCompatibleWith(version: Version | string): boolean {
        if (typeof version == 'string') version = new Version(version);
        return this.major === version.major;
    }

    toString(): string {
        return `${this.major}.${this.minor}.${this.patch}`;
    }
}
