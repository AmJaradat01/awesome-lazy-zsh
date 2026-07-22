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
            repoSetup: 'wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add - && echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list && sudo apt-get update'
        },
        yum: {
            packages: ['mongodb-org'],
            repoSetup: 'cat <<EOF | sudo tee /etc/yum.repos.d/mongodb-org-7.0.repo\n[mongodb-org-7.0]\nname=MongoDB Repository\nbaseurl=https://repo.mongodb.org/yum/redhat/\\$releasever/mongodb-org/7.0/x86_64/\ngpgcheck=1\nenabled=1\ngpgkey=https://www.mongodb.org/static/pgp/server-7.0.asc\nEOF'
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
            repoSetup: 'wget -qO - https://artifacts.elastic.co/GPG-KEY-elasticsearch | sudo apt-key add - && echo "deb https://artifacts.elastic.co/packages/8.x/apt stable main" | sudo tee /etc/apt/sources.list.d/elastic-8.x.list && sudo apt-get update'
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
    }
};

/**
 * Maps alias plugin names to service registry keys.
 * Used to determine which selected plugins correspond to installable services.
 * @type {Object.<string, string>}
 */
export const aliasToService = {
    'mongodb': 'mongodb',
    'mysql': 'mysql',
    'postgresql': 'postgresql',
    'redis': 'redis',
    'rabbitmq': 'rabbitmq',
    'elasticsearch': 'elasticsearch',
    'memcached': 'memcached'
};
