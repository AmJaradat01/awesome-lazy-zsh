/**
 * Shell command execution utilities
 * @author Ali M. Jaradat <AmJaradat01@gmail.com>
 */

import { execSync, execFileSync } from 'child_process';
import chalk from 'chalk';

/**
 * Executes shell command with error handling.
 * WARNING: Only use this for trusted, hardcoded commands — never with user input.
 * For commands with user-supplied arguments, use runCommandSafe instead.
 * @param {string} command - Shell command to execute
 * @returns {Promise<boolean>} Command execution success status
 */
export function runCommand(command) {
    return new Promise((resolve) => {
        try {
            console.log(chalk.blue(`🚀 Running: ${command}`));
            execSync(command, { 
                stdio: 'inherit',
                timeout: 60000 // 60 second timeout
            });
            console.log(chalk.green(`✅ Command executed successfully`));
            resolve(true);
        } catch (error) {
            console.error(chalk.red(`❌ Command failed: ${command}`));
            console.error(chalk.red(`Error: ${error.message}`));
            resolve(false);
        }
    });
}

/**
 * Executes a command safely without shell interpolation.
 * Uses execFileSync with an argument array — immune to command injection.
 * @param {string} binary - The binary to execute (e.g., 'git')
 * @param {string[]} args - Array of arguments (never concatenated into a shell string)
 * @param {Object} [options] - Optional options (cwd, timeout)
 * @returns {Promise<boolean>} Command execution success status
 */
export function runCommandSafe(binary, args, options = {}) {
    return new Promise((resolve) => {
        try {
            const displayCmd = `${binary} ${args.join(' ')}`;
            console.log(chalk.blue(`🚀 Running: ${displayCmd}`));
            execFileSync(binary, args, {
                stdio: 'inherit',
                timeout: options.timeout || 60000,
                cwd: options.cwd || undefined
            });
            console.log(chalk.green(`✅ Command executed successfully`));
            resolve(true);
        } catch (error) {
            const displayCmd = `${binary} ${args.join(' ')}`;
            console.error(chalk.red(`❌ Command failed: ${displayCmd}`));
            console.error(chalk.red(`Error: ${error.message}`));
            resolve(false);
        }
    });
}
