# Awesome Lazy Zsh

[![Awesome](https://awesome.re/badge.svg)](https://awesome.re) ![Version](https://img.shields.io/badge/version-v2.0.0-blue.svg) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Awesome-Lazy-Zsh is a simplified and customizable Zsh setup tool for managing plugins and themes. It streamlines your terminal environment with an easy-to-use CLI interface, allowing you to manage `.zshrc` configurations effectively.

## Features

- **Plugin Management**: Install and manage plugins easily.
- **Theme Customization**: Apply a variety of Zsh themes.
- **Backup and Restore**: Safeguard your `.zshrc` configurations.
- **Interactive CLI**: User-friendly setup options.
- **Dependency Management**: Automatically checks for Git, Node.js, and Homebrew.

## Table of Contents

- [Awesome Lazy Zsh](#awesome-lazy-zsh)
  - [Features](#features)
  - [Table of Contents](#table-of-contents)
  - [Installation](#installation)
    - [Step-by-Step Installation](#step-by-step-installation)
  - [Usage](#usage)
    - [Starting the Setup](#starting-the-setup)
    - [Fresh Installation](#fresh-installation)
    - [Default Installation](#default-installation)
    - [Backup/Restore](#backuprestore)
  - [Contributing](#contributing)
  - [License](#license)

## Installation

To start using Awesome-Lazy-Zsh, clone the repository and run the `setup.sh` script.

### Step-by-Step Installation

1. **Clone the Repository**:
    ```bash
    git clone https://github.com/AmJaradat01/awesome-lazy-zsh.git
    cd awesome-lazy-zsh
    ```

2. **Run the Setup Script**:
    ```bash
    chmod +x setup.sh
    ./setup.sh
    ```
    The script will install Git, Node.js, and Homebrew if necessary, and provide options for managing themes, plugins, and backups.

## Usage

After running `setup.sh`, you can proceed with a fresh installation, default installation, or backup/restore options via the CLI.

### Starting the Setup

Upon running `setup.sh`, the CLI will offer the following options:

1. **Fresh Installation**: Select plugins and themes manually.
2. **Default Installation**: Apply pre-configured plugins and themes.
3. **Backup/Restore**: Manage `.zshrc` backups and restorations.

### Fresh Installation

This option allows you to select plugins and themes interactively, which will be installed and applied to your `.zshrc` configuration.

### Default Installation

This option installs a set of pre-configured plugins, such as `git`, `nvm`, `docker`, and applies the `spaceship` theme.

### Backup/Restore

This option lets you back up or restore your `.zshrc` file.

## Contributing

We welcome contributions! To contribute:

1. Fork the repository.
2. Create a feature branch.
3. Commit and push your changes.
4. Open a pull request.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
