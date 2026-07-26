/**
 * Custom plugin repository management
 * @author Ali M. Jaradat <AmJaradat01@gmail.com>
 */

import { runCommandSafe } from './commands.js';
import fs from 'fs';
import path from 'path';
import os from 'os';
import chalk from 'chalk';

const userHome = process.env.AWESOME_LAZY_ZSH_DATA_HOME || os.homedir();
const CUSTOM_PLUGINS_FILE = path.join(userHome, '.awesome-lazy-zsh/custom-plugins.json');

/**
 * Validates a plugin name to prevent path traversal and shell metacharacters.
 * Only allows alphanumeric characters, hyphens, and underscores.
 * @param {string} name - Plugin name to validate
 * @returns {{valid: boolean, reason?: string}} Validation result
 */
export function validatePluginName(name) {
    if (typeof name !== 'string' || name.length === 0) {
        return { valid: false, reason: 'Plugin name must be a non-empty string.' };
    }

    if (name.length > 100) {
        return { valid: false, reason: 'Plugin name must be 100 characters or fewer.' };
    }

    // Reject path traversal patterns
    if (name.includes('..') || name.includes('/') || name.includes('\\')) {
        return { valid: false, reason: 'Plugin name must not contain path separators or "..".' };
    }

    // Only allow safe characters: alphanumeric, hyphens, underscores, dots (no leading dot)
    if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(name)) {
        return { valid: false, reason: 'Plugin name must start with a letter or digit and contain only letters, digits, hyphens, underscores, and dots.' };
    }

    return { valid: true };
}

/**
 * Validates a repository URL to prevent local file access and non-HTTPS cloning.
 * Only allows https:// URLs pointing to known git hosting providers or any https:// .git URL.
 * @param {string} url - Repository URL to validate
 * @returns {{valid: boolean, reason?: string}} Validation result
 */
export function validateRepoUrl(url) {
    if (typeof url !== 'string' || url.length === 0) {
        return { valid: false, reason: 'Repository URL must be a non-empty string.' };
    }

    if (url.length > 2048) {
        return { valid: false, reason: 'Repository URL must be 2048 characters or fewer.' };
    }

    // Must be HTTPS
    if (!url.startsWith('https://')) {
        return { valid: false, reason: 'Repository URL must use HTTPS (https://). HTTP, SSH, file://, and local paths are not allowed.' };
    }

    // Parse URL to validate structure
    let parsed;
    try {
        parsed = new URL(url);
    } catch {
        return { valid: false, reason: 'Repository URL is not a valid URL.' };
    }

    // Reject URLs with credentials embedded
    if (parsed.username || parsed.password) {
        return { valid: false, reason: 'Repository URL must not contain embedded credentials.' };
    }

    // Reject localhost / loopback / private IPs
    const hostname = parsed.hostname.toLowerCase();
    if (
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname === '::1' ||
        hostname.startsWith('192.168.') ||
        hostname.startsWith('10.') ||
        hostname.startsWith('172.') ||
        hostname.endsWith('.local')
    ) {
        return { valid: false, reason: 'Repository URL must not point to localhost or private network addresses.' };
    }

    // Must end with .git or be from a known git hosting provider
    const knownHosts = ['github.com', 'gitlab.com', 'bitbucket.org', 'codeberg.org'];
    const isKnownHost = knownHosts.some(host => hostname === host || hostname.endsWith(`.${host}`));
    const endsWithGit = parsed.pathname.endsWith('.git');

    if (!isKnownHost && !endsWithGit) {
        return { valid: false, reason: 'Repository URL must end with .git or be hosted on a known provider (GitHub, GitLab, Bitbucket, Codeberg).' };
    }

    return { valid: true };
}

/**
 * Loads custom plugin registry from file
 * @returns {Object} Custom plugin name-to-URL mappings
 */
export function loadCustomPlugins() {
    if (!fs.existsSync(CUSTOM_PLUGINS_FILE)) {
        return {};
    }
    return JSON.parse(fs.readFileSync(CUSTOM_PLUGINS_FILE, 'utf-8'));
}

/**
 * Saves custom plugin registry to file
 * @param {Object} plugins - Plugin name-to-URL mappings
 */
export function saveCustomPlugins(plugins) {
    const dir = path.dirname(CUSTOM_PLUGINS_FILE);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    }
    fs.writeFileSync(CUSTOM_PLUGINS_FILE, JSON.stringify(plugins, null, 2), { mode: 0o600 });
}

/**
 * Adds custom plugin to registry
 * @param {string} name - Plugin name
 * @param {string} repoUrl - Git repository URL
 */
export function addCustomPlugin(name, repoUrl) {
    const customPlugins = loadCustomPlugins();
    customPlugins[name] = repoUrl;
    saveCustomPlugins(customPlugins);
    
    console.log(chalk.green(`✅ Added custom plugin: ${name}`));
}

/**
 * Installs custom plugin from repository.
 * Validates both the plugin name and repository URL before proceeding.
 * @param {string} name - Plugin name
 * @param {string} repoUrl - Git repository URL (must be HTTPS)
 * @returns {Promise<boolean>} Installation success status
 */
export async function installCustomPlugin(name, repoUrl) {
    // Validate plugin name
    const nameValidation = validatePluginName(name);
    if (!nameValidation.valid) {
        console.error(chalk.red(`❌ Invalid plugin name: ${nameValidation.reason}`));
        return false;
    }

    // Validate repository URL
    const urlValidation = validateRepoUrl(repoUrl);
    if (!urlValidation.valid) {
        console.error(chalk.red(`❌ Invalid repository URL: ${urlValidation.reason}`));
        return false;
    }

    const pluginPath = path.join(userHome, '.oh-my-zsh/custom/plugins', name);
    
    // Double-check the resolved path is still under the plugins directory (belt-and-suspenders)
    const pluginsBase = path.join(userHome, '.oh-my-zsh/custom/plugins');
    const resolvedPath = path.resolve(pluginPath);
    if (!resolvedPath.startsWith(pluginsBase + path.sep) && resolvedPath !== pluginsBase) {
        console.error(chalk.red(`❌ Invalid plugin path: resolved path escapes plugins directory.`));
        return false;
    }

    if (fs.existsSync(pluginPath)) {
        console.log(chalk.blue(`ℹ️ ${name} already installed`));
        return true;
    }
    
    console.log(chalk.yellow(`⚠️ Installing custom plugin ${name}...`));
    const success = await runCommandSafe('git', ['clone', '--depth', '1', repoUrl, pluginPath]);
    
    if (success) {
        addCustomPlugin(name, repoUrl);
        console.log(chalk.green(`✅ Custom plugin ${name} installed`));
    }
    
    return success;
}
