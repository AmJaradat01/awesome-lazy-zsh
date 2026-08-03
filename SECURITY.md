# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 3.6.x   | :white_check_mark: |
| 3.5.x   | :white_check_mark: |
| 3.4.x   | :white_check_mark: |
| < 3.4   | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability in awesome-lazy-zsh, please report it responsibly.

### How to Report

1. **Do NOT open a public GitHub issue** for security vulnerabilities
2. Email the maintainer directly at: **AmJaradat01@gmail.com**
3. Include the following information:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### What to Expect

- **Acknowledgment**: Within 48 hours of your report
- **Initial Assessment**: Within 7 days
- **Resolution Timeline**: Depends on severity
  - Critical: 24-72 hours
  - High: 1-2 weeks
  - Medium: 2-4 weeks
  - Low: Next scheduled release

### Security Measures

This project implements several security measures:

#### Supply Chain Security
- External plugins are pinned to specific tags or commit SHAs
- GitHub Actions are pinned to full commit SHAs
- Downloads are verified with SHA-256 checksums where available
- curl/wget use `-f` flag to fail on HTTP errors

#### File System Security
- All sensitive files are created with restrictive permissions (0o600/0o700)
- Atomic file writes prevent corruption
- Backup files are stored in a unified, protected directory

#### Shell Security
- Commands use `execFileSync` with argument arrays (no shell interpolation)
- Plugin and theme names are validated before use in shell configs
- User input is sanitized before being written to configuration files

#### Configuration Safety
- `.zshrc` uses a managed-block approach to preserve user customizations
- Automatic backups are created before any modifications
- Stable symlink paths are used to survive version upgrades

### Scope

The following are in scope for security reports:

- Command injection vulnerabilities
- Path traversal attacks
- Privilege escalation
- Supply chain attacks (malicious dependencies)
- Sensitive data exposure
- Arbitrary code execution

### Out of Scope

- Issues in third-party plugins (report to their maintainers)
- Social engineering attacks
- Physical access attacks
- Issues requiring unlikely user interaction

## Security Best Practices for Users

1. **Review plugins before installing** - Custom plugins execute arbitrary code
2. **Keep the tool updated** - Run `brew upgrade awesome-lazy-zsh` regularly
3. **Don't store secrets in .zshrc** - Use a secrets manager instead
4. **Review backup files** - Periodically clean old backups from `~/.awesome-lazy-zsh/backups/`

## Acknowledgments

We appreciate the security research community's efforts in responsibly disclosing vulnerabilities. Contributors who report valid security issues will be acknowledged here (with permission).
