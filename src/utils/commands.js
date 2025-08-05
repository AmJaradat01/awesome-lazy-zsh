/**
 * Shell command execution utilities
 * @author Ali M. Jaradat <AmJaradat01@gmail.com>
 */

import { execSync } from 'child_process';
import chalk from 'chalk';

/**
 * Executes shell command with error handling
 * @param {string} command - Shell command to execute
 * @returns {Promise<boolean>} Command execution success status
 */
export function runCommand(command) {
    return new Promise((resolve) => {
        try {
            console.log(chalk.blue(`🚀 Running: ${command}`));
            execSync(command, { stdio: 'inherit' });
            console.log(chalk.green(`✅ Command executed successfully`));
            resolve(true);
        } catch (error) {
            console.error(chalk.red(`❌ Command failed: ${command}`));
            console.error(chalk.red(`Error: ${error.message}`));
            resolve(false);
        }
    });
}
