/**
 * @author Ali M. Jaradat
 * @email AmJaradat01@gmail.com
 * @since 1-Jan-2022
 * @version 1.0.0
 * @file This file manages the installation and configuration of themes for Awesome-Lazy-Zsh.
 * It handles applying selected or default themes and updating the .zshrc file.
 * @lastModified 4-Sep-2024
 */

import { getUserSelection } from '../prompts.js';
import { runCommand } from './commands.js';
import fs from 'fs';
import os from 'os';
import chalk from 'chalk';
import { themeRepos } from './config.js';  // Import theme repository mappings
import { updateZshrc } from './zshrcManager.js';

// Function to install a theme
async function installTheme(themeName) {
    const themePath = `${os.homedir()}/.oh-my-zsh/custom/themes/${themeName}`;
    if (themeRepos[themeName] && themeRepos[themeName] !== '') {
        if (!fs.existsSync(themePath)) {
            console.log(chalk.yellow(`⚠️ Installing ${themeName} theme...`));
            await runCommand(`git clone ${themeRepos[themeName]} ${themePath}`);
            console.log(chalk.green(`✅ ${themeName} theme installed.`));
        } else {
            console.log(chalk.blue(`ℹ️ ${themeName} theme is already installed.`));
        }
    } else {
        console.log(chalk.blue(`ℹ️ ${themeName} theme is already built into Oh My Zsh.`));
    }
}

// Function to apply the selected theme
export async function chooseTheme(plugins = []) {
    const themes = Object.keys(themeRepos);

    console.log(chalk.bold.blue('Select a theme to apply:'));
    const selectedTheme = await getUserSelection({
        type: 'select',
        name: 'selectedTheme',
        message: 'Choose a theme to apply:',
        choices: themes.map(theme => ({ title: theme, value: theme }))
    });

    if (!selectedTheme) {
        console.error(chalk.red('❌ No theme selected. Exiting.'));
        return;  // Add return to prevent further execution
    }

    console.log(chalk.bold.cyan('Selected theme:'), selectedTheme);
    await installTheme(selectedTheme);

    console.log(chalk.green(`✅ Applying theme: ${selectedTheme}`));

    // Update .zshrc with selected theme and plugins
    updateZshrc(plugins, selectedTheme);  // Pass both plugins and selected theme
}

// Function to apply the default theme
export async function applyDefaultTheme(plugins) {
    const defaultTheme = 'spaceship';  // Define your default theme here
    console.log(chalk.green(`✅ Applying default theme: ${defaultTheme}`));
    await installTheme(defaultTheme);
    updateZshrc(plugins, defaultTheme);  // Pass an empty plugin array for default installation
    console.log(chalk.green.bold('✅ Default theme applied successfully.'));
}
