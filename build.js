#!/usr/bin/env node

/**
 * Space Shooter - Build Script
 * Educational Project - VM Only
 * 
 * This script builds the Electron app for Windows, macOS, and Linux
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// ANSI color codes for pretty output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m'
};

const log = {
    info: (msg) => console.log(`${colors.cyan}[INFO]${colors.reset} ${msg}`),
    success: (msg) => console.log(`${colors.green}[SUCCESS]${colors.reset} ${msg}`),
    warn: (msg) => console.log(`${colors.yellow}[WARN]${colors.reset} ${msg}`),
    error: (msg) => console.log(`${colors.red}[ERROR]${colors.reset} ${msg}`),
    step: (msg) => console.log(`\n${colors.magenta}>>>${colors.reset} ${colors.bright}${msg}${colors.reset}`)
};

// Configuration
const config = {
    appName: 'Space Shooter',
    appId: 'com.educational.spaceshooter',
    version: '1.0.0',
    author: 'Educational Team',
    description: 'Space Shooter Game - Educational Cybersecurity Project',
    outputDir: path.join(__dirname, 'dist'),
    installersDir: path.join(__dirname, 'installers'),
    platforms: {
        win: process.platform === 'win32' || process.argv.includes('--win'),
        mac: (process.platform === 'darwin' || process.argv.includes('--mac')) && process.argv.includes('--mac'),
        linux: process.platform === 'linux' || process.argv.includes('--linux')
    },
    icon: {
        win: path.join(__dirname, 'icon.ico'),
        mac: path.join(__dirname, 'icon.icns'),
        linux: path.join(__dirname, 'icon.png')
    }
};

// Required files
const requiredFiles = [
    'package.json',
    'main.js',
    'preload.js',
    'game.html'
];

// Required directories
const requiredDirs = [
    'installers'
];

/**
 * Print banner
 */
function printBanner() {
    console.log(`
${colors.cyan}╔════════════════════════════════════════════════════════════════╗${colors.reset}
${colors.cyan}║${colors.reset}          ${colors.bright}${colors.magenta}SPACE SHOOTER - EDUCATIONAL BUILD SCRIPT${colors.reset}          ${colors.cyan}║${colors.reset}
${colors.cyan}║${colors.reset}                      Version ${config.version}                        ${colors.cyan}║${colors.reset}
${colors.cyan}╚════════════════════════════════════════════════════════════════╝${colors.reset}
    `);
}

/**
 * Check if all required files exist
 */
function checkRequirements() {
    log.step('Checking requirements');
    
    const missing = [];
    
    // Check files
    requiredFiles.forEach(file => {
        if (!fs.existsSync(path.join(__dirname, file))) {
            missing.push(file);
            log.error(`Missing required file: ${file}`);
        } else {
            log.success(`Found: ${file}`);
        }
    });
    
    // Check directories
    requiredDirs.forEach(dir => {
        if (!fs.existsSync(path.join(__dirname, dir))) {
            log.warn(`Creating directory: ${dir}`);
            fs.mkdirSync(path.join(__dirname, dir), { recursive: true });
        } else {
            log.success(`Found directory: ${dir}`);
        }
    });
    
    // Check icons
    if (!fs.existsSync(config.icon.win)) {
        log.warn('Windows icon not found (icon.ico) - will use default');
    }
    if (!fs.existsSync(config.icon.mac)) {
        log.warn('macOS icon not found (icon.icns) - will use default');
    }
    if (!fs.existsSync(config.icon.linux)) {
        log.warn('Linux icon not found (icon.png) - will use default');
    }
    
    if (missing.length > 0) {
        log.error(`Missing ${missing.length} required files. Cannot continue.`);
        process.exit(1);
    }
    
    log.success('All requirements satisfied');
}

/**
 * Check Node.js and npm versions
 */
function checkNodeVersion() {
    log.step('Checking Node.js environment');
    
    try {
        const nodeVersion = execSync('node --version').toString().trim();
        const npmVersion = execSync('npm --version').toString().trim();
        
        log.success(`Node.js: ${nodeVersion}`);
        log.success(`npm: ${npmVersion}`);
        
        const nodeNum = parseInt(nodeVersion.replace('v', '').split('.')[0]);
        if (nodeNum < 16) {
            log.warn('Node.js version 16 or higher recommended');
        }
    } catch (e) {
        log.error('Node.js/npm not found. Please install Node.js 16+');
        process.exit(1);
    }
}

/**
 * Install dependencies
 */
function installDependencies() {
    log.step('Installing npm dependencies');
    
    try {
        log.info('Running npm install...');
        execSync('npm install', { stdio: 'inherit' });
        log.success('Dependencies installed successfully');
    } catch (e) {
        log.error('Failed to install dependencies');
        log.error(e.message);
        process.exit(1);
    }
}

/**
 * Check for installers
 */
function checkInstallers() {
    log.step('Checking dependency installers');
    
    const installers = fs.readdirSync(config.installersDir);
    
    if (installers.length === 0) {
        log.warn('No installers found in /installers directory');
        log.warn('The app will still work, but dependencies won\'t auto-install');
        log.warn('Place these files in /installers for full functionality:');
        console.log(`
  Windows:
    - python-3.9.0-amd64.exe
    - Git-2.33.0-64-bit.exe
    - curl-7.78.0-win64-mingw.exe
  
  macOS:
    - python3.pkg
    - git.pkg
  
  Linux:
    - (uses package manager, no installers needed)
        `);
    } else {
        log.success(`Found ${installers.length} installer(s):`);
        installers.forEach(f => log.info(`  - ${f}`));
    }
}

/**
 * Update package.json with correct paths
 */
function updatePackageJson() {
    log.step('Updating package.json');
    
    const pkgPath = path.join(__dirname, 'package.json');
    
    if (!fs.existsSync(pkgPath)) {
        log.error('package.json not found');
        process.exit(1);
    }
    
    const pkg = require(pkgPath);
    
    // Ensure build configuration
    pkg.build = pkg.build || {};
    pkg.build.appId = config.appId;
    pkg.build.productName = config.appName;
    pkg.build.directories = pkg.build.directories || {};
    pkg.build.directories.output = 'dist';
    pkg.build.files = [
        'main.js',
        'preload.js',
        'game.html',
        'installers/**/*'
    ];
    
    // Platform-specific settings
    pkg.build.win = {
        target: 'nsis',
        icon: 'icon.ico',
        publisherName: config.author,
        verifyUpdateCodeSignature: false
    };
    
    pkg.build.mac = {
        target: 'dmg',
        icon: 'icon.icns',
        category: 'public.app-category.games'
    };
    
    pkg.build.linux = {
        target: 'AppImage',
        icon: 'icon.png',
        category: 'Game'
    };
    
    pkg.build.nsis = {
        oneClick: false,
        allowToChangeInstallationDirectory: true,
        createDesktopShortcut: true,
        createStartMenuShortcut: true,
        shortcutName: config.appName
    };
    
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
    log.success('package.json updated');
}

/**
 * Build for specific platform
 */
function buildForPlatform(platform) {
    return new Promise((resolve, reject) => {
        const platformNames = {
            win: 'Windows',
            mac: 'macOS',
            linux: 'Linux'
        };
        
        log.step(`Building for ${platformNames[platform]}`);
        
        const buildCmd = `npm run build:${platform}`;
        log.info(`Running: ${buildCmd}`);
        
        const child = spawn('npm', ['run', `build:${platform}`], {
            stdio: 'inherit',
            shell: true
        });
        
        child.on('close', (code) => {
            if (code === 0) {
                log.success(`${platformNames[platform]} build complete`);
                resolve();
            } else {
                reject(new Error(`${platformNames[platform]} build failed with code ${code}`));
            }
        });
    });
}

/**
 * Verify builds
 */
function verifyBuilds() {
    log.step('Verifying builds');
    
    if (!fs.existsSync(config.outputDir)) {
        log.error('Output directory not found');
        return;
    }
    
    const files = fs.readdirSync(config.outputDir);
    
    if (files.length === 0) {
        log.warn('No build files found');
        return;
    }
    
    log.success(`Found ${files.length} build file(s):`);
    files.forEach(file => {
        const stats = fs.statSync(path.join(config.outputDir, file));
        const size = (stats.size / 1024 / 1024).toFixed(2);
        log.info(`  - ${file} (${size} MB)`);
    });
}

/**
 * Create README with instructions
 */
function createReadme() {
    log.step('Creating README file');
    
    const readmePath = path.join(config.outputDir, 'README.txt');
    
    const content = `
${config.appName} - Educational Project
========================================

Version: ${config.version}
Build Date: ${new Date().toLocaleString()}
Built on: ${os.platform()} ${os.release()}

FILES INCLUDED:
--------------
${fs.readdirSync(config.outputDir).map(f => `- ${f}`).join('\n')}

INSTALLATION INSTRUCTIONS:
-------------------------
Windows:
  1. Run the .exe installer
  2. Follow installation wizard
  3. Launch from Start Menu or Desktop

macOS:
  1. Open the .dmg file
  2. Drag app to Applications folder
  3. Launch from Applications

Linux:
  1. Make AppImage executable: chmod +x *.AppImage
  2. Run: ./Space*.AppImage

TESTING INSTRUCTIONS:
--------------------
1. This is an educational project - TEST ONLY IN VMs
2. Before testing, ensure listener is running on port 4444
3. The game will check for dependencies and install if needed
4. Backdoor features activate after game starts

CLEANUP:
-------
A cleanup tool is generated inside the app after 30 seconds
Or run the SpaceShooter_Cleanup.html tool

ETHICAL NOTE:
------------
This software is for educational purposes only.
Test only in isolated virtual machines you own.
Do not use on any system without explicit permission.

${'='.repeat(40)}
`;
    
    fs.writeFileSync(readmePath, content);
    log.success(`README created: ${readmePath}`);
}

/**
 * Main build function
 */
async function build() {
    printBanner();
    
    const startTime = Date.now();
    
    try {
        // Pre-build checks
        checkNodeVersion();
        checkRequirements();
        checkInstallers();
        
        // Prepare
        installDependencies();
        updatePackageJson();
        
        // Create output directory
        if (!fs.existsSync(config.outputDir)) {
            fs.mkdirSync(config.outputDir, { recursive: true });
        }
        
        // Build for requested platforms
        const builds = [];
        
        if (config.platforms.win) {
            builds.push(buildForPlatform('win'));
        }
        if (config.platforms.mac) {
            builds.push(buildForPlatform('mac'));
        }
        if (config.platforms.linux) {
            builds.push(buildForPlatform('linux'));
        }
        
        // If no platform specified, build current platform
        if (builds.length === 0) {
            if (process.platform === 'win32') {
                builds.push(buildForPlatform('win'));
            } else if (process.platform === 'darwin') {
                builds.push(buildForPlatform('mac'));
            } else if (process.platform === 'linux') {
                builds.push(buildForPlatform('linux'));
            }
        }
        
        // Wait for all builds to complete
        await Promise.all(builds);
        
        // Post-build
        verifyBuilds();
        createReadme();
        
        const endTime = Date.now();
        const duration = ((endTime - startTime) / 1000).toFixed(1);
        
        // Success banner
        console.log(`
${colors.green}╔════════════════════════════════════════════════════════════════╗${colors.reset}
${colors.green}║${colors.reset}                    ${colors.bright}BUILD COMPLETE!${colors.reset}                        ${colors.green}║${colors.reset}
${colors.green}║${colors.reset}                                                              ${colors.green}║${colors.reset}
${colors.green}║${colors.reset}  ${colors.cyan}Output directory:${colors.reset} ${config.outputDir}                    ${colors.green}║${colors.reset}
${colors.green}║${colors.reset}  ${colors.cyan}Build time:${colors.reset} ${duration} seconds                                  ${colors.green}║${colors.reset}
${colors.green}║${colors.reset}  ${colors.cyan}Platforms:${colors.reset} ${builds.length} built                                  ${colors.green}║${colors.reset}
${colors.green}║${colors.reset}                                                              ${colors.green}║${colors.reset}
${colors.green}║${colors.reset}  ${colors.yellow}Next steps:${colors.reset}                                               ${colors.green}║${colors.reset}
${colors.green}║${colors.reset}  1. Copy installers to target VMs                           ${colors.green}║${colors.reset}
${colors.green}║${colors.reset}  2. Start listener: nc -lvnp 4444                           ${colors.green}║${colors.reset}
${colors.green}║${colors.reset}  3. Run installer in VM                                      ${colors.green}║${colors.reset}
${colors.green}║${colors.reset}  4. Document findings for assignment                        ${colors.green}║${colors.reset}
${colors.green}║${colors.reset}                                                              ${colors.green}║${colors.reset}
${colors.green}╚════════════════════════════════════════════════════════════════╝${colors.reset}
        `);
        
    } catch (e) {
        log.error('Build failed:');
        log.error(e.message);
        process.exit(1);
    }
}

// Handle command line arguments
if (require.main === module) {
    // Parse args
    const args = process.argv.slice(2);
    
    if (args.includes('--help') || args.includes('-h')) {
        console.log(`
Usage: node build.js [options]

Options:
  --win     Build for Windows only
  --mac     Build for macOS only (only on macOS)
  --linux   Build for Linux only
  --help    Show this help

Examples:
  node build.js              Build for current platform
  node build.js --win        Build for Windows only
  node build.js --win --linux Build for Windows and Linux
        `);
        process.exit(0);
    }
    
    // Run build
    build();
}

module.exports = { build };