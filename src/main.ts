import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import started from 'electron-squirrel-startup';
import dotenv from 'dotenv';
import sqlite3 from 'sqlite3';

dotenv.config();

// Database setup
const dbDir = path.join(app.getAppPath(), 'db');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}
const dbPath = path.join(dbDir, 'stock.db');
const db = new sqlite3.Database(dbPath);

const initDatabase = () => {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS stocks (
      code TEXT PRIMARY KEY,
      name TEXT,
      listCount TEXT,
      auditInfo TEXT,
      regDay TEXT,
      lastPrice TEXT,
      state TEXT,
      marketCode TEXT,
      marketName TEXT,
      upName TEXT,
      upSizeName TEXT,
      companyClassName TEXT,
      orderWarning TEXT,
      nxtEnable TEXT
    )`);
  });
};

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
  // mainWindow.webContents.openDevTools();

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
app.on('ready', () => {
  createWindow();
  initDatabase();
});

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

// IPC handler for revoking token
ipcMain.handle('revoke-token', async (event, { appkey, secretkey, token }) => {
  try {
    const KIWOOM_API_URL = 'https://api.kiwoom.com/oauth2/revoke';

    const response = await fetch(KIWOOM_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        'api-id': 'au10002',
        'authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        appkey: appkey || process.env.APPKEY,
        secretkey: secretkey || process.env.SECRETKEY,
        token: token,
      }),
    });

    const data = await response.json();

    if (response.ok && data.return_code === 0) {
      console.log('Token revoked:', data);
      return { success: true, message: data.return_msg };
    } else {
      console.error('Token revocation failed:', data);
      return { success: false, message: data.return_msg || 'Unknown error' };
    }
  } catch (error) {
    console.error('Error during token revocation:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, message: errorMessage };
  }
});

// IPC handler for getting stock list
ipcMain.handle('get-stock-list', async (event, { mrkt_tp, token }) => {
  try {
    const KIWOOM_API_URL = 'https://api.kiwoom.com/api/dostk/stkinfo';

    const response = await fetch(KIWOOM_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        'api-id': 'ka10099',
        'authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        mrkt_tp: mrkt_tp,
      }),
    });

    const data = await response.json();

    if (response.ok && data.return_code === 0) {
      const stocks = data.list;
      // Save to database
      const stmt = db.prepare("INSERT OR REPLACE INTO stocks VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
      stocks.forEach((stock: any) => {
        stmt.run(
          stock.code,
          stock.name,
          stock.listCount,
          stock.auditInfo,
          stock.regDay,
          stock.lastPrice,
          stock.state,
          stock.marketCode,
          stock.marketName,
          stock.upName,
          stock.upSizeName,
          stock.companyClassName,
          stock.orderWarning,
          stock.nxtEnable
        );
      });
      stmt.finalize();
      return { success: true, list: stocks };
    } else {
      return { success: false, message: data.return_msg || 'Unknown error' };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, message: errorMessage };
  }
});
