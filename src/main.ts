import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import dotenv from 'dotenv';

dotenv.config();

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, // Enable context isolation
      nodeIntegration: false, // Disable Node.js integration
    },
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }

  // Open the DevTools.
  mainWindow.webContents.openDevTools();

  // Send environment variables to the renderer process
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.send('env-vars', {
      appkey: process.env.APPKEY,
      secretkey: process.env.SECRETKEY,
    });
  });
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC handler for login
ipcMain.handle('login', async (event, { appkey, secretkey }) => {
  try {
    const KIWOOM_API_URL = 'https://api.kiwoom.com/oauth2/token'; // From au10001_접근토큰_발급.md

    const response = await fetch(KIWOOM_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        'api-id': 'au10001',
      },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        appkey: appkey || process.env.APPKEY,
        secretkey: secretkey || process.env.SECRETKEY,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      // Store the token securely (e.g., in memory for this example)
      // In a real application, you might want to use electron-store or similar for persistence
      console.log('Access Token:', data.token);
      return { success: true, token: data.token };
    } else {
      console.error('Login failed:', data);
      return { success: false, message: data.return_msg || 'Unknown error' };
    }
  } catch (error) {
    console.error('Error during login:', error);
    return { success: false, message: error.message };
  }
});
