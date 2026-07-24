# Awesome Lazy Zsh

![Version](https://img.shields.io/badge/version-v3.4.2-blue.svg) [![GitHub Release](https://img.shields.io/github/v/release/AmJaradat01/awesome-lazy-zsh)](https://github.com/AmJaradat01/awesome-lazy-zsh/releases/latest) ![Node.js](https://img.shields.io/badge/node-%3E%3D18-green.svg) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT) ![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Linux%20%7C%20WSL2-lightgrey.svg)

🚀 **The easiest way to set up and manage your Zsh environment**

Awesome-Lazy-Zsh automates your Zsh setup with 42 plugins, 5 themes, configuration profiles, and service installation. It installs dependencies, manages Oh My Zsh, and gives you a beautiful interactive CLI to build the terminal environment you want.

## ✨ Features

### Core
- 🔌 **42 Plugins** — databases, cloud CLIs, DevOps tools, languages, and productivity shortcuts
- 🎨 **5 Themes** — Spaceship, Powerlevel10k, Starship, Agnoster, Robbyrussell
- 💾 **Backup & Restore** — automatic `.zshrc` backups before any changes
- 🖥️ **Interactive CLI** — guided setup wizard with multi-select menus
- 🔧 **Auto Dependencies** — installs Git, Node.js, Homebrew, fzf automatically
- 📁 **Configuration Profiles** — save, switch, and manage different setups
- 🌐 **Custom Plugins** — add plugins from any Git repository

### Resume Setup (v3.3.0)
- 🔄 **Never lose progress** — checkpoint-based state persistence
- Automatic saves at each major step (plugin selection, installation, services, theme)
- "Resume previous setup" or "Start fresh" prompt on re-launch
- Per-plugin/service progress tracking — skips what already succeeded
- 24-hour auto-expiry for stale state files
- Graceful degradation — state I/O failures never crash the flow

### Service Installation (v3.2.0+)
- 📦 Install real service servers (MongoDB, MySQL, PostgreSQL, Redis, RabbitMQ, Elasticsearch, Memcached)
- ☁️ Install cloud CLIs (AWS CLI, Google Cloud SDK, Azure CLI)
- 🛠️ Install DevOps tools (kubectl, Terraform, Ansible, Docker Compose)
- 💻 Install language runtimes (Python, Go, Rust, Java/OpenJDK)
- 🔍 Platform auto-detection — Homebrew (macOS), apt (Debian/Ubuntu), yum (RHEL/CentOS)
- ✅ Pre-installation checks — skips already-installed tools
- 🚀 Optionally start services immediately after installation

## 📋 Table of Contents

- [Quick Start](#-quick-start)
- [Installation Options](#-installation-options)
- [Available Plugins](#-available-plugins)
- [Available Themes](#-available-themes)
- [Resume Setup](#-resume-setup)
- [Profile Management](#-profile-management)
- [System Requirements](#-system-requirements)
- [Contributing](#-contributing)
- [License](#-license)

## 🚀 Quick Start

### Via Homebrew 🍺
```bash
brew tap amjaradat01/awesome-lazy-zsh
brew trust amjaradat01/awesome-lazy-zsh
brew install awesome-lazy-zsh
awesome-lazy-zsh
```

> **Note:** Homebrew requires trusting third-party taps before installing. The `brew trust` step is a one-time requirement.

### Via Git Clone
```bash
git clone https://github.com/AmJaradat01/awesome-lazy-zsh.git
cd awesome-lazy-zsh
./setup.sh
```

The setup script installs Git, Node.js, Homebrew, and fzf if missing, then launches the interactive CLI.

## 🎛️ Installation Options

| Option | Description |
|--------|-------------|
| 🆕 **Fresh Installation** | Choose plugins and theme interactively |
| ⚡ **Default Installation** | Pre-configured developer setup (18 plugins + Spaceship theme) |
| 🔄 **Update Plugins** | Update all installed plugins to latest |
| 📁 **Manage Profiles** | Save, switch, or list configuration profiles |
| 🌐 **Custom Plugins** | Add any plugin from a Git repository URL |
| 💾 **Backup/Restore** | Manage .zshrc backups |

If a previous setup was interrupted, you'll also see a **Resume** option to continue from where you left off.

## 🔌 Available Plugins

### Database Services
| Plugin | Aliases |
|--------|---------|
| `mongodb` | `mongo-start`, `mongo-stop`, `mongo-local` |
| `postgresql` | `pg-start`, `pg-stop`, `pg-local`, `pg-list` |
| `mysql` | `mysql-start`, `mysql-stop`, `mysql-local` |
| `redis` | `redis-start`, `redis-stop`, `redis-ping` |
| `rabbitmq` | `rabbitmq-start`, `rabbitmq-queues` |
| `elasticsearch` | `es-start`, `es-health`, `es-indices` |
| `memcached` | `memcached-start`, `mc-stats` |

### Cloud Providers
| Plugin | Aliases |
|--------|---------|
| `aws` | `aws-whoami`, `aws-profile`, `ec2-list`, `s3-ls` |
| `gcloud` | `gc-auth`, `gc-vms`, `gc-buckets` |
| `azure` | `az-login`, `az-vms`, `az-aks` |

### DevOps Tools
| Plugin | Aliases |
|--------|---------|
| `kubernetes` | `kgp`, `kgs`, `kctx`, `kns`, `klogs` |
| `docker-compose-extended` | `dcu`, `dcd`, `dcl`, `dcps` |
| `terraform-extended` | `tfi`, `tfp`, `tfa`, `tfw` |
| `ansible` | `ap`, `av`, `ag`, `aping` |

### Development Languages
| Plugin | Aliases |
|--------|---------|
| `python` | `venv-create`, `va`, `vd`, `pip-freeze` |
| `golang` | `gob`, `gor`, `got`, `gomod` |
| `rust` | `cb`, `cr`, `ct`, `cf` |
| `node` | `ni`, `nr`, `yi`, `pi` |
| `java` | `mci`, `gwb`, `java11`, `java17` |

### Productivity
| Plugin | Aliases |
|--------|---------|
| `git-extras` | `gst`, `grbi`, `gcp`, `gundo`, `gsync` |
| `ssh` | `ssh-keygen-ed`, `ssh-copy-key`, `ssh-agent-start` |
| `dotenv` | `dotenv`, `env-load`, `env-show` |
| `directories` | `..`, `...`, `mkcd`, `bookmark`, `goto` |
| `history-search` | `hg`, `fh`, `htop10` |
| `extract` | `extract`, `mktar`, `mkzip` |

### Built-in Oh My Zsh Plugins
`git` · `git-flow` · `npm` · `nvm` · `docker` · `docker-compose` · `kubectl` · `terraform` · `vscode` · `extract` · `dotenv` · `ssh-agent` · `node` · `gitfast`

### External Plugins
| Plugin | Source |
|--------|--------|
| `zsh-autosuggestions` | Fish-like command suggestions |
| `zsh-syntax-highlighting` | Real-time syntax highlighting |
| `zsh-autocomplete` | IDE-style auto-completion |
| `fzf` | Fuzzy finder integration |
| `z` | Smart directory jumping |
| `thefuck` | Corrects previous console commands |

## 🎨 Available Themes

| Theme | Type | Description |
|-------|------|-------------|
| `spaceship` | External | Modern, feature-rich prompt with git info |
| `powerlevel10k` | External | Highly customizable, very fast |
| `starship` | External | Cross-shell, written in Rust |
| `agnoster` | Built-in | Clean, git-aware segments |
| `robbyrussell` | Built-in | Simple and fast (Oh My Zsh default) |

## 🔄 Resume Setup

If your setup is interrupted (Ctrl+C, terminal crash, network issue), your progress is saved automatically. On re-launch, you'll see:

```
? A previous setup was interrupted. What would you like to do?
❯ Resume previous setup
  Start fresh
```

Checkpoints are saved after:
- Plugin selection
- Each plugin installation
- Service installation
- Theme selection

State is stored at `~/.awesome-lazy-zsh-state.json` and expires after 24 hours.

## 📁 Profile Management

Save and switch between different plugin/theme configurations:

```
? Profile management:
❯ Switch profile
  Save current as profile
  List profiles
```

Example setups:
- **Work**: docker, kubernetes, aws, terraform, git-extras
- **Personal**: git, node, python, fzf, z
- **Minimal**: git, zsh-autosuggestions, z

## 💻 System Requirements

### Supported Platforms
| Platform | Service Installation | Aliases |
|----------|---------------------|---------|
| macOS (Intel & Apple Silicon) | ✅ via Homebrew | ✅ |
| Linux (Debian/Ubuntu) | ✅ via apt | ✅ |
| Linux (RHEL/CentOS/Fedora) | ✅ via yum | ✅ |
| Windows (WSL2) | ✅ via apt (inside WSL) | ✅ |

Service installation requires macOS or Linux with a supported package manager. Aliases work on any system running Zsh.

### Auto-installed Dependencies
| Tool | Purpose |
|------|---------|
| Homebrew | Package manager (macOS/Linux) |
| Git | Plugin management and cloning |
| Node.js | Powers the interactive CLI |
| fzf | Fuzzy finder functionality |
| Oh My Zsh | Zsh plugin framework |

### Terminal Compatibility
Works in any terminal that supports Zsh: iTerm2, Terminal.app, GNOME Terminal, Windows Terminal (WSL), VS Code terminal, Alacritty, Kitty, WezTerm.

## 🤝 Contributing

See [CONTRIBUTING](CONTRIBUTING) for details on development setup, git-flow workflow, and pull request guidelines.

## 📄 License

[MIT License](LICENSE) — free to use in personal and commercial projects.

---

**Made with ❤️ for developers who want a powerful terminal without the setup hassle**
