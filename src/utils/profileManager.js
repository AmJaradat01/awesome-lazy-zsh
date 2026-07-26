/**
 * Configuration profile management
 * @author Ali M. Jaradat <AmJaradat01@gmail.com>
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import chalk from 'chalk';
import { updateZshrc } from './zshrcManager.js';
import { installPlugin } from './pluginManager.js';
import { installCustomPlugin, loadCustomPlugins } from './customPlugins.js';

const PROFILES_DIR = path.join(process.env.AWESOME_LAZY_ZSH_DATA_HOME || os.homedir(), '.awesome-lazy-zsh/profiles');

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
 */
export function saveProfile(name, plugins, theme, customRepos = {}) {
    // Validate profile name to prevent path traversal
    if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
        console.error(chalk.red('❌ Invalid profile name. Use only letters, numbers, hyphens, and underscores.'));
        return;
    }

    ensureProfilesDir();
    const profile = { plugins, theme, customRepos, created: new Date().toISOString() };
    
    fs.writeFileSync(
        path.join(PROFILES_DIR, `${name}.json`),
        JSON.stringify(profile, null, 2),
        { mode: 0o600 }
    );
    
    console.log(chalk.green(`✅ Profile '${name}' saved`));
}

/**
 * Loads profile configuration by name
 * @param {string} name - Profile name
 * @returns {Object|null} Profile data or null if not found
 */
export function loadProfile(name) {
    // Validate profile name to prevent path traversal
    if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
        console.error(chalk.red('❌ Invalid profile name'));
        return null;
    }

    const profilePath = path.join(PROFILES_DIR, `${name}.json`);
    
    if (!fs.existsSync(profilePath)) {
        console.error(chalk.red(`❌ Profile '${name}' not found`));
        return null;
    }
    
    return JSON.parse(fs.readFileSync(profilePath, 'utf-8'));
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
 * Switches to specified profile configuration
 * @param {string} name - Profile name to switch to
 * @returns {Promise<boolean>} Switch success status
 */
export async function switchProfile(name) {
    const profile = loadProfile(name);
    if (!profile) return false;
    
    console.log(chalk.blue(`🔄 Switching to profile '${name}'...`));
    for (const plugin of profile.plugins || []) {
        const customUrl = profile.customRepos?.[plugin];
        const installed = customUrl
            ? await installCustomPlugin(plugin, customUrl)
            : await installPlugin(plugin);
        if (!installed) {
            console.error(chalk.red(`❌ Could not install profile component '${plugin}'`));
            return false;
        }
    }
    await updateZshrc(profile.plugins, profile.theme);
    console.log(chalk.green(`✅ Switched to profile '${name}'`));
    return true;
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
    
    fs.writeFileSync(outputPath, JSON.stringify(profile, null, 2), { mode: 0o600 });
    console.log(chalk.green(`✅ Profile exported to ${outputPath}`));
    return true;
}
