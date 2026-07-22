/**
 * Service installer utilities
 * Handles checking, installing, and starting local development services.
 * @author Ali M. Jaradat <AmJaradat01@gmail.com>
 */

import { exec } from 'child_process';
import chalk from 'chalk';
import { serviceRegistry } from './serviceRegistry.js';

/**
 * @typedef {Object} InstallResult
 * @property {string} service - Service key
 * @property {boolean} success - Whether installation succeeded
 * @property {boolean} skipped - Whether service was already installed
 * @property {string} message - Status message
 */

/**
 * @typedef {Object} ExecResult
 * @property {boolean} success - Whether the command executed successfully
 * @property {string} output - Command stdout or error message
 */

/**
 * Default command executor for isServiceInstalled.
 * Wraps child_process exec in a promise, resolves to true if command exits 0, false otherwise.
 * Same pattern as platformDetector.js.
 * @param {string} command - Shell command to execute
 * @returns {Promise<boolean>}
 */
function defaultCheckExecCommand(command) {
    return new Promise((resolve) => {
        exec(command, (error) => {
            resolve(!error);
        });
    });
}

/**
 * Default command executor for installService/startService.
 * Wraps child_process exec in a promise, returns { success, output }.
 * @param {string} command - Shell command to execute
 * @returns {Promise<ExecResult>}
 */
function defaultExecCommand(command) {
    return new Promise((resolve) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                resolve({ success: false, output: error.message || stderr || String(error) });
            } else {
                resolve({ success: true, output: stdout.trim() });
            }
        });
    });
}

/**
 * Checks if a service binary is already present on the system.
 * Uses `which` or `command -v` to check if the binary exists.
 * @param {string} binary - Binary name to check (e.g., 'mongod')
 * @param {function} [execCommand] - Optional command executor for testability (resolves to boolean)
 * @returns {Promise<boolean>}
 */
export async function isServiceInstalled(binary, execCommand = defaultCheckExecCommand) {
    return await execCommand(`which ${binary}`);
}

/**
 * Pure function that returns the install command sequence for a given service on a given platform.
 * @param {string} serviceKey - Key from serviceRegistry
 * @param {Object} platform - Platform info object
 * @param {'macos'|'linux'} platform.os - Operating system
 * @param {'brew'|'apt'|'yum'|null} platform.packageManager - Detected package manager
 * @returns {string[]} Array of command strings to execute in sequence
 */
export function getInstallCommands(serviceKey, platform) {
    const service = serviceRegistry[serviceKey];
    if (!service) {
        return [];
    }

    const { packageManager } = platform;

    if (packageManager === 'brew') {
        const commands = [];
        if (service.brew.tap !== null) {
            commands.push(`brew tap ${service.brew.tap}`);
        }
        commands.push(`brew install ${service.brew.package}`);
        return commands;
    }

    if (packageManager === 'apt') {
        const commands = [];
        if (service.apt.repoSetup !== null) {
            commands.push(service.apt.repoSetup);
        }
        commands.push(`sudo apt-get install -y ${service.apt.packages.join(' ')}`);
        return commands;
    }

    if (packageManager === 'yum') {
        const commands = [];
        if (service.yum.repoSetup !== null) {
            commands.push(service.yum.repoSetup);
        }
        commands.push(`sudo yum install -y ${service.yum.packages.join(' ')}`);
        return commands;
    }

    return [];
}

/**
 * Pure function that returns the start command(s) for a given service on a given platform.
 * @param {string} serviceKey - Key from serviceRegistry
 * @param {Object} platform - Platform info object
 * @param {'macos'|'linux'} platform.os - Operating system
 * @param {'brew'|'apt'|'yum'|null} platform.packageManager - Detected package manager
 * @returns {string[]} Array of start command strings
 */
export function getStartCommands(serviceKey, platform) {
    const service = serviceRegistry[serviceKey];
    if (!service) {
        return [];
    }

    if (platform.os === 'macos') {
        return [`brew services start ${service.brew.package}`];
    }

    if (platform.os === 'linux') {
        return [
            `sudo systemctl start ${service.systemdUnit}`,
            `sudo systemctl enable ${service.systemdUnit}`
        ];
    }

    return [];
}

/**
 * Pure function that generates the success message for a given service.
 * The message contains both the service's displayName and port number.
 * @param {string} serviceKey - Key from serviceRegistry
 * @returns {string} Success message string containing displayName and port
 */
export function generateSuccessMessage(serviceKey) {
    const service = serviceRegistry[serviceKey];
    if (!service) {
        return '';
    }
    return `${service.displayName} installed successfully on port ${service.port}.`;
}

/**
 * Installs a single service using the detected platform's package manager.
 * Reads from serviceRegistry, runs tap/repo setup if needed, then runs install command.
 * Returns an InstallResult object with service, success, skipped, and message.
 * @param {string} serviceKey - Key from serviceRegistry
 * @param {Object} platform - Detected platform info
 * @param {function} [execCommand] - Optional command executor for testability (returns { success, output })
 * @returns {Promise<InstallResult>}
 */
export async function installService(serviceKey, platform, execCommand = defaultExecCommand) {
    const service = serviceRegistry[serviceKey];
    if (!service) {
        return {
            service: serviceKey,
            success: false,
            skipped: false,
            message: `Unknown service: ${serviceKey}`
        };
    }

    const commands = getInstallCommands(serviceKey, platform);
    if (commands.length === 0) {
        return {
            service: serviceKey,
            success: false,
            skipped: false,
            message: `No install commands available for ${service.displayName} on this platform.`
        };
    }

    console.log(chalk.blue(`\n📦 Installing ${service.displayName}...`));

    for (const command of commands) {
        console.log(chalk.gray(`   Running: ${command}`));
        const result = await execCommand(command);
        if (!result.success) {
            console.log(chalk.red(`   ❌ Failed: ${result.output}`));
            return {
                service: serviceKey,
                success: false,
                skipped: false,
                message: `${service.displayName} installation failed: ${result.output}`
            };
        }
    }

    const successMsg = generateSuccessMessage(serviceKey);
    console.log(chalk.green(`   ✅ ${service.displayName} installed successfully (port ${service.port})`));
    return {
        service: serviceKey,
        success: true,
        skipped: false,
        message: successMsg
    };
}

/**
 * Starts a service using platform-appropriate commands.
 * On macOS uses `brew services start`, on Linux uses `systemctl start` + `systemctl enable`.
 * @param {string} serviceKey - Key from serviceRegistry
 * @param {Object} platform - Detected platform info
 * @param {function} [execCommand] - Optional command executor for testability (returns { success, output })
 * @returns {Promise<boolean>}
 */
export async function startService(serviceKey, platform, execCommand = defaultExecCommand) {
    const service = serviceRegistry[serviceKey];
    if (!service) {
        return false;
    }

    const commands = getStartCommands(serviceKey, platform);
    if (commands.length === 0) {
        return false;
    }

    console.log(chalk.blue(`   🚀 Starting ${service.displayName}...`));

    for (const command of commands) {
        console.log(chalk.gray(`   Running: ${command}`));
        const result = await execCommand(command);
        if (!result.success) {
            console.log(chalk.red(`   ⚠️  Failed to start ${service.displayName}: ${result.output}`));
            return false;
        }
    }

    console.log(chalk.green(`   ✅ ${service.displayName} started successfully`));
    return true;
}
