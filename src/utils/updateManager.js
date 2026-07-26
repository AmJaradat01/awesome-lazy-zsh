/**
 * Plugin update and rollback management
 * @author Ali M. Jaradat <AmJaradat01@gmail.com>
 */

import { runCommandSafe } from './commands.js';
import { pluginRepos } from './config.js';
import fs from 'fs';
import path from 'path';
import os from 'os';
import chalk from 'chalk';
import { loadCustomPlugins } from './customPlugins.js';

const PLUGINS_DIR = path.join(os.homedir(), '.oh-my-zsh/custom/plugins');

/**
 * Updates a single plugin to latest version
 * @param {string} pluginName - Plugin name to update
 * @returns {Promise<boolean>} Update success status
 */
export async function updatePlugin(pluginName) {
    if (!fs.existsSync(PLUGINS_DIR)) {
        return false;
    }
    
    const pluginPath = path.join(PLUGINS_DIR, pluginName);
    
    if (!fs.existsSync(pluginPath) || !pluginRepos[pluginName]) {
        return false;
    }

    console.log(chalk.yellow(`🔄 Updating ${pluginName}...`));
    const configured = pluginRepos[pluginName];
    const custom = loadCustomPlugins()[pluginName];
    let success;
    if (configured && configured !== 'alias-only') {
        const ref = configured.includes('#') ? configured.slice(configured.indexOf('#') + 1) : 'HEAD';
        success = await runCommandSafe('git', ['fetch', '--tags', '--prune', 'origin'], { cwd: pluginPath });
        if (success) success = await runCommandSafe('git', ['checkout', '--detach', ref], { cwd: pluginPath });
    } else if (custom) {
        success = await runCommandSafe('git', ['pull', '--ff-only'], { cwd: pluginPath });
    } else {
        return false;
    }
    
    if (success) {
        console.log(chalk.green(`✅ ${pluginName} updated`));
    }
    return success;
}

/**
 * Updates all installed plugins
 * @returns {Promise<void>}
 */
export async function updateAllPlugins() {
    if (!fs.existsSync(PLUGINS_DIR)) {
        console.log(chalk.yellow('⚠️ No custom plugins directory found'));
        return;
    }
    
    const plugins = fs.readdirSync(PLUGINS_DIR).filter(dir => 
        fs.statSync(path.join(PLUGINS_DIR, dir)).isDirectory()
    );
    
    if (plugins.length === 0) {
        console.log(chalk.yellow('⚠️ No custom plugins to update'));
        return;
    }
    
    console.log(chalk.blue('🔄 Updating all plugins...'));
    const results = await Promise.all(plugins.map(updatePlugin));
    
    const updated = results.filter(Boolean).length;
    console.log(chalk.green(`✅ Updated ${updated}/${plugins.length} plugins`));
}

/**
 * Rolls back plugin to previous commit
 * @param {string} pluginName - Plugin name to rollback
 * @returns {Promise<boolean>} Rollback success status
 */
export async function rollbackPlugin(pluginName) {
    const pluginPath = path.join(PLUGINS_DIR, pluginName);
    
    if (!fs.existsSync(pluginPath)) return false;
    
    console.log(chalk.yellow(`⏪ Rolling back ${pluginName}...`));
    const success = await runCommandSafe('git', ['reflog', 'exists'], { cwd: pluginPath });
    if (!success) return false;
    return await runCommandSafe('git', ['reset', '--hard', 'HEAD@{1}'], { cwd: pluginPath });
}
