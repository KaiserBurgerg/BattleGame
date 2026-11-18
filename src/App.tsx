import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArenaMapId,
  ArenaWorldState,
  CoinTier,
  DonorRecord,
  EventBannerItem,
  GameState,
  LayoutMode,
  PodiumEntry,
  TeamId,
  TeamState,
  TikTokEventType,
  VictoryCelebrationState,
} from './game/types';
import {
  RAGE_PER_TAP,
  addTeamRage,
  createInitialWorldState,
  getTopPodiumViewers,
  normalizeCoinTier,
  normalizeTeamInput,
  registerViewerTeam,
  resetAllGameState,
  resetRoundState,
  resolveViewerTeam,
  spawnMeatDrop,
  spawnPackPupBot,
  spawnUnitByCoinTier,
  stepArenaSimulation,
} from './game/rules';
import { renderArenaFrame } from './game/renderer';
import { audioEngine } from './game/audio';
import { TopHeader } from './components/TopHeader';
import { CommandBoard } from './components/CommandBoard';
import { StreamerControls } from './components/StreamerControls';
import { TitleAndStatusModals } from './components/TitleAndStatusModals';

const DEMO_VIEWER_NAMES = [
  'Lukas',
  'Max_99',
  'Leon_TV',
  'Sarah_Live',
  'Finn_Wolf',
  'Mia_Queen',
];

export default function App() {
  const searchParams =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search)
      : null;
  const isAutostart = searchParams?.get('autostart') === '1';
  const initialStandalone = searchParams?.get('standalone') === '1';

  const [gameState, setGameState] = useState<GameState>(
    isAutostart ? 'playing' : 'title'
  );
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('9:16');
  const [isStandalone916, setIsStandalone916] =
    useState<boolean>(initialStandalone);

  // TikTok Live Channel Name & Connection State
  const [tiktokChannel, setTiktokChannel] = useState<string>(() => {
    try {
      return localStorage.getItem('beast_arena_tiktok_channel') || '';
    } catch {
      return '';
    }
  });
  const [tiktokConnected, setTiktokConnected] = useState<boolean>(false);
  const [tiktokStatus, setTiktokStatus] = useState<
    'idle' | 'connecting' | 'connected' | 'reconnecting'
  >('idle');

  // Manual Streamer Test Controls
  const [viewerName, setViewerName] = useState<string>('Lukas');
  const [selectedTeam, setSelectedTeam] = useState<TeamId>('lion');

  // Rudel-Welpen Bots (nameless pack pups) ON by default; Fake human viewers OFF by default!
  const [pupBotsEnabled, setPupBotsEnabled] = useState<boolean>(true);
  const [fakeViewersEnabled, setFakeViewersEnabled] = useState<boolean>(false);

  const [sfxEnabled, setSfxEnabled] = useState<boolean>(true);
  const [ttsEnabled, setTtsEnabled] = useState<boolean>(true);

  // Compact 760x360 canvas aspect ratio fits the 36% middle arena perfectly without side cropping
  const worldRef = useRef<ArenaWorldState>(createInitialWorldState(760, 360));
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pupBotsEnabledRef = useRef<boolean>(pupBotsEnabled);
  pupBotsEnabledRef.current = pupBotsEnabled;
  const fakeViewersEnabledRef = useRef<boolean>(fakeViewersEnabled);
  fakeViewersEnabledRef.current = fakeViewersEnabled;
  const wsRef = useRef<WebSocket | null>(null);
  const sseRef = useRef<EventSource | null>(null);
  const sseReconnectTimerRef = useRef<number | null>(null);
  const wsReconnectTimerRef = useRef<number | null>(null);
  const activeTiktokChannelRef = useRef<string>('');
  const didAutoConnectOnBootRef = useRef<boolean>(false);

  const [hudState, setHudState] = useState<{
    lion: TeamState;
    wolf: TeamState;
    mvp: DonorRecord | null;
    roundNumber: number;
    mapId: ArenaMapId;
    activeBanner: EventBannerItem | null;
    winnerTeam: TeamId | null;
    victoryCelebration: VictoryCelebrationState | null;
    topPodium: PodiumEntry[];
    totalDamageDealt: Record<TeamId, number>;
    totalUnitsSpawned: Record<TeamId, number>;
    viewerTeams: Record<string, TeamId>;
    viewerLastChatSpawn: Record<string, number>;
    nowMs: number;
  }>(() => {
    const w = worldRef.current;
    return {
      lion: { ...w.teams.lion },
      wolf: { ...w.teams.wolf },
      mvp: w.mvp ? { ...w.mvp } : null,
      roundNumber: w.roundNumber,
      mapId: w.mapId,
      activeBanner: w.activeBanner ? { ...w.activeBanner } : null,
      winnerTeam: w.winnerTeam,
      victoryCelebration: w.victoryCelebration ? { ...w.victoryCelebration } : null,
      topPodium: getTopPodiumViewers(w, 3),
      totalDamageDealt: { ...w.totalDamageDealt },
      totalUnitsSpawned: { ...w.totalUnitsSpawned },
      viewerTeams: { ...w.viewerTeams },
      viewerLastChatSpawn: { ...w.viewerLastChatSpawn },
      nowMs: Date.now(),
    };
  });

  const syncHudFromWorld = useCallback(() => {
    const w = worldRef.current;
    setHudState({
      lion: { ...w.teams.lion },
      wolf: { ...w.teams.wolf },
      mvp: w.mvp ? { ...w.mvp } : null,
      roundNumber: w.roundNumber,
      mapId: w.mapId,
      activeBanner: w.activeBanner ? { ...w.activeBanner } : null,
      winnerTeam: w.winnerTeam,
      victoryCelebration: w.victoryCelebration ? { ...w.victoryCelebration } : null,
      topPodium: getTopPodiumViewers(w, 3),
      totalDamageDealt: { ...w.totalDamageDealt },
      totalUnitsSpawned: { ...w.totalUnitsSpawned },
      viewerTeams: { ...w.viewerTeams },
      viewerLastChatSpawn: { ...w.viewerLastChatSpawn },
      nowMs: Date.now(),
    });
    if (w.state !== gameState) {
      setGameState(w.state);
    }
  }, [gameState]);

  useEffect(() => {
    document.body.dataset.state = gameState;
    worldRef.current.state = gameState;
  }, [gameState]);

  // Seed ONLY nameless Rudel-Welpen (Löwen-Welpe & Wolfs-Welpe) on boot — NO fake viewer names!
  useEffect(() => {
    const w = worldRef.current;
    if (w.beasts.length === 0) {
      spawnPackPupBot(w, 'lion');
      spawnPackPupBot(w, 'lion');
      spawnPackPupBot(w, 'wolf');
      spawnPackPupBot(w, 'wolf');
      if (isAutostart) {
        w.state = 'playing';
      }
      syncHudFromWorld();
    }
  }, [isAutostart, syncHudFromWorld]);

  // Core Action Handlers — strictly respect the viewer's bound team if they wrote "1" or "2" & 15s cooldown!
  const handleChatChooseTeam = useCallback(
    (chosenTeam: TeamId, username: string) => {
      const w = worldRef.current;
      const cleanUser =
        username.trim() || (chosenTeam === 'lion' ? 'LöwenClan' : 'WolfsRudel');
      const effectiveTeam = registerViewerTeam(w, cleanUser, chosenTeam);
      setSelectedTeam(effectiveTeam);
      const spawned = spawnUnitByCoinTier(w, effectiveTeam, cleanUser, 0);
      if (spawned.length > 0) {
        audioEngine.playSpawnSound(0, effectiveTeam);
      }
      syncHudFromWorld();
    },
    [syncHudFromWorld]
  );

  const handleTriggerSpawn = useCallback(
    (fallbackTeam: TeamId, username: string, coins: CoinTier) => {
      const w = worldRef.current;
      const cleanUser =
        username.trim() || (fallbackTeam === 'lion' ? 'LöwenClan' : 'WolfsRudel');
      const effectiveTeam = resolveViewerTeam(w, cleanUser, fallbackTeam);
      const spawned = spawnUnitByCoinTier(w, effectiveTeam, cleanUser, coins);
      if (spawned.length > 0) {
        audioEngine.playSpawnSound(coins, effectiveTeam);
        if (coins >= 1) {
          audioEngine.announceCoinDonationDe(cleanUser, effectiveTeam, coins);
        }
      }
      syncHudFromWorld();
    },
    [syncHudFromWorld]
  );

  const handleTriggerHeal = useCallback(
    (fallbackTeam: TeamId, username: string) => {
      const w = worldRef.current;
      const cleanUser = username.trim();
      const effectiveTeam = resolveViewerTeam(w, cleanUser, fallbackTeam);
      spawnMeatDrop(w, effectiveTeam, cleanUser);
      audioEngine.playSpawnSound(0, effectiveTeam);
      syncHudFromWorld();
    },
    [syncHudFromWorld]
  );

  const handleTriggerRageBoost = useCallback(
    (fallbackTeam: TeamId, amount = 100, username?: string) => {
      const w = worldRef.current;
      const effectiveTeam = resolveViewerTeam(w, username || '', fallbackTeam);
      const activated = addTeamRage(w, effectiveTeam, amount, username);
      if (activated) {
        audioEngine.playThunderStrike();
      } else {
        audioEngine.playSpawnSound(1, effectiveTeam);
      }
      syncHudFromWorld();
    },
    [syncHudFromWorld]
  );

  // Parse incoming TikTok chat text ("1", "2", "!heilen") or gift payload
  const processIncomingTikTokPayload = useCallback(
    (payload: Record<string, unknown>) => {
      const eventType = String(payload.event || payload.type || '').toLowerCase();
      const data = (payload.data as Record<string, unknown>) || payload;
      const nickname = String(
        data.nickname || data.uniqueId || data.username || data.user || 'Zuschauer'
      );
      const comment = String(data.comment || data.text || data.message || '')
        .trim()
        .toLowerCase();

      if (worldRef.current.state === 'title') {
        worldRef.current.state = 'playing';
        setGameState('playing');
      }

      if (eventType === 'chat' || comment) {
        if (comment === '1' || comment.includes('löwe') || comment.includes('loewe')) {
          handleChatChooseTeam('lion', nickname);
        } else if (comment === '2' || comment.includes('wolf')) {
          handleChatChooseTeam('wolf', nickname);
        } else if (comment.includes('!heilen') || comment.includes('!heal')) {
          const fallback: TeamId = comment.includes('2') ? 'wolf' : 'lion';
          handleTriggerHeal(fallback, nickname);
        }
      } else if (eventType === 'like') {
        const likeCount = Math.max(1, Number(data.likeCount || 1));
        const fallback: TeamId = Math.random() < 0.5 ? 'lion' : 'wolf';
        handleTriggerRageBoost(fallback, likeCount * RAGE_PER_TAP, nickname);
      } else if (eventType === 'gift') {
        const diamondCount = Number(
          data.diamondCount || data.coins || data.giftCoins || 1
        );
        const repeatCount = Number(data.repeatCount || 1);
        const totalCoins = diamondCount * Math.max(1, repeatCount);
        const fallback: TeamId = data.team
          ? normalizeTeamInput(String(data.team))
          : Math.random() < 0.5
          ? 'lion'
          : 'wolf';
        handleTriggerSpawn(fallback, nickname, normalizeCoinTier(totalCoins));
      }
    },
    [handleChatChooseTeam, handleTriggerHeal, handleTriggerRageBoost, handleTriggerSpawn]
  );

  // Connect TikTok Channel Name with Automatic Reconnect for SSE, Electron IPC, and TikFinity WebSocket
  const handleConnectTiktokChannel = useCallback(
    (overrideChannel?: string) => {
      const clean = (overrideChannel ?? tiktokChannel).trim().replace(/^@+/, '');

      if (sseReconnectTimerRef.current !== null) {
        window.clearTimeout(sseReconnectTimerRef.current);
        sseReconnectTimerRef.current = null;
      }
      if (wsReconnectTimerRef.current !== null) {
        window.clearTimeout(wsReconnectTimerRef.current);
        wsReconnectTimerRef.current = null;
      }

      if (!clean) {
        activeTiktokChannelRef.current = '';
        setTiktokConnected(false);
        setTiktokStatus('idle');
        if (sseRef.current) {
          sseRef.current.close();
          sseRef.current = null;
        }
        if (wsRef.current) {
          wsRef.current.close();
          wsRef.current = null;
        }
        return;
      }

      activeTiktokChannelRef.current = clean;
      try {
        localStorage.setItem('beast_arena_tiktok_channel', clean);
      } catch {
        // ignore storage errors
      }
      setTiktokConnected(true);
      setTiktokStatus((prev) => (prev === 'connected' ? 'connected' : 'connecting'));

      const startSseStream = () => {
        if (activeTiktokChannelRef.current !== clean || typeof EventSource === 'undefined') {
          return;
        }
        try {
          if (sseRef.current) {
            sseRef.current.close();
            sseRef.current = null;
          }
          const sse = new EventSource(
            `/api/tiktok/stream?username=${encodeURIComponent(clean)}`
          );
          sse.onmessage = (evt) => {
            try {
              const parsed = JSON.parse(String(evt.data));
              if (parsed && parsed.event === 'status') {
                const st = String(parsed.status || '');
                if (st === 'connected') {
                  setTiktokConnected(true);
                  setTiktokStatus('connected');
                } else if (st === 'reconnecting' || st === 'waiting' || st === 'ended') {
                  setTiktokStatus('reconnecting');
                }
              } else if (parsed) {
                setTiktokConnected(true);
                setTiktokStatus('connected');
                processIncomingTikTokPayload(parsed);
              }
            } catch {
              // ignore non-json frames
            }
          };
          sse.onerror = () => {
            if (activeTiktokChannelRef.current !== clean) return;
            setTiktokStatus('reconnecting');
            // EventSource auto-retries CONNECTING, but if browser transitions to CLOSED we explicitly re-open
            if (sse.readyState === EventSource.CLOSED && sseReconnectTimerRef.current === null) {
              sse.close();
              sseReconnectTimerRef.current = window.setTimeout(() => {
                sseReconnectTimerRef.current = null;
                startSseStream();
              }, 3000);
            }
          };
          sseRef.current = sse;
        } catch {
          if (sseReconnectTimerRef.current === null) {
            sseReconnectTimerRef.current = window.setTimeout(() => {
              sseReconnectTimerRef.current = null;
              startSseStream();
            }, 3500);
          }
        }
      };

      const startTikFinityWs = () => {
        if (activeTiktokChannelRef.current !== clean || typeof WebSocket === 'undefined') {
          return;
        }
        try {
          if (wsRef.current) {
            wsRef.current.onclose = null;
            wsRef.current.close();
            wsRef.current = null;
          }
          const ws = new WebSocket(
            `ws://localhost:21213/?uniqueId=${encodeURIComponent(clean)}`
          );
          ws.onopen = () => {
            if (activeTiktokChannelRef.current !== clean) {
              ws.close();
              return;
            }
            setTiktokConnected(true);
            setTiktokStatus('connected');
            ws.send(JSON.stringify({ action: 'connect', uniqueId: clean }));
          };
          ws.onmessage = (evt) => {
            try {
              const parsed = JSON.parse(String(evt.data));
              setTiktokConnected(true);
              setTiktokStatus('connected');
              processIncomingTikTokPayload(parsed);
            } catch {
              // ignore non-json frames
            }
          };
          ws.onclose = () => {
            if (activeTiktokChannelRef.current !== clean) return;
            if (wsReconnectTimerRef.current === null) {
              wsReconnectTimerRef.current = window.setTimeout(() => {
                wsReconnectTimerRef.current = null;
                startTikFinityWs();
              }, 5000);
            }
          };
          ws.onerror = () => {
            // Handled cleanly by onclose auto-reconnect & primary SSE connector
          };
          wsRef.current = ws;
        } catch {
          // Fallback to direct tiktok-live-connector SSE / postMessage
        }
      };

      // 1. Standalone Windows .exe (Electron) native tiktok-live-connector with built-in auto-reconnect
      if (typeof window !== 'undefined' && window.electronAPI?.connectTikTokLive) {
        window.electronAPI.connectTikTokLive(clean);
      } else {
        // 2. Built-in server.ts tiktok-live-connector SSE stream with auto-reconnect
        startSseStream();
      }

      // 3. Optional local TikFinity / WebSocket bridge on port 21213 with auto-reconnect
      startTikFinityWs();
    },
    [processIncomingTikTokPayload, tiktokChannel]
  );

  const connectTiktokRef = useRef(handleConnectTiktokChannel);
  connectTiktokRef.current = handleConnectTiktokChannel;

  // Auto-connect saved TikTok channel on boot + instant recovery on browser 'online' + cleanup ONLY on unmount
  useEffect(() => {
    if (!didAutoConnectOnBootRef.current) {
      didAutoConnectOnBootRef.current = true;
      try {
        const saved = (localStorage.getItem('beast_arena_tiktok_channel') || '')
          .trim()
          .replace(/^@+/, '');
        if (saved) {
          connectTiktokRef.current(saved);
        }
      } catch {
        // ignore storage errors
      }
    }

    const onOnline = () => {
      const current = activeTiktokChannelRef.current;
      if (current) {
        connectTiktokRef.current(current);
      }
    };
    window.addEventListener('online', onOnline);

    return () => {
      window.removeEventListener('online', onOnline);
      activeTiktokChannelRef.current = '';
      if (sseReconnectTimerRef.current !== null) {
        window.clearTimeout(sseReconnectTimerRef.current);
        sseReconnectTimerRef.current = null;
      }
      if (wsReconnectTimerRef.current !== null) {
        window.clearTimeout(wsReconnectTimerRef.current);
        wsReconnectTimerRef.current = null;
      }
      if (sseRef.current) {
        sseRef.current.close();
        sseRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

  // Listen for native Electron tiktok-live-connector events & window postMessage events
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.data && typeof e.data === 'object') {
        processIncomingTikTokPayload(e.data as Record<string, unknown>);
      }
    };
    window.addEventListener('message', onMessage);

    let unsubscribeElectron: (() => void) | undefined;
    if (
      typeof window !== 'undefined' &&
      window.electronAPI?.onTikTokLiveEvent
    ) {
      unsubscribeElectron = window.electronAPI.onTikTokLiveEvent((payload) => {
        if (!payload) return;
        if (payload.event === 'status') {
          const st = String(payload.status || '');
          if (st === 'connected') {
            setTiktokConnected(true);
            setTiktokStatus('connected');
          } else if (st === 'reconnecting' || st === 'waiting' || st === 'ended') {
            setTiktokStatus('reconnecting');
          }
        } else {
          setTiktokConnected(true);
          setTiktokStatus('connected');
          processIncomingTikTokPayload(payload);
        }
      });
    }

    return () => {
      window.removeEventListener('message', onMessage);
      if (unsubscribeElectron) unsubscribeElectron();
    };
  }, [processIncomingTikTokPayload]);

  // Global window.triggerTikTokEvent(type, team, username, coins) API
  useEffect(() => {
    window.triggerTikTokEvent = (
      type: TikTokEventType,
      rawTeam: TeamId | 1 | 2 | '1' | '2' | 'loewe' | 'loewen',
      rawUsername = 'TikTokUser',
      rawCoins = 0
    ) => {
      const team = normalizeTeamInput(rawTeam);
      const user = String(rawUsername || 'TikTokUser');

      if (worldRef.current.state === 'title') {
        worldRef.current.state = 'playing';
        setGameState('playing');
      }

      if (type === 'chat_spawn' && Number(rawCoins || 0) === 0) {
        handleChatChooseTeam(team, user);
      } else if (type === 'heal') {
        handleTriggerHeal(team, user);
      } else if (type === 'like' || type === 'rage_boost') {
        const taps = Math.max(1, Number(rawCoins || 1));
        handleTriggerRageBoost(
          team,
          type === 'rage_boost' ? 100 : taps * RAGE_PER_TAP,
          user
        );
      } else if (type === 'gift') {
        const tier = normalizeCoinTier(Number(rawCoins) || 1);
        handleTriggerSpawn(team, user, tier);
      } else {
        handleTriggerSpawn(team, user, normalizeCoinTier(Number(rawCoins) || 0));
      }
    };

    return () => {
      delete window.triggerTikTokEvent;
    };
  }, [
    handleChatChooseTeam,
    handleTriggerHeal,
    handleTriggerRageBoost,
    handleTriggerSpawn,
  ]);

  // Game State Transitions
  const handleStartOrResume = useCallback(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    if (tiktokChannel.trim()) {
      handleConnectTiktokChannel();
    }
    worldRef.current.state = 'playing';
    document.body.dataset.state = 'playing';
    setGameState('playing');
    syncHudFromWorld();
  }, [handleConnectTiktokChannel, syncHudFromWorld, tiktokChannel]);

  const handleRestartRound = useCallback(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    const w = worldRef.current;
    w.roundNumber += 1;
    resetRoundState(w);
    w.state = 'playing';
    document.body.dataset.state = 'playing';
    setGameState('playing');
    spawnPackPupBot(w, 'lion');
    spawnPackPupBot(w, 'lion');
    spawnPackPupBot(w, 'wolf');
    spawnPackPupBot(w, 'wolf');
    syncHudFromWorld();
  }, [syncHudFromWorld]);

  // Complete Reset Button ("Alles Neustarten") — resets wins, round 1, HP, MVP, and viewer team bindings
  const handleResetAll = useCallback(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    const w = worldRef.current;
    resetAllGameState(w);
    w.state = 'playing';
    document.body.dataset.state = 'playing';
    setGameState('playing');
    spawnPackPupBot(w, 'lion');
    spawnPackPupBot(w, 'lion');
    spawnPackPupBot(w, 'wolf');
    spawnPackPupBot(w, 'wolf');
    syncHudFromWorld();
  }, [syncHudFromWorld]);

  // Toggle Standalone 9:16 Window Mode + Electron Native 9:16 Window IPC
  const handleToggleStandalone916 = useCallback(() => {
    if (
      typeof window !== 'undefined' &&
      window.electronAPI?.openStandalone916Window
    ) {
      window.electronAPI.openStandalone916Window();
    }
    setLayoutMode('9:16');
    setIsStandalone916((prev) => !prev);
  }, []);

  const handleReturnToTitle = useCallback(() => {
    worldRef.current.state = 'title';
    document.body.dataset.state = 'title';
    setGameState('title');
    syncHudFromWorld();
  }, [syncHudFromWorld]);

  // Keyboard Listeners
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInputFocused =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);

      if (worldRef.current.state === 'title') {
        if (!isInputFocused && (e.code === 'Enter' || e.code === 'Space')) {
          e.preventDefault();
          handleStartOrResume();
        }
        return;
      }

      if (e.code === 'Escape' || (!isInputFocused && e.code === 'KeyP')) {
        e.preventDefault();
        if (worldRef.current.state === 'playing') {
          worldRef.current.state = 'paused';
          setGameState('paused');
        } else if (worldRef.current.state === 'paused') {
          handleStartOrResume();
        }
        return;
      }

      if (isInputFocused || worldRef.current.state !== 'playing') return;

      if (e.key === '1') {
        handleChatChooseTeam('lion', viewerName);
      } else if (e.key === '2') {
        handleChatChooseTeam('wolf', viewerName);
      } else if (e.code === 'KeyH') {
        handleTriggerHeal(selectedTeam, viewerName);
      } else if (e.code === 'KeyW') {
        handleTriggerRageBoost(selectedTeam, 100, viewerName);
      } else if (e.code === 'KeyR') {
        handleResetAll();
      } else if (e.code === 'KeyM') {
        setSfxEnabled((prev) => {
          audioEngine.sfxEnabled = !prev;
          return !prev;
        });
      } else if (e.code === 'KeyV') {
        setTtsEnabled((prev) => {
          audioEngine.ttsEnabled = !prev;
          return !prev;
        });
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    handleChatChooseTeam,
    handleResetAll,
    handleStartOrResume,
    handleTriggerHeal,
    handleTriggerRageBoost,
    selectedTeam,
    viewerName,
  ]);

  // Main 60 FPS Canvas Simulation + Rudel-Welpen Bot Loop
  useEffect(() => {
    let timerId = 0;
    let cancelled = false;
    let lastTime = performance.now();
    let hudSyncAccum = 0;
    let pupSpawnAccum = 0;
    let fakeViewerAccum = 0;

    const loop = () => {
      if (cancelled) return;
      const now = performance.now();
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = Math.min(Math.max(rawDt, 0.001), 0.05);

      const world = worldRef.current;

      // 1. Nameless Rudel-Welpen Bots (keeps the bridge battle alive with NO fake viewer names!)
      if (world.state === 'playing' && pupBotsEnabledRef.current) {
        pupSpawnAccum += dt;
        const activePups = world.beasts.filter((b) => b.isBotPup && b.alive).length;
        if (pupSpawnAccum >= 2.8 && activePups < 8 && world.beasts.length < 24) {
          pupSpawnAccum = 0;
          spawnPackPupBot(world, 'lion');
          spawnPackPupBot(world, 'wolf');
        }
      }

      // 2. Optional Demo Fake-Zuschauer (OFF by default — only runs if streamer explicitly enables it)
      if (world.state === 'playing' && fakeViewersEnabledRef.current) {
        fakeViewerAccum += dt;
        if (fakeViewerAccum >= 3.5 && world.beasts.length < 26) {
          fakeViewerAccum = 0;
          const randTeam: TeamId = Math.random() < 0.5 ? 'lion' : 'wolf';
          const randUser =
            DEMO_VIEWER_NAMES[Math.floor(Math.random() * DEMO_VIEWER_NAMES.length)];
          registerViewerTeam(world, randUser, randTeam);
          spawnUnitByCoinTier(world, randTeam, randUser, 0);
        }
      }

      // Step physics & combat rules
      const stepEvents = stepArenaSimulation(world, dt);

      if (stepEvents.colossusSlamOccurred) {
        audioEngine.playGroundSlam();
      } else if (stepEvents.heavyHitOccurred || stepEvents.boarChargeHit) {
        audioEngine.playHitSound(true);
      }
      if (stepEvents.elementalWaveFired) {
        audioEngine.playElementalWave(stepEvents.elementalWaveFired);
      }
      if (stepEvents.titanThunderStrike) {
        audioEngine.playThunderStrike();
      }
      if (stepEvents.roundWonBy) {
        audioEngine.playVictoryFanfare();
        setGameState(world.state);
      }
      if (stepEvents.autoRestartRound) {
        if (pupBotsEnabledRef.current) {
          spawnPackPupBot(world, 'lion');
          spawnPackPupBot(world, 'lion');
          spawnPackPupBot(world, 'wolf');
          spawnPackPupBot(world, 'wolf');
        }
        setGameState('playing');
      }

      // Render 2.5D Battlefield Canvas
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          renderArenaFrame(ctx, world, now / 1000);
        }
      }

      // Sync React HUD state at ~8Hz
      hudSyncAccum += dt;
      if (hudSyncAccum >= 0.125 || stepEvents.roundWonBy || stepEvents.autoRestartRound) {
        hudSyncAccum = 0;
        setHudState({
          lion: { ...world.teams.lion },
          wolf: { ...world.teams.wolf },
          mvp: world.mvp ? { ...world.mvp } : null,
          roundNumber: world.roundNumber,
          mapId: world.mapId,
          activeBanner: world.activeBanner ? { ...world.activeBanner } : null,
          winnerTeam: world.winnerTeam,
          victoryCelebration: world.victoryCelebration
            ? { ...world.victoryCelebration }
            : null,
          topPodium: getTopPodiumViewers(world, 3),
          totalDamageDealt: { ...world.totalDamageDealt },
          totalUnitsSpawned: { ...world.totalUnitsSpawned },
          viewerTeams: { ...world.viewerTeams },
          viewerLastChatSpawn: { ...world.viewerLastChatSpawn },
          nowMs: Date.now(),
        });
      }

      timerId = window.setTimeout(loop, 16);
    };

    timerId = window.setTimeout(loop, 16);
    return () => {
      cancelled = true;
      window.clearTimeout(timerId);
    };
  }, []);

  const cleanViewerKey = viewerName.trim().toLowerCase();
  const boundViewerTeam = cleanViewerKey
    ? hudState.viewerTeams[cleanViewerKey] ?? null
    : null;
  const lastFreeSpawnTime = cleanViewerKey
    ? hudState.viewerLastChatSpawn[cleanViewerKey]
    : undefined;
  const chatCooldownRemainingSec =
    lastFreeSpawnTime !== undefined &&
    hudState.nowMs - lastFreeSpawnTime < 15_000
      ? Math.ceil((15_000 - (hudState.nowMs - lastFreeSpawnTime)) / 1000)
      : 0;

  return (
    <main
      className="w-screen h-screen bg-[#070605] flex flex-col items-center justify-between overflow-hidden select-none"
      data-standalone-916={isStandalone916 ? 'true' : 'false'}
    >
      {/* MAIN ARENA CONTAINER: 9:16 Portrait Stream Frame or 16:9 Full Width */}
      <div
        className={`relative flex flex-col justify-between flex-1 min-h-0 overflow-hidden border-x-2 border-amber-500/70 bg-[#0d0a06] shadow-[0_0_50px_rgba(0,0,0,0.95)] ${
          layoutMode === '9:16' || isStandalone916
            ? 'w-full max-w-[580px]'
            : 'w-full max-w-[1440px]'
        }`}
        data-testid="arena-container"
        data-layout={isStandalone916 ? '9:16' : layoutMode}
      >
        {/* 1. TOP-HEADER (18% HEIGHT - Large & Clear, No Timer) */}
        <TopHeader
          lion={hudState.lion}
          wolf={hudState.wolf}
          mvp={hudState.mvp}
          roundNumber={hudState.roundNumber}
          mapId={hudState.mapId}
          sfxEnabled={sfxEnabled}
          ttsEnabled={ttsEnabled}
          isStandalone916={isStandalone916}
          onToggleSfx={() => {
            setSfxEnabled((prev) => {
              audioEngine.sfxEnabled = !prev;
              return !prev;
            });
          }}
          onToggleTts={() => {
            setTtsEnabled((prev) => {
              audioEngine.ttsEnabled = !prev;
              return !prev;
            });
          }}
          onResetAll={handleResetAll}
          onToggleStandalone916={handleToggleStandalone916}
          onPause={() => {
            worldRef.current.state = 'paused';
            setGameState('paused');
          }}
        />

        {/* 2. HAUPT-ARENA (33% HEIGHT - Compact 2.5D Battlefield so Header & CommandBoard are super legible!) */}
        <div
          className="relative h-[33%] w-full bg-[#1a120b] overflow-hidden shrink-0"
          role="region"
          aria-label="2.5D Schlachtfeld Haupt-Arena"
        >
          <canvas
            ref={canvasRef}
            width={worldRef.current.width}
            height={worldRef.current.height}
            data-testid="arena-canvas"
            className="w-full h-full block"
          />

          {/* SIEGER-FEUERWERK & PODEST DER BESTEN ZUSCHAUER (Non-blocking inside Arena, Auto-Restart!) */}
          {hudState.victoryCelebration && (
            <div
              data-testid="victory-podium-overlay"
              className="pointer-events-none absolute inset-x-0 bottom-1.5 z-20 flex flex-col items-center px-2"
            >
              <div
                className={`mb-1.5 px-3 py-1 rounded-xl border-2 text-center shadow-[0_6px_24px_rgba(0,0,0,0.9)] ${
                  hudState.victoryCelebration.winnerTeam === 'lion'
                    ? 'bg-[#2a1905]/92 border-yellow-300 text-yellow-200'
                    : 'bg-[#081c2e]/92 border-sky-300 text-sky-100'
                }`}
              >
                <div className="font-display-crest font-black text-xs sm:text-sm tracking-wide">
                  {hudState.victoryCelebration.winnerTeam === 'lion'
                    ? '🦁🏆 TEAM LÖWE GEWINNT DIE RUNDE!'
                    : '🐺🏆 TEAM WOLF GEWINNT DIE RUNDE!'}
                </div>
                <div className="text-[10px] font-bold text-amber-200/95 font-mono-num">
                  🎆 Feuerwerk &amp; Siegerehrung · Nächste Runde in{' '}
                  {Math.max(
                    1,
                    Math.ceil(
                      hudState.victoryCelebration.duration -
                        hudState.victoryCelebration.timer
                    )
                  )}
                  s
                </div>
              </div>

              {/* TOP-3 ZUSCHAUER PODEST (2 - 1 - 3 Olympic Podium) */}
              <div className="w-full max-w-[430px] grid grid-cols-3 items-end gap-1.5 bg-black/72 border border-yellow-400/70 rounded-xl px-2 pt-1.5 pb-1 shadow-2xl">
                {[2, 1, 3].map((targetRank) => {
                  const entry = hudState.topPodium.find((p) => p.rank === targetRank);
                  const isFirst = targetRank === 1;
                  const isSecond = targetRank === 2;
                  const medal = isFirst ? '🥇' : isSecond ? '🥈' : '🥉';
                  const pedestalHeight = isFirst
                    ? 'min-h-[62px] bg-[#2e2006]/95 border-yellow-300'
                    : isSecond
                    ? 'min-h-[48px] bg-[#1b2230]/92 border-slate-300'
                    : 'min-h-[40px] bg-[#26180f]/92 border-amber-600';

                  return (
                    <div
                      key={targetRank}
                      className={`flex flex-col items-center justify-center rounded-t-lg border-t-2 border-x px-1 py-1 text-center ${pedestalHeight}`}
                    >
                      <div className="text-[11px] font-black leading-none text-white">
                        {medal} {targetRank}.
                      </div>
                      {entry ? (
                        <>
                          <div className="w-full truncate text-[10.5px] font-black text-yellow-200 mt-0.5">
                            {entry.team === 'lion' ? '🦁' : '🐺'} {entry.username}
                          </div>
                          <div className="text-[9.5px] font-extrabold font-mono-num text-amber-100/90">
                            {entry.totalCoins > 0
                              ? `${entry.totalCoins} Coins`
                              : `${entry.actions} Aktionen`}
                          </div>
                        </>
                      ) : (
                        <div className="text-[9.5px] font-bold text-stone-400 mt-0.5">
                          — Offen —
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* GROSSES EVENT-BANNER (Top Center of the Arena on every Coin Donation!) */}
          {hudState.activeBanner && (
            <div
              key={hudState.activeBanner.id}
              data-testid="event-banner"
              className={`pointer-events-none absolute top-2 left-1/2 -translate-x-1/2 z-20 w-[94%] max-w-[520px] px-3 py-1.5 rounded-xl border-2 text-center shadow-[0_8px_28px_rgba(0,0,0,0.9)] transition-transform duration-150 ${
                hudState.activeBanner.coins >= 100
                  ? 'bg-[#3b1d06] border-yellow-300 text-yellow-200'
                  : hudState.activeBanner.team === 'lion'
                  ? 'bg-[#281907] border-amber-400 text-amber-100'
                  : 'bg-[#0b1d30] border-sky-400 text-sky-100'
              }`}
            >
              <div className="font-condensed-hud font-extrabold text-xs sm:text-sm md:text-base tracking-wide leading-tight uppercase">
                {hudState.activeBanner.text}
              </div>
            </div>
          )}

          {/* Floating badge in pure 9:16 standalone window mode so streamer can exit or restart anytime */}
          {isStandalone916 && (
            <div
              className="absolute bottom-1.5 right-2 z-20 flex items-center gap-1 bg-black/85 border border-amber-400/70 rounded-lg px-2 py-0.5"
              data-testid="standalone-916-floating-bar"
            >
              <span className="text-[10px] font-extrabold text-emerald-300">
                🗗 9:16 Fenster
              </span>
              <button
                type="button"
                onClick={handleResetAll}
                className="px-1.5 py-0.5 rounded bg-red-900 hover:bg-red-800 text-[10px] font-bold text-white cursor-pointer"
              >
                🔄 Neustart
              </button>
              <button
                type="button"
                onClick={handleToggleStandalone916}
                className="px-1.5 py-0.5 rounded bg-stone-800 hover:bg-stone-700 text-[10px] font-bold text-amber-200 cursor-pointer"
              >
                Steuerpult
              </button>
            </div>
          )}
        </div>

        {/* 3. COIN- & BEFEHLS-TAFEL (49% HEIGHT - Spacious, Large Text, Zero Truncation!) */}
        <CommandBoard
          onQuickTriggerCoin={(coins) =>
            handleTriggerSpawn(selectedTeam, viewerName, coins)
          }
          onQuickTriggerFree={(team) =>
            handleChatChooseTeam(team, viewerName)
          }
          onQuickTriggerHeal={() =>
            handleTriggerHeal(selectedTeam, viewerName)
          }
          onQuickTriggerRage={() =>
            handleTriggerRageBoost(selectedTeam, 10 * RAGE_PER_TAP, viewerName)
          }
          chatCooldownRemainingSec={chatCooldownRemainingSec}
        />
      </div>

      {/* 4. LIVE-SIMULATOR & STREAMER-STEUERPULT (UNTEN AM RAND - hidden when pure standalone 9:16 window is active) */}
      {!isStandalone916 && (
        <StreamerControls
          tiktokChannel={tiktokChannel}
          onChangeTiktokChannel={(val) => {
            setTiktokChannel(val);
            activeTiktokChannelRef.current = '';
            setTiktokConnected(false);
            setTiktokStatus('idle');
          }}
          tiktokConnected={tiktokConnected}
          tiktokStatus={tiktokStatus}
          onConnectTiktok={() => handleConnectTiktokChannel()}
          username={viewerName}
          onChangeUsername={setViewerName}
          selectedTeam={selectedTeam}
          boundViewerTeam={boundViewerTeam}
          chatCooldownRemainingSec={chatCooldownRemainingSec}
          onSelectTeam={setSelectedTeam}
          onChatChooseTeam={(team) => handleChatChooseTeam(team, viewerName)}
          onSpawnCoin={(coins) =>
            handleTriggerSpawn(selectedTeam, viewerName, coins)
          }
          onRageBoost={() => handleTriggerRageBoost(selectedTeam, 100, viewerName)}
          onHealDrop={() => handleTriggerHeal(selectedTeam, viewerName)}
          pupBotsEnabled={pupBotsEnabled}
          onTogglePupBots={() => setPupBotsEnabled((prev) => !prev)}
          fakeViewersEnabled={fakeViewersEnabled}
          onToggleFakeViewers={() => setFakeViewersEnabled((prev) => !prev)}
          layoutMode={layoutMode}
          onToggleLayoutMode={() =>
            setLayoutMode((prev) => (prev === '9:16' ? '16:9' : '9:16'))
          }
          isStandalone916={isStandalone916}
          onToggleStandalone916={handleToggleStandalone916}
          onResetAll={handleResetAll}
        />
      )}

      {/* TITLE MENU, PAUSE & ROUND VICTORY MODALS */}
      <TitleAndStatusModals
        gameState={gameState}
        layoutMode={layoutMode}
        onSelectLayoutMode={setLayoutMode}
        tiktokChannel={tiktokChannel}
        onChangeTiktokChannel={(val) => {
          setTiktokChannel(val);
          activeTiktokChannelRef.current = '';
          setTiktokConnected(false);
          setTiktokStatus('idle');
        }}
        tiktokConnected={tiktokConnected}
        onConnectTiktok={() => handleConnectTiktokChannel()}
        pupBotsEnabled={pupBotsEnabled}
        onTogglePupBots={() => setPupBotsEnabled((prev) => !prev)}
        fakeViewersEnabled={fakeViewersEnabled}
        onToggleFakeViewers={() => setFakeViewersEnabled((prev) => !prev)}
        ttsEnabled={ttsEnabled}
        onToggleTts={() => {
          setTtsEnabled((prev) => {
            audioEngine.ttsEnabled = !prev;
            return !prev;
          });
        }}
        winnerTeam={hudState.winnerTeam}
        mvp={hudState.mvp}
        lionWins={hudState.lion.wins}
        wolfWins={hudState.wolf.wins}
        totalDamageDealt={hudState.totalDamageDealt}
        totalUnitsSpawned={hudState.totalUnitsSpawned}
        onStartOrResume={handleStartOrResume}
        onRestartRound={handleRestartRound}
        onResetAll={handleResetAll}
        onToggleStandalone916={handleToggleStandalone916}
        onReturnToTitle={handleReturnToTitle}
      />
    </main>
  );
}
