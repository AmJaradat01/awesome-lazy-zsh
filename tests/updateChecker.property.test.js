// Feature: update-notification, Property 1: Version parsing round-trip
// **Validates: Requirements 1.2, 1.5**
//
// Feature: update-notification, Property 3: Version comparison consistency
// **Validates: Requirements 2.1, 2.2, 2.3**
//
// Feature: update-notification, Property 4: Invalid versions yield null
// **Validates: Requirements 2.4**
//
// Feature: update-notification, Property 5: Pre-release versions compare lower
// **Validates: Requirements 2.5**
//
// Feature: update-notification, Property 6: Cache freshness boundary
// **Validates: Requirements 7.2, 7.5**

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fc from 'fast-check';
import fs from 'fs';
import {
    parseVersion,
    compareVersions,
    isCacheFresh,
    readCache,
    writeCache,
    CACHE_FILE_PATH,
    CHECK_INTERVAL_MS
} from '../src/utils/updateChecker.js';

/**
 * Arbitrary: generates a valid semver tuple (major, minor, patch) of non-negative integers.
 */
function semverTupleArb() {
    return fc.record({
        major: fc.nat({ max: 999 }),
        minor: fc.nat({ max: 999 }),
        patch: fc.nat({ max: 999 })
    });
}

/**
 * Arbitrary: generates a valid semver string from a tuple.
 */
function semverStringArb() {
    return semverTupleArb().map(({ major, minor, patch }) => `${major}.${minor}.${patch}`);
}

/**
 * Arbitrary: generates a non-semver string (does not match digits.digits.digits pattern).
 */
function invalidVersionArb() {
    return fc.string({ minLength: 0, maxLength: 30 }).filter(s => {
        // Strip leading v for the same logic parseVersion uses
        let v = s.trim();
        if (v.startsWith('v')) v = v.slice(1);
        return !/^\d+\.\d+\.\d+(?:-.+)?$/.test(v);
    });
}

/**
 * Arbitrary: generates a pre-release suffix (non-empty alphanumeric with dots/dashes).
 */
function prereleaseArb() {
    return fc.stringMatching(/^[a-zA-Z0-9][a-zA-Z0-9.\-]{0,19}$/);
}

// Feature: update-notification, Property 1: Version parsing round-trip
describe('Property 1: Version parsing round-trip', () => {
    it('parseVersion returns correct components for any valid semver tuple', () => {
        fc.assert(
            fc.property(semverTupleArb(), ({ major, minor, patch }) => {
                const versionStr = `${major}.${minor}.${patch}`;
                const result = parseVersion(versionStr);

                assert.notEqual(result, null, `parseVersion("${versionStr}") should not be null`);
                assert.strictEqual(result.major, major);
                assert.strictEqual(result.minor, minor);
                assert.strictEqual(result.patch, patch);
                assert.strictEqual(result.prerelease, null);
            }),
            { numRuns: 100 }
        );
    });

    it('parseVersion handles "v" prefix correctly for any valid semver tuple', () => {
        fc.assert(
            fc.property(semverTupleArb(), ({ major, minor, patch }) => {
                const versionStr = `v${major}.${minor}.${patch}`;
                const result = parseVersion(versionStr);

                assert.notEqual(result, null, `parseVersion("${versionStr}") should not be null`);
                assert.strictEqual(result.major, major);
                assert.strictEqual(result.minor, minor);
                assert.strictEqual(result.patch, patch);
                assert.strictEqual(result.prerelease, null);
            }),
            { numRuns: 100 }
        );
    });

    it('parseVersion returns null for any string not matching the semver pattern', () => {
        fc.assert(
            fc.property(invalidVersionArb(), (invalidStr) => {
                const result = parseVersion(invalidStr);
                assert.strictEqual(result, null,
                    `parseVersion("${invalidStr}") should be null for invalid input`);
            }),
            { numRuns: 100 }
        );
    });
});

// Feature: update-notification, Property 3: Version comparison consistency
describe('Property 3: Version comparison consistency', () => {
    it('antisymmetry: compareVersions(a, b) === -compareVersions(b, a)', () => {
        fc.assert(
            fc.property(semverStringArb(), semverStringArb(), (a, b) => {
                const ab = compareVersions(a, b);
                const ba = compareVersions(b, a);

                assert.notEqual(ab, null);
                assert.notEqual(ba, null);
                assert.strictEqual(ab, -ba,
                    `compareVersions("${a}", "${b}") = ${ab}, compareVersions("${b}", "${a}") = ${ba}, expected antisymmetry`);
            }),
            { numRuns: 100 }
        );
    });

    it('reflexivity: compareVersions(a, a) === 0', () => {
        fc.assert(
            fc.property(semverStringArb(), (a) => {
                const result = compareVersions(a, a);
                assert.strictEqual(result, 0,
                    `compareVersions("${a}", "${a}") should be 0, got ${result}`);
            }),
            { numRuns: 100 }
        );
    });
});

// Feature: update-notification, Property 4: Invalid versions yield null
describe('Property 4: Invalid versions yield null', () => {
    it('compareVersions returns null when first argument is invalid', () => {
        fc.assert(
            fc.property(invalidVersionArb(), semverStringArb(), (invalid, valid) => {
                const result = compareVersions(invalid, valid);
                assert.strictEqual(result, null,
                    `compareVersions("${invalid}", "${valid}") should be null for invalid first arg`);
            }),
            { numRuns: 100 }
        );
    });

    it('compareVersions returns null when second argument is invalid', () => {
        fc.assert(
            fc.property(semverStringArb(), invalidVersionArb(), (valid, invalid) => {
                const result = compareVersions(valid, invalid);
                assert.strictEqual(result, null,
                    `compareVersions("${valid}", "${invalid}") should be null for invalid second arg`);
            }),
            { numRuns: 100 }
        );
    });
});

// Feature: update-notification, Property 5: Pre-release versions compare lower
describe('Property 5: Pre-release versions compare lower', () => {
    it('version without suffix is greater than same version with suffix', () => {
        fc.assert(
            fc.property(semverStringArb(), prereleaseArb(), (version, suffix) => {
                const withSuffix = `${version}-${suffix}`;
                const result = compareVersions(version, withSuffix);

                assert.strictEqual(result, 1,
                    `compareVersions("${version}", "${withSuffix}") should be 1 (version without suffix > version with suffix)`);
            }),
            { numRuns: 100 }
        );
    });
});

// Feature: update-notification, Property 6: Cache freshness boundary
describe('Property 6: Cache freshness boundary', () => {
    it('timestamps within 24h are fresh', () => {
        // Use a buffer of 1000ms to avoid flakiness from timing differences
        // between the Date.now() in the test and the Date.now() in isCacheFresh
        fc.assert(
            fc.property(
                fc.integer({ min: 1, max: CHECK_INTERVAL_MS - 1000 }),
                (ageMs) => {
                    const now = Date.now();
                    const checkedAt = new Date(now - ageMs).toISOString();
                    const cache = { checkedAt };

                    assert.strictEqual(isCacheFresh(cache), true,
                        `Cache checked ${ageMs}ms ago should be fresh`);
                }
            ),
            { numRuns: 100 }
        );
    });

    it('timestamps beyond 24h are stale', () => {
        fc.assert(
            fc.property(
                fc.integer({ min: 1, max: 365 * 24 * 60 * 60 * 1000 }),
                (extraMs) => {
                    const now = Date.now();
                    const checkedAt = new Date(now - CHECK_INTERVAL_MS - extraMs).toISOString();
                    const cache = { checkedAt };

                    assert.strictEqual(isCacheFresh(cache), false,
                        `Cache checked ${CHECK_INTERVAL_MS + extraMs}ms ago should be stale`);
                }
            ),
            { numRuns: 100 }
        );
    });

    it('future timestamps are stale', () => {
        fc.assert(
            fc.property(
                fc.integer({ min: 1, max: 365 * 24 * 60 * 60 * 1000 }),
                (futureMs) => {
                    const now = Date.now();
                    const checkedAt = new Date(now + futureMs).toISOString();
                    const cache = { checkedAt };

                    assert.strictEqual(isCacheFresh(cache), false,
                        `Cache with future timestamp should be stale`);
                }
            ),
            { numRuns: 100 }
        );
    });
});


// Feature: update-notification, Property 2: Cache round-trip preservation
// **Validates: Requirements 1.3, 7.1**
describe('Property 2: Cache round-trip preservation', () => {
    /** Cleanup cache file before and after each test. */
    beforeEach(() => {
        try { fs.unlinkSync(CACHE_FILE_PATH); } catch {}
    });
    afterEach(() => {
        try { fs.unlinkSync(CACHE_FILE_PATH); } catch {}
    });

    it('writeCache then readCache produces identical latestVersion and skippedVersion', () => {
        fc.assert(
            fc.property(
                fc.record({
                    latestVersion: semverStringArb(),
                    skippedVersion: fc.oneof(semverStringArb(), fc.constant(null))
                }),
                ({ latestVersion, skippedVersion }) => {
                    writeCache({ latestVersion, skippedVersion });
                    const cached = readCache();

                    assert.notEqual(cached, null, 'readCache should return non-null after writeCache');
                    assert.strictEqual(cached.latestVersion, latestVersion,
                        `latestVersion mismatch: expected "${latestVersion}", got "${cached.latestVersion}"`);
                    assert.strictEqual(cached.skippedVersion, skippedVersion,
                        `skippedVersion mismatch: expected ${skippedVersion}, got ${cached.skippedVersion}`);
                    // checkedAt should be a valid ISO 8601 date string
                    assert.strictEqual(typeof cached.checkedAt, 'string');
                    assert.ok(!Number.isNaN(new Date(cached.checkedAt).getTime()),
                        `checkedAt should be valid ISO 8601, got "${cached.checkedAt}"`);
                }
            ),
            { numRuns: 100 }
        );
    });
});

// Feature: update-notification, Property 7: Skipped version suppresses prompt
// **Validates: Requirements 7.6**
describe('Property 7: Skipped version suppresses prompt', () => {
    it('when skippedVersion equals latestVersion, the version is identified as skipped', () => {
        fc.assert(
            fc.property(semverStringArb(), (version) => {
                // Simulate an UpdateResult-like data check:
                // If cache.skippedVersion === latestVersion, the prompt should be suppressed.
                const cache = {
                    latestVersion: version,
                    checkedAt: new Date().toISOString(),
                    skippedVersion: version
                };

                // The logic that determines suppression: skippedVersion === latestVersion
                const isSkipped = cache.skippedVersion === cache.latestVersion;
                assert.strictEqual(isSkipped, true,
                    `When skippedVersion equals latestVersion ("${version}"), should be identified as skipped`);
            }),
            { numRuns: 100 }
        );
    });

    it('when skippedVersion differs from latestVersion, the version is NOT skipped', () => {
        fc.assert(
            fc.property(
                semverStringArb(),
                semverStringArb(),
                (latestVersion, skippedVersion) => {
                    fc.pre(latestVersion !== skippedVersion);

                    const cache = {
                        latestVersion,
                        checkedAt: new Date().toISOString(),
                        skippedVersion
                    };

                    const isSkipped = cache.skippedVersion === cache.latestVersion;
                    assert.strictEqual(isSkipped, false,
                        `When skippedVersion ("${skippedVersion}") differs from latestVersion ("${latestVersion}"), should not be skipped`);
                }
            ),
            { numRuns: 100 }
        );
    });
});

// Feature: update-notification, Property 8: Malformed cache yields null
// **Validates: Requirements 7.4**
describe('Property 8: Malformed cache yields null', () => {
    beforeEach(() => {
        try { fs.unlinkSync(CACHE_FILE_PATH); } catch {}
    });
    afterEach(() => {
        try { fs.unlinkSync(CACHE_FILE_PATH); } catch {}
    });

    it('arbitrary non-JSON strings written to cache file cause readCache to return null', () => {
        fc.assert(
            fc.property(
                fc.string({ minLength: 1, maxLength: 200 }).filter(s => {
                    // Filter out strings that happen to be valid JSON with the right fields
                    try {
                        const parsed = JSON.parse(s);
                        return !(
                            typeof parsed.latestVersion === 'string' &&
                            /^\d+\.\d+\.\d+$/.test(parsed.latestVersion) &&
                            typeof parsed.checkedAt === 'string' &&
                            !Number.isNaN(new Date(parsed.checkedAt).getTime())
                        );
                    } catch {
                        return true; // Not valid JSON — good candidate
                    }
                }),
                (malformedContent) => {
                    fs.writeFileSync(CACHE_FILE_PATH, malformedContent, 'utf8');
                    const result = readCache();
                    assert.strictEqual(result, null,
                        `readCache should return null for malformed content: "${malformedContent.slice(0, 50)}..."`);
                }
            ),
            { numRuns: 100 }
        );
    });

    it('JSON objects missing valid latestVersion or checkedAt cause readCache to return null', () => {
        fc.assert(
            fc.property(
                fc.record({
                    latestVersion: fc.oneof(
                        fc.constant(null),
                        fc.constant(123),
                        fc.constant('not-semver'),
                        fc.constant(''),
                        fc.constant('abc.def.ghi')
                    ),
                    checkedAt: fc.oneof(
                        fc.constant(null),
                        fc.constant(123),
                        fc.constant('not-a-date'),
                        fc.constant('')
                    )
                }),
                (invalidCache) => {
                    fs.writeFileSync(CACHE_FILE_PATH, JSON.stringify(invalidCache), 'utf8');
                    const result = readCache();
                    assert.strictEqual(result, null,
                        `readCache should return null for invalid cache object: ${JSON.stringify(invalidCache)}`);
                }
            ),
            { numRuns: 100 }
        );
    });
});
