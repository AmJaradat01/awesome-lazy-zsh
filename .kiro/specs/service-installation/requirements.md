# Requirements Document

## Introduction

This feature adds the ability to install actual local development services (MongoDB Community Server, MySQL Community Server, Redis, PostgreSQL, RabbitMQ, Elasticsearch, Memcached) during the awesome-lazy-zsh setup process. Currently, selecting these services only installs shell aliases for managing them. This feature introduces an explicit step that offers to install the underlying server software itself, using platform-appropriate package managers (Homebrew on macOS, apt/yum on Linux).

## Glossary

- **Setup_CLI**: The interactive Node.js CLI application (`src/index.js`) that guides users through awesome-lazy-zsh configuration
- **Service_Installer**: The module responsible for detecting, installing, and optionally starting local development services on the user's machine
- **Installable_Service**: A local development service server (MongoDB, MySQL, PostgreSQL, Redis, RabbitMQ, Elasticsearch, Memcached) that can be installed via a package manager
- **Alias_Plugin**: An alias-only plugin entry in the plugin selection that provides shell shortcuts for managing a service without installing the service itself
- **Package_Manager**: The system package manager used for installation — Homebrew on macOS, apt on Debian/Ubuntu Linux, yum on RHEL/CentOS Linux
- **Service_Registry**: The configuration object mapping each Installable_Service to its package names, tap requirements, and systemd unit names per platform

## Requirements

### Requirement 1: Service Installation Prompt After Plugin Selection

**User Story:** As a user, I want to be asked whether to install the actual service servers after selecting service-related alias plugins, so that I can get fully working services without manual installation steps.

#### Acceptance Criteria

1. WHEN the user completes plugin selection and at least one Alias_Plugin corresponding to an Installable_Service is selected, THE Setup_CLI SHALL display a prompt asking whether the user wants to install the actual service servers.
2. WHEN the user completes plugin selection and no Alias_Plugin corresponding to an Installable_Service is selected, THE Setup_CLI SHALL skip the service installation prompt entirely.
3. WHEN the service installation prompt is displayed, THE Setup_CLI SHALL present two options: "Install selected services" and "Skip (aliases only)".

### Requirement 2: Granular Service Selection

**User Story:** As a user, I want to choose which specific services to install even if I selected multiple service alias plugins, so that I only install the servers I actually need on my machine.

#### Acceptance Criteria

1. WHEN the user chooses "Install selected services", THE Setup_CLI SHALL display a multi-select list containing only the Installable_Services whose corresponding Alias_Plugins were selected.
2. THE Setup_CLI SHALL pre-select all Installable_Services in the multi-select list by default.
3. WHEN the user deselects a service from the multi-select list, THE Service_Installer SHALL skip installation of that service while still installing its aliases.

### Requirement 3: Platform Detection

**User Story:** As a user, I want the installer to automatically detect my operating system and use the correct package manager, so that installation works without manual intervention.

#### Acceptance Criteria

1. THE Service_Installer SHALL detect the operating system platform (macOS or Linux) before attempting installation.
2. WHILE running on macOS, THE Service_Installer SHALL use Homebrew as the Package_Manager for all service installations.
3. WHILE running on Linux with apt available, THE Service_Installer SHALL use apt as the Package_Manager for all service installations.
4. WHILE running on Linux with yum available and apt unavailable, THE Service_Installer SHALL use yum as the Package_Manager for all service installations.
5. IF neither Homebrew (on macOS) nor apt/yum (on Linux) is available, THEN THE Service_Installer SHALL display an error message identifying the missing Package_Manager and skip service installation.

### Requirement 4: macOS Service Installation via Homebrew

**User Story:** As a macOS user, I want services installed via Homebrew with proper taps configured, so that I get the official community-maintained packages.

#### Acceptance Criteria

1. WHEN installing MongoDB on macOS, THE Service_Installer SHALL run `brew tap mongodb/brew` before running `brew install mongodb-community`.
2. WHEN installing MySQL on macOS, THE Service_Installer SHALL run `brew install mysql`.
3. WHEN installing PostgreSQL on macOS, THE Service_Installer SHALL run `brew install postgresql@14`.
4. WHEN installing Redis on macOS, THE Service_Installer SHALL run `brew install redis`.
5. WHEN installing RabbitMQ on macOS, THE Service_Installer SHALL run `brew install rabbitmq`.
6. WHEN installing Elasticsearch on macOS, THE Service_Installer SHALL run `brew tap elastic/tap` before running `brew install elastic/tap/elasticsearch-full`.
7. WHEN installing Memcached on macOS, THE Service_Installer SHALL run `brew install memcached`.

### Requirement 5: Linux Service Installation via apt

**User Story:** As a Linux (Debian/Ubuntu) user, I want services installed via apt with proper repository configuration, so that I get stable packages from official sources.

#### Acceptance Criteria

1. WHEN installing MongoDB on Debian/Ubuntu Linux, THE Service_Installer SHALL add the official MongoDB repository GPG key and sources list before running `sudo apt-get install -y mongodb-org`.
2. WHEN installing MySQL on Debian/Ubuntu Linux, THE Service_Installer SHALL run `sudo apt-get install -y mysql-server`.
3. WHEN installing PostgreSQL on Debian/Ubuntu Linux, THE Service_Installer SHALL run `sudo apt-get install -y postgresql postgresql-contrib`.
4. WHEN installing Redis on Debian/Ubuntu Linux, THE Service_Installer SHALL run `sudo apt-get install -y redis-server`.
5. WHEN installing RabbitMQ on Debian/Ubuntu Linux, THE Service_Installer SHALL run `sudo apt-get install -y rabbitmq-server`.
6. WHEN installing Elasticsearch on Debian/Ubuntu Linux, THE Service_Installer SHALL add the Elastic APT repository and GPG key before running `sudo apt-get install -y elasticsearch`.
7. WHEN installing Memcached on Debian/Ubuntu Linux, THE Service_Installer SHALL run `sudo apt-get install -y memcached`.

### Requirement 6: Linux Service Installation via yum

**User Story:** As a Linux (RHEL/CentOS) user, I want services installed via yum with proper repository configuration, so that I get packages compatible with my distribution.

#### Acceptance Criteria

1. WHEN installing MongoDB on RHEL/CentOS Linux, THE Service_Installer SHALL add the official MongoDB yum repository before running `sudo yum install -y mongodb-org`.
2. WHEN installing MySQL on RHEL/CentOS Linux, THE Service_Installer SHALL run `sudo yum install -y mysql-server`.
3. WHEN installing PostgreSQL on RHEL/CentOS Linux, THE Service_Installer SHALL run `sudo yum install -y postgresql-server postgresql-contrib`.
4. WHEN installing Redis on RHEL/CentOS Linux, THE Service_Installer SHALL run `sudo yum install -y redis`.
5. WHEN installing RabbitMQ on RHEL/CentOS Linux, THE Service_Installer SHALL run `sudo yum install -y rabbitmq-server`.
6. WHEN installing Elasticsearch on RHEL/CentOS Linux, THE Service_Installer SHALL add the Elastic yum repository and GPG key before running `sudo yum install -y elasticsearch`.
7. WHEN installing Memcached on RHEL/CentOS Linux, THE Service_Installer SHALL run `sudo yum install -y memcached`.

### Requirement 7: Pre-Installation Check

**User Story:** As a user, I want the installer to skip services that are already installed, so that I don't waste time reinstalling or break existing configurations.

#### Acceptance Criteria

1. WHEN a service is selected for installation, THE Service_Installer SHALL check whether the service binary is already present on the system.
2. IF the service binary is already present, THEN THE Service_Installer SHALL display a message indicating the service is already installed and skip installation for that service.
3. THE Service_Installer SHALL use the following binaries for detection: `mongod` for MongoDB, `mysqld` for MySQL, `pg_isready` for PostgreSQL, `redis-server` for Redis, `rabbitmq-server` for RabbitMQ, `elasticsearch` (or the Elasticsearch process) for Elasticsearch, `memcached` for Memcached.

### Requirement 8: Post-Installation Service Start Option

**User Story:** As a user, I want to optionally start services immediately after installation, so that I can begin using them right away without extra manual steps.

#### Acceptance Criteria

1. WHEN one or more services are successfully installed, THE Setup_CLI SHALL prompt the user asking whether to start the installed services immediately.
2. WHEN the user chooses to start services, THE Service_Installer SHALL start each successfully installed service using the platform-appropriate service management command.
3. WHEN the user chooses not to start services, THE Setup_CLI SHALL display the manual start commands for each installed service.
4. WHILE running on macOS, THE Service_Installer SHALL use `brew services start <package>` to start services.
5. WHILE running on Linux, THE Service_Installer SHALL use `sudo systemctl start <unit>` and `sudo systemctl enable <unit>` to start and enable services.

### Requirement 9: Installation Progress and Error Reporting

**User Story:** As a user, I want clear feedback during installation showing progress and any errors, so that I can diagnose problems if a service fails to install.

#### Acceptance Criteria

1. WHEN a service installation begins, THE Service_Installer SHALL display the service name and the command being executed.
2. WHEN a service installation completes successfully, THE Service_Installer SHALL display a success message with the service name and port number.
3. IF a service installation fails, THEN THE Service_Installer SHALL display an error message with the service name and the error details, and continue installing remaining services.
4. WHEN all service installations are complete, THE Service_Installer SHALL display a summary listing which services were installed successfully and which failed.

### Requirement 10: Service Registry Configuration

**User Story:** As a developer, I want a centralized configuration mapping services to their platform-specific package names, tap requirements, and binary paths, so that adding new services requires only a configuration change.

#### Acceptance Criteria

1. THE Service_Registry SHALL define for each Installable_Service: display name, default port, Homebrew package name, Homebrew tap (if required), apt package name, yum package name, systemd unit name, and detection binary path.
2. THE Service_Registry SHALL include entries for MongoDB, MySQL, PostgreSQL, Redis, RabbitMQ, Elasticsearch, and Memcached.
3. WHEN a new Installable_Service needs to be supported, THE Service_Registry SHALL be the only configuration that requires modification (aside from the corresponding alias file).
