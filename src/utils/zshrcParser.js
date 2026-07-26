/**
 * .zshrc Parser and Analyzer
 * Parses .zshrc files into structured sections for intelligent updates
 * @author Ali M. Jaradat <AmJaradat01@gmail.com>
 */

import fs from 'fs';
import path from 'path';
import os from 'os';

// Block markers
const MANAGED_BLOCK_START = '# >>> awesome-lazy-zsh managed block >>>';
const MANAGED_BLOCK_END = '# <<< awesome-lazy-zsh managed block <<<';

// Known third-party integration markers (preserve these)
const THIRD_PARTY_MARKERS = {
    kiroPre: {
        start: '# Kiro CLI pre block',
        end: null, // Single line or until next block
        preserve: 'top'
    },
    kiroPost: {
        start: '# Kiro CLI post block',
        end: null,
        preserve: 'bottom'
    },
    iterm2: {
        start: 'source.*iterm2_shell_integration',
        isRegex: true,
        preserve: 'bottom'
    },
    nvm: {
        start: 'export NVM_DIR=',
        end: 'bash_completion',
        preserve: 'managed'
    },
    homebrew: {
        start: 'eval "$(.*brew shellenv)"',
        isRegex: true,
        preserve: 'managed'
    }
};

/**
 * Represents a parsed .zshrc file structure
 * @typedef {Object} ParsedZshrc
 * @property {Section[]} sections - Array of parsed sections
 * @property {string[]} errors - Syntax errors found
 * @property {Duplicate[]} duplicates - Detected duplicates
 * @property {Object} settings - Extracted settings (theme, plugins, etc.)
 */

/**
 * Represents a section of the .zshrc file
 * @typedef {Object} Section
 * @property {string} type - Section type: 'user-pre', 'managed', 'user-post', 'third-party'
 * @property {string} content - Raw content of the section
 * @property {number} startLine - Starting line number (1-based)
 * @property {number} endLine - Ending line number (1-based)
 * @property {string} [thirdPartyId] - ID if this is a third-party section
 */

/**
 * Represents a detected duplicate
 * @typedef {Object} Duplicate
 * @property {string} type - Duplicate type: 'path', 'alias', 'export', 'plugin', 'function'
 * @property {string} name - Name/identifier of the duplicate
 * @property {number[]} lines - Line numbers where duplicates appear
 * @property {string[]} values - The different values found
 */

/**
 * Parses a .zshrc file into structured sections
 * @param {string} content - Raw .zshrc file content
 * @returns {ParsedZshrc} Parsed structure
 */
export function parseZshrc(content) {
    const lines = content.split('\n');
    const sections = [];
    const errors = [];
    const duplicates = [];
    const settings = {
        theme: null,
        plugins: [],
        allPlugins: [], // includes alias-only plugins from metadata
        exports: {},
        aliases: {},
        functions: {},
        paths: []
    };

    let currentSection = {
        type: 'user-pre',
        content: '',
        startLine: 1,
        endLine: 1
    };

    let inManagedBlock = false;
    let blockStack = []; // Track if/for/while/case blocks for syntax validation

    for (let i = 0; i < lines.length; i++) {
        const lineNum = i + 1;
        const line = lines[i];
        const trimmedLine = line.trim();

        // Check for managed block boundaries
        if (trimmedLine.includes(MANAGED_BLOCK_START)) {
            // Save previous section if it has content
            if (currentSection.content.trim()) {
                currentSection.endLine = lineNum - 1;
                sections.push({ ...currentSection });
            }

            inManagedBlock = true;
            currentSection = {
                type: 'managed',
                content: line + '\n',
                startLine: lineNum,
                endLine: lineNum
            };
            continue;
        }

        if (trimmedLine.includes(MANAGED_BLOCK_END)) {
            currentSection.content += line + '\n';
            currentSection.endLine = lineNum;
            sections.push({ ...currentSection });
            inManagedBlock = false;

            currentSection = {
                type: 'user-post',
                content: '',
                startLine: lineNum + 1,
                endLine: lineNum + 1
            };
            continue;
        }

        // Check for third-party integrations
        let isThirdParty = false;
        for (const [id, marker] of Object.entries(THIRD_PARTY_MARKERS)) {
            const matches = marker.isRegex
                ? new RegExp(marker.start).test(line)
                : line.includes(marker.start);

            if (matches && !inManagedBlock) {
                // Save previous section
                if (currentSection.content.trim() && currentSection.type !== 'third-party') {
                    currentSection.endLine = lineNum - 1;
                    sections.push({ ...currentSection });
                }

                // Find end of third-party block
                let endLine = lineNum;
                if (marker.end) {
                    for (let j = i; j < lines.length; j++) {
                        if (lines[j].includes(marker.end)) {
                            endLine = j + 1;
                            break;
                        }
                    }
                }

                sections.push({
                    type: 'third-party',
                    thirdPartyId: id,
                    content: lines.slice(i, endLine).join('\n') + '\n',
                    startLine: lineNum,
                    endLine: endLine,
                    preserveLocation: marker.preserve
                });

                // Skip processed lines
                i = endLine - 1;
                currentSection = {
                    type: inManagedBlock ? 'managed' : (sections.some(s => s.type === 'managed') ? 'user-post' : 'user-pre'),
                    content: '',
                    startLine: endLine + 1,
                    endLine: endLine + 1
                };
                isThirdParty = true;
                break;
            }
        }

        if (isThirdParty) continue;

        // Add line to current section
        currentSection.content += line + '\n';
        currentSection.endLine = lineNum;

        // Extract settings
        extractSettings(line, lineNum, settings, duplicates);

        // Validate syntax
        validateSyntax(trimmedLine, lineNum, blockStack, errors);
    }

    // Save final section
    if (currentSection.content.trim()) {
        sections.push(currentSection);
    }

    // Check for unclosed blocks
    if (blockStack.length > 0) {
        for (const block of blockStack) {
            errors.push({
                line: block.line,
                message: `Unclosed '${block.type}' block started at line ${block.line}`,
                severity: 'error'
            });
        }
    }

    // Detect duplicates
    detectDuplicates(settings, duplicates);

    return { sections, errors, duplicates, settings };
}

/**
 * Extracts settings from a line
 * @param {string} line - The line to analyze
 * @param {number} lineNum - Line number
 * @param {Object} settings - Settings object to populate
 * @param {Duplicate[]} duplicates - Duplicates array to populate
 */
function extractSettings(line, lineNum, settings, duplicates) {
    const trimmed = line.trim();

    // Skip comments
    if (trimmed.startsWith('#')) {
        // Check for awesome-lazy-zsh metadata
        const metadataMatch = trimmed.match(/^# awesome-lazy-zsh-plugins=(\[.+\])$/);
        if (metadataMatch) {
            try {
                settings.allPlugins = JSON.parse(metadataMatch[1]);
            } catch { /* ignore parse errors */ }
        }
        return;
    }

    // Theme extraction
    const themeMatch = line.match(/ZSH_THEME=["']([^"']+)["']/);
    if (themeMatch) {
        if (settings.theme && settings.theme.value !== themeMatch[1]) {
            duplicates.push({
                type: 'theme',
                name: 'ZSH_THEME',
                lines: [settings.theme.line, lineNum],
                values: [settings.theme.value, themeMatch[1]]
            });
        }
        settings.theme = { value: themeMatch[1], line: lineNum };
    }

    // Plugins extraction
    const pluginsMatch = line.match(/plugins=\(([^)]+)\)/);
    if (pluginsMatch) {
        const plugins = pluginsMatch[1].split(/\s+/).filter(Boolean);
        if (settings.plugins.length > 0) {
            duplicates.push({
                type: 'plugins',
                name: 'plugins=()',
                lines: [settings.pluginsLine, lineNum],
                values: [settings.plugins.join(' '), plugins.join(' ')]
            });
        }
        settings.plugins = plugins;
        settings.pluginsLine = lineNum;
    }

    // Export extraction (including PATH)
    const exportMatch = line.match(/export\s+([A-Z_][A-Z0-9_]*)=(.+)/);
    if (exportMatch) {
        const name = exportMatch[1];
        const value = exportMatch[2];

        if (name === 'PATH') {
            settings.paths.push({ value, line: lineNum });
        } else {
            if (settings.exports[name]) {
                settings.exports[name].lines.push(lineNum);
                settings.exports[name].values.push(value);
            } else {
                settings.exports[name] = { lines: [lineNum], values: [value] };
            }
        }
    }

    // Alias extraction
    const aliasMatch = line.match(/alias\s+([a-zA-Z0-9_-]+)=(.+)/);
    if (aliasMatch) {
        const name = aliasMatch[1];
        const value = aliasMatch[2];

        if (settings.aliases[name]) {
            settings.aliases[name].lines.push(lineNum);
            settings.aliases[name].values.push(value);
        } else {
            settings.aliases[name] = { lines: [lineNum], values: [value] };
        }
    }

    // Function extraction
    const funcMatch = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*\(\)\s*\{?/);
    if (funcMatch) {
        const name = funcMatch[1];
        if (settings.functions[name]) {
            settings.functions[name].lines.push(lineNum);
        } else {
            settings.functions[name] = { lines: [lineNum] };
        }
    }
}

/**
 * Validates shell syntax on a line
 * @param {string} line - Trimmed line to validate
 * @param {number} lineNum - Line number
 * @param {Array} blockStack - Stack of open blocks
 * @param {Array} errors - Errors array to populate
 */
function validateSyntax(line, lineNum, blockStack, errors) {
    // Skip empty lines and comments
    if (!line || line.startsWith('#')) return;

    // Block openers
    if (/^if\s+/.test(line) || line === 'if') {
        blockStack.push({ type: 'if', line: lineNum });
    } else if (/^for\s+/.test(line) || line === 'for') {
        blockStack.push({ type: 'for', line: lineNum });
    } else if (/^while\s+/.test(line) || line === 'while') {
        blockStack.push({ type: 'while', line: lineNum });
    } else if (/^until\s+/.test(line) || line === 'until') {
        blockStack.push({ type: 'until', line: lineNum });
    } else if (/^case\s+/.test(line)) {
        blockStack.push({ type: 'case', line: lineNum });
    } else if (/^function\s+/.test(line) || /^\w+\s*\(\)\s*\{/.test(line)) {
        blockStack.push({ type: 'function', line: lineNum });
    }

    // Block closers
    if (line === 'fi' || line.endsWith('; fi') || line.startsWith('fi;')) {
        const lastBlock = blockStack.pop();
        if (!lastBlock || lastBlock.type !== 'if') {
            errors.push({
                line: lineNum,
                message: `Unexpected 'fi' without matching 'if'`,
                severity: 'error'
            });
            if (lastBlock) blockStack.push(lastBlock); // Restore
        }
    } else if (line === 'done' || line.endsWith('; done') || line.startsWith('done;')) {
        const lastBlock = blockStack.pop();
        if (!lastBlock || !['for', 'while', 'until'].includes(lastBlock.type)) {
            errors.push({
                line: lineNum,
                message: `Unexpected 'done' without matching 'for/while/until'`,
                severity: 'error'
            });
            if (lastBlock) blockStack.push(lastBlock);
        }
    } else if (line === 'esac' || line.endsWith('; esac') || line.startsWith('esac;')) {
        const lastBlock = blockStack.pop();
        if (!lastBlock || lastBlock.type !== 'case') {
            errors.push({
                line: lineNum,
                message: `Unexpected 'esac' without matching 'case'`,
                severity: 'error'
            });
            if (lastBlock) blockStack.push(lastBlock);
        }
    } else if (line === '}' || line.startsWith('};')) {
        const lastBlock = blockStack.pop();
        if (!lastBlock || lastBlock.type !== 'function') {
            errors.push({
                line: lineNum,
                message: `Unexpected '}' without matching function definition`,
                severity: 'error'
            });
            if (lastBlock) blockStack.push(lastBlock);
        }
    }

    // Check for malformed lines
    if (/\$PATH[a-zA-Z]/.test(line)) {
        errors.push({
            line: lineNum,
            message: `Possibly malformed PATH assignment (missing separator after $PATH)`,
            severity: 'warning'
        });
    }

    // Check for obvious command injection in exports
    if (/export\s+PATH=.*["'][^"']*["'].*["']/.test(line)) {
        errors.push({
            line: lineNum,
            message: `Suspicious PATH assignment with multiple quotes`,
            severity: 'warning'
        });
    }
}

/**
 * Detects duplicates from extracted settings
 * @param {Object} settings - Extracted settings
 * @param {Duplicate[]} duplicates - Duplicates array to populate
 */
function detectDuplicates(settings, duplicates) {
    // Check exports for duplicates
    for (const [name, data] of Object.entries(settings.exports)) {
        if (data.lines.length > 1) {
            // Check if values are actually different
            const uniqueValues = [...new Set(data.values)];
            if (uniqueValues.length > 1 || data.lines.length > 1) {
                duplicates.push({
                    type: 'export',
                    name: name,
                    lines: data.lines,
                    values: data.values
                });
            }
        }
    }

    // Check aliases for duplicates
    for (const [name, data] of Object.entries(settings.aliases)) {
        if (data.lines.length > 1) {
            duplicates.push({
                type: 'alias',
                name: name,
                lines: data.lines,
                values: data.values
            });
        }
    }

    // Check functions for duplicates
    for (const [name, data] of Object.entries(settings.functions)) {
        if (data.lines.length > 1) {
            duplicates.push({
                type: 'function',
                name: name,
                lines: data.lines,
                values: ['(defined multiple times)']
            });
        }
    }

    // Check PATH for redundant additions
    if (settings.paths.length > 1) {
        // Extract unique path components
        const allPaths = [];
        for (const pathEntry of settings.paths) {
            const pathValue = pathEntry.value.replace(/["']/g, '');
            const components = pathValue.split(':').filter(p => p && p !== '$PATH');
            for (const comp of components) {
                const existing = allPaths.find(p => p.path === comp);
                if (existing) {
                    existing.lines.push(pathEntry.line);
                } else {
                    allPaths.push({ path: comp, lines: [pathEntry.line] });
                }
            }
        }

        // Report duplicate path entries
        for (const entry of allPaths) {
            if (entry.lines.length > 1) {
                duplicates.push({
                    type: 'path',
                    name: entry.path,
                    lines: entry.lines,
                    values: [`Added ${entry.lines.length} times`]
                });
            }
        }
    }
}

/**
 * Reads and parses a .zshrc file from disk
 * @param {string} [filePath] - Path to .zshrc (defaults to ~/.zshrc)
 * @returns {ParsedZshrc|null} Parsed structure or null if file doesn't exist
 */
export function parseZshrcFile(filePath = null) {
    const zshrcPath = filePath || path.join(os.homedir(), '.zshrc');

    if (!fs.existsSync(zshrcPath)) {
        return null;
    }

    const content = fs.readFileSync(zshrcPath, 'utf8');
    return parseZshrc(content);
}

/**
 * Generates a report of issues found in the .zshrc
 * @param {ParsedZshrc} parsed - Parsed .zshrc structure
 * @returns {string} Human-readable report
 */
export function generateReport(parsed) {
    let report = '';

    if (parsed.errors.length > 0) {
        report += '=== Syntax Errors ===\n';
        for (const error of parsed.errors) {
            const icon = error.severity === 'error' ? '❌' : '⚠️';
            report += `${icon} Line ${error.line}: ${error.message}\n`;
        }
        report += '\n';
    }

    if (parsed.duplicates.length > 0) {
        report += '=== Duplicates Found ===\n';
        for (const dup of parsed.duplicates) {
            report += `📋 ${dup.type.toUpperCase()}: ${dup.name}\n`;
            report += `   Lines: ${dup.lines.join(', ')}\n`;
            if (dup.values.length <= 2) {
                report += `   Values: ${dup.values.join(' vs ')}\n`;
            }
        }
        report += '\n';
    }

    report += '=== Sections ===\n';
    for (const section of parsed.sections) {
        const lines = section.endLine - section.startLine + 1;
        let desc = `${section.type} (lines ${section.startLine}-${section.endLine}, ${lines} lines)`;
        if (section.thirdPartyId) {
            desc += ` [${section.thirdPartyId}]`;
        }
        report += `📄 ${desc}\n`;
    }

    if (parsed.settings.theme) {
        report += `\n=== Current Settings ===\n`;
        report += `Theme: ${parsed.settings.theme.value}\n`;
        report += `Plugins: ${parsed.settings.plugins.join(', ')}\n`;
        if (parsed.settings.allPlugins.length > parsed.settings.plugins.length) {
            report += `All plugins (incl. aliases): ${parsed.settings.allPlugins.join(', ')}\n`;
        }
    }

    return report;
}

/**
 * Checks if the .zshrc has a managed block
 * @param {ParsedZshrc} parsed - Parsed .zshrc structure
 * @returns {boolean} True if managed block exists
 */
export function hasManagedBlock(parsed) {
    return parsed.sections.some(s => s.type === 'managed');
}

/**
 * Gets the content of the managed block
 * @param {ParsedZshrc} parsed - Parsed .zshrc structure
 * @returns {string|null} Managed block content or null
 */
export function getManagedBlockContent(parsed) {
    const managed = parsed.sections.find(s => s.type === 'managed');
    return managed ? managed.content : null;
}

/**
 * Gets all user content (non-managed sections)
 * @param {ParsedZshrc} parsed - Parsed .zshrc structure
 * @returns {{pre: string, post: string}} User content before and after managed block
 */
export function getUserContent(parsed) {
    let pre = '';
    let post = '';
    let foundManaged = false;

    for (const section of parsed.sections) {
        if (section.type === 'managed') {
            foundManaged = true;
            continue;
        }

        if (section.type === 'third-party') {
            // Third-party sections go to their preferred location
            if (section.preserveLocation === 'top') {
                pre += section.content;
            } else if (section.preserveLocation === 'bottom') {
                post += section.content;
            }
            // 'managed' location means it will be in the managed block
            continue;
        }

        if (!foundManaged) {
            pre += section.content;
        } else {
            post += section.content;
        }
    }

    return { pre, post };
}

export { MANAGED_BLOCK_START, MANAGED_BLOCK_END };
