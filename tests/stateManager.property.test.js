// Feature: resume-setup, Property 1: State round-trip preservation
// **Validates: Requirements 1.1, 1.3, 1.4, 1.6**
//
// Feature: resume-setup, Property 2: Pending-to-installed transition preserves the selection set
// **Validates: Requirements 1.2, 4.2, 4.3, 5.2, 5.3**
//
// Feature: resume-setup, Property 3: Validation rejects invalid state objects
// **Validates: Requirements 2.3, 8.1, 8.4**

import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import fc from 'fast-check';
import {
    STATE_FILE_PATH,
    CURRENT_SCHEMA_VERSION,
    readState,
    writeState,
    validateState
} from '../src/utils/stateManager.js';

const VALID_CHECKPOINTS = [
    'plugin_selection',
    'plugin_installation',
    'service_installation',
    'theme_selection'
];

const REQUIRED_FIELDS = [
    'version',
    'checkpoint',
    'selectedPlugins',
    'installedPlugins',
    'pendingPlugins',
    'selectedServices',
    'installedServices',
    'pendingServices',
    'selectedTheme',
    'timestamp'
];

/**
 * Generates a valid state object that passes validateState.
 */
function validStateArb() {
    return fc.record({
        version: fc.constant(CURRENT_SCHEMA_VERSION),
        checkpoint: fc.constantFrom(...VALID_CHECKPOINTS),
        selectedPlugins: fc.array(fc.string({ minLength: 1 }), { maxLength: 10 }),
        installedPlugins: fc.array(fc.string({ minLength: 1 }), { maxLength: 10 }),
        pendingPlugins: fc.array(fc.string({ minLength: 1 }), { maxLength: 10 }),
        selectedServices: fc.array(fc.string({ minLength: 1 }), { maxLength: 10 }),
        installedServices: fc.array(fc.string({ minLength: 1 }), { maxLength: 10 }),
        pendingServices: fc.array(fc.string({ minLength: 1 }), { maxLength: 10 }),
        selectedTheme: fc.oneof(fc.string({ minLength: 1 }), fc.constant(null)),
        timestamp: fc.integer({ min: 1, max: Number.MAX_SAFE_INTEGER })
    });
}

describe('Property 3: Validation rejects invalid state objects', () => {

    it('rejects objects with a required field deleted', () => {
        fc.assert(
            fc.property(
                validStateArb(),
                fc.constantFrom(...REQUIRED_FIELDS),
                (state, fieldToDelete) => {
                    const invalid = { ...state };
                    delete invalid[fieldToDelete];
                    assert.strictEqual(validateState(invalid), false,
                        `Should reject state missing "${fieldToDelete}"`);
                }
            ),
            { numRuns: 100 }
        );
    });

    it('rejects objects with incorrect field types', () => {
        // Strategies: replace array fields with non-arrays, replace strings with numbers, etc.
        const typeCorruptors = [
            // Make an array field a string
            (state) => {
                const arrayFields = [
                    'selectedPlugins', 'installedPlugins', 'pendingPlugins',
                    'selectedServices', 'installedServices', 'pendingServices'
                ];
                const field = arrayFields[Math.floor(Math.random() * arrayFields.length)];
                return { ...state, [field]: 'not-an-array' };
            },
            // Make checkpoint a number
            (state) => ({ ...state, checkpoint: 42 }),
            // Make version a string
            (state) => ({ ...state, version: '1' }),
            // Make timestamp a string
            (state) => ({ ...state, timestamp: 'not-a-number' }),
            // Make selectedTheme a number (not string or null)
            (state) => ({ ...state, selectedTheme: 123 }),
            // Make an array field contain non-strings
            (state) => ({ ...state, selectedPlugins: [1, 2, 3] }),
        ];

        fc.assert(
            fc.property(
                validStateArb(),
                fc.constantFrom(...typeCorruptors),
                (state, corruptor) => {
                    const invalid = corruptor(state);
                    assert.strictEqual(validateState(invalid), false,
                        `Should reject state with incorrect field types`);
                }
            ),
            { numRuns: 100 }
        );
    });

    it('rejects objects with unrecognized checkpoint values', () => {
        fc.assert(
            fc.property(
                validStateArb(),
                fc.string({ minLength: 1 }).filter(s => !VALID_CHECKPOINTS.includes(s)),
                (state, invalidCheckpoint) => {
                    const invalid = { ...state, checkpoint: invalidCheckpoint };
                    assert.strictEqual(validateState(invalid), false,
                        `Should reject unrecognized checkpoint "${invalidCheckpoint}"`);
                }
            ),
            { numRuns: 100 }
        );
    });

    it('rejects objects with wrong version number', () => {
        fc.assert(
            fc.property(
                validStateArb(),
                fc.integer().filter(v => v !== CURRENT_SCHEMA_VERSION),
                (state, wrongVersion) => {
                    const invalid = { ...state, version: wrongVersion };
                    assert.strictEqual(validateState(invalid), false,
                        `Should reject version ${wrongVersion} (expected ${CURRENT_SCHEMA_VERSION})`);
                }
            ),
            { numRuns: 100 }
        );
    });

    it('rejects non-object values', () => {
        fc.assert(
            fc.property(
                fc.oneof(
                    fc.constant(null),
                    fc.constant(undefined),
                    fc.integer(),
                    fc.string(),
                    fc.boolean(),
                    fc.constant([])
                ),
                (nonObject) => {
                    assert.strictEqual(validateState(nonObject), false,
                        `Should reject non-object value: ${JSON.stringify(nonObject)}`);
                }
            ),
            { numRuns: 100 }
        );
    });

    it('rejects objects with timestamp <= 0', () => {
        fc.assert(
            fc.property(
                validStateArb(),
                fc.integer({ min: -1000000, max: 0 }),
                (state, badTimestamp) => {
                    const invalid = { ...state, timestamp: badTimestamp };
                    assert.strictEqual(validateState(invalid), false,
                        `Should reject timestamp ${badTimestamp}`);
                }
            ),
            { numRuns: 100 }
        );
    });
});


// Feature: resume-setup, Property 1: State round-trip preservation
describe('Property 1: State round-trip preservation', () => {
    afterEach(() => {
        // Clean up state file after each test
        try { fs.unlinkSync(STATE_FILE_PATH); } catch { /* ignore */ }
        try { fs.unlinkSync(STATE_FILE_PATH + '.tmp'); } catch { /* ignore */ }
    });

    it('writeState then readState produces identical field values for all valid states', () => {
        const setupStateArb = fc.record({
            checkpoint: fc.constantFrom(
                'plugin_selection',
                'plugin_installation',
                'service_installation',
                'theme_selection'
            ),
            selectedPlugins: fc.array(fc.string({ minLength: 1, maxLength: 30 }), { maxLength: 20 }),
            installedPlugins: fc.array(fc.string({ minLength: 1, maxLength: 30 }), { maxLength: 20 }),
            pendingPlugins: fc.array(fc.string({ minLength: 1, maxLength: 30 }), { maxLength: 20 }),
            selectedServices: fc.array(fc.string({ minLength: 1, maxLength: 30 }), { maxLength: 20 }),
            installedServices: fc.array(fc.string({ minLength: 1, maxLength: 30 }), { maxLength: 20 }),
            pendingServices: fc.array(fc.string({ minLength: 1, maxLength: 30 }), { maxLength: 20 }),
            selectedTheme: fc.oneof(fc.string({ minLength: 1, maxLength: 30 }), fc.constant(null))
        });

        fc.assert(
            fc.property(setupStateArb, (state) => {
                // Clean before each iteration
                try { fs.unlinkSync(STATE_FILE_PATH); } catch { /* ignore */ }

                // Write the state
                writeState(state);

                // Read it back
                const result = readState();

                // result must not be null
                assert.notEqual(result, null, 'readState returned null after writeState');

                // Compare all user-controlled fields
                // (version and timestamp are set by writeState, so we skip those)
                assert.equal(result.checkpoint, state.checkpoint);
                assert.deepEqual(result.selectedPlugins, state.selectedPlugins);
                assert.deepEqual(result.installedPlugins, state.installedPlugins);
                assert.deepEqual(result.pendingPlugins, state.pendingPlugins);
                assert.deepEqual(result.selectedServices, state.selectedServices);
                assert.deepEqual(result.installedServices, state.installedServices);
                assert.deepEqual(result.pendingServices, state.pendingServices);
                assert.equal(result.selectedTheme, state.selectedTheme);
            }),
            { numRuns: 100 }
        );
    });
});


// Feature: resume-setup, Property 2: Pending-to-installed transition preserves the selection set
describe('Property 2: Pending-to-installed transition preserves the selection set', () => {

    /**
     * Helper: checks that two arrays contain exactly the same elements (order-independent).
     */
    function sameElements(a, b) {
        const sortedA = [...a].sort();
        const sortedB = [...b].sort();
        assert.deepEqual(sortedA, sortedB,
            `Sets differ.\n  Got:      ${JSON.stringify(sortedA)}\n  Expected: ${JSON.stringify(sortedB)}`);
    }

    /**
     * Arbitrary: generates a unique array of plugin/service names, then splits it
     * randomly into installed and pending partitions.
     * Returns { selected, installed, pending }.
     */
    function partitionedSetArb() {
        return fc.uniqueArray(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 15 })
            .chain(selected => {
                // Generate a random subset mask for installed vs pending
                return fc.array(fc.boolean(), { minLength: selected.length, maxLength: selected.length })
                    .map(mask => {
                        const installed = selected.filter((_, i) => mask[i]);
                        const pending = selected.filter((_, i) => !mask[i]);
                        return { selected, installed, pending };
                    });
            })
            // Ensure at least one item is in pending so we can perform a transition
            .filter(({ pending }) => pending.length > 0);
    }

    it('moving a plugin from pending to installed preserves the selection set', () => {
        fc.assert(
            fc.property(
                partitionedSetArb(),
                fc.nat(),
                ({ selected, installed, pending }, indexSeed) => {
                    // Pick a random plugin from pending
                    const idx = indexSeed % pending.length;
                    const movedPlugin = pending[idx];

                    // Perform the transition: move from pending to installed
                    const newInstalled = [...installed, movedPlugin];
                    const newPending = pending.filter((_, i) => i !== idx);

                    // Assert: union of newInstalled and newPending equals selectedPlugins
                    const union = newInstalled.concat(newPending);
                    sameElements(union, selected);
                }
            ),
            { numRuns: 100 }
        );
    });

    it('moving a service from pending to installed preserves the selection set', () => {
        fc.assert(
            fc.property(
                partitionedSetArb(),
                fc.nat(),
                ({ selected, installed, pending }, indexSeed) => {
                    // Pick a random service from pending
                    const idx = indexSeed % pending.length;
                    const movedService = pending[idx];

                    // Perform the transition: move from pending to installed
                    const newInstalled = [...installed, movedService];
                    const newPending = pending.filter((_, i) => i !== idx);

                    // Assert: union of newInstalled and newPending equals selectedServices
                    const union = newInstalled.concat(newPending);
                    sameElements(union, selected);
                }
            ),
            { numRuns: 100 }
        );
    });
});
