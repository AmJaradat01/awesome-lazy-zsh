# Awesome Lazy Zsh

[![Awesome](https://awesome.re/badge.svg)](https://awesome.re) ![Version](https://img.shields.io/badge/version-v3.0.4-blue.svg) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

🚀 **The easiest way to set up and manage your Zsh environment**

Awesome-Lazy-Zsh is a powerful yet simple tool that automates your Zsh setup with plugins, themes, and configurations. Perfect for developers who want a beautiful, functional terminal without the hassle.

## ✨ Features

### Core Features
- 🔌 **Smart Plugin Management** - Install, update, and manage 15+ popular plugins
- 🎨 **Theme Customization** - Choose from popular themes like Spaceship, Powerlevel10k
- 💾 **Backup & Restore** - Automatic `.zshrc` backups before any changes
- 🖥️ **Interactive CLI** - Beautiful, user-friendly setup wizard
- 🔧 **Auto Dependencies** - Installs Git, Node.js, Homebrew automatically

### New Features
- 🔄 **Plugin Updates** - Keep all plugins up-to-date with one command
- 📁 **Configuration Profiles** - Save and switch between different setups (work/personal)
- 🌐 **Custom Plugins** - Add plugins from any Git repository
- ⚡ **System Integration** - Optimized for macOS/Linux with smart path detection
- 🎯 **Smart Aliases** - 20+ useful development shortcuts

## 📋 Table of Contents

- [Quick Start](#-quick-start)
- [Features](#-features)
- [Installation Options](#-installation-options)
- [Plugin Management](#-plugin-management)
- [Profile Management](#-profile-management)
- [Available Plugins](#-available-plugins)
- [Available Themes](#-available-themes)
- [System Requirements](#-system-requirements)
- [Contributing](#-contributing)

## 🚀 Quick Start

### Via Homebrew (Recommended) 🍺
```bash
# Option 1: Direct install
brew install amjaradat01/awesome-lazy-zsh/awesome-lazy-zsh

# Option 2: Add tap first (shorter)
brew tap amjaradat01/awesome-lazy-zsh
brew install awesome-lazy-zsh

# Run the tool
awesome-lazy-zsh
```

### Via Git Clone
**One-line installation:**
```bash
git clone https://github.com/AmJaradat01/awesome-lazy-zsh.git && cd awesome-lazy-zsh && ./setup.sh
```

**Step-by-step:**
1. **Clone & Enter**
   ```bash
   git clone https://github.com/AmJaradat01/awesome-lazy-zsh.git
   cd awesome-lazy-zsh
   ```

2. **Run Setup**
   ```bash
   ./setup.sh
   ```

3. **Choose Your Setup**
   - 🆕 **Fresh Installation** - Pick your own plugins and themes
   - ⚡ **Default Installation** - Pre-configured setup for developers
   - 🔄 **Update Plugins** - Keep everything current
   - 📁 **Manage Profiles** - Switch between configurations

**That's it!** Your terminal will be transformed in minutes.

## 🎛️ Installation Options

### 🆕 Fresh Installation
**Perfect for customization lovers**
- Choose from 15+ plugins (git, docker, kubectl, fzf, etc.)
- Pick your favorite theme (spaceship, powerlevel10k, starship)
- Interactive selection with preview

### ⚡ Default Installation  
**Perfect for getting started quickly**
- Pre-selected developer plugins: `git`, `docker`, `nvm`, `kubectl`, `fzf`
- Spaceship theme (beautiful and fast)
- Optimized aliases and shortcuts

### 🔄 Update Plugins
**Keep everything current**
- Updates all installed plugins to latest versions
- Safe rollback if something breaks
- Shows update progress and results

### 📁 Profile Management
**Switch between setups instantly**
- Save current configuration as named profile
- Switch between work/personal setups
- Export profiles to share with team

### 🌐 Custom Plugins
**Add any plugin from any repository**
- Install plugins from GitHub, GitLab, etc.
- Automatic integration with existing setup
- Persistent custom plugin registry

## 🔌 Plugin Management

**Built-in Plugin Updates:**
```bash
# Run setup again and choose "Update plugins"
./setup.sh
```

**Add Custom Plugin:**
```bash
# Through the CLI menu
./setup.sh → "Add custom plugin"
# Enter: plugin-name and repository-url
```

**Profile Management:**
```bash
# Save current setup
./setup.sh → "Manage profiles" → "Save current as profile"

# Switch profiles
./setup.sh → "Manage profiles" → "Switch profile"
```

## 📁 Profile Management

Profiles let you maintain different Zsh configurations:

- **Work Profile**: Docker, Kubernetes, AWS plugins
- **Personal Profile**: Git, Node.js, fun themes
- **Minimal Profile**: Just essentials for servers

**Example:**
```bash
# Create work profile with specific plugins
Work Profile: git, docker, kubectl, terraform + spaceship theme

# Create personal profile  
Personal Profile: git, nvm, fzf, z + powerlevel10k theme

# Switch instantly
./setup.sh → Manage profiles → Switch profile → Work
```

## 🔌 Available Plugins

| Plugin | Description | Auto-installed |
|--------|-------------|----------------|
| `git` | Git shortcuts and info | ✅ Default |
| `docker` | Docker commands and aliases | ✅ Default |
| `nvm` | Node.js version management | ✅ Default |
| `kubectl` | Kubernetes CLI shortcuts | ✅ Default |
| `fzf` | Fuzzy finder integration | ✅ Default |
| `zsh-autosuggestions` | Command suggestions | ✅ Default |
| `zsh-syntax-highlighting` | Syntax highlighting | ✅ Default |
| `z` | Smart directory jumping | ⚡ Fresh only |
| `terraform` | Terraform shortcuts | ⚡ Fresh only |
| `thefuck` | Correct previous commands | ⚡ Fresh only |

## 🎨 Available Themes

| Theme | Description | Speed | Customization |
|-------|-------------|-------|---------------|
| `spaceship` | Modern, feature-rich | ⚡⚡⚡ | 🎨🎨🎨 |
| `powerlevel10k` | Fastest, most customizable | ⚡⚡⚡⚡ | 🎨🎨🎨🎨 |
| `starship` | Cross-shell, Rust-powered | ⚡⚡⚡⚡ | 🎨🎨🎨 |
| `agnoster` | Clean, git-aware | ⚡⚡⚡ | 🎨🎨 |
| `robbyrussell` | Simple, fast default | ⚡⚡⚡⚡ | 🎨 |

## 💻 System Requirements

**Supported Systems:**
- ✅ macOS (Intel & Apple Silicon)
- ✅ Linux (Ubuntu, Debian, CentOS, etc.)
- ✅ WSL2 (Windows Subsystem for Linux)

**Auto-installed Dependencies:**
- Git (for plugin management)
- Node.js (for CLI interface)
- Homebrew (macOS/Linux package manager)
- Oh My Zsh (Zsh framework)

**Terminal Compatibility:**
- ✅ iTerm2 (macOS) - Full integration
- ✅ Terminal.app (macOS)
- ✅ GNOME Terminal (Linux)
- ✅ VS Code Terminal
- ✅ Any Zsh-compatible terminal

## 🤝 Contributing

**Quick Contribution:**
1. 🍴 Fork the repo
2. 🌿 Create feature branch: `git checkout -b amazing-feature`
3. 💾 Commit changes: `git commit -m 'Add amazing feature'`
4. 📤 Push branch: `git push origin amazing-feature`
5. 🔄 Open Pull Request

**Ideas Welcome:**
- New plugin integrations
- Theme improvements
- System compatibility
- Documentation updates

## 📄 License

MIT License - feel free to use in personal and commercial projects!

---

**Made with ❤️ for developers who love beautiful, functional terminals**

⭐ **Star this repo if it helped you!** ⭐
