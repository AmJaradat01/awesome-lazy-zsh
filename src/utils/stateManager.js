/**
 * State persistence manager for resume setup feature
 * @author Ali M. Jaradat <AmJaradat01@gmail.com>
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import chalk from 'chalk';

/**
 * @typedef {Object} SetupState
 * @property {number} version - Schema version (current: 1)
 * @property {string} checkpoint - Current checkpoint name
 * @property {string[]} selectedPlugins - User's plugin selections
 * @property {string[]} installedPlugins - Successfully installed plugins
 * @property {string[]} pendingPlugins - Plugins still to install
 * @property {string[]} selectedServices - Services user chose to install
 * @property {string[]} installedServices - Successfully installed services
 * @property {string[]} pendingServices - Services still to install
 * @property {string|null} selectedTheme - Chosen theme name
 * @property {number} timestamp - Unix timestamp (ms) of last update
 */

/** Path to the state file in user's home directory */
export const STATE_FILE_PATH = path.join(os.homedir(), '.awesome-lazy-zsh-state.json');

/** Current schema version for state file validation */
export const CURRENT_SCHEMA_VERSION = 1;

/** Maximum age of a state file before it is considered expired (24 hours) */
export const MAX_AGE_MS = 24 * 60 * 60 * 1000;

/** Valid checkpoint names */
const VALID_CHECKPOINTS = [
    'plugin_selection',
    'plugin_installation',
    'service_installation',
    'theme_selection'
];

/**
 * Reads and parses the state file from disk.
 * @returns {SetupState|null} The parsed state object, or null if the file doesn't exist or is invalid.
 */
export function readState() {
    try {
        const content = fs.readFileSync(STATE_FILE_PATH, 'utf8');
        return JSON.parse(content);
    } catch {
        return null;
    }
}

/**
 * Merges partial state updates into the existing state and writes atomically.
 * Creates a new state if none exists. Always updates the timestamp.
 * @param {Partial<SetupState>} partialState - Fields to merge into the current state.
 */
export function writeState(partialState) {
    try {
        const existing = readState() || {};
        const merged = {
            ...existing,
            ...partialState,
            version: CURRENT_SCHEMA_VERSION,
            timestamp: Date.now()
        };
        const tmpPath = STATE_FILE_PATH + '.tmp';
        fs.writeFileSync(tmpPath, JSON.stringify(merged, null, 2), { encoding: 'utf8', mode: 0o600 });
        fs.renameSync(tmpPath, STATE_FILE_PATH);
    } catch (error) {
        console.log(chalk.yellow(`⚠️ Warning: Could not save setup state: ${error.message}`));
    }
}

/**
 * Removes the state file from disk.
 * Logs a warning on failure but never throws.
 */
export function deleteState() {
    try {
        fs.unlinkSync(STATE_FILE_PATH);
    } catch (error) {
        if (error.code !== 'ENOENT') {
            console.log(chalk.yellow(`⚠️ Warning: Could not delete state file: ${error.message}`));
        }
    }
}

/**
 * Validates that the given data conforms to the SetupState schema.
 * @param {unknown} data - The data to validate.
 * @returns {boolean} True if data is a valid SetupState, false otherwise.
 */
export function validateState(data) {
    try {
        if (data === null || typeof data !== 'object') {
            return false;
        }

        // Check schema version
        if (data.version !== CURRENT_SCHEMA_VERSION) {
            return false;
        }

        // Check checkpoint is a valid string
        if (typeof data.checkpoint !== 'string' || !VALID_CHECKPOINTS.includes(data.checkpoint)) {
            return false;
        }

        // Check all array fields are arrays of strings
        const arrayFields = [
            'selectedPlugins',
            'installedPlugins',
            'pendingPlugins',
            'selectedServices',
            'installedServices',
            'pendingServices'
        ];

        for (const field of arrayFields) {
            if (!Array.isArray(data[field])) {
                return false;
            }
            if (!data[field].every(item => typeof item === 'string')) {
                return false;
            }
        }

        // Check selectedTheme is string or null
        if (data.selectedTheme !== null && typeof data.selectedTheme !== 'string') {
            return false;
        }

        // Check timestamp is a positive number
        if (typeof data.timestamp !== 'number' || data.timestamp <= 0) {
            return false;
        }

        return true;
    } catch {
        return false;
    }
}

/**
 * Checks if a state has expired (older than 24 hours).
 * @param {SetupState} state - The state to check.
 * @returns {boolean} True if the state timestamp is older than MAX_AGE_MS.
 */
export function isExpired(state) {
    try {
        return Date.now() - state.timestamp > MAX_AGE_MS;
    } catch {
        return true;
    }
}
