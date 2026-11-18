const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let mainWindow = null;
let standalone916Window = null;
let activeTikTokConnection = null;
let activeTikTokUsername = '';
let activeTikTokReconnectTimer = null;
let tikTokRetryAttempt = 0;
let isAppQuitting = false;

function broadcastTikTokEvent(payload) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('tiktok-live-event', payload);
  }
  if (standalone916Window && !standalone916Window.isDestroyed()) {
    standalone916Window.webContents.send('tiktok-live-event', payload);
  }
}

function cleanupNativeTikTokConnection() {
  if (activeTikTokReconnectTimer) {
    clearTimeout(activeTikTokReconnectTimer);
    activeTikTokReconnectTimer = null;
  }
  if (activeTikTokConnection) {
    try {
      activeTikTokConnection.removeAllListeners &&
        activeTikTokConnection.removeAllListeners();
      activeTikTokConnection.disconnect();
    } catch {
      // ignore disconnect error
    }
    activeTikTokConnection = null;
  }
}

function scheduleNativeTikTokReconnect(cleanUsername, reason) {
  if (isAppQuitting || activeTikTokUsername !== cleanUsername || activeTikTokReconnectTimer) {
    return;
  }
  tikTokRetryAttempt += 1;
  const delayMs = Math.min(10000, 2500 + tikTokRetryAttempt * 1500);
  broadcastTikTokEvent({
    event: 'status',
    status: 'reconnecting',
    username: cleanUsername,
    retryInMs: delayMs,
    message: reason || 'Verbindung unterbrochen – verbinde automatisch neu...',
  });
  activeTikTokReconnectTimer = setTimeout(() => {
    activeTikTokReconnectTimer = null;
    if (!isAppQuitting && activeTikTokUsername === cleanUsername) {
      connectNativeTikTokLive(cleanUsername, true);
    }
  }, delayMs);
}

function connectNativeTikTokLive(rawUsername, isRetry = false) {
  const cleanUsername = String(rawUsername || '').trim().replace(/^@+/, '');
  if (!cleanUsername) {
    activeTikTokUsername = '';
    cleanupNativeTikTokConnection();
    return;
  }

  if (!isRetry) {
    tikTokRetryAttempt = 0;
  }
  activeTikTokUsername = cleanUsername;
  cleanupNativeTikTokConnection();

  try {
    const {
      ControlEvent,
      TikTokLiveConnection,
      WebcastEvent,
    } = require('tiktok-live-connector');
    const conn = new TikTokLiveConnection(cleanUsername, {
      processInitialData: false,
      enableExtendedGiftInfo: true,
    });
    activeTikTokConnection = conn;

    conn.on(ControlEvent ? ControlEvent.CONNECTED : 'connected', (state) => {
      if (activeTikTokConnection !== conn || isAppQuitting) return;
      tikTokRetryAttempt = 0;
      broadcastTikTokEvent({
        event: 'status',
        status: 'connected',
        roomId: state && state.roomId ? state.roomId : '',
        username: cleanUsername,
      });
    });

    conn.on(ControlEvent ? ControlEvent.DISCONNECTED : 'disconnected', () => {
      if (activeTikTokConnection !== conn || isAppQuitting) return;
      scheduleNativeTikTokReconnect(
        cleanUsername,
        'Verbindung kurz unterbrochen – verbinde automatisch neu...'
      );
    });

    conn.on(ControlEvent ? ControlEvent.ERROR : 'error', (err) => {
      if (activeTikTokConnection !== conn || isAppQuitting) return;
      const msg = err && err.message ? err.message : 'TikTok Verbindungsfehler';
      if (msg.toLowerCase().includes('disconnect') || msg.toLowerCase().includes('websocket')) {
        scheduleNativeTikTokReconnect(cleanUsername, msg);
      }
    });

    conn.on(WebcastEvent ? WebcastEvent.STREAM_END : 'streamEnd', () => {
      if (activeTikTokConnection !== conn || isAppQuitting) return;
      scheduleNativeTikTokReconnect(
        cleanUsername,
        'Livestream pausiert – warte auf Reconnect...'
      );
    });

    conn
      .connect()
      .then((state) => {
        if (activeTikTokConnection !== conn || isAppQuitting) return;
        tikTokRetryAttempt = 0;
        broadcastTikTokEvent({
          event: 'status',
          status: 'connected',
          roomId: state && state.roomId ? state.roomId : '',
          username: cleanUsername,
        });
      })
      .catch((err) => {
        if (activeTikTokConnection !== conn || isAppQuitting) return;
        scheduleNativeTikTokReconnect(
          cleanUsername,
          err ? err.message : 'Wartet auf Livestream'
        );
      });

    conn.on(WebcastEvent ? WebcastEvent.CHAT : 'chat', (data) => {
      if (activeTikTokConnection !== conn) return;
      const nickname =
        (data && data.user && (data.user.nickname || data.user.uniqueId)) ||
        (data && (data.nickname || data.uniqueId)) ||
        'Zuschauer';
      const uniqueId =
        (data && data.user && data.user.uniqueId) ||
        (data && data.uniqueId) ||
        nickname;
      broadcastTikTokEvent({
        event: 'chat',
        data: {
          nickname,
          uniqueId,
          comment: (data && data.comment) || '',
        },
      });
    });

    conn.on(WebcastEvent ? WebcastEvent.GIFT : 'gift', (data) => {
      if (activeTikTokConnection !== conn) return;
      const giftType =
        data && data.giftDetails && data.giftDetails.giftType !== undefined
          ? data.giftDetails.giftType
          : data && data.giftType;
      if (giftType === 1 && !(data && data.repeatEnd)) return;
      const nickname =
        (data && data.user && (data.user.nickname || data.user.uniqueId)) ||
        (data && (data.nickname || data.uniqueId)) ||
        'Spender';
      const uniqueId =
        (data && data.user && data.user.uniqueId) ||
        (data && data.uniqueId) ||
        nickname;
      const diamondCount = Number(
        (data && data.giftDetails && data.giftDetails.diamondCount) ||
          (data && data.diamondCount) ||
          1
      );
      broadcastTikTokEvent({
        event: 'gift',
        data: {
          nickname,
          uniqueId,
          diamondCount,
          repeatCount: Number((data && data.repeatCount) || 1),
          giftName:
            (data && data.giftDetails && data.giftDetails.giftName) ||
            (data && data.giftName) ||
            'Gift',
        },
      });
    });

    conn.on(WebcastEvent ? WebcastEvent.LIKE : 'like', (data) => {
      if (activeTikTokConnection !== conn) return;
      const nickname =
        (data && data.user && (data.user.nickname || data.user.uniqueId)) ||
        (data && (data.nickname || data.uniqueId)) ||
        'Zuschauer';
      const uniqueId =
        (data && data.user && data.user.uniqueId) ||
        (data && data.uniqueId) ||
        nickname;
      broadcastTikTokEvent({
        event: 'like',
        data: {
          nickname,
          uniqueId,
          likeCount: Number((data && data.likeCount) || 1),
        },
      });
    });
  } catch (err) {
    scheduleNativeTikTokReconnect(
      cleanUsername,
      err ? err.message : 'TikTok Connector Fehler'
    );
  }
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 920,
    minWidth: 540,
    minHeight: 780,
    title: 'BEAST ARENA LIVE: Löwen-Clan vs. Wolfs-Rudel',
    backgroundColor: '#070605',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
  mainWindow.loadFile(indexPath);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createStandalone916Window() {
  if (standalone916Window && !standalone916Window.isDestroyed()) {
    standalone916Window.focus();
    return;
  }

  standalone916Window = new BrowserWindow({
    width: 540,
    height: 960,
    minWidth: 405,
    minHeight: 720,
    title: 'BEAST ARENA LIVE (9:16 Stream-Fenster)',
    backgroundColor: '#070605',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
  standalone916Window.loadFile(indexPath, {
    query: { autostart: '1', standalone: '1' },
  });

  standalone916Window.on('closed', () => {
    standalone916Window = null;
  });
}

ipcMain.on('open-standalone-916-window', () => {
  createStandalone916Window();
});

ipcMain.on('connect-tiktok-live', (_event, username) => {
  connectNativeTikTokLive(username);
});

app.whenReady().then(() => {
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  isAppQuitting = true;
  cleanupNativeTikTokConnection();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
