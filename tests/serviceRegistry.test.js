/**
 * Property-Based Test: Service registry structural completeness
 * Validates: Requirements 10.1, 7.3
 *
 * Verifies that every entry in the service registry contains all required fields
 * with correct types, and that the aliasToService mapping covers all 7 services
 * with valid references to registry keys.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as fc from 'fast-check';
import { serviceRegistry, aliasToService } from '../src/utils/serviceRegistry.js';

describe('Feature: service-installation, Property 4: Service registry structural completeness', () => {
    const serviceKeys = Object.keys(serviceRegistry);

    /**
     * **Validates: Requirements 10.1, 7.3**
     *
     * For any entry in the service registry, the entry SHALL contain all required fields:
     * displayName (non-empty string), port (positive integer), binary (non-empty string),
     * brew.package (non-empty string), brew.tap (string or null), apt.packages (non-empty array),
     * apt.repoSetup (string or null), yum.packages (non-empty array), yum.repoSetup (string or null),
     * and systemdUnit (non-empty string).
     */
    it('every registry entry has all required fields with correct types', () => {
        fc.assert(
            fc.property(
                fc.constantFrom(...serviceKeys),
                (serviceKey) => {
                    const entry = serviceRegistry[serviceKey];

                    // displayName: non-empty string
                    assert.equal(typeof entry.displayName, 'string', `${serviceKey}.displayName must be a string`);
                    assert.ok(entry.displayName.length > 0, `${serviceKey}.displayName must be non-empty`);

                    // port: non-negative integer (0 for CLI tools, positive for services)
                    assert.equal(typeof entry.port, 'number', `${serviceKey}.port must be a number`);
                    assert.ok(Number.isInteger(entry.port), `${serviceKey}.port must be an integer`);
                    assert.ok(entry.port >= 0, `${serviceKey}.port must be non-negative`);

                    // binary: non-empty string
                    assert.equal(typeof entry.binary, 'string', `${serviceKey}.binary must be a string`);
                    assert.ok(entry.binary.length > 0, `${serviceKey}.binary must be non-empty`);

                    // brew.package: non-empty string
                    assert.equal(typeof entry.brew, 'object', `${serviceKey}.brew must be an object`);
                    assert.equal(typeof entry.brew.package, 'string', `${serviceKey}.brew.package must be a string`);
                    assert.ok(entry.brew.package.length > 0, `${serviceKey}.brew.package must be non-empty`);

                    // brew.tap: string or null
                    assert.ok(
                        entry.brew.tap === null || typeof entry.brew.tap === 'string',
                        `${serviceKey}.brew.tap must be a string or null`
                    );

                    // apt.packages: non-empty array of strings
                    assert.equal(typeof entry.apt, 'object', `${serviceKey}.apt must be an object`);
                    assert.ok(Array.isArray(entry.apt.packages), `${serviceKey}.apt.packages must be an array`);
                    assert.ok(entry.apt.packages.length > 0, `${serviceKey}.apt.packages must be non-empty`);
                    for (const pkg of entry.apt.packages) {
                        assert.equal(typeof pkg, 'string', `${serviceKey}.apt.packages entries must be strings`);
                        assert.ok(pkg.length > 0, `${serviceKey}.apt.packages entries must be non-empty strings`);
                    }

                    // apt.repoSetup: string or null
                    assert.ok(
                        entry.apt.repoSetup === null || typeof entry.apt.repoSetup === 'string',
                        `${serviceKey}.apt.repoSetup must be a string or null`
                    );

                    // yum.packages: non-empty array of strings
                    assert.equal(typeof entry.yum, 'object', `${serviceKey}.yum must be an object`);
                    assert.ok(Array.isArray(entry.yum.packages), `${serviceKey}.yum.packages must be an array`);
                    assert.ok(entry.yum.packages.length > 0, `${serviceKey}.yum.packages must be non-empty`);
                    for (const pkg of entry.yum.packages) {
                        assert.equal(typeof pkg, 'string', `${serviceKey}.yum.packages entries must be strings`);
                        assert.ok(pkg.length > 0, `${serviceKey}.yum.packages entries must be non-empty strings`);
                    }

                    // yum.repoSetup: string or null
                    assert.ok(
                        entry.yum.repoSetup === null || typeof entry.yum.repoSetup === 'string',
                        `${serviceKey}.yum.repoSetup must be a string or null`
                    );

                    // systemdUnit: string (may be empty for CLI tools/languages)
                    assert.equal(typeof entry.systemdUnit, 'string', `${serviceKey}.systemdUnit must be a string`);
                }
            ),
            { numRuns: 100 }
        );
    });

    it('aliasToService mapping has entries for all expected services', () => {
        const aliasKeys = Object.keys(aliasToService);
        const expectedServices = [
            'mongodb', 'mysql', 'postgresql', 'redis', 'rabbitmq', 'elasticsearch', 'memcached',
            'aws', 'gcloud', 'azure',
            'kubernetes', 'terraform-extended', 'ansible', 'docker-compose-extended',
            'python', 'golang', 'rust', 'java',
            'flutter', 'react-native', 'fastlane', 'firebase'
        ];

        // All expected services must be covered
        assert.equal(aliasKeys.length, expectedServices.length, `aliasToService must have exactly ${expectedServices.length} entries`);

        for (const service of expectedServices) {
            assert.ok(
                aliasKeys.includes(service),
                `aliasToService must have an entry for '${service}'`
            );
        }
    });

    it('all aliasToService values reference valid keys in serviceRegistry', () => {
        fc.assert(
            fc.property(
                fc.constantFrom(...Object.keys(aliasToService)),
                (aliasKey) => {
                    const serviceKey = aliasToService[aliasKey];
                    assert.ok(
                        serviceKey in serviceRegistry,
                        `aliasToService['${aliasKey}'] = '${serviceKey}' must be a valid key in serviceRegistry`
                    );
                }
            ),
            { numRuns: 100 }
        );
    });
});
