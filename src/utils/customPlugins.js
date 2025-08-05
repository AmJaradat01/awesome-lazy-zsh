/**
 * Custom plugin repository management
 * @author Ali M. Jaradat <AmJaradat01@gmail.com>
 */

import { runCommand } from './commands.js';
import fs from 'fs';
import path from 'path';
import os from 'os';
import chalk from 'chalk';

const CUSTOM_PLUGINS_FILE = path.join(os.homedir(), '.awesome-lazy-zsh/custom-plugins.json');

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
        fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CUSTOM_PLUGINS_FILE, JSON.stringify(plugins, null, 2));
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
 * Installs custom plugin from repository
 * @param {string} name - Plugin name
 * @param {string} repoUrl - Git repository URL
 * @returns {Promise<boolean>} Installation success status
 */
export async function installCustomPlugin(name, repoUrl) {
    const pluginPath = path.join(os.homedir(), `.oh-my-zsh/custom/plugins/${name}`);
    
    if (fs.existsSync(pluginPath)) {
        console.log(chalk.blue(`ℹ️ ${name} already installed`));
        return true;
    }
    
    console.log(chalk.yellow(`⚠️ Installing custom plugin ${name}...`));
    const success = await runCommand(`git clone ${repoUrl} ${pluginPath}`);
    
    if (success) {
        addCustomPlugin(name, repoUrl);
        console.log(chalk.green(`✅ Custom plugin ${name} installed`));
    }
    
    return success;
}