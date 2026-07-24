/**
 * Property-Based Tests for Service Installer
 * Tests install command generation, start command generation, and success message format.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as fc from 'fast-check';
import { getInstallCommands, getStartCommands, generateSuccessMessage } from '../src/utils/serviceInstaller.js';
import { serviceRegistry } from '../src/utils/serviceRegistry.js';

const serviceKeys = Object.keys(serviceRegistry);

const platforms = [
    { os: 'macos', packageManager: 'brew' },
    { os: 'linux', packageManager: 'apt' },
    { os: 'linux', packageManager: 'yum' }
];

describe('Feature: service-installation, Property 2: Install command generation correctness', () => {
    /**
     * **Validates: Requirements 4.1–4.7, 5.1–5.7, 6.1–6.7**
     *
     * For any service key in the service registry and for any valid platform,
     * the generated install command sequence SHALL include the registry-configured
     * tap/repo setup command (if non-null) followed by the platform-appropriate
     * package install command using the correct package name(s) from the registry.
     */
    it('generates correct install commands for every service × platform combination', () => {
        fc.assert(
            fc.property(
                fc.constantFrom(...serviceKeys),
                fc.constantFrom(...platforms),
                (serviceKey, platform) => {
                    const service = serviceRegistry[serviceKey];
                    const commands = getInstallCommands(serviceKey, platform);

                    assert.ok(Array.isArray(commands), 'commands must be an array');
                    assert.ok(commands.length > 0, `commands must not be empty for known service '${serviceKey}'`);

                    if (platform.packageManager === 'brew') {
                        // If tap is defined, it must be the first command
                        if (service.brew.tap !== null) {
                            assert.equal(
                                commands[0],
                                `brew tap ${service.brew.tap}`,
                                `First command must be 'brew tap ${service.brew.tap}'`
                            );
                            assert.equal(
                                commands[1],
                                `brew install ${service.brew.package}`,
                                `Second command must be 'brew install ${service.brew.package}'`
                            );
                            assert.equal(commands.length, 2, 'Brew with tap should have exactly 2 commands');
                        } else {
                            assert.equal(
                                commands[0],
                                `brew install ${service.brew.package}`,
                                `Only command must be 'brew install ${service.brew.package}'`
                            );
                            assert.equal(commands.length, 1, 'Brew without tap should have exactly 1 command');
                        }
                    }

                    if (platform.packageManager === 'apt') {
                        const expectedInstallCmd = `sudo apt-get install -y ${service.apt.packages.join(' ')}`;
                        if (service.apt.repoSetup !== null) {
                            assert.equal(
                                commands[0],
                                service.apt.repoSetup,
                                'First command must be the apt repoSetup'
                            );
                            assert.equal(
                                commands[1],
                                expectedInstallCmd,
                                `Second command must be '${expectedInstallCmd}'`
                            );
                            assert.equal(commands.length, 2, 'Apt with repoSetup should have exactly 2 commands');
                        } else {
                            assert.equal(
                                commands[0],
                                expectedInstallCmd,
                                `Only command must be '${expectedInstallCmd}'`
                            );
                            assert.equal(commands.length, 1, 'Apt without repoSetup should have exactly 1 command');
                        }
                    }

                    if (platform.packageManager === 'yum') {
                        const expectedInstallCmd = `sudo yum install -y ${service.yum.packages.join(' ')}`;
                        if (service.yum.repoSetup !== null) {
                            assert.equal(
                                commands[0],
                                service.yum.repoSetup,
                                'First command must be the yum repoSetup'
                            );
                            assert.equal(
                                commands[1],
                                expectedInstallCmd,
                                `Second command must be '${expectedInstallCmd}'`
                            );
                            assert.equal(commands.length, 2, 'Yum with repoSetup should have exactly 2 commands');
                        } else {
                            assert.equal(
                                commands[0],
                                expectedInstallCmd,
                                `Only command must be '${expectedInstallCmd}'`
                            );
                            assert.equal(commands.length, 1, 'Yum without repoSetup should have exactly 1 command');
                        }
                    }
                }
            ),
            { numRuns: 100 }
        );
    });

    it('returns empty array for unknown service key', () => {
        fc.assert(
            fc.property(
                fc.string().filter(s => !(s in serviceRegistry)),
                fc.constantFrom(...platforms),
                (unknownKey, platform) => {
                    const commands = getInstallCommands(unknownKey, platform);
                    assert.deepEqual(commands, [], 'Unknown service must return empty array');
                }
            ),
            { numRuns: 100 }
        );
    });
});

describe('Feature: service-installation, Property 3: Start command generation correctness', () => {
    /**
     * **Validates: Requirements 8.2, 8.4, 8.5**
     *
     * For any service key in the service registry and for any valid platform,
     * the generated start command SHALL be `brew services start <brew.package>` on macOS,
     * or `sudo systemctl start <systemdUnit>` followed by `sudo systemctl enable <systemdUnit>` on Linux.
     */
    it('generates correct start commands for every service × platform combination', () => {
        fc.assert(
            fc.property(
                fc.constantFrom(...serviceKeys),
                fc.constantFrom(...platforms),
                (serviceKey, platform) => {
                    const service = serviceRegistry[serviceKey];
                    const commands = getStartCommands(serviceKey, platform);

                    assert.ok(Array.isArray(commands), 'commands must be an array');

                    // CLI tools (port=0) and tools without systemdUnit don't have start commands
                    if (service.port === 0) {
                        assert.deepEqual(commands, [], `CLI tool '${serviceKey}' should return empty start commands`);
                        return;
                    }

                    assert.ok(commands.length > 0, `commands must not be empty for service '${serviceKey}'`);

                    if (platform.os === 'macos') {
                        assert.deepEqual(
                            commands,
                            [`brew services start ${service.brew.package}`],
                            `macOS start command must be 'brew services start ${service.brew.package}'`
                        );
                    }

                    if (platform.os === 'linux') {
                        assert.deepEqual(
                            commands,
                            [
                                `sudo systemctl start ${service.systemdUnit}`,
                                `sudo systemctl enable ${service.systemdUnit}`
                            ],
                            `Linux start commands must be systemctl start + enable for '${service.systemdUnit}'`
                        );
                    }
                }
            ),
            { numRuns: 100 }
        );
    });

    it('returns empty array for unknown service key', () => {
        fc.assert(
            fc.property(
                fc.string().filter(s => !(s in serviceRegistry)),
                fc.constantFrom(...platforms),
                (unknownKey, platform) => {
                    const commands = getStartCommands(unknownKey, platform);
                    assert.deepEqual(commands, [], 'Unknown service must return empty array');
                }
            ),
            { numRuns: 100 }
        );
    });
});

describe('Feature: service-installation, Property 6: Success message format', () => {
    /**
     * **Validates: Requirements 9.2**
     *
     * For any service key in the service registry, the generated success message
     * SHALL contain both the service's displayName and its port number.
     */
    it('success message contains displayName and port for every service', () => {
        fc.assert(
            fc.property(
                fc.constantFrom(...serviceKeys),
                (serviceKey) => {
                    const service = serviceRegistry[serviceKey];
                    const message = generateSuccessMessage(serviceKey);

                    assert.equal(typeof message, 'string', 'Message must be a string');
                    assert.ok(message.length > 0, 'Message must be non-empty');

                    assert.ok(
                        message.includes(service.displayName),
                        `Message must contain displayName '${service.displayName}', got: '${message}'`
                    );

                    // Services with ports should include port number
                    if (service.port > 0) {
                        assert.ok(
                            message.includes(String(service.port)),
                            `Message must contain port '${service.port}', got: '${message}'`
                        );
                    }
                }
            ),
            { numRuns: 100 }
        );
    });
});
