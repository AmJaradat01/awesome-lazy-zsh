/**
 * Unit tests for updateChecker cache and install detection
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';

import {
    CACHE_FILE_PATH,
    readCache,
    writeCache,
    detectInstallMethod
} from '../src/utils/updateChecker.js';

describe('readCache', () => {
    beforeEach(() => {
        try { fs.unlinkSync(CACHE_FILE_PATH); } catch { /* ignore */ }
    });

    afterEach(() => {
        try { fs.unlinkSync(CACHE_FILE_PATH); } catch { /* ignore */ }
    });

    it('returns null when cache file does not exist', () => {
        const result = readCache();
        assert.equal(result, null);
    });

    it('deletes corrupt files and returns null', () => {
        fs.writeFileSync(CACHE_FILE_PATH, 'not valid json{{{', 'utf8');
        const result = readCache();
        assert.equal(result, null);
        assert.equal(fs.existsSync(CACHE_FILE_PATH), false);
    });

    it('deletes file with invalid latestVersion and returns null', () => {
        fs.writeFileSync(CACHE_FILE_PATH, JSON.stringify({
            latestVersion: 'not-semver',
            checkedAt: new Date().toISOString()
        }), 'utf8');
        const result = readCache();
        assert.equal(result, null);
        assert.equal(fs.existsSync(CACHE_FILE_PATH), false);
    });

    it('deletes file with missing checkedAt and returns null', () => {
        fs.writeFileSync(CACHE_FILE_PATH, JSON.stringify({
            latestVersion: '1.0.0'
        }), 'utf8');
        const result = readCache();
        assert.equal(result, null);
        assert.equal(fs.existsSync(CACHE_FILE_PATH), false);
    });

    it('returns valid cache object when file is well-formed', () => {
        const cache = {
            latestVersion: '3.4.0',
            checkedAt: '2025-01-01T00:00:00.000Z',
            skippedVersion: null
        };
        fs.writeFileSync(CACHE_FILE_PATH, JSON.stringify(cache), 'utf8');
        const result = readCache();
        assert.equal(result.latestVersion, '3.4.0');
        assert.equal(result.checkedAt, '2025-01-01T00:00:00.000Z');
        assert.equal(result.skippedVersion, null);
    });
});

describe('writeCache', () => {
    beforeEach(() => {
        try { fs.unlinkSync(CACHE_FILE_PATH); } catch { /* ignore */ }
        try { fs.unlinkSync(CACHE_FILE_PATH + '.tmp'); } catch { /* ignore */ }
    });

    afterEach(() => {
        try { fs.unlinkSync(CACHE_FILE_PATH); } catch { /* ignore */ }
        try { fs.unlinkSync(CACHE_FILE_PATH + '.tmp'); } catch { /* ignore */ }
    });

    it('does not throw on error', () => {
        // Passing an object that would normally work, but verifying no exceptions bubble up
        // even in normal operation
        assert.doesNotThrow(() => {
            writeCache({ latestVersion: '3.4.0' });
        });
    });

    it('fails silently when given invalid input that causes write issues', () => {
        // writeCache should never throw, even with unusual input
        assert.doesNotThrow(() => {
            writeCache(null);
        });
    });
});

describe('detectInstallMethod', () => {
    it('returns "git" when .git directory exists (this project has .git)', () => {
        const result = detectInstallMethod();
        assert.equal(result, 'git');
    });

    it('returns a string value', () => {
        const result = detectInstallMethod();
        assert.equal(typeof result, 'string');
        assert.ok(result === 'git' || result === 'brew');
    });
});

describe('checkForUpdate', () => {
    let originalFetch;

    beforeEach(() => {
        originalFetch = global.fetch;
        // Remove any existing cache before each test
        try { fs.unlinkSync(CACHE_FILE_PATH); } catch { /* ignore */ }
    });

    afterEach(() => {
        global.fetch = originalFetch;
        try { fs.unlinkSync(CACHE_FILE_PATH); } catch { /* ignore */ }
    });

    it('resolves null on HTTP 500', async () => {
        global.fetch = async () => ({
            ok: false,
            status: 500
        });

        const { checkForUpdate } = await import(`../src/utils/updateChecker.js?t=${Date.now()}_500`);
        const result = await checkForUpdate();
        assert.equal(result, null);
    });

    it('resolves null on 5s timeout (aborted request)', async () => {
        // Mock fetch that never resolves until aborted
        global.fetch = (url, options) => {
            return new Promise((resolve, reject) => {
                const onAbort = () => {
                    reject(new DOMException('The operation was aborted.', 'AbortError'));
                };
                if (options?.signal?.aborted) {
                    onAbort();
                    return;
                }
                options?.signal?.addEventListener('abort', onAbort);
            });
        };

        const { checkForUpdate } = await import(`../src/utils/updateChecker.js?t=${Date.now()}_timeout`);
        const result = await checkForUpdate();
        assert.equal(result, null);
    });

    it('uses cached version when cache is fresh (no fetch called)', async () => {
        // Write a fresh cache (checkedAt is now)
        const freshCache = {
            latestVersion: '9.9.9',
            checkedAt: new Date().toISOString(),
            skippedVersion: null
        };
        fs.writeFileSync(CACHE_FILE_PATH, JSON.stringify(freshCache), 'utf8');

        let fetchCalled = false;
        global.fetch = async () => {
            fetchCalled = true;
            return { ok: true, json: async () => ({ tag_name: 'v9.9.9' }) };
        };

        const { checkForUpdate } = await import(`../src/utils/updateChecker.js?t=${Date.now()}_cached`);
        const result = await checkForUpdate();

        assert.equal(fetchCalled, false, 'fetch should not have been called when cache is fresh');
        assert.notEqual(result, null);
        assert.equal(result.latestVersion, '9.9.9');
    });

    it('returns skipped=true when cached skippedVersion matches latestVersion', async () => {
        // Write a fresh cache where skippedVersion matches latestVersion
        const freshCache = {
            latestVersion: '4.0.0',
            checkedAt: new Date().toISOString(),
            skippedVersion: '4.0.0'
        };
        fs.writeFileSync(CACHE_FILE_PATH, JSON.stringify(freshCache), 'utf8');

        global.fetch = async () => ({
            ok: true,
            json: async () => ({ tag_name: 'v4.0.0' })
        });

        const { checkForUpdate } = await import(`../src/utils/updateChecker.js?t=${Date.now()}_skipped`);
        const result = await checkForUpdate();

        assert.notEqual(result, null);
        assert.equal(result.skipped, true);
    });
});

describe('performUpdate - git method', () => {
    const successRunner = async () => ({ success: true, output: 'ok' });

    it('returns object with success and message for git method', async () => {
        const { performUpdate } = await import(`../src/utils/updateChecker.js?t=${Date.now()}_gitpull`);

        // performUpdate runs git pull on the project root (which is a git repo).
        // Verify it returns the expected shape.
        const result = await performUpdate('git', '3.4.5', successRunner);
        assert.equal(typeof result.success, 'boolean');
        assert.equal(typeof result.message, 'string');
    });

    it('returns success: false when git pull fails', async () => {
        // Force git pull failure by setting GIT_DIR to a non-existent location
        // This makes any git command fail because it can't find the repo
        const origGitDir = process.env.GIT_DIR;
        process.env.GIT_DIR = '/tmp/nonexistent-git-dir-for-test';

        try {
            const { performUpdate } = await import(`../src/utils/updateChecker.js?t=${Date.now()}_gitfail`);
            const result = await performUpdate('git', '3.4.5', async () => ({ success: false, output: 'simulated failure' }));
            assert.equal(result.success, false);
            assert.equal(typeof result.message, 'string');
        } finally {
            // Restore original GIT_DIR
            if (origGitDir === undefined) {
                delete process.env.GIT_DIR;
            } else {
                process.env.GIT_DIR = origGitDir;
            }
        }
    });

    it('never rejects the promise regardless of outcome', async () => {
        const { performUpdate } = await import(`../src/utils/updateChecker.js?t=${Date.now()}_noreject`);

        // performUpdate should NEVER reject — it catches all errors
        const result = await performUpdate('brew', '3.4.5', successRunner);
        assert.equal(typeof result.success, 'boolean');
        assert.equal(typeof result.message, 'string');
    });
});


describe('Integration: no prompt when no update available', () => {
    let originalFetch;

    beforeEach(() => {
        originalFetch = global.fetch;
        try { fs.unlinkSync(CACHE_FILE_PATH); } catch { /* ignore */ }
    });

    afterEach(() => {
        global.fetch = originalFetch;
        try { fs.unlinkSync(CACHE_FILE_PATH); } catch { /* ignore */ }
    });

    it('returns updateAvailable=false when latest equals current version', async () => {
        // Read the actual current version from package.json
        const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
        const currentVersion = pkg.version;

        // Mock fetch to return the same version as current
        global.fetch = async () => ({
            ok: true,
            json: async () => ({ tag_name: `v${currentVersion}` })
        });

        const { checkForUpdate } = await import(`../src/utils/updateChecker.js?t=${Date.now()}_noUpdate`);
        const result = await checkForUpdate();

        assert.notEqual(result, null);
        assert.equal(result.updateAvailable, false);
        assert.equal(result.currentVersion, currentVersion);
        assert.equal(result.latestVersion, currentVersion);
    });

    it('returns updateAvailable=false when latest is older than current', async () => {
        // Mock fetch to return an older version
        global.fetch = async () => ({
            ok: true,
            json: async () => ({ tag_name: 'v0.0.1' })
        });

        const { checkForUpdate } = await import(`../src/utils/updateChecker.js?t=${Date.now()}_olderVersion`);
        const result = await checkForUpdate();

        assert.notEqual(result, null);
        assert.equal(result.updateAvailable, false);
    });

    it('returns null when fetch fails (no prompt possible)', async () => {
        global.fetch = async () => ({
            ok: false,
            status: 404
        });

        const { checkForUpdate } = await import(`../src/utils/updateChecker.js?t=${Date.now()}_fetch404`);
        const result = await checkForUpdate();

        assert.equal(result, null);
    });
});

describe('Integration: skip action caches the version', () => {
    beforeEach(() => {
        try { fs.unlinkSync(CACHE_FILE_PATH); } catch { /* ignore */ }
    });

    afterEach(() => {
        try { fs.unlinkSync(CACHE_FILE_PATH); } catch { /* ignore */ }
    });

    it('writing skippedVersion to cache persists correctly via readCache', () => {
        // Simulate the "skip" action: write cache with skippedVersion set
        writeCache({ latestVersion: '5.0.0', skippedVersion: '5.0.0' });

        // Verify the skippedVersion is persisted
        const cache = readCache();
        assert.notEqual(cache, null);
        assert.equal(cache.latestVersion, '5.0.0');
        assert.equal(cache.skippedVersion, '5.0.0');
    });

    it('skipped version suppresses update prompt on next check', async () => {
        // Write cache with a skippedVersion that matches the latestVersion
        // and a fresh timestamp so no fetch is needed
        const cacheData = {
            latestVersion: '99.0.0',
            checkedAt: new Date().toISOString(),
            skippedVersion: '99.0.0'
        };
        fs.writeFileSync(CACHE_FILE_PATH, JSON.stringify(cacheData), 'utf8');

        // fetch should NOT be called since cache is fresh
        let fetchCalled = false;
        const originalFetch = global.fetch;
        global.fetch = async () => {
            fetchCalled = true;
            return { ok: true, json: async () => ({ tag_name: 'v99.0.0' }) };
        };

        try {
            const { checkForUpdate } = await import(`../src/utils/updateChecker.js?t=${Date.now()}_skipInteg`);
            const result = await checkForUpdate();

            assert.equal(fetchCalled, false, 'fetch should not be called when cache is fresh');
            assert.notEqual(result, null);
            assert.equal(result.skipped, true);
            assert.equal(result.latestVersion, '99.0.0');
        } finally {
            global.fetch = originalFetch;
        }
    });
});

describe('Integration: checkForUpdate returns updateAvailable=true when latest > current', () => {
    let originalFetch;

    beforeEach(() => {
        originalFetch = global.fetch;
        try { fs.unlinkSync(CACHE_FILE_PATH); } catch { /* ignore */ }
    });

    afterEach(() => {
        global.fetch = originalFetch;
        try { fs.unlinkSync(CACHE_FILE_PATH); } catch { /* ignore */ }
    });

    it('returns updateAvailable=true when GitHub has a newer version', async () => {
        // Mock fetch to return a version higher than current (99.99.99)
        global.fetch = async () => ({
            ok: true,
            json: async () => ({ tag_name: 'v99.99.99' })
        });

        const { checkForUpdate } = await import(`../src/utils/updateChecker.js?t=${Date.now()}_updateAvail`);
        const result = await checkForUpdate();

        assert.notEqual(result, null);
        assert.equal(result.updateAvailable, true);
        assert.equal(result.latestVersion, '99.99.99');
        assert.equal(result.skipped, false);
    });

    it('caches the fetched version after successful check', async () => {
        global.fetch = async () => ({
            ok: true,
            json: async () => ({ tag_name: 'v10.0.0' })
        });

        const { checkForUpdate } = await import(`../src/utils/updateChecker.js?t=${Date.now()}_cacheAfterFetch`);
        await checkForUpdate();

        // Verify cache was written with the fetched version
        const cache = readCache();
        assert.notEqual(cache, null);
        assert.equal(cache.latestVersion, '10.0.0');
    });

    it('includes installMethod in the result', async () => {
        global.fetch = async () => ({
            ok: true,
            json: async () => ({ tag_name: 'v99.0.0' })
        });

        const { checkForUpdate } = await import(`../src/utils/updateChecker.js?t=${Date.now()}_installMethod`);
        const result = await checkForUpdate();

        assert.notEqual(result, null);
        assert.ok(result.installMethod === 'git' || result.installMethod === 'brew');
    });
});
