/**
 * Unit tests for platform detector module
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { detectPlatform } from '../src/utils/platformDetector.js';

describe('detectPlatform', () => {
    describe('macOS', () => {
        it('should detect macOS with brew available', async () => {
            const result = await detectPlatform({
                getPlatform: () => 'darwin',
                execCommand: (cmd) => Promise.resolve(cmd === 'which brew')
            });

            assert.deepStrictEqual(result, {
                os: 'macos',
                packageManager: 'brew',
                error: null
            });
        });

        it('should return error when brew is not available on macOS', async () => {
            const result = await detectPlatform({
                getPlatform: () => 'darwin',
                execCommand: () => Promise.resolve(false)
            });

            assert.strictEqual(result.os, 'macos');
            assert.strictEqual(result.packageManager, null);
            assert.ok(result.error);
            assert.ok(result.error.includes('Homebrew'));
        });
    });

    describe('Linux', () => {
        it('should detect Linux with apt-get available', async () => {
            const result = await detectPlatform({
                getPlatform: () => 'linux',
                execCommand: (cmd) => Promise.resolve(cmd === 'which apt-get')
            });

            assert.deepStrictEqual(result, {
                os: 'linux',
                packageManager: 'apt',
                error: null
            });
        });

        it('should fall back to yum when apt-get is unavailable', async () => {
            const result = await detectPlatform({
                getPlatform: () => 'linux',
                execCommand: (cmd) => Promise.resolve(cmd === 'which yum')
            });

            assert.deepStrictEqual(result, {
                os: 'linux',
                packageManager: 'yum',
                error: null
            });
        });

        it('should prefer apt-get over yum when both are available', async () => {
            const result = await detectPlatform({
                getPlatform: () => 'linux',
                execCommand: () => Promise.resolve(true)
            });

            assert.strictEqual(result.packageManager, 'apt');
        });

        it('should return error when neither apt-get nor yum is available on Linux', async () => {
            const result = await detectPlatform({
                getPlatform: () => 'linux',
                execCommand: () => Promise.resolve(false)
            });

            assert.strictEqual(result.os, 'linux');
            assert.strictEqual(result.packageManager, null);
            assert.ok(result.error);
            assert.ok(result.error.includes('apt-get') || result.error.includes('yum'));
        });
    });

    describe('Unsupported platforms', () => {
        it('should return error for Windows', async () => {
            const result = await detectPlatform({
                getPlatform: () => 'win32',
                execCommand: () => Promise.resolve(true)
            });

            assert.strictEqual(result.os, 'win32');
            assert.strictEqual(result.packageManager, null);
            assert.ok(result.error);
            assert.ok(result.error.includes('Unsupported platform'));
        });

        it('should return error for unknown platform', async () => {
            const result = await detectPlatform({
                getPlatform: () => 'freebsd',
                execCommand: () => Promise.resolve(true)
            });

            assert.strictEqual(result.os, 'freebsd');
            assert.strictEqual(result.packageManager, null);
            assert.ok(result.error);
            assert.ok(result.error.includes('freebsd'));
        });
    });

    describe('Default behavior (no options)', () => {
        it('should work without options (uses real os.platform and exec)', async () => {
            const result = await detectPlatform();

            // On any system this runs, it should return a valid structure
            assert.ok('os' in result);
            assert.ok('packageManager' in result);
            assert.ok('error' in result);
        });
    });
});
