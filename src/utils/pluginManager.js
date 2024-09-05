/**
 * @author Ali M. Jaradat
 * @email AmJaradat01@gmail.com
 * @since 1-Jan-2022
 * @version 1.0.0
 * @file This file manages the installation and configuration of plugins for Awesome-Lazy-Zsh.
 * It handles fresh installation, default installation, and updating the .zshrc file.
 * @lastModified 4-Sep-2024
 */

import { getUserSelection } from '../prompts.js';
import { runCommand } from './commands.js';
import { updateZshrc } from './zshrcManager.js';
import { pluginRepos } from './config.js';
import chalk from 'chalk';
import path from 'path';
import os from 'os';
import fs from 'fs';

// Default plugins list
const defaultPlugins = [
    'git', 'git-flow', 'npm', 'nvm', 'docker', 'docker-compose',
    'kubectl', 'terraform', 'vscode', 'fzf', 'z',
    'zsh-autocomplete', 'zsh-autosuggestions', 'zsh-syntax-highlighting'
];

// Function to install a plugin
async function installPlugin(pluginName) {
    const pluginPath = path.join(os.homedir(), `.oh-my-zsh/custom/plugins/${pluginName}`);

    if (!fs.existsSync(pluginPath)) {
        const repoUrl = pluginRepos[pluginName];
        if (repoUrl) {
            console.log(chalk.yellow(`⚠️ Installing ${pluginName} plugin...`));
            await runCommand(`git clone ${repoUrl} ${pluginPath}`);
            console.log(chalk.green(`✅ ${pluginName} plugin installed successfully.`));
        } else {
            console.error(chalk.red(`❌ Error installing plugin ${pluginName}: Repository URL not found.`));
        }
    } else {
        console.log(chalk.blue(`ℹ️ ${pluginName} plugin is already installed.`));
    }
}

// Function to install selected plugins (fresh installation)
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

        for (const plugin of plugins) {
            await installPlugin(plugin);
        }

        // Pass the selected plugins to the .zshrc updater
        updateZshrc(plugins, 'spaceship');
        return plugins;  // Return selected plugins
    } catch (error) {
        console.error(chalk.red('❌ Error during plugin installation process:'), error);
        return null;
    }
}

// Function to install default plugins
export async function runDefaultInstallation() {
    try {
        console.log(chalk.bold.blue('Installing default plugins...'));

        for (const plugin of defaultPlugins) {
            await installPlugin(plugin);
        }

        // Update .zshrc with the default plugins and theme
        updateZshrc(defaultPlugins, 'spaceship');  // Ensure plugins are passed here
        console.log(chalk.green('✅ Default plugins installed successfully.'));
        return defaultPlugins;
    } catch (error) {
        console.error(chalk.red('❌ Error during default plugin installation:'), error);
        return null;
    }
}
