# Awesome Lazy Zsh

[![Awesome](https://awesome.re/badge.svg)](https://awesome.re) ![Version](https://img.shields.io/badge/version-v3.1.1-blue.svg) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

🚀 **The easiest way to set up and manage your Zsh environment**

Awesome-Lazy-Zsh is a powerful yet simple tool that automates your Zsh setup with plugins, themes, and configurations. Perfect for developers who want a beautiful, functional terminal without the hassle.

## ✨ Features

### Core Features
- 🔌 **Smart Plugin Management** - Install, update, and manage 40+ popular plugins
- 🎨 **Theme Customization** - Choose from popular themes like Spaceship, Powerlevel10k
- 💾 **Backup & Restore** - Automatic `.zshrc` backups before any changes
- 🖥️ **Interactive CLI** - Beautiful, user-friendly setup wizard
- 🔧 **Auto Dependencies** - Installs Git, Node.js, Homebrew automatically

### New in v3.1.0
- 🗄️ **Database Services** - MongoDB, PostgreSQL, MySQL, Redis, RabbitMQ, Elasticsearch, Memcached
- ☁️ **Cloud CLI Tools** - AWS, Google Cloud, Azure shortcuts
- 🐳 **DevOps Tools** - Kubernetes, Docker Compose, Terraform, Ansible
- 💻 **Language Support** - Python, Go, Rust, Node.js, Java
- 🛠️ **Productivity** - Git extras, SSH manager, directory shortcuts, history search
- 🌐 **Cross-Platform** - Full support for macOS, Linux, and Windows (WSL)

## 📋 Table of Contents

- [Quick Start](#-quick-start)
- [Installation Options](#-installation-options)
- [Available Plugins](#-available-plugins)
- [Available Themes](#-available-themes)
- [System Requirements](#-system-requirements)
- [Contributing](#-contributing)

## 🚀 Quick Start

### Via Homebrew (Recommended) 🍺
```bash
brew install amjaradat01/awesome-lazy-zsh/awesome-lazy-zsh
awesome-lazy-zsh
```

### Via Git Clone
```bash
git clone https://github.com/AmJaradat01/awesome-lazy-zsh.git && cd awesome-lazy-zsh && ./setup.sh
```

## 🎛️ Installation Options

| Option | Description |
|--------|-------------|
| 🆕 **Fresh Installation** | Choose your own plugins and themes |
| ⚡ **Default Installation** | Pre-configured setup for developers |
| 🔄 **Update Plugins** | Keep everything current |
| 📁 **Manage Profiles** | Switch between configurations |
| 🌐 **Custom Plugins** | Add plugins from any Git repository |

## 🔌 Available Plugins

### Database Services
| Plugin | Description | Aliases |
|--------|-------------|---------|
| `mongodb` | MongoDB Community | `mongo-start`, `mongo-stop`, `mongo-local` |
| `postgresql` | PostgreSQL Server | `pg-start`, `pg-stop`, `pg-local`, `pg-list` |
| `mysql` | MySQL Server | `mysql-start`, `mysql-stop`, `mysql-local` |
| `redis` | Redis Server | `redis-start`, `redis-stop`, `redis-ping` |
| `rabbitmq` | RabbitMQ Server | `rabbitmq-start`, `rabbitmq-queues` |
| `elasticsearch` | Elasticsearch | `es-start`, `es-health`, `es-indices` |
| `memcached` | Memcached | `memcached-start`, `mc-stats` |

### Cloud Providers
| Plugin | Description | Aliases |
|--------|-------------|---------|
| `aws` | AWS CLI | `aws-whoami`, `aws-profile`, `ec2-list`, `s3-ls` |
| `gcloud` | Google Cloud | `gc-auth`, `gc-vms`, `gc-buckets` |
| `azure` | Azure CLI | `az-login`, `az-vms`, `az-aks` |

### DevOps Tools
| Plugin | Description | Aliases |
|--------|-------------|---------|
| `kubernetes` | Kubernetes/kubectl | `kgp`, `kgs`, `kctx`, `kns`, `klogs` |
| `docker-compose-extended` | Docker Compose | `dcu`, `dcd`, `dcl`, `dcps` |
| `terraform-extended` | Terraform | `tfi`, `tfp`, `tfa`, `tfw` |
| `ansible` | Ansible | `ap`, `av`, `ag`, `aping` |

### Development Languages
| Plugin | Description | Aliases |
|--------|-------------|---------|
| `python` | Python/venv | `venv-create`, `va`, `vd`, `pip-freeze` |
| `golang` | Go | `gob`, `gor`, `got`, `gomod` |
| `rust` | Rust/Cargo | `cb`, `cr`, `ct`, `cf` |
| `node` | Node/NPM/Yarn | `ni`, `nr`, `yi`, `pi` |
| `java` | Java/Maven/Gradle | `mci`, `gwb`, `java11`, `java17` |

### Productivity
| Plugin | Description | Aliases |
|--------|-------------|---------|
| `git-extras` | Extended Git | `gst`, `grbi`, `gcp`, `gundo`, `gsync` |
| `ssh` | SSH Manager | `ssh-keygen-ed`, `ssh-copy-key`, `ssh-agent-start` |
| `dotenv` | Dotenv Loader | `dotenv`, `env-load`, `env-show` |
| `directories` | Directory Shortcuts | `..`, `...`, `mkcd`, `bookmark`, `goto` |
| `history-search` | History Search | `hg`, `fh`, `htop10` |
| `extract` | Archive Extraction | `extract`, `mktar`, `mkzip` |

### Built-in Oh My Zsh Plugins
| Plugin | Description |
|--------|-------------|
| `git` | Git shortcuts and info |
| `git-flow` | Git Flow workflow |
| `docker` | Docker commands |
| `docker-compose` | Docker Compose |
| `kubectl` | Kubernetes CLI |
| `terraform` | Terraform |
| `nvm` | Node Version Manager |
| `npm` | NPM shortcuts |
| `vscode` | VS Code integration |

### External Plugins
| Plugin | Description |
|--------|-------------|
| `zsh-autosuggestions` | Command suggestions |
| `zsh-syntax-highlighting` | Syntax highlighting |
| `zsh-autocomplete` | Auto-completion |
| `fzf` | Fuzzy finder |
| `z` | Smart directory jumping |
| `thefuck` | Correct previous commands |

## 🎨 Available Themes

| Theme | Description | Speed | Customization |
|-------|-------------|-------|---------------|
| `spaceship` | Modern, feature-rich | ⚡⚡⚡ | 🎨🎨🎨 |
| `powerlevel10k` | Fastest, most customizable | ⚡⚡⚡⚡ | 🎨🎨🎨🎨 |
| `starship` | Cross-shell, Rust-powered | ⚡⚡⚡⚡ | 🎨🎨🎨 |
| `agnoster` | Clean, git-aware | ⚡⚡⚡ | 🎨🎨 |
| `robbyrussell` | Simple, fast default | ⚡⚡⚡⚡ | 🎨 |

## 💻 System Requirements

### Supported Systems
- ✅ macOS (Intel & Apple Silicon)
- ✅ Linux (Ubuntu, Debian, CentOS, Fedora, etc.)
- ✅ Windows (WSL2, Git Bash, Cygwin)

### Cross-Platform Support
All plugins automatically detect your OS and use the appropriate commands:
- **macOS**: Homebrew services (`brew services`)
- **Linux**: systemd (`systemctl`)
- **Windows**: Native services (`net start/stop`)

### Auto-installed Dependencies
- Git (for plugin management)
- Node.js (for CLI interface)
- Homebrew (macOS/Linux package manager)
- Oh My Zsh (Zsh framework)

### Terminal Compatibility
- ✅ iTerm2 (macOS)
- ✅ Terminal.app (macOS)
- ✅ GNOME Terminal (Linux)
- ✅ Windows Terminal (Windows)
- ✅ VS Code Terminal
- ✅ Any Zsh-compatible terminal

## 📁 Profile Management

Save and switch between different configurations:

```bash
# Save current setup as a profile
./setup.sh → "Manage profiles" → "Save current as profile"

# Switch between profiles
./setup.sh → "Manage profiles" → "Switch profile"
```

**Example Profiles:**
- **Work**: docker, kubernetes, aws, terraform
- **Personal**: git, node, python, fzf
- **Minimal**: git, z, zsh-autosuggestions

## 🤝 Contributing

1. 🍴 Fork the repo
2. 🌿 Create feature branch: `git checkout -b feature/amazing-feature`
3. 💾 Commit changes: `git commit -m 'Add amazing feature'`
4. 📤 Push branch: `git push origin feature/amazing-feature`
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
