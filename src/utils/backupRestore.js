/**
 * .zshrc backup and restore utilities
 * @author Ali M. Jaradat <AmJaradat01@gmail.com>
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import prompts from 'prompts';
import { backupExistingZshrc, listBackups } from './zshrcManager.js';

// Unified backup directory - same as zshrcManager
const BACKUP_DIR = path.join(os.homedir(), '.awesome-lazy-zsh', 'backups');

/**
 * Ensures backup directory exists with restrictive permissions
 * @returns {string} Backup directory path
 */
function ensureBackupFolderExists() {
    if (!fs.existsSync(BACKUP_DIR)) {
        try {
            fs.mkdirSync(BACKUP_DIR, { recursive: true, mode: 0o700 });
            console.log(`Backup folder created at: ${BACKUP_DIR}`);
        } catch (error) {
            console.error(`Error creating backup folder: ${error.message}`);
            throw error;
        }
    }
    return BACKUP_DIR;
}

/**
 * Creates timestamped backup of current .zshrc
 */
export function backupZshrc() {
    const zshrcPath = path.join(os.homedir(), '.zshrc');
    
    try {
        const backupPath = backupExistingZshrc(zshrcPath);
        if (backupPath) {
            // Verify backup was created successfully
            const backupContent = fs.readFileSync(backupPath, 'utf8');
            if (backupContent.length === 0) {
                console.error('Warning: Backup file is empty!');
            } else {
                console.log(`Backup verified: ${backupContent.length} characters`);
            }
        } else {
            console.log('No .zshrc file found to backup.');
        }
    } catch (error) {
        console.error(`Error during backup: ${error.message}`);
    }
}

/**
 * Interactive .zshrc restoration from backup
 */
export async function restoreZshrc() {
    ensureBackupFolderExists();

    // Get all available backups from unified directory
    const backups = listBackups();

    if (backups.length === 0) {
        console.log('No backups found.');
        return;
    }

    // Format backup choices with timestamps
    const choices = backups.map(backupPath => {
        const filename = path.basename(backupPath);
        const timestamp = parseInt(filename.split('.').pop(), 10);
        const date = new Date(timestamp);
        return {
            title: `${filename} (${date.toLocaleString()})`,
            value: backupPath
        };
    });

    // Prompt the user to select a backup file to restore
    const { selectedBackup } = await prompts({
        type: 'select',
        name: 'selectedBackup',
        message: 'Select a backup file to restore:',
        choices
    });

    if (selectedBackup) {
        // Confirmation prompt before restoring the selected backup
        const { confirmRestore } = await prompts({
            type: 'confirm',
            name: 'confirmRestore',
            message: `Are you sure you want to restore from ${path.basename(selectedBackup)}?`,
            initial: true
        });

        if (confirmRestore) {
            try {
                const zshrcPath = path.join(os.homedir(), '.zshrc');
                
                // Create a safety backup of current .zshrc before restoring
                if (fs.existsSync(zshrcPath)) {
                    const safetyBackup = backupExistingZshrc(zshrcPath);
                    if (safetyBackup) {
                        console.log(`Safety backup created: ${safetyBackup}`);
                    }
                }
                
                // Restore from selected backup
                const backupContent = fs.readFileSync(selectedBackup, 'utf8');
                fs.writeFileSync(zshrcPath, backupContent, { encoding: 'utf8', mode: 0o600 });
                console.log(`.zshrc restored from backup: ${selectedBackup}`);
            } catch (error) {
                console.error(`Error during restoration: ${error.message}`);
            }
        } else {
            console.log('Restore operation cancelled by the user.');
        }
    } else {
        console.log('No backup selected. Restore operation cancelled.');
    }
}

/**
 * Main backup/restore workflow handler
 */
export async function handleRestoreBackup() {
    const { backupOption } = await prompts({
        type: 'select',
        name: 'backupOption',
        message: 'Choose an option:',
        choices: [
            { title: 'Backup .zshrc', value: 'backup' },
            { title: 'Restore .zshrc from Backup', value: 'restore' }
        ]
    });

    if (backupOption === 'backup') {
        console.log('⚠️ Backing up .zshrc...');
        backupZshrc();
    } else if (backupOption === 'restore') {
        console.log('⚠️ Restoring .zshrc from backup...');
        await restoreZshrc();
    } else {
        console.log('❌ No valid option selected. Exiting.');
    }
}
