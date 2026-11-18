import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import {
  ControlEvent,
  TikTokLiveConnection,
  WebcastEvent,
} from 'tiktok-live-connector';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // Real TikTok Live SSE Stream Endpoint using tiktok-live-connector with automatic reconnect
  app.get('/api/tiktok/stream', (req, res) => {
    const rawUsername = String(req.query.username || '').trim().replace(/^@+/, '');
    if (!rawUsername) {
      res.status(400).json({ error: 'Missing TikTok username' });
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    let closed = false;
    let retryAttempt = 0;
    let reconnectTimer: NodeJS.Timeout | null = null;
    let currentConnection: TikTokLiveConnection | null = null;

    const sendEvent = (payload: Record<string, unknown>) => {
      if (closed) return;
      try {
        res.write(`data: ${JSON.stringify(payload)}\n\n`);
      } catch {
        // ignore write errors after close
      }
    };

    const cleanupCurrentConnection = () => {
      if (currentConnection) {
        try {
          currentConnection.removeAllListeners?.();
          currentConnection.disconnect();
        } catch {
          // ignore disconnect errors
        }
        currentConnection = null;
      }
    };

    const scheduleReconnect = (reason: string) => {
      if (closed || reconnectTimer) return;
      retryAttempt += 1;
      const delayMs = Math.min(10000, 2500 + retryAttempt * 1500);
      sendEvent({
        event: 'status',
        status: 'reconnecting',
        username: rawUsername,
        retryInMs: delayMs,
        message: reason,
      });
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        if (!closed) {
          connectToTikTok();
        }
      }, delayMs);
    };

    const connectToTikTok = () => {
      if (closed) return;
      cleanupCurrentConnection();

      const conn = new TikTokLiveConnection(rawUsername, {
        processInitialData: false,
        enableExtendedGiftInfo: true,
      });
      currentConnection = conn;

      conn.on(ControlEvent.CONNECTED, (state: { roomId?: string }) => {
        if (closed || currentConnection !== conn) return;
        retryAttempt = 0;
        sendEvent({
          event: 'status',
          status: 'connected',
          roomId: state?.roomId || '',
          username: rawUsername,
        });
      });

      conn.on(ControlEvent.DISCONNECTED, () => {
        if (closed || currentConnection !== conn) return;
        scheduleReconnect('Verbindung kurz unterbrochen – verbinde automatisch neu...');
      });

      conn.on(ControlEvent.ERROR, (err: Error) => {
        if (closed || currentConnection !== conn) return;
        const msg = err?.message || 'TikTok-Verbindungsfehler';
        // Only trigger reconnect if not already scheduled; some errors are fatal stream drops
        if (msg.toLowerCase().includes('disconnect') || msg.toLowerCase().includes('websocket')) {
          scheduleReconnect(msg);
        }
      });

      conn.on(WebcastEvent.CHAT, (data: any) => {
        if (closed || currentConnection !== conn) return;
        const nickname =
          data?.user?.nickname ||
          data?.user?.uniqueId ||
          data?.nickname ||
          data?.uniqueId ||
          'Zuschauer';
        const uniqueId = data?.user?.uniqueId || data?.uniqueId || nickname;
        sendEvent({
          event: 'chat',
          data: {
            nickname,
            uniqueId,
            comment: data?.comment || '',
          },
        });
      });

      conn.on(WebcastEvent.GIFT, (data: any) => {
        if (closed || currentConnection !== conn) return;
        const giftType = data?.giftDetails?.giftType ?? data?.giftType;
        // Wait until streak ends for streakable gifts (giftType === 1) so coins aren't double-counted
        if (giftType === 1 && !data?.repeatEnd) {
          return;
        }
        const nickname =
          data?.user?.nickname ||
          data?.user?.uniqueId ||
          data?.nickname ||
          data?.uniqueId ||
          'Spender';
        const uniqueId = data?.user?.uniqueId || data?.uniqueId || nickname;
        const diamondCount = Number(
          data?.giftDetails?.diamondCount ?? data?.diamondCount ?? 1
        );
        const repeatCount = Number(data?.repeatCount ?? 1);
        const giftName =
          data?.giftDetails?.giftName || data?.giftName || 'Gift';

        sendEvent({
          event: 'gift',
          data: {
            nickname,
            uniqueId,
            diamondCount,
            repeatCount,
            giftName,
          },
        });
      });

      conn.on(WebcastEvent.LIKE, (data: any) => {
        if (closed || currentConnection !== conn) return;
        const nickname =
          data?.user?.nickname ||
          data?.user?.uniqueId ||
          data?.nickname ||
          data?.uniqueId ||
          'Zuschauer';
        const uniqueId = data?.user?.uniqueId || data?.uniqueId || nickname;
        sendEvent({
          event: 'like',
          data: {
            nickname,
            uniqueId,
            likeCount: Number(data?.likeCount ?? 1),
          },
        });
      });

      conn.on(WebcastEvent.STREAM_END, () => {
        if (closed || currentConnection !== conn) return;
        scheduleReconnect('Livestream beendet oder unterbrochen – warte auf Reconnect...');
      });

      conn
        .connect()
        .then((state: { roomId?: string }) => {
          if (closed || currentConnection !== conn) return;
          retryAttempt = 0;
          sendEvent({
            event: 'status',
            status: 'connected',
            roomId: state?.roomId || '',
            username: rawUsername,
          });
        })
        .catch((err: Error) => {
          if (closed || currentConnection !== conn) return;
          scheduleReconnect(
            err?.message || 'TikTok Live noch nicht aktiv – erneuter Verbindungsversuch...'
          );
        });
    };

    connectToTikTok();

    const keepAliveTimer = setInterval(() => {
      if (!closed) {
        try {
          res.write(': keepalive\n\n');
        } catch {
          // ignore write errors
        }
      }
    }, 15000);

    req.on('close', () => {
      closed = true;
      clearInterval(keepAliveTimer);
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      cleanupCurrentConnection();
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*all', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Beast Arena Live Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
