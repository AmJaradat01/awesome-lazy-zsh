/**
 * Configuration profile management
 * @author Ali M. Jaradat <AmJaradat01@gmail.com>
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import chalk from 'chalk';
import { updateZshrc, extractExistingPlugins, extractExistingTheme } from './zshrcManager.js';
import { installPlugin } from './pluginManager.js';
import { installCustomPlugin, loadCustomPlugins } from './customPlugins.js';

const PROFILES_DIR = path.join(
    process.env.AWESOME_LAZY_ZSH_DATA_HOME || os.homedir(),
    '.awesome-lazy-zsh/profiles'
);

/**
 * Validates a profile name for safety
 * @param {string} name - Profile name to validate
 * @returns {boolean} True if valid
 */
function isValidProfileName(name) {
    return typeof name === 'string' &&
        name.length > 0 &&
        name.length <= 50 &&
        /^[a-zA-Z0-9_-]+$/.test(name);
}

/**
 * Ensures profiles directory exists
 */
export function ensureProfilesDir() {
    if (!fs.existsSync(PROFILES_DIR)) {
        fs.mkdirSync(PROFILES_DIR, { recursive: true, mode: 0o700 });
    }
}



/**
 * Saves current configuration as named profile
 * @param {string} name - Profile name
 * @param {string[]} plugins - Plugin list
 * @param {string} theme - Theme name
 * @param {Object} customRepos - Custom plugin repositories
 * @returns {boolean} Success status
 */
export function saveProfile(name, plugins, theme, customRepos = {}) {
    if (!isValidProfileName(name)) {
        console.error(chalk.red('Invalid profile name. Use only letters, numbers, hyphens, and underscores.'));
        return false;
    }

    ensureProfilesDir();
    
    const profile = {
        plugins,
        theme,
        customRepos,
        created: new Date().toISOString(),
        version: 2 // Profile format version
    };

    const profilePath = path.join(PROFILES_DIR, `${name}.json`);
    fs.writeFileSync(profilePath, JSON.stringify(profile, null, 2), { mode: 0o600 });

    console.log(chalk.green(`Profile '${name}' saved`));
    return true;
}

/**
 * Loads profile configuration by name
 * @param {string} name - Profile name
 * @returns {Object|null} Profile data or null if not found
 */
export function loadProfile(name) {
    if (!isValidProfileName(name)) {
        console.error(chalk.red('Invalid profile name'));
        return null;
    }

    const profilePath = path.join(PROFILES_DIR, `${name}.json`);

    if (!fs.existsSync(profilePath)) {
        console.error(chalk.red(`Profile '${name}' not found`));
        return null;
    }

    try {
        return JSON.parse(fs.readFileSync(profilePath, 'utf-8'));
    } catch (error) {
        console.error(chalk.red(`Failed to load profile '${name}': ${error.message}`));
        return null;
    }
}

/**
 * Lists all available profile names
 * @returns {string[]} Array of profile names
 */
export function listProfiles() {
    ensureProfilesDir();
    return fs.readdirSync(PROFILES_DIR)
        .filter(file => file.endsWith('.json'))
        .map(file => file.replace('.json', ''));
}



/**
 * Deletes a profile by name
 * @param {string} name - Profile name to delete
 * @returns {boolean} Success status
 */
export function deleteProfile(name) {
    if (!isValidProfileName(name)) {
        console.error(chalk.red('Invalid profile name'));
        return false;
    }

    const profilePath = path.join(PROFILES_DIR, `${name}.json`);

    if (!fs.existsSync(profilePath)) {
        console.error(chalk.red(`Profile '${name}' not found`));
        return false;
    }

    fs.unlinkSync(profilePath);
    console.log(chalk.green(`Profile '${name}' deleted`));
    return true;
}

/**
 * Gets detailed information about a profile
 * @param {string} name - Profile name
 * @returns {Object|null} Profile details or null
 */
export function getProfileInfo(name) {
    const profile = loadProfile(name);
    if (!profile) return null;

    return {
        name,
        theme: profile.theme,
        pluginCount: profile.plugins?.length || 0,
        plugins: profile.plugins || [],
        customPlugins: Object.keys(profile.customRepos || {}),
        created: profile.created,
        version: profile.version || 1
    };
}

/**
 * Switches to specified profile configuration
 * @param {string} name - Profile name to switch to
 * @returns {Promise<boolean>} Switch success status
 */
export async function switchProfile(name) {
    const profile = loadProfile(name);
    if (!profile) return false;

    console.log(chalk.blue(`Switching to profile '${name}'...`));

    // Install any plugins that need installation
    const failedPlugins = [];
    for (const plugin of profile.plugins || []) {
        const customUrl = profile.customRepos?.[plugin];
        try {
            const installed = customUrl
                ? await installCustomPlugin(plugin, customUrl)
                : await installPlugin(plugin);

            if (!installed) {
                failedPlugins.push(plugin);
            }
        } catch (error) {
            console.error(chalk.yellow(`Warning: Could not install '${plugin}': ${error.message}`));
            failedPlugins.push(plugin);
        }
    }

    // Update .zshrc with new configuration using the new API
    const result = await updateZshrc(profile.plugins, profile.theme, {
        repair: true,
        cleanDuplicates: true
    });

    if (!result.success) {
        console.error(chalk.red(`Failed to switch profile: ${result.error}`));
        return false;
    }

    if (failedPlugins.length > 0) {
        console.log(chalk.yellow(`Warning: Some plugins could not be installed: ${failedPlugins.join(', ')}`));
    }

    console.log(chalk.green(`Switched to profile '${name}'`));
    return true;
}



/**
 * Saves the current .zshrc configuration as a profile
 * @param {string} name - Profile name
 * @returns {boolean} Success status
 */
export function saveCurrentAsProfile(name) {
    if (!isValidProfileName(name)) {
        console.error(chalk.red('Invalid profile name. Use only letters, numbers, hyphens, and underscores.'));
        return false;
    }

    const zshrcPath = path.join(os.homedir(), '.zshrc');
    if (!fs.existsSync(zshrcPath)) {
        console.error(chalk.red('No .zshrc file found'));
        return false;
    }

    const content = fs.readFileSync(zshrcPath, 'utf8');
    const plugins = extractExistingPlugins(content);
    const theme = extractExistingTheme(content) || 'robbyrussell';

    // Get custom plugin repos
    const allCustomRepos = loadCustomPlugins();
    const customRepos = Object.fromEntries(
        Object.entries(allCustomRepos).filter(([plugin]) => plugins.includes(plugin))
    );

    return saveProfile(name, plugins, theme, customRepos);
}

/**
 * Exports profile to specified file path
 * @param {string} name - Profile name to export
 * @param {string} outputPath - Output file path
 * @returns {boolean} Export success status
 */
export function exportProfile(name, outputPath) {
    const profile = loadProfile(name);
    if (!profile) return false;

    try {
        fs.writeFileSync(outputPath, JSON.stringify(profile, null, 2), { mode: 0o600 });
        console.log(chalk.green(`Profile exported to ${outputPath}`));
        return true;
    } catch (error) {
        console.error(chalk.red(`Failed to export profile: ${error.message}`));
        return false;
    }
}

/**
 * Imports a profile from a file
 * @param {string} inputPath - Path to profile file
 * @param {string} [name] - Optional name override
 * @returns {boolean} Import success status
 */
export function importProfile(inputPath, name = null) {
    if (!fs.existsSync(inputPath)) {
        console.error(chalk.red(`File not found: ${inputPath}`));
        return false;
    }

    try {
        const profile = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

        // Validate profile structure
        if (!profile.plugins || !Array.isArray(profile.plugins)) {
            console.error(chalk.red('Invalid profile format: missing plugins array'));
            return false;
        }
        if (!profile.theme || typeof profile.theme !== 'string') {
            console.error(chalk.red('Invalid profile format: missing theme'));
            return false;
        }

        // Determine profile name
        const profileName = name || path.basename(inputPath, '.json');
        if (!isValidProfileName(profileName)) {
            console.error(chalk.red('Invalid profile name'));
            return false;
        }

        return saveProfile(profileName, profile.plugins, profile.theme, profile.customRepos || {});
    } catch (error) {
        console.error(chalk.red(`Failed to import profile: ${error.message}`));
        return false;
    }
}

/**
 * Compares two profiles
 * @param {string} name1 - First profile name
 * @param {string} name2 - Second profile name
 * @returns {Object|null} Comparison result or null
 */
export function compareProfiles(name1, name2) {
    const profile1 = loadProfile(name1);
    const profile2 = loadProfile(name2);

    if (!profile1 || !profile2) return null;

    const plugins1 = new Set(profile1.plugins || []);
    const plugins2 = new Set(profile2.plugins || []);

    return {
        themes: {
            [name1]: profile1.theme,
            [name2]: profile2.theme,
            same: profile1.theme === profile2.theme
        },
        plugins: {
            onlyIn1: [...plugins1].filter(p => !plugins2.has(p)),
            onlyIn2: [...plugins2].filter(p => !plugins1.has(p)),
            common: [...plugins1].filter(p => plugins2.has(p))
        }
    };
}
