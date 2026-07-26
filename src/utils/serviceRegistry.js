/**
 * Centralized service registry configuration
 * Maps each installable service to its platform-specific package names,
 * tap requirements, binary paths, and systemd unit names.
 * @author Ali M. Jaradat <AmJaradat01@gmail.com>
 */

/**
 * @typedef {Object} ServiceConfig
 * @property {string} displayName - Human-readable service name
 * @property {number} port - Default service port
 * @property {string} binary - Binary name for detection (e.g., 'mongod')
 * @property {Object} brew - Homebrew config
 * @property {string} brew.package - Homebrew package name
 * @property {string|null} brew.tap - Required tap (null if none)
 * @property {Object} apt - apt config
 * @property {string[]} apt.packages - Package name(s) to install
 * @property {string|null} apt.repoSetup - Shell commands to add repository (null if none)
 * @property {Object} yum - yum config
 * @property {string[]} yum.packages - Package name(s) to install
 * @property {string|null} yum.repoSetup - Shell commands to add repository (null if none)
 * @property {string} systemdUnit - systemd service unit name (Linux)
 */

/**
 * Service registry containing all installable service configurations.
 * @type {Object.<string, ServiceConfig>}
 */
export const serviceRegistry = {
    mongodb: {
        displayName: 'MongoDB Community Server',
        port: 27017,
        binary: 'mongod',
        brew: {
            package: 'mongodb-community',
            tap: 'mongodb/brew'
        },
        apt: {
            packages: ['mongodb-org'],
            repoSetup: 'set -e; . /etc/os-release; arch=$(dpkg --print-architecture); curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | sudo gpg --dearmor --yes -o /usr/share/keyrings/mongodb-server-7.0.gpg; echo "deb [arch=$arch signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg] https://repo.mongodb.org/apt/ubuntu ${VERSION_CODENAME}/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list >/dev/null; sudo apt-get update'
        },
        yum: {
            packages: ['mongodb-org'],
            repoSetup: 'printf "%s\\n" "[mongodb-org-7.0]" "name=MongoDB Repository" "baseurl=https://repo.mongodb.org/yum/redhat/\\$releasever/mongodb-org/7.0/\\$basearch/" "gpgcheck=1" "enabled=1" "gpgkey=https://www.mongodb.org/static/pgp/server-7.0.asc" | sudo tee /etc/yum.repos.d/mongodb-org-7.0.repo >/dev/null'
        },
        systemdUnit: 'mongod'
    },
    mysql: {
        displayName: 'MySQL Community Server',
        port: 3306,
        binary: 'mysqld',
        brew: {
            package: 'mysql',
            tap: null
        },
        apt: {
            packages: ['mysql-server'],
            repoSetup: null
        },
        yum: {
            packages: ['mysql-server'],
            repoSetup: null
        },
        systemdUnit: 'mysqld'
    },
    postgresql: {
        displayName: 'PostgreSQL',
        port: 5432,
        binary: 'pg_isready',
        brew: {
            package: 'postgresql@14',
            tap: null
        },
        apt: {
            packages: ['postgresql', 'postgresql-contrib'],
            repoSetup: null
        },
        yum: {
            packages: ['postgresql-server', 'postgresql-contrib'],
            repoSetup: null
        },
        systemdUnit: 'postgresql'
    },
    redis: {
        displayName: 'Redis',
        port: 6379,
        binary: 'redis-server',
        brew: {
            package: 'redis',
            tap: null
        },
        apt: {
            packages: ['redis-server'],
            repoSetup: null
        },
        yum: {
            packages: ['redis'],
            repoSetup: null
        },
        systemdUnit: 'redis'
    },
    rabbitmq: {
        displayName: 'RabbitMQ',
        port: 5672,
        binary: 'rabbitmq-server',
        brew: {
            package: 'rabbitmq',
            tap: null
        },
        apt: {
            packages: ['rabbitmq-server'],
            repoSetup: null
        },
        yum: {
            packages: ['rabbitmq-server'],
            repoSetup: null
        },
        systemdUnit: 'rabbitmq-server'
    },
    elasticsearch: {
        displayName: 'Elasticsearch',
        port: 9200,
        binary: 'elasticsearch',
        brew: {
            package: 'elastic/tap/elasticsearch-full',
            tap: 'elastic/tap'
        },
        apt: {
            packages: ['elasticsearch'],
            repoSetup: 'curl -fsSL https://artifacts.elastic.co/GPG-KEY-elasticsearch | sudo gpg --dearmor --yes -o /usr/share/keyrings/elasticsearch-keyring.gpg && echo "deb [signed-by=/usr/share/keyrings/elasticsearch-keyring.gpg] https://artifacts.elastic.co/packages/8.x/apt stable main" | sudo tee /etc/apt/sources.list.d/elastic-8.x.list >/dev/null && sudo apt-get update'
        },
        yum: {
            packages: ['elasticsearch'],
            repoSetup: 'sudo rpm --import https://artifacts.elastic.co/GPG-KEY-elasticsearch && cat <<EOF | sudo tee /etc/yum.repos.d/elasticsearch.repo\n[elasticsearch]\nname=Elasticsearch repository for 8.x packages\nbaseurl=https://artifacts.elastic.co/packages/8.x/yum\ngpgcheck=1\ngpgkey=https://artifacts.elastic.co/GPG-KEY-elasticsearch\nenabled=1\nautorefresh=1\ntype=rpm-md\nEOF'
        },
        systemdUnit: 'elasticsearch'
    },
    memcached: {
        displayName: 'Memcached',
        port: 11211,
        binary: 'memcached',
        brew: {
            package: 'memcached',
            tap: null
        },
        apt: {
            packages: ['memcached'],
            repoSetup: null
        },
        yum: {
            packages: ['memcached'],
            repoSetup: null
        },
        systemdUnit: 'memcached'
    },

    // Cloud CLI Tools
    aws: {
        displayName: 'AWS CLI',
        port: 0,
        binary: 'aws',
        brew: {
            package: 'awscli',
            tap: null
        },
        apt: {
            packages: ['awscli'],
            repoSetup: null
        },
        yum: {
            packages: ['awscli'],
            repoSetup: null
        },
        systemdUnit: ''
    },
    gcloud: {
        displayName: 'Google Cloud SDK',
        port: 0,
        binary: 'gcloud',
        brew: {
            package: 'google-cloud-sdk',
            tap: null
        },
        apt: {
            packages: ['google-cloud-cli'],
            repoSetup: 'curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | sudo gpg --dearmor -o /usr/share/keyrings/cloud.google.gpg && echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main" | sudo tee /etc/apt/sources.list.d/google-cloud-sdk.list && sudo apt-get update'
        },
        yum: {
            packages: ['google-cloud-cli'],
            repoSetup: 'cat <<EOF | sudo tee /etc/yum.repos.d/google-cloud-sdk.repo\n[google-cloud-cli]\nname=Google Cloud CLI\nbaseurl=https://packages.cloud.google.com/yum/repos/cloud-sdk-el9-x86_64\nenabled=1\ngpgcheck=1\nrepo_gpgcheck=0\ngpgkey=https://packages.cloud.google.com/yum/doc/rpm-package-key.gpg\nEOF'
        },
        systemdUnit: ''
    },
    azure: {
        displayName: 'Azure CLI',
        port: 0,
        binary: 'az',
        brew: {
            package: 'azure-cli',
            tap: null
        },
        apt: {
            packages: ['azure-cli'],
            repoSetup: 'curl -sL https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor | sudo tee /etc/apt/trusted.gpg.d/microsoft.gpg > /dev/null && echo "deb [arch=amd64] https://packages.microsoft.com/repos/azure-cli/ $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/azure-cli.list && sudo apt-get update'
        },
        yum: {
            packages: ['azure-cli'],
            repoSetup: 'sudo rpm --import https://packages.microsoft.com/keys/microsoft.asc && cat <<EOF | sudo tee /etc/yum.repos.d/azure-cli.repo\n[azure-cli]\nname=Azure CLI\nbaseurl=https://packages.microsoft.com/yumrepos/azure-cli\nenabled=1\ngpgcheck=1\ngpgkey=https://packages.microsoft.com/keys/microsoft.asc\nEOF'
        },
        systemdUnit: ''
    },

    // DevOps & Infrastructure Tools
    kubernetes: {
        displayName: 'kubectl (Kubernetes CLI)',
        port: 0,
        binary: 'kubectl',
        brew: {
            package: 'kubectl',
            tap: null
        },
        apt: {
            packages: ['kubectl'],
            repoSetup: 'curl -fsSL https://pkgs.k8s.io/core:/stable:/v1.31/deb/Release.key | sudo gpg --dearmor -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg && echo "deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] https://pkgs.k8s.io/core:/stable:/v1.31/deb/ /" | sudo tee /etc/apt/sources.list.d/kubernetes.list && sudo apt-get update'
        },
        yum: {
            packages: ['kubectl'],
            repoSetup: 'cat <<EOF | sudo tee /etc/yum.repos.d/kubernetes.repo\n[kubernetes]\nname=Kubernetes\nbaseurl=https://pkgs.k8s.io/core:/stable:/v1.31/rpm/\nenabled=1\ngpgcheck=1\ngpgkey=https://pkgs.k8s.io/core:/stable:/v1.31/rpm/repodata/repomd.xml.key\nEOF'
        },
        systemdUnit: ''
    },
    'terraform-extended': {
        displayName: 'Terraform',
        port: 0,
        binary: 'terraform',
        brew: {
            package: 'terraform',
            tap: null
        },
        apt: {
            packages: ['terraform'],
            repoSetup: 'wget -O- https://apt.releases.hashicorp.com/gpg | sudo gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg && echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/hashicorp.list && sudo apt-get update'
        },
        yum: {
            packages: ['terraform'],
            repoSetup: 'sudo yum install -y yum-utils && sudo yum-config-manager --add-repo https://rpm.releases.hashicorp.com/RHEL/hashicorp.repo'
        },
        systemdUnit: ''
    },
    ansible: {
        displayName: 'Ansible',
        port: 0,
        binary: 'ansible',
        brew: {
            package: 'ansible',
            tap: null
        },
        apt: {
            packages: ['ansible'],
            repoSetup: 'sudo apt-add-repository --yes --update ppa:ansible/ansible'
        },
        yum: {
            packages: ['ansible'],
            repoSetup: 'sudo yum install -y epel-release'
        },
        systemdUnit: ''
    },
    'docker-compose-extended': {
        displayName: 'Docker Compose',
        port: 0,
        binary: 'docker-compose',
        brew: {
            package: 'docker-compose',
            tap: null
        },
        apt: {
            packages: ['docker-compose-plugin'],
            repoSetup: null
        },
        yum: {
            packages: ['docker-compose-plugin'],
            repoSetup: null
        },
        systemdUnit: ''
    },

    // Development Languages & Runtimes
    python: {
        displayName: 'Python 3',
        port: 0,
        binary: 'python3',
        brew: {
            package: 'python',
            tap: null
        },
        apt: {
            packages: ['python3', 'python3-pip', 'python3-venv'],
            repoSetup: null
        },
        yum: {
            packages: ['python3', 'python3-pip'],
            repoSetup: null
        },
        systemdUnit: ''
    },
    golang: {
        displayName: 'Go (Golang)',
        port: 0,
        binary: 'go',
        brew: {
            package: 'go',
            tap: null
        },
        apt: {
            packages: ['golang-go'],
            repoSetup: null
        },
        yum: {
            packages: ['golang'],
            repoSetup: null
        },
        systemdUnit: ''
    },
    rust: {
        displayName: 'Rust (via rustup)',
        port: 0,
        binary: 'rustc',
        brew: {
            package: 'rustup',
            tap: null
        },
        apt: {
            packages: ['rustc', 'cargo'],
            repoSetup: null
        },
        yum: {
            packages: ['rust', 'cargo'],
            repoSetup: null
        },
        systemdUnit: ''
    },
    java: {
        displayName: 'Java (OpenJDK)',
        port: 0,
        binary: 'java',
        brew: {
            package: 'openjdk',
            tap: null
        },
        apt: {
            packages: ['default-jdk'],
            repoSetup: null
        },
        yum: {
            packages: ['java-17-openjdk-devel'],
            repoSetup: null
        },
        systemdUnit: ''
    }
};

/**
 * Maps alias plugin names to service registry keys.
 * Used to determine which selected plugins correspond to installable services.
 * @type {Object.<string, string>}
 */
export const aliasToService = {
    // Database Services
    'mongodb': 'mongodb',
    'mysql': 'mysql',
    'postgresql': 'postgresql',
    'redis': 'redis',
    'rabbitmq': 'rabbitmq',
    'elasticsearch': 'elasticsearch',
    'memcached': 'memcached',
    // Cloud CLI Tools
    'aws': 'aws',
    'gcloud': 'gcloud',
    'azure': 'azure',
    // DevOps & Infrastructure Tools
    'kubernetes': 'kubernetes',
    'terraform-extended': 'terraform-extended',
    'ansible': 'ansible',
    'docker-compose-extended': 'docker-compose-extended',
    // Development Languages & Runtimes
    'python': 'python',
    'golang': 'golang',
    'rust': 'rust',
    'java': 'java'
};
