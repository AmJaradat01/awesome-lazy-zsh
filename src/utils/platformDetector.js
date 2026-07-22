/**
 * Platform detection utilities
 * Detects OS and available package manager for service installation.
 * @author Ali M. Jaradat <AmJaradat01@gmail.com>
 */

import os from 'os';
import { exec } from 'child_process';

/**
 * @typedef {Object} PlatformInfo
 * @property {'macos'|'linux'} os - Operating system
 * @property {'brew'|'apt'|'yum'|null} packageManager - Detected package manager
 * @property {string|null} error - Error message if no valid package manager found
 */

/**
 * Default command executor that wraps child_process exec in a promise.
 * Resolves to true if command exits 0, false otherwise.
 * @param {string} command - Shell command to execute
 * @returns {Promise<boolean>}
 */
function defaultExecCommand(command) {
    return new Promise((resolve) => {
        exec(command, (error) => {
            resolve(!error);
        });
    });
}

/**
 * Detects the platform and available package manager.
 * @param {Object} [options] - Optional overrides for testing
 * @param {function} [options.execCommand] - Command executor (resolves to boolean)
 * @param {function} [options.getPlatform] - Function returning platform string (e.g., 'darwin', 'linux')
 * @returns {Promise<PlatformInfo>}
 */
export async function detectPlatform(options = {}) {
    const execCommand = options.execCommand || defaultExecCommand;
    const getPlatform = options.getPlatform || (() => os.platform());

    const platform = getPlatform();

    if (platform === 'darwin') {
        const hasBrew = await execCommand('which brew');
        if (hasBrew) {
            return { os: 'macos', packageManager: 'brew', error: null };
        }
        return {
            os: 'macos',
            packageManager: null,
            error: 'Homebrew is not installed. Please install Homebrew (https://brew.sh) to proceed with service installation.'
        };
    }

    if (platform === 'linux') {
        const hasApt = await execCommand('which apt-get');
        if (hasApt) {
            return { os: 'linux', packageManager: 'apt', error: null };
        }

        const hasYum = await execCommand('which yum');
        if (hasYum) {
            return { os: 'linux', packageManager: 'yum', error: null };
        }

        return {
            os: 'linux',
            packageManager: null,
            error: 'No supported package manager found. Please install apt-get or yum to proceed with service installation.'
        };
    }

    return {
        os: platform,
        packageManager: null,
        error: `Unsupported platform: ${platform}. Service installation is only supported on macOS and Linux.`
    };
}
