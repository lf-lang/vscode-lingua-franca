/**
 * Define a SemVer-style version number.
 * @author Peter Donovan <peterdonovan@berkeley.edu>
 */
export class Version {
    public static readonly regex = /\bv?(?<major>\d+)\.(?<minor>\d+)\.(?<patch>\d+)/;
    private static readonly permissiveRegex = /\b(?<major>\d{1,3})\b/;
    readonly major: number;
    readonly minor: number;
    readonly patch: number;

    constructor(version: string, permissive?: boolean) {
        if (!Version.regex.test(version)) {
            if (permissive && Version.permissiveRegex.test(version)) {
                this.major = parseInt(version.match(Version.permissiveRegex)!.groups!.major, 10);
                this.minor = 0;
                this.patch = 0;
                return;
            }
            throw new Error(`${version} does not describe a valid version number.`);
        }
        const result = version.match(Version.regex);
        this.major = parseInt(result!.groups!.major, 10);
        this.minor = parseInt(result!.groups!.minor, 10);
        this.patch = parseInt(result!.groups!.patch, 10);
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
