/**
 * System-specific optimizations and integrations
 * @author Ali M. Jaradat <AmJaradat01@gmail.com>
 */

import os from 'os';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

/**
 * Detects current system platform and architecture
 * @returns {Object} System information object
 */
export function detectSystem() {
    const platform = os.platform();
    const arch = os.arch();
    
    return {
        platform,
        arch,
        isMac: platform === 'darwin',
        isLinux: platform === 'linux',
        isAppleSilicon: platform === 'darwin' && arch === 'arm64'
    };
}

/**
 * Gets platform-specific optimized PATH entries
 * @returns {string[]} Array of PATH entries
 */
export function getOptimizedPaths() {
    const system = detectSystem();
    const paths = [];
    
    if (system.isMac) {
        if (system.isAppleSilicon) {
            paths.push('/opt/homebrew/bin');
        } else {
            paths.push('/usr/local/bin');
        }
        paths.push('/Applications/Visual Studio Code.app/Contents/Resources/app/bin');
        paths.push('/Applications/Sublime Text.app/Contents/SharedSupport/bin');
    }
    
    if (system.isLinux) {
        paths.push('/home/linuxbrew/.linuxbrew/bin');
        paths.push('/snap/bin');
    }
    
    return paths;
}

/**
 * Generates system-specific .zshrc optimizations
 * @returns {string} Configuration string for .zshrc
 */
export function generateSystemOptimizations() {
    const system = detectSystem();
    let config = '\n# System Optimizations\n';
    
    if (system.isMac) {
        config += '# macOS specific settings\n';
        config += 'export BROWSER="open"\n';
        
        if (system.isAppleSilicon) {
            config += 'eval "$(/opt/homebrew/bin/brew shellenv)"\n';
        }
    }
    
    if (system.isLinux) {
        config += '# Linux specific settings\n';
        config += 'export BROWSER="xdg-open"\n';
    }
    
    return config;
}

/**
 * Sets up terminal-specific integrations
 * @returns {Promise<string>} Integration configuration string
 */
export async function setupTerminalIntegration() {
    const system = detectSystem();
    
    if (system.isMac) {
        // iTerm2 integration
        const itermScript = path.join(os.homedir(), '.iterm2_shell_integration.zsh');
        if (fs.existsSync(itermScript)) {
            console.log(chalk.green('✅ iTerm2 integration detected'));
            return `source ${itermScript}\n`;
        }
    }
    
    return '';
}