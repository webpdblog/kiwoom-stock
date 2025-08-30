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
    width: 1200,
    height: 800,
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
      appkey: process.env.APP_KEY,
      secretkey: process.env.SECRET_KEY,
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
        appkey: appkey || process.env.APP_KEY,
        secretkey: secretkey || process.env.SECRET_KEY,
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
        appkey: appkey || process.env.APP_KEY,
        secretkey: secretkey || process.env.SECRET_KEY,
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

// IPC handler for searching stocks
ipcMain.handle('search-stocks', async (event, { term }) => {
  return new Promise((resolve, reject) => {
    if (!term) {
      return resolve([]);
    }
    db.all(
      "SELECT code, name FROM stocks WHERE name LIKE ? OR code LIKE ? LIMIT 10",
      [`${term}%`, `${term}%`],
      (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      }
    );
  });
});

// IPC handler for getting basic stock info
ipcMain.handle('get-stock-info', async (event, { query, token }) => {
  try {
    let stk_cd = query;
    // If query is not a 6-digit number, assume it's a name and look up the code
    if (!/^\d{6}$/.test(query)) {
      const row: { code: string } | undefined = await new Promise((resolve, reject) => {
        db.get("SELECT code FROM stocks WHERE name = ?", [query], (err, row) => {
          if (err) reject(err);
          else resolve(row as { code: string });
        });
      });
      if (row) {
        stk_cd = row.code;
      } else {
        return { success: false, message: `Stock not found for name: ${query}` };
      }
    }

    const KIWOOM_API_URL = 'https://api.kiwoom.com/api/dostk/stkinfo';

    const response = await fetch(KIWOOM_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        'api-id': 'ka10001',
        'authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        stk_cd: stk_cd,
      }),
    });

    const data = await response.json();

    if (response.ok && data.return_code === 0) {
      return { success: true, info: data };
    } else {
      return { success: false, message: data.return_msg || 'Unknown error' };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, message: errorMessage };
  }
});

// IPC handler for getting trading members
ipcMain.handle('get-trading-members', async (event, { code, token }) => {
  try {
    const KIWOOM_API_URL = 'https://api.kiwoom.com/api/dostk/stkinfo';

    const response = await fetch(KIWOOM_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        'api-id': 'ka10002',
        'authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        stk_cd: code,
      }),
    });

    const data = await response.json();

    if (response.ok && data.return_code === 0) {
      const sell = [];
      const buy = [];

      for (let i = 1; i <= 5; i++) {
        if (data[`sel_trde_ori_nm_${i}`]) {
          sell.push({
            member: data[`sel_trde_ori_nm_${i}`],
            volume: parseInt(data[`sel_trde_qty_${i}`] || '0').toLocaleString(),
          });
        }
        if (data[`buy_trde_ori_nm_${i}`]) {
          buy.push({
            member: data[`buy_trde_ori_nm_${i}`],
            volume: parseInt(data[`buy_trde_qty_${i}`] || '0').toLocaleString(),
          });
        }
      }
      
      // The ka10002 API does not provide a specific field for "외국계추정합".
      // This needs to be calculated separately if required.

      return { success: true, data: { sell, buy } };
    } else {
      return { success: false, message: data.return_msg || 'Unknown error' };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, message: errorMessage };
  }
});

// IPC handler for getting stock quotes
ipcMain.handle('get-stock-quotes', async (event, { code, token }) => {
  try {
    const KIWOOM_API_URL = 'https://api.kiwoom.com/api/dostk/mrkcond';

    const response = await fetch(KIWOOM_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        'api-id': 'ka10004',
        'authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        stk_cd: code,
      }),
    });

    const data = await response.json();

    if (response.ok && data.return_code === 0) {
      return { success: true, quote: data };
    } else {
      return { success: false, message: data.return_msg || 'Unknown error' };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, message: errorMessage };
  }
});

// IPC handler for getting stock history
ipcMain.handle('get-stock-history', async (event, { code, token }) => {
  try {
    const KIWOOM_API_URL = 'https://api.kiwoom.com/api/dostk/mrkcond'; // As per documentation, but might be incorrect given the error

    const response = await fetch(KIWOOM_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        'api-id': 'ka10005',
        'authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        stk_cd: code,
      }),
    });

    const data = await response.json();

    if (response.ok && data.return_code === 0) {
      return { success: true, history: data.stk_ddwkmm };
    } else {
      return { success: false, message: data.return_msg || 'Unknown error' };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, message: errorMessage };
  }
});

// IPC handler for getting stock minute data
ipcMain.handle('get-stock-minute-data', async (event, { code, token }) => {
  try {
    const KIWOOM_API_URL = 'https://api.kiwoom.com/api/dostk/mrkcond'; // As per documentation, still suspicious

    const response = await fetch(KIWOOM_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        'api-id': 'ka10006',
        'authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        stk_cd: code,
      }),
    });

    const data = await response.json();

    if (response.ok && data.return_code === 0) {
      return { success: true, minuteData: data };
    } else {
      return { success: false, message: data.return_msg || 'Unknown error' };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, message: errorMessage };
  }
});

// IPC handler for getting market price information
ipcMain.handle('get-market-price-info', async (event, { code, token }) => {
  try {
    const KIWOOM_API_URL = 'https://api.kiwoom.com/api/dostk/mrkcond'; // As per documentation, still suspicious

    const response = await fetch(KIWOOM_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        'api-id': 'ka10007',
        'authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        stk_cd: code,
      }),
    });

    const data = await response.json();

    if (response.ok && data.return_code === 0) {
      return { success: true, info: data };
    } else {
      return { success: false, message: data.return_msg || 'Unknown error' };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, message: errorMessage };
  }
});

// IPC handler for getting foreign trading trend
ipcMain.handle('get-foreign-trading-trend', async (event, { code, token }) => {
  try {
    const KIWOOM_API_URL = 'https://api.kiwoom.com/api/dostk/frgnistt';

    const response = await fetch(KIWOOM_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        'api-id': 'ka10008',
        'authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        stk_cd: code,
      }),
    });

    const data = await response.json();

    if (response.ok && data.return_code === 0) {
      return { success: true, trendData: data.stk_frgnr };
    } else {
      return { success: false, message: data.return_msg || 'Unknown error' };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, message: errorMessage };
  }
});

// IPC handler for getting institution trading data
ipcMain.handle('get-institution-trading-data', async (event, { code, token }) => {
  try {
    const KIWOOM_API_URL = 'https://api.kiwoom.com/api/dostk/frgnistt'; // As per documentation, still suspicious

    const response = await fetch(KIWOOM_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        'api-id': 'ka10009',
        'authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        stk_cd: code,
      }),
    });

    const data = await response.json();

    if (response.ok && data.return_code === 0) {
      return { success: true, institutionData: data };
    } else {
      return { success: false, message: data.return_msg || 'Unknown error' };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, message: errorMessage };
  }
});

// IPC handler for getting sector program trading data
ipcMain.handle('get-sector-program-data', async (event, { code, token }) => {
  try {
    const KIWOOM_API_URL = 'https://api.kiwoom.com/api/dostk/sect';

    const response = await fetch(KIWOOM_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        'api-id': 'ka10010',
        'authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        stk_cd: code,
      }),
    });

    const data = await response.json();

    if (response.ok && data.return_code === 0) {
      return { success: true, programData: data };
    } else {
      return { success: false, message: data.return_msg || 'Unknown error' };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, message: errorMessage };
  }
});

// IPC handler for getting rights offering market data
ipcMain.handle('get-rights-offering-data', async (event, { type, token }) => {
  try {
    const KIWOOM_API_URL = 'https://api.kiwoom.com/api/dostk/mrkcond';

    const response = await fetch(KIWOOM_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        'api-id': 'ka10011',
        'authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        newstk_recvrht_tp: type,
      }),
    });

    const data = await response.json();

    if (response.ok && data.return_code === 0) {
      return { success: true, rightsData: data.newstk_recvrht_mrpr || [] };
    } else {
      return { success: false, message: data.return_msg || 'Unknown error' };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, message: errorMessage };
  }
});

// IPC handler for getting credit trading trend data
ipcMain.handle('get-credit-trading-trend', async (event, { code, date, queryType, token }) => {
  try {
    const KIWOOM_API_URL = 'https://api.kiwoom.com/api/dostk/stkinfo';

    const response = await fetch(KIWOOM_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        'api-id': 'ka10013',
        'authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        stk_cd: code,
        dt: date,
        qry_tp: queryType,
      }),
    });

    const data = await response.json();

    if (response.ok && data.return_code === 0) {
      return { success: true, trendData: data.crd_trde_trend || [] };
    } else {
      return { success: false, message: data.return_msg || 'Unknown error' };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, message: errorMessage };
  }
});

// IPC handler for getting short selling trend data
ipcMain.handle('get-short-selling-trend', async (event, { code, timeType, startDate, endDate, token }) => {
  try {
    const KIWOOM_API_URL = 'https://api.kiwoom.com/api/dostk/shsa';

    const response = await fetch(KIWOOM_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        'api-id': 'ka10014',
        'authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        stk_cd: code,
        tm_tp: timeType,
        strt_dt: startDate,
        end_dt: endDate,
      }),
    });

    const data = await response.json();

    if (response.ok && data.return_code === 0) {
      return { success: true, shortSellingData: data.shrts_trnsn || [] };
    } else {
      return { success: false, message: data.return_msg || 'Unknown error' };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, message: errorMessage };
  }
});

// IPC handler for getting daily trading details
ipcMain.handle('get-daily-trading-details', async (event, { code, startDate, token }) => {
  try {
    const KIWOOM_API_URL = 'https://api.kiwoom.com/api/dostk/stkinfo';

    const response = await fetch(KIWOOM_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        'api-id': 'ka10015',
        'authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        stk_cd: code,
        strt_dt: startDate,
      }),
    });

    const data = await response.json();

    if (response.ok && data.return_code === 0) {
      return { success: true, dailyTradingData: data.daly_trde_dtl || [] };
    } else {
      return { success: false, message: data.return_msg || 'Unknown error' };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, message: errorMessage };
  }
});

// IPC handler for getting new/high-low price data
ipcMain.handle('get-new-high-low-data', async (event, { marketType, newHighLowType, highLowCloseType, stockCondition, tradeQtyType, creditCondition, upDownInclude, period, exchangeType, token }) => {
  try {
    const KIWOOM_API_URL = 'https://api.kiwoom.com/api/dostk/stkinfo';

    const response = await fetch(KIWOOM_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        'api-id': 'ka10016',
        'authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        mrkt_tp: marketType,
        ntl_tp: newHighLowType,
        high_low_close_tp: highLowCloseType,
        stk_cnd: stockCondition,
        trde_qty_tp: tradeQtyType,
        crd_cnd: creditCondition,
        updown_incls: upDownInclude,
        dt: period,
        stex_tp: exchangeType,
      }),
    });

    const data = await response.json();

    if (response.ok && data.return_code === 0) {
      return { success: true, newHighLowData: data.ntl_pric || [] };
    } else {
      return { success: false, message: data.return_msg || 'Unknown error' };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, message: errorMessage };
  }
});

// IPC handler for getting upper/lower limit price data
ipcMain.handle('get-upper-lower-limit-data', async (event, { marketType, upDownType, sortType, stockCondition, tradeQtyType, creditCondition, tradeGoldType, exchangeType, token }) => {
  try {
    const KIWOOM_API_URL = 'https://api.kiwoom.com/api/dostk/stkinfo';

    const response = await fetch(KIWOOM_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        'api-id': 'ka10017',
        'authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        mrkt_tp: marketType,
        updown_tp: upDownType,
        sort_tp: sortType,
        stk_cnd: stockCondition,
        trde_qty_tp: tradeQtyType,
        crd_cnd: creditCondition,
        trde_gold_tp: tradeGoldType,
        stex_tp: exchangeType,
      }),
    });

    const data = await response.json();

    if (response.ok && data.return_code === 0) {
      return { success: true, upperLowerLimitData: data.updown_pric || [] };
    } else {
      return { success: false, message: data.return_msg || 'Unknown error' };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, message: errorMessage };
  }
});

// IPC handler for getting high-low price approach data
ipcMain.handle('get-high-low-approach-data', async (event, { highLowType, approachRate, marketType, tradeQtyType, stockCondition, creditCondition, exchangeType, token }) => {
  try {
    const KIWOOM_API_URL = 'https://api.kiwoom.com/api/dostk/stkinfo';

    const response = await fetch(KIWOOM_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        'api-id': 'ka10018',
        'authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        high_low_tp: highLowType,
        alacc_rt: approachRate,
        mrkt_tp: marketType,
        trde_qty_tp: tradeQtyType,
        stk_cnd: stockCondition,
        crd_cnd: creditCondition,
        stex_tp: exchangeType,
      }),
    });

    const data = await response.json();

    if (response.ok && data.return_code === 0) {
      return { success: true, highLowApproachData: data.high_low_pric_alacc || [] };
    } else {
      return { success: false, message: data.return_msg || 'Unknown error' };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, message: errorMessage };
  }
});

// IPC handler for getting price surge/plunge data
ipcMain.handle('get-price-surge-plunge-data', async (event, { marketType, fluctuationType, timeType, time, tradeQtyType, stockCondition, creditCondition, priceCondition, upDownInclude, exchangeType, token }) => {
  try {
    const KIWOOM_API_URL = 'https://api.kiwoom.com/api/dostk/stkinfo';

    const response = await fetch(KIWOOM_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        'api-id': 'ka10019',
        'authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        mrkt_tp: marketType,
        flu_tp: fluctuationType,
        tm_tp: timeType,
        tm: time,
        trde_qty_tp: tradeQtyType,
        stk_cnd: stockCondition,
        crd_cnd: creditCondition,
        pric_cnd: priceCondition,
        updown_incls: upDownInclude,
        stex_tp: exchangeType,
      }),
    });

    const data = await response.json();

    if (response.ok && data.return_code === 0) {
      return { success: true, priceSurgePlungeData: data.pric_jmpflu || [] };
    } else {
      return { success: false, message: data.return_msg || 'Unknown error' };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, message: errorMessage };
  }
});
