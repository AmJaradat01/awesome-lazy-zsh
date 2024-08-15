# Awesome-Lazy-Zsh

Awesome-Lazy-Zsh is a customizable Zsh setup tool that allows you to easily configure and enhance your Zsh environment with themes, plugins, and aliases.

## Features

- Default and custom installation options
- Automatic installation of Zsh, Oh-My-Zsh, and Homebrew if not present
- Theme selection including Powerlevel10k, Spaceship, Starship, and more
- Plugin selection with autocomplete and additional plugins from the Oh-My-Zsh wiki
- Customizable aliases and functions
- Automatic `.zshrc` generation with user selections

## Installation

1. Clone the repository:

```bash
git clone https://github.com/AmJaradat01/awesome-lazy-zsh.git
cd awesome-lazy-zsh
```

2. Install dependencies:

```bash
npm install
```

3. Run the setup script:

```bash
node awesome-lazy-zsh.js
```

or 

```bash
npm start
```

## Usage

1. **Choose Installation Type:** Select between Default Installation or Custom Installation.
2. **Select Theme:** Choose your desired theme (e.g., Powerlevel10k, Spaceship, Starship). // default: Spaceship
3. **Select Plugins:** Select plugins from a list, or fetch additional plugins from the Oh-My-Zsh wiki.
4. **Customize Aliases and Functions:** Optionally customize aliases and functions in your `.zshrc`.

## Requirements

- Node.js
- Git
- Homebrew (automatically installed if not present)

## Compatibility

- macOS
- Linux (Not tested yet)

## Troubleshooting

- **Permissions Issues:** If you encounter permissions issues during installation, try running the commands with sudo.
- **Missing Dependencies:** Ensure that Node.js, Git, and Homebrew are correctly installed on your system.
- **Path Issues:** If commands aren't recognized, make sure your PATH environment variable is correctly set. You may need to restart your terminal or run source ~/.zshrc.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.