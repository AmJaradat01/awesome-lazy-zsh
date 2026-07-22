/**
 * Plugin installation and management utilities
 * @author Ali M. Jaradat <AmJaradat01@gmail.com>
 */

import { getUserSelection } from '../prompts.js';
import { runCommand } from './commands.js';
import { updateZshrc } from './zshrcManager.js';
import { pluginRepos } from './config.js';
import chalk from 'chalk';
import path from 'path';
import os from 'os';
import fs from 'fs';

/** Default plugin selection for quick setup */
const defaultPlugins = [
    'git', 'git-flow', 'npm', 'nvm', 'docker', 'docker-compose',
    'kubectl', 'terraform', 'vscode', 'fzf', 'z',
    'zsh-autocomplete', 'zsh-autosuggestions', 'zsh-syntax-highlighting',
    'git-extras', 'directories', 'history-search', 'extract'
];

/**
 * Installs a single plugin with validation
 * @param {string} pluginName - Plugin name to install
 * @returns {Promise<boolean>} Installation success status
 */
async function installPlugin(pluginName) {
    const repoUrl = pluginRepos[pluginName];
    
    if (!repoUrl || repoUrl === '') {
        console.log(chalk.blue(`ℹ️ ${pluginName} is a built-in Oh My Zsh plugin.`));
        return true;
    }

    if (repoUrl === 'alias-only') {
        console.log(chalk.blue(`ℹ️ ${pluginName} will be loaded as a custom alias file.`));
        return true;
    }

    const pluginPath = path.join(os.homedir(), `.oh-my-zsh/custom/plugins/${pluginName}`);

    if (fs.existsSync(pluginPath)) {
        console.log(chalk.blue(`ℹ️ ${pluginName} plugin is already installed.`));
        return true;
    }

    try {
        console.log(chalk.yellow(`⚠️ Installing ${pluginName} plugin...`));
        await runCommand(`git clone ${repoUrl} ${pluginPath}`);
        
        // Verify installation
        if (fs.existsSync(pluginPath)) {
            console.log(chalk.green(`✅ ${pluginName} plugin installed successfully.`));
            return true;
        } else {
            throw new Error('Plugin directory not created');
        }
    } catch (error) {
        console.error(chalk.red(`❌ Failed to install ${pluginName}: ${error.message}`));
        return false;
    }
}

/**
 * Runs interactive plugin selection and installation
 * @returns {Promise<string[]|null>} Installed plugin names or null on failure
 */
export async function runFreshInstallation() {
    try {
        console.log(chalk.bold.blue('Select plugins to install:'));
        const plugins = await getUserSelection({
            type: 'multiselect',
            name: 'plugins',
            message: 'Select plugins to install:',
            choices: Object.keys(pluginRepos).map(plugin => ({ title: plugin, value: plugin }))
        });

        if (!plugins || plugins.length === 0) {
            console.error(chalk.red('❌ No plugins selected. Exiting.'));
            return null;
        }

        console.log(chalk.bold.cyan('Selected plugins:'), plugins.join(', '));

        const installedPlugins = [];
        const failedPlugins = [];

        for (const plugin of plugins) {
            const success = await installPlugin(plugin);
            if (success) {
                installedPlugins.push(plugin);
            } else {
                failedPlugins.push(plugin);
            }
        }

        if (failedPlugins.length > 0) {
            console.log(chalk.yellow(`⚠️ Failed to install: ${failedPlugins.join(', ')}`));
        }

        if (installedPlugins.length === 0) {
            console.error(chalk.red('❌ No plugins were successfully installed.'));
            return null;
        }

        // Pass the successfully installed plugins to the .zshrc updater
        await updateZshrc(installedPlugins, 'spaceship');
        return installedPlugins;
    } catch (error) {
        console.error(chalk.red('❌ Error during plugin installation process:'), error);
        return null;
    }
}

/**
 * Installs predefined default plugins
 * @returns {Promise<string[]|null>} Installed plugin names or null on failure
 */
export async function runDefaultInstallation() {
    try {
        console.log(chalk.bold.blue('Installing default plugins...'));

        const installedPlugins = [];
        const failedPlugins = [];

        for (const plugin of defaultPlugins) {
            const success = await installPlugin(plugin);
            if (success) {
                installedPlugins.push(plugin);
            } else {
                failedPlugins.push(plugin);
            }
        }

        if (failedPlugins.length > 0) {
            console.log(chalk.yellow(`⚠️ Failed to install: ${failedPlugins.join(', ')}`));
        }

        if (installedPlugins.length === 0) {
            console.error(chalk.red('❌ No default plugins were successfully installed.'));
            return null;
        }

        // Update .zshrc with the successfully installed plugins and theme
        await updateZshrc(installedPlugins, 'spaceship');
        console.log(chalk.green('✅ Default plugins installation completed.'));
        return installedPlugins;
    } catch (error) {
        console.error(chalk.red('❌ Error during default plugin installation:'), error);
        return null;
    }
}
