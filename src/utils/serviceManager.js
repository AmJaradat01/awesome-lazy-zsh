/**
 * Cross-platform service management utilities
 * Supports: macOS (Homebrew), Linux (systemd/apt), Windows (choco/scoop)
 * @author Ali M. Jaradat <AmJaradat01@gmail.com>
 */

import { runCommand } from './commands.js';
import chalk from 'chalk';
import os from 'os';

const platform = os.platform();

export const services = {
    'mongodb': { 
        name: 'MongoDB', 
        port: 27017,
        brew: 'mongodb-community',
        apt: 'mongodb',
        choco: 'mongodb'
    },
    'postgresql': { 
        name: 'PostgreSQL', 
        port: 5432,
        brew: 'postgresql@14',
        apt: 'postgresql',
        choco: 'postgresql'
    },
    'mysql': { 
        name: 'MySQL', 
        port: 3306,
        brew: 'mysql',
        apt: 'mysql-server',
        choco: 'mysql'
    },
    'redis': { 
        name: 'Redis', 
        port: 6379,
        brew: 'redis',
        apt: 'redis-server',
        choco: 'redis-64'
    },
    'rabbitmq': { 
        name: 'RabbitMQ', 
        port: 5672,
        brew: 'rabbitmq',
        apt: 'rabbitmq-server',
        choco: 'rabbitmq'
    }
};

function getPackageName(serviceName) {
    const svc = services[serviceName];
    if (!svc) return null;
    if (platform === 'darwin') return svc.brew;
    if (platform === 'linux') return svc.apt;
    if (platform === 'win32') return svc.choco;
    return null;
}

function getSystemdName(serviceName) {
    const map = { mongodb: 'mongod', postgresql: 'postgresql', mysql: 'mysql', redis: 'redis-server', rabbitmq: 'rabbitmq-server' };
    return map[serviceName] || serviceName;
}

export async function installService(serviceName) {
    const service = services[serviceName];
    if (!service) {
        console.log(chalk.red(`❌ Unknown service: ${serviceName}`));
        return false;
    }
    const pkg = getPackageName(serviceName);
    try {
        console.log(chalk.yellow(`⚙️ Installing ${service.name}...`));
        if (platform === 'darwin') {
            await runCommand(`brew install ${pkg}`);
        } else if (platform === 'linux') {
            await runCommand(`sudo apt-get install -y ${pkg}`);
        } else if (platform === 'win32') {
            await runCommand(`choco install ${pkg} -y`);
        }
        console.log(chalk.green(`✅ ${service.name} installed successfully.`));
        return true;
    } catch (error) {
        console.error(chalk.red(`❌ Failed to install ${service.name}: ${error.message}`));
        return false;
    }
}

export async function startService(serviceName) {
    const service = services[serviceName];
    if (!service) return false;
    try {
        if (platform === 'darwin') {
            await runCommand(`brew services start ${getPackageName(serviceName)}`);
        } else if (platform === 'linux') {
            await runCommand(`sudo systemctl start ${getSystemdName(serviceName)}`);
        } else if (platform === 'win32') {
            await runCommand(`net start ${serviceName}`);
        }
        console.log(chalk.green(`✅ ${service.name} started on port ${service.port}`));
        return true;
    } catch (error) {
        console.error(chalk.red(`❌ Failed to start ${service.name}`));
        return false;
    }
}

export async function stopService(serviceName) {
    const service = services[serviceName];
    if (!service) return false;
    try {
        if (platform === 'darwin') {
            await runCommand(`brew services stop ${getPackageName(serviceName)}`);
        } else if (platform === 'linux') {
            await runCommand(`sudo systemctl stop ${getSystemdName(serviceName)}`);
        } else if (platform === 'win32') {
            await runCommand(`net stop ${serviceName}`);
        }
        console.log(chalk.green(`✅ ${service.name} stopped`));
        return true;
    } catch (error) {
        console.error(chalk.red(`❌ Failed to stop ${service.name}`));
        return false;
    }
}

export async function restartService(serviceName) {
    const service = services[serviceName];
    if (!service) return false;
    try {
        if (platform === 'darwin') {
            await runCommand(`brew services restart ${getPackageName(serviceName)}`);
        } else if (platform === 'linux') {
            await runCommand(`sudo systemctl restart ${getSystemdName(serviceName)}`);
        } else if (platform === 'win32') {
            await runCommand(`net stop ${serviceName} & net start ${serviceName}`);
        }
        console.log(chalk.green(`✅ ${service.name} restarted`));
        return true;
    } catch (error) {
        console.error(chalk.red(`❌ Failed to restart ${service.name}`));
        return false;
    }
}

export async function getServiceStatus(serviceName) {
    try {
        if (platform === 'darwin') {
            const result = await runCommand(`brew services info ${getPackageName(serviceName)} --json`);
            return JSON.parse(result);
        } else if (platform === 'linux') {
            const result = await runCommand(`systemctl is-active ${getSystemdName(serviceName)}`);
            return { status: result.trim() };
        } else if (platform === 'win32') {
            const result = await runCommand(`sc query ${serviceName}`);
            return { status: result };
        }
    } catch {
        return null;
    }
}

export async function listAllServices() {
    try {
        let result;
        if (platform === 'darwin') {
            result = await runCommand('brew services list');
        } else if (platform === 'linux') {
            result = await runCommand('systemctl list-units --type=service --state=running');
        } else if (platform === 'win32') {
            result = await runCommand('sc query type= service state= all');
        }
        console.log(chalk.cyan('📋 Services:\n'));
        console.log(result);
        return result;
    } catch (error) {
        console.error(chalk.red('❌ Failed to list services'));
        return null;
    }
}
