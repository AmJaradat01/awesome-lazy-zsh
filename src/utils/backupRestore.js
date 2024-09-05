/**
 * @author Ali M. Jaradat
 * @email AmJaradat01@gmail.com
 * @since 1-Jan-2022
 * @version 1.0.0
 * @file This file handles the backup and restoration of the .zshrc file for Awesome-Lazy-Zsh.
 * It includes functions to back up, restore, and manage user selections during the backup/restore process.
 * @lastModified 4-Sep-2024
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import prompts from 'prompts';

// Function to ensure the backup folder exists
function ensureBackupFolderExists() {
    const backupFolder = path.join(os.homedir(), '.awesome-lazy-zsh_backup');
    if (!fs.existsSync(backupFolder)) {
        try {
            fs.mkdirSync(backupFolder, { recursive: true });
            console.log(`✅ Backup folder created at: ${backupFolder}`);
        } catch (error) {
            console.error(`❌ Error creating backup folder: ${error.message}`);
            throw error;
        }
    }
    return backupFolder;
}

// Function to create a backup of the current .zshrc file
export function backupZshrc() {
    const homeDir = os.homedir();
    const zshrcPath = path.join(homeDir, '.zshrc');
    const backupFolder = ensureBackupFolderExists();
    const backupPath = path.join(backupFolder, `.zshrc.backup.${Date.now()}`);

    try {
        if (fs.existsSync(zshrcPath)) {
            fs.copyFileSync(zshrcPath, backupPath);
            console.log(`✅ Backup created at: ${backupPath}`);
        } else {
            console.log('❌ No .zshrc file found to backup.');
        }
    } catch (error) {
        console.error(`❌ Error during backup: ${error.message}`);
    }
}

// Function to restore .zshrc file from a selected backup
export async function restoreZshrc() {
    const backupFolder = ensureBackupFolderExists();

    // Retrieve a list of available backup files
    const backups = fs.readdirSync(backupFolder).filter(file => file.startsWith('.zshrc.backup.'));

    if (backups.length === 0) {
        console.log('❌ No backups found.');
        return;
    }

    // Prompt the user to select a backup file to restore
    const { selectedBackup } = await prompts({
        type: 'select',
        name: 'selectedBackup',
        message: 'Select a backup file to restore:',
        choices: backups.map(file => ({ title: file, value: path.join(backupFolder, file) }))
    });

    if (selectedBackup) {
        // Confirmation prompt before restoring the selected backup
        const { confirmRestore } = await prompts({
            type: 'confirm',
            name: 'confirmRestore',
            message: `Are you sure you want to restore from ${selectedBackup}?`,
            initial: true
        });

        if (confirmRestore) {
            try {
                const zshrcPath = path.join(os.homedir(), '.zshrc');
                fs.copyFileSync(selectedBackup, zshrcPath);
                console.log(`✅ .zshrc restored from backup: ${selectedBackup}`);
            } catch (error) {
                console.error(`❌ Error during restoration: ${error.message}`);
            }
        } else {
            console.log('⚠️ Restore operation cancelled by the user.');
        }
    } else {
        console.log('⚠️ No backup selected. Restore operation cancelled.');
    }
}

// Main handler for backup/restore process
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
