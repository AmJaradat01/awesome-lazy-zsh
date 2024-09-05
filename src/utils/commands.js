/**
 * @author Ali M. Jaradat
 * @email AmJaradat01@gmail.com
 * @since 1-Jan-2022
 * @version 1.0.0
 * @file This file contains utility functions for executing shell commands in Awesome-Lazy-Zsh.
 * It handles command execution and related error handling.
 * @lastModified 4-Sep-2024
 */

import { execSync } from 'child_process';
import chalk from 'chalk';

/**
 * Executes a shell command synchronously and handles errors.
 * @param {string} command - The shell command to execute.
 */
export function runCommand(command) {
    try {
        console.log(chalk.blue(`🚀 Running: ${command}`));
        execSync(command, { stdio: 'inherit' });
        console.log(chalk.green(`✅ Command executed successfully: ${command}`));
    } catch (error) {
        console.error(chalk.red(`❌ Command failed: ${command}\nError: ${error.message}`));
    }
}
