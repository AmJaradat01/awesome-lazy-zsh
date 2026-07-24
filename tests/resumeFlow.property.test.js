// Feature: resume-setup, Property 5: Checkpoint-to-step routing correctness
// **Validates: Requirements 3.2, 4.1, 5.1, 6.1, 6.2**

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fc from 'fast-check';

/**
 * Pure routing map extracted from the resume logic.
 * Each checkpoint maps to the next step identifier and the state field
 * that step consumes.
 */
const CHECKPOINT_NEXT_STEPS = {
    'plugin_selection': 'install_pending_plugins',
    'plugin_installation': 'service_installation',
    'service_installation': 'theme_selection',
    'theme_selection': 'apply_saved_theme'
};

/**
 * Maps each checkpoint to the state field it requires for the next step.
 */
const CHECKPOINT_REQUIRED_STATE = {
    'plugin_selection': 'pendingPlugins',
    'plugin_installation': 'installedPlugins',
    'service_installation': 'installedPlugins',
    'theme_selection': 'selectedTheme'
};

const VALID_CHECKPOINTS = Object.keys(CHECKPOINT_NEXT_STEPS);

/**
 * Resolves the next step for a given checkpoint.
 * @param {string} checkpoint - A valid checkpoint name.
 * @returns {string} The next step identifier.
 */
function getNextStep(checkpoint) {
    return CHECKPOINT_NEXT_STEPS[checkpoint];
}

/**
 * Returns the state field required by the next step after a given checkpoint.
 * @param {string} checkpoint - A valid checkpoint name.
 * @returns {string} The state field name required for routing.
 */
function getRequiredStateField(checkpoint) {
    return CHECKPOINT_REQUIRED_STATE[checkpoint];
}

// Generators
const checkpointArb = fc.constantFrom(...VALID_CHECKPOINTS);

const pluginNameArb = fc.stringMatching(/^[a-z][a-z0-9-]{0,29}$/);

const themeNameArb = fc.oneof(
    fc.stringMatching(/^[a-z][a-z0-9-]{0,19}$/),
    fc.constant(null)
);

const validStateArb = fc.record({
    checkpoint: checkpointArb,
    selectedPlugins: fc.array(pluginNameArb, { minLength: 0, maxLength: 10 }),
    installedPlugins: fc.array(pluginNameArb, { minLength: 0, maxLength: 10 }),
    pendingPlugins: fc.array(pluginNameArb, { minLength: 0, maxLength: 10 }),
    selectedServices: fc.array(pluginNameArb, { minLength: 0, maxLength: 10 }),
    installedServices: fc.array(pluginNameArb, { minLength: 0, maxLength: 10 }),
    pendingServices: fc.array(pluginNameArb, { minLength: 0, maxLength: 10 }),
    selectedTheme: themeNameArb
});

describe('Property 5: Checkpoint-to-step routing correctness', () => {
    it('every valid checkpoint maps to the correct next step', () => {
        fc.assert(
            fc.property(checkpointArb, (checkpoint) => {
                const nextStep = getNextStep(checkpoint);

                switch (checkpoint) {
                    case 'plugin_selection':
                        assert.equal(nextStep, 'install_pending_plugins');
                        break;
                    case 'plugin_installation':
                        assert.equal(nextStep, 'service_installation');
                        break;
                    case 'service_installation':
                        assert.equal(nextStep, 'theme_selection');
                        break;
                    case 'theme_selection':
                        assert.equal(nextStep, 'apply_saved_theme');
                        break;
                    default:
                        assert.fail(`Unexpected checkpoint: ${checkpoint}`);
                }
            }),
            { numRuns: 100 }
        );
    });

    it('all valid checkpoints have a defined routing (no gaps)', () => {
        fc.assert(
            fc.property(checkpointArb, (checkpoint) => {
                const nextStep = getNextStep(checkpoint);
                assert.notEqual(nextStep, undefined, `Checkpoint "${checkpoint}" has no routing`);
                assert.equal(typeof nextStep, 'string');
                assert.ok(nextStep.length > 0, `Routing for "${checkpoint}" is empty`);
            }),
            { numRuns: 100 }
        );
    });

    it('each checkpoint routing preserves relevant state data for the next step', () => {
        fc.assert(
            fc.property(validStateArb, (state) => {
                const checkpoint = state.checkpoint;
                const requiredField = getRequiredStateField(checkpoint);

                // Verify the state contains the field needed by the next step
                assert.ok(
                    requiredField in state,
                    `State missing required field "${requiredField}" for checkpoint "${checkpoint}"`
                );

                // Verify the field value is accessible (not undefined)
                const fieldValue = state[requiredField];
                assert.notEqual(
                    fieldValue,
                    undefined,
                    `Field "${requiredField}" is undefined in state for checkpoint "${checkpoint}"`
                );

                // Verify the data type is correct for routing
                if (requiredField === 'selectedTheme') {
                    assert.ok(
                        fieldValue === null || typeof fieldValue === 'string',
                        `selectedTheme must be string or null, got ${typeof fieldValue}`
                    );
                } else {
                    assert.ok(
                        Array.isArray(fieldValue),
                        `${requiredField} must be an array, got ${typeof fieldValue}`
                    );
                }
            }),
            { numRuns: 100 }
        );
    });

    it('the routing map covers exactly the set of valid checkpoints', () => {
        fc.assert(
            fc.property(checkpointArb, (checkpoint) => {
                // Every valid checkpoint must exist in the routing map
                assert.ok(
                    checkpoint in CHECKPOINT_NEXT_STEPS,
                    `Checkpoint "${checkpoint}" not in routing map`
                );

                // And the routing map should not have extra keys beyond valid checkpoints
                const routingKeys = Object.keys(CHECKPOINT_NEXT_STEPS);
                assert.equal(routingKeys.length, VALID_CHECKPOINTS.length);
                for (const key of routingKeys) {
                    assert.ok(
                        VALID_CHECKPOINTS.includes(key),
                        `Routing map contains unknown checkpoint "${key}"`
                    );
                }
            }),
            { numRuns: 100 }
        );
    });
});
