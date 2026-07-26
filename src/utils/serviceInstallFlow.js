/**
 * Service installation flow orchestration
 * Coordinates user-facing prompts and the service installation lifecycle.
 * @author Ali M. Jaradat <AmJaradat01@gmail.com>
 */

import prompts from 'prompts';
import chalk from 'chalk';
import { serviceRegistry, aliasToService } from './serviceRegistry.js';
import { detectPlatform } from './platformDetector.js';
import {
    isServiceInstalled,
    installService,
    startService,
    getStartCommands
} from './serviceInstaller.js';
import { writeState } from './stateManager.js';

/**
 * @typedef {import('./serviceInstaller.js').InstallResult} InstallResult
 */

/**
 * Filters selected plugins against the aliasToService mapping.
 * Returns the intersection of selectedPlugins with the keys of aliasToService.
 * Pure function for testability.
 * @param {string[]} plugins - List of selected plugin names
 * @returns {string[]} Array of service keys that can be installed
 */
export function getInstallableServices(plugins) {
    if (!plugins || !Array.isArray(plugins)) {
        return [];
    }
    return plugins.filter(plugin => plugin in aliasToService).map(plugin => aliasToService[plugin]);
}

/**
 * Generates a formatted summary string from an array of InstallResult objects.
 * Each service's displayName is mentioned exactly once with its status label
 * (installed/failed/skipped). Pure function used by both display logic and property tests.
 * @param {InstallResult[]} results - Array of installation result objects
 * @returns {string} Formatted summary string
 */
export function generateSummary(results) {
    if (!results || results.length === 0) {
        return 'No services were processed.';
    }

    const installed = [];
    const failed = [];
    const skipped = [];

    for (const result of results) {
        const service = serviceRegistry[result.service];
        const displayName = service ? service.displayName : result.service;

        if (result.skipped) {
            skipped.push({ displayName, result });
        } else if (result.success) {
            installed.push({ displayName, result });
        } else {
            failed.push({ displayName, result });
        }
    }

    const lines = [];
    lines.push('\nService Installation Summary:');

    if (installed.length > 0) {
        lines.push('  ✅ Installed:');
        for (const { displayName } of installed) {
            lines.push(`    • ${displayName}: installed`);
        }
    }

    if (failed.length > 0) {
        lines.push('  ⚠️ Failed:');
        for (const { displayName, result } of failed) {
            const errorMsg = result.message ? ` - ${result.message}` : '';
            lines.push(`    • ${displayName}: failed${errorMsg}`);
        }
    }

    if (skipped.length > 0) {
        lines.push('  ℹ️ Skipped:');
        for (const { displayName } of skipped) {
            lines.push(`    • ${displayName}: skipped`);
        }
    }

    return lines.join('\n');
}

/**
 * Main entry point for the service installation flow.
 * Called after plugin selection if service-related plugins were selected.
 * @param {string[]} selectedPlugins - List of selected plugin names
 * @returns {Promise<void>}
 */
export async function runServiceInstallation(selectedPlugins, resumeState = null) {
    const installableServices = getInstallableServices(selectedPlugins);

    // If no installable services found, return early (no prompt)
    if (installableServices.length === 0) {
        return;
    }

    // Prompt user: "Install selected services" vs "Skip (aliases only)"
    const actionResponse = resumeState ? { action: 'install' } : await prompts({
        type: 'select',
        name: 'action',
        message: 'Service-related plugins detected. Would you like to install the actual service servers?',
        choices: [
            { title: 'Install selected services', value: 'install' },
            { title: 'Skip (aliases only)', value: 'skip' }
        ]
    });

    // Handle user cancellation (Ctrl+C returns undefined/null)
    if (!actionResponse || actionResponse.action == null) {
        return;
    }

    if (actionResponse.action === 'skip') {
        return;
    }

    // Show multi-select of installable services (all pre-selected by default)
    const servicesResponse = resumeState ? { selectedServices: resumeState.pendingServices || [] } : await prompts({
        type: 'multiselect',
        name: 'selectedServices',
        message: 'Select services to install:',
        choices: installableServices.map(serviceKey => ({
            title: serviceRegistry[serviceKey].displayName,
            value: serviceKey,
            selected: true
        }))
    });

    // Handle user cancellation or no selection
    if (!servicesResponse || !servicesResponse.selectedServices || servicesResponse.selectedServices.length === 0) {
        return;
    }

    const selectedServices = servicesResponse.selectedServices;

    // Save state checkpoint: service selection complete
    writeState({
        checkpoint: 'service_installation',
        selectedServices: selectedServices,
        pendingServices: [...selectedServices],
        installedServices: []
    });

    // Detect platform
    const platform = await detectPlatform();

    if (platform.error) {
        console.log(chalk.red(`\n❌ ${platform.error}`));
        return;
    }

    // Install each selected service
    const results = [];
    const installedServices = [...(resumeState?.installedServices || [])];
    const pendingServices = [...selectedServices];

    for (const serviceKey of selectedServices) {
        const service = serviceRegistry[serviceKey];
        const alreadyInstalled = await isServiceInstalled(service.binary);

        if (alreadyInstalled) {
            console.log(chalk.blue(`\nℹ️  ${service.displayName} is already installed.`));
            results.push({
                service: serviceKey,
                success: true,
                skipped: true,
                message: `${service.displayName} is already installed.`
            });
            // Move from pending to installed
            const idx = pendingServices.indexOf(serviceKey);
            if (idx !== -1) pendingServices.splice(idx, 1);
            installedServices.push(serviceKey);
            writeState({
                pendingServices: [...pendingServices],
                installedServices: [...installedServices]
            });
        } else {
            const result = await installService(serviceKey, platform);
            results.push(result);
            if (result.success) {
                // Move from pending to installed
                const idx = pendingServices.indexOf(serviceKey);
                if (idx !== -1) pendingServices.splice(idx, 1);
                installedServices.push(serviceKey);
                writeState({
                    pendingServices: [...pendingServices],
                    installedServices: [...installedServices]
                });
            }
        }
    }

    // Prompt "Start services now?" if any were successfully installed (not skipped)
    const successfullyInstalled = results.filter(r => r.success && !r.skipped);

    if (successfullyInstalled.length > 0) {
        const startResponse = await prompts({
            type: 'confirm',
            name: 'startNow',
            message: 'Start services now?',
            initial: true
        });

        if (startResponse && startResponse.startNow) {
            // Start each successfully installed service
            for (const result of successfullyInstalled) {
                await startService(result.service, platform);
            }
        } else {
            // Display manual start commands
            console.log(chalk.cyan('\nManual start commands:'));
            for (const result of successfullyInstalled) {
                const commands = getStartCommands(result.service, platform);
                const service = serviceRegistry[result.service];
                console.log(chalk.white(`  ${service.displayName}:`));
                for (const cmd of commands) {
                    console.log(chalk.gray(`    ${cmd}`));
                }
            }
        }
    }

    // Display final summary with chalk
    console.log(chalk.bold(generateSummary(results)));
}
