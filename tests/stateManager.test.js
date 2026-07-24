/**
 * Unit tests for stateManager module
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import os from 'os';

// We need to test with a custom state file path to avoid touching the real one.
// We'll test by importing the module and using a temp directory approach.
import {
    STATE_FILE_PATH,
    CURRENT_SCHEMA_VERSION,
    MAX_AGE_MS,
    readState,
    writeState,
    deleteState,
    validateState,
    isExpired
} from '../src/utils/stateManager.js';

/**
 * Helper to create a valid state object for testing
 */
function createValidState(overrides = {}) {
    return {
        version: CURRENT_SCHEMA_VERSION,
        checkpoint: 'plugin_selection',
        selectedPlugins: ['git', 'fzf'],
        installedPlugins: ['git'],
        pendingPlugins: ['fzf'],
        selectedServices: [],
        installedServices: [],
        pendingServices: [],
        selectedTheme: null,
        timestamp: Date.now(),
        ...overrides
    };
}

describe('stateManager constants', () => {
    it('STATE_FILE_PATH points to home directory', () => {
        const expected = path.join(os.homedir(), '.awesome-lazy-zsh-state.json');
        assert.equal(STATE_FILE_PATH, expected);
    });

    it('CURRENT_SCHEMA_VERSION is 1', () => {
        assert.equal(CURRENT_SCHEMA_VERSION, 1);
    });

    it('MAX_AGE_MS is 24 hours in milliseconds', () => {
        assert.equal(MAX_AGE_MS, 24 * 60 * 60 * 1000);
    });
});

describe('readState', () => {
    beforeEach(() => {
        // Clean up before each test
        try { fs.unlinkSync(STATE_FILE_PATH); } catch { /* ignore */ }
    });

    afterEach(() => {
        // Clean up after each test
        try { fs.unlinkSync(STATE_FILE_PATH); } catch { /* ignore */ }
    });

    it('returns null when file does not exist', () => {
        const result = readState();
        assert.equal(result, null);
    });

    it('returns null when file contains invalid JSON', () => {
        fs.writeFileSync(STATE_FILE_PATH, 'not valid json{{{', 'utf8');
        const result = readState();
        assert.equal(result, null);
    });

    it('returns parsed object when file contains valid JSON', () => {
        const state = createValidState();
        fs.writeFileSync(STATE_FILE_PATH, JSON.stringify(state), 'utf8');
        const result = readState();
        assert.deepEqual(result, state);
    });
});

describe('writeState', () => {
    beforeEach(() => {
        try { fs.unlinkSync(STATE_FILE_PATH); } catch { /* ignore */ }
    });

    afterEach(() => {
        try { fs.unlinkSync(STATE_FILE_PATH); } catch { /* ignore */ }
        try { fs.unlinkSync(STATE_FILE_PATH + '.tmp'); } catch { /* ignore */ }
    });

    it('creates a new state file when none exists', () => {
        writeState({ checkpoint: 'plugin_selection', selectedPlugins: ['git'] });
        const result = readState();
        assert.equal(result.checkpoint, 'plugin_selection');
        assert.deepEqual(result.selectedPlugins, ['git']);
        assert.equal(result.version, CURRENT_SCHEMA_VERSION);
        assert.equal(typeof result.timestamp, 'number');
    });

    it('merges partial updates into existing state', () => {
        writeState({
            checkpoint: 'plugin_selection',
            selectedPlugins: ['git', 'fzf'],
            installedPlugins: [],
            pendingPlugins: ['git', 'fzf']
        });
        writeState({ installedPlugins: ['git'], pendingPlugins: ['fzf'] });
        const result = readState();
        assert.equal(result.checkpoint, 'plugin_selection');
        assert.deepEqual(result.selectedPlugins, ['git', 'fzf']);
        assert.deepEqual(result.installedPlugins, ['git']);
        assert.deepEqual(result.pendingPlugins, ['fzf']);
    });

    it('always updates the timestamp', () => {
        writeState({ checkpoint: 'plugin_selection' });
        const first = readState();
        // Small delay to ensure timestamp differs
        const before = Date.now();
        writeState({ checkpoint: 'plugin_installation' });
        const second = readState();
        assert.ok(second.timestamp >= before);
    });

    it('always sets the version to CURRENT_SCHEMA_VERSION', () => {
        writeState({ checkpoint: 'plugin_selection', version: 99 });
        const result = readState();
        assert.equal(result.version, CURRENT_SCHEMA_VERSION);
    });
});

describe('deleteState', () => {
    beforeEach(() => {
        try { fs.unlinkSync(STATE_FILE_PATH); } catch { /* ignore */ }
        try { fs.unlinkSync(STATE_FILE_PATH + '.tmp'); } catch { /* ignore */ }
    });

    afterEach(() => {
        try { fs.unlinkSync(STATE_FILE_PATH); } catch { /* ignore */ }
        try { fs.unlinkSync(STATE_FILE_PATH + '.tmp'); } catch { /* ignore */ }
    });

    it('removes the state file', () => {
        fs.writeFileSync(STATE_FILE_PATH, '{}', 'utf8');
        deleteState();
        assert.equal(fs.existsSync(STATE_FILE_PATH), false);
    });

    it('does not throw when file does not exist', () => {
        assert.doesNotThrow(() => deleteState());
    });

    it('logs warning when file cannot be deleted', () => {
        // Create a directory at the state file path — unlinkSync on a dir throws EPERM/EISDIR
        // We simulate a non-ENOENT error by making the file undeletable via a directory trick
        const dir = STATE_FILE_PATH;
        fs.mkdirSync(dir, { recursive: true });
        const logs = [];
        const originalLog = console.log;
        console.log = (...args) => logs.push(args.join(' '));
        try {
            deleteState();
            // Should have logged a warning (error code is not ENOENT)
            assert.ok(logs.some(msg => msg.includes('Warning') && msg.includes('Could not delete state file')));
        } finally {
            console.log = originalLog;
            fs.rmdirSync(dir);
        }
    });
});

describe('validateState', () => {
    it('returns true for a fully valid state', () => {
        const state = createValidState();
        assert.equal(validateState(state), true);
    });

    it('returns false for null', () => {
        assert.equal(validateState(null), false);
    });

    it('returns false for non-object values', () => {
        assert.equal(validateState('string'), false);
        assert.equal(validateState(42), false);
        assert.equal(validateState(undefined), false);
    });

    it('returns false when version does not match CURRENT_SCHEMA_VERSION', () => {
        const state = createValidState({ version: 2 });
        assert.equal(validateState(state), false);
    });

    it('returns false when checkpoint is missing', () => {
        const state = createValidState();
        delete state.checkpoint;
        assert.equal(validateState(state), false);
    });

    it('returns false when checkpoint is not a valid name', () => {
        const state = createValidState({ checkpoint: 'invalid_checkpoint' });
        assert.equal(validateState(state), false);
    });

    it('returns false when selectedPlugins is not an array', () => {
        const state = createValidState({ selectedPlugins: 'not-array' });
        assert.equal(validateState(state), false);
    });

    it('returns false when an array field contains non-string elements', () => {
        const state = createValidState({ selectedPlugins: [123, 'git'] });
        assert.equal(validateState(state), false);
    });

    it('returns false when selectedTheme is neither string nor null', () => {
        const state = createValidState({ selectedTheme: 123 });
        assert.equal(validateState(state), false);
    });

    it('returns false when timestamp is not a number', () => {
        const state = createValidState({ timestamp: 'not-number' });
        assert.equal(validateState(state), false);
    });

    it('returns false when timestamp is zero or negative', () => {
        assert.equal(validateState(createValidState({ timestamp: 0 })), false);
        assert.equal(validateState(createValidState({ timestamp: -1 })), false);
    });

    it('accepts all valid checkpoint names', () => {
        const checkpoints = ['plugin_selection', 'plugin_installation', 'service_installation', 'theme_selection'];
        for (const checkpoint of checkpoints) {
            assert.equal(validateState(createValidState({ checkpoint })), true);
        }
    });

    it('accepts a valid state with selectedTheme as a string', () => {
        const state = createValidState({ selectedTheme: 'powerlevel10k' });
        assert.equal(validateState(state), true);
    });
});

describe('isExpired', () => {
    it('returns true for timestamp older than 24 hours', () => {
        const state = createValidState({ timestamp: Date.now() - MAX_AGE_MS - 1 });
        assert.equal(isExpired(state), true);
    });

    it('returns false for timestamp within 24 hours', () => {
        const state = createValidState({ timestamp: Date.now() - MAX_AGE_MS + 1000 });
        assert.equal(isExpired(state), false);
    });

    it('returns false for timestamp exactly 24h-1ms old', () => {
        const state = createValidState({ timestamp: Date.now() - MAX_AGE_MS + 1 });
        assert.equal(isExpired(state), false);
    });

    it('returns false for current timestamp', () => {
        const state = createValidState({ timestamp: Date.now() });
        assert.equal(isExpired(state), false);
    });

    it('returns true for timestamp exactly at the boundary (>24h)', () => {
        // Exactly 24h + 1ms old
        const state = createValidState({ timestamp: Date.now() - MAX_AGE_MS - 1 });
        assert.equal(isExpired(state), true);
    });

    it('returns false for timestamp exactly at the boundary (=24h)', () => {
        // Exactly 24h — not expired because condition is > not >=
        const state = createValidState({ timestamp: Date.now() - MAX_AGE_MS });
        assert.equal(isExpired(state), false);
    });
});
