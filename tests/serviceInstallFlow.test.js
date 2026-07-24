/**
 * Property-based tests for the service installation flow module.
 * Uses fast-check with node:test.
 * @author Ali M. Jaradat <AmJaradat01@gmail.com>
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as fc from 'fast-check';
import { getInstallableServices, generateSummary } from '../src/utils/serviceInstallFlow.js';
import { pluginRepos } from '../src/utils/config.js';
import { aliasToService, serviceRegistry } from '../src/utils/serviceRegistry.js';

/**
 * Property 1: Service filtering from plugin selection
 * For any subset of plugin names from pluginRepos keys, getInstallableServices()
 * returns exactly the intersection of selected plugins with aliasToService keys,
 * mapped through aliasToService.
 *
 * **Validates: Requirements 1.1, 1.2, 2.1**
 */
describe('Property 1: Service filtering from plugin selection', () => {
    const allPluginNames = Object.keys(pluginRepos);
    const aliasKeys = Object.keys(aliasToService);

    it('returns the intersection of selected plugins with aliasToService keys (mapped to service keys)', () => {
        fc.assert(
            fc.property(
                fc.subarray(allPluginNames, { minLength: 0, maxLength: allPluginNames.length }),
                (selectedPlugins) => {
                    const result = getInstallableServices(selectedPlugins);

                    // Expected: plugins that are in aliasToService, mapped to their service keys
                    const expected = selectedPlugins
                        .filter(p => aliasKeys.includes(p))
                        .map(p => aliasToService[p]);

                    assert.deepEqual(result.sort(), expected.sort());
                }
            ),
            { numRuns: 100 }
        );
    });

    it('returns empty array for empty input', () => {
        const result = getInstallableServices([]);
        assert.deepEqual(result, []);
    });

    it('returns empty array for null input', () => {
        const result = getInstallableServices(null);
        assert.deepEqual(result, []);
    });

    it('returns empty array for undefined input', () => {
        const result = getInstallableServices(undefined);
        assert.deepEqual(result, []);
    });
});

/**
 * Property 5: Installation summary completeness
 * For any list of InstallResult objects, the generated summary mentions every
 * service's displayName exactly once and labels each correctly as installed,
 * failed, or skipped.
 *
 * **Validates: Requirements 9.4**
 */
describe('Property 5: Installation summary completeness', () => {
    const serviceKeys = Object.keys(serviceRegistry);

    // Generator for InstallResult objects with valid constraints:
    // if skipped=true then success must be true
    const installResultArb = fc.record({
        service: fc.constantFrom(...serviceKeys),
        success: fc.boolean(),
        skipped: fc.boolean(),
        message: fc.string()
    }).map(r => {
        // Constraint: if skipped is true, success must also be true
        if (r.skipped) {
            return { ...r, success: true };
        }
        return r;
    });

    it('mentions every result service displayName exactly once with correct status', () => {
        fc.assert(
            fc.property(
                fc.array(installResultArb, { minLength: 1, maxLength: 7 }).filter(results => {
                    // Ensure unique service keys (each service appears at most once)
                    const services = results.map(r => r.service);
                    return new Set(services).size === services.length;
                }),
                (results) => {
                    const summary = generateSummary(results);

                    for (const result of results) {
                        const displayName = serviceRegistry[result.service].displayName;

                        // Each service displayName should appear exactly once
                        const occurrences = summary.split(displayName).length - 1;
                        assert.equal(
                            occurrences,
                            1,
                            `Expected "${displayName}" to appear exactly once, found ${occurrences}`
                        );

                        // Verify correct status label
                        if (result.skipped) {
                            assert.ok(
                                summary.includes(`${displayName}: skipped`),
                                `Expected "${displayName}" to be labeled as skipped`
                            );
                        } else if (result.success) {
                            assert.ok(
                                summary.includes(`${displayName}: installed`),
                                `Expected "${displayName}" to be labeled as installed`
                            );
                        } else {
                            assert.ok(
                                summary.includes(`${displayName}: failed`),
                                `Expected "${displayName}" to be labeled as failed`
                            );
                        }
                    }
                }
            ),
            { numRuns: 100 }
        );
    });
});
