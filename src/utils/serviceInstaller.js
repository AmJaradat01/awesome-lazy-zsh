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
 * Validates that a binary name is safe to use in shell commands.
 * Only allows alphanumeric characters, hyphens, underscores, and dots.
 * Prevents shell metacharacter injection via `which` or other commands.
 * @param {string} binary - Binary name to validate
 * @returns {boolean} True if the binary name is safe
 */
function isValidBinaryName(binary) {
    return typeof binary === 'string' &&
        binary.length > 0 &&
        binary.length <= 100 &&
        /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(binary);
}

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
 * Validates binary name before passing to shell to prevent injection.
 * @param {string} binary - Binary name to check (e.g., 'mongod')
 * @param {function} [execCommand] - Optional command executor for testability (resolves to boolean)
 * @returns {Promise<boolean>}
 */
export async function isServiceInstalled(binary, execCommand = defaultCheckExecCommand) {
    if (!isValidBinaryName(binary)) {
        console.log(chalk.red(`❌ Invalid binary name: "${binary}"`));
        return false;
    }
    return await execCommand(`which ${binary}`);
}

/**
 * Validates that a package name or command segment is safe for shell interpolation.
 * @param {string} value - Package name or command segment
 * @returns {boolean} True if safe
 */
function isValidPackageName(value) {
    if (typeof value !== 'string' || value.length === 0 || value.length > 200) return false;
    // Allow alphanumeric, hyphens, underscores, dots, slashes (for tap/package), @, colons
    // Reject shell metacharacters: ; & | ` $ ( ) { } < > ! ? * ~ " '
    return /^[a-zA-Z0-9@/_.:+=-]+$/.test(value);
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
            if (!isValidPackageName(service.brew.tap)) return [];
            commands.push(`brew tap ${service.brew.tap}`);
            // Trust the tap to allow installation from non-official taps (Homebrew security feature)
            commands.push(`brew trust --tap ${service.brew.tap}`);
        }
        if (!isValidPackageName(service.brew.package)) return [];
        commands.push(`brew install ${service.brew.package}`);
        return commands;
    }

    if (packageManager === 'apt') {
        const commands = [];
        if (service.apt.repoSetup !== null) {
            commands.push(service.apt.repoSetup);
        }
        // Validate each package name
        for (const pkg of service.apt.packages) {
            if (!isValidPackageName(pkg)) return [];
        }
        commands.push(`sudo apt-get install -y ${service.apt.packages.join(' ')}`);
        return commands;
    }

    if (packageManager === 'yum') {
        const commands = [];
        if (service.yum.repoSetup !== null) {
            commands.push(service.yum.repoSetup);
        }
        // Validate each package name
        for (const pkg of service.yum.packages) {
            if (!isValidPackageName(pkg)) return [];
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

    // CLI tools and languages don't have services to start
    if (!service.systemdUnit && platform.os === 'linux') {
        return [];
    }

    if (platform.os === 'macos') {
        // Only services with ports have brew services (not CLI tools)
        if (service.port === 0) {
            return [];
        }
        if (!isValidPackageName(service.brew.package)) return [];
        return [`brew services start ${service.brew.package}`];
    }

    if (platform.os === 'linux') {
        if (!service.systemdUnit) {
            return [];
        }
        if (!isValidBinaryName(service.systemdUnit)) return [];
        return [`sudo systemctl start ${service.systemdUnit}`];
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
    if (service.port > 0) {
        return `${service.displayName} installed successfully on port ${service.port}.`;
    }
    return `${service.displayName} installed successfully.`;
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
 * On macOS uses `brew services start`; on Linux starts the service without enabling it at boot.
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
