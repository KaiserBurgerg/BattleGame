import React from 'react';
import { DonorRecord, GameState, LayoutMode, TeamId } from '../game/types';

interface TitleAndStatusModalsProps {
  gameState: GameState;
  layoutMode: LayoutMode;
  onSelectLayoutMode: (mode: LayoutMode) => void;
  tiktokChannel: string;
  onChangeTiktokChannel: (channel: string) => void;
  tiktokConnected: boolean;
  onConnectTiktok: () => void;
  pupBotsEnabled: boolean;
  onTogglePupBots: () => void;
  fakeViewersEnabled: boolean;
  onToggleFakeViewers: () => void;
  ttsEnabled: boolean;
  onToggleTts: () => void;
  winnerTeam: TeamId | null;
  mvp: DonorRecord | null;
  lionWins: number;
  wolfWins: number;
  totalDamageDealt: Record<TeamId, number>;
  totalUnitsSpawned: Record<TeamId, number>;
  onStartOrResume: () => void;
  onRestartRound: () => void;
  onResetAll: () => void;
  onToggleStandalone916: () => void;
  onReturnToTitle: () => void;
}

export const TitleAndStatusModals: React.FC<TitleAndStatusModalsProps> = ({
  gameState,
  layoutMode,
  onSelectLayoutMode,
  tiktokChannel,
  onChangeTiktokChannel,
  tiktokConnected,
  onConnectTiktok,
  pupBotsEnabled,
  onTogglePupBots,
  fakeViewersEnabled,
  onToggleFakeViewers,
  ttsEnabled,
  onToggleTts,
  winnerTeam,
  mvp,
  lionWins,
  wolfWins,
  totalDamageDealt,
  totalUnitsSpawned,
  onStartOrResume,
  onRestartRound,
  onResetAll,
  onToggleStandalone916,
  onReturnToTitle,
}) => {
  if (gameState === 'playing' || gameState === 'gameover') return null;

  const cleanHandle = tiktokChannel.trim().replace(/^@/, '');

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/80 pointer-events-auto"
      role="dialog"
      aria-modal="true"
      aria-label={
        gameState === 'title'
          ? 'Beast Arena Hauptmenü'
          : gameState === 'paused'
          ? 'Spiel pausiert'
          : 'Runden-Ergebnis'
      }
    >
      {gameState === 'title' && (
        <div className="w-full max-w-lg bg-[#140e06] border-2 border-amber-400 rounded-2xl p-5 text-center shadow-[0_20px_60px_rgba(0,0,0,0.95)]">
          {/* Custom Inline SVG Emblem Lockup */}
          <div className="flex justify-center mb-2">
            <svg
              viewBox="0 0 320 88"
              className="w-64 h-18"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="crestGold" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#fef08a" />
                  <stop offset="50%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#b45309" />
                </linearGradient>
              </defs>
              <polygon
                points="20,10 300,10 288,76 160,86 32,76"
                fill="#1f1508"
                stroke="url(#crestGold)"
                strokeWidth="4"
              />
              <circle cx="52" cy="44" r="16" fill="#f59e0b" opacity="0.85" />
              <polygon points="268,26 282,44 268,62 254,44" fill="#38bdf8" opacity="0.85" />
              <line x1="125" y1="18" x2="195" y2="70" stroke="#fde047" strokeWidth="3.5" />
              <line x1="195" y1="18" x2="125" y2="70" stroke="#bae6fd" strokeWidth="3.5" />
              <text
                x="160"
                y="44"
                textAnchor="middle"
                fill="#fef08a"
                fontFamily="Cinzel, Georgia, serif"
                fontWeight="900"
                fontSize="21"
                letterSpacing="2"
              >
                BEAST ARENA
              </text>
              <text
                x="160"
                y="65"
                textAnchor="middle"
                fill="#ffffff"
                fontFamily="Barlow Condensed, sans-serif"
                fontWeight="800"
                fontSize="13"
                letterSpacing="3"
              >
                LÖWEN-CLAN VS. WOLFS-RUDEL
              </text>
            </svg>
          </div>

          <h1 className="font-display-crest text-xl sm:text-2xl font-black text-amber-300 tracking-wide mb-1">
            BEAST ARENA LIVE
          </h1>
          <p className="text-xs text-amber-100/80 mb-3.5">
            Interaktives TikTok-Livestream-Spiel · Team-Lock ([1] / [2]) &amp; 9:16 Eigenständiges Fenster
          </p>

          {/* TIKTOK USERNAME / LIVE-CHAT CONNECTION BOX */}
          <div className="mb-3.5 p-3 rounded-xl bg-[#1f1609] border border-amber-400/70 text-left">
            <label
              htmlFor="title-tiktok-username"
              className="block text-xs font-extrabold text-yellow-300 uppercase tracking-wider mb-1.5"
            >
              📡 Dein TikTok-Name (für Live-Chat &amp; Geschenke-Erkennung):
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-amber-400 font-bold text-sm">
                  @
                </span>
                <input
                  id="title-tiktok-username"
                  type="text"
                  value={cleanHandle}
                  onChange={(e) => onChangeTiktokChannel(e.target.value)}
                  placeholder="dein_tiktok_name"
                  className="w-full pl-7 pr-3 py-2 rounded-lg bg-[#110c05] border border-amber-500/60 text-sm font-bold text-white placeholder-amber-200/40 focus:outline-none focus:border-yellow-300"
                />
              </div>
              <button
                type="button"
                onClick={onConnectTiktok}
                className={`px-3.5 py-2 rounded-lg font-extrabold text-xs whitespace-nowrap border transition-colors cursor-pointer ${
                  tiktokConnected && cleanHandle
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-300'
                    : 'bg-amber-500 hover:bg-amber-400 text-stone-950 border-yellow-200'
                }`}
              >
                {tiktokConnected && cleanHandle
                  ? '✅ Livechat aktiv'
                  : '🔗 Chat verbinden'}
              </button>
            </div>
            <div className="mt-1.5 text-[11px] text-amber-200/80">
              Wer <strong>1</strong> oder <strong>2</strong> schreibt, bleibt fest in seinem gewählten Team (alle Buffs &amp; Coins zählen nur für sein Team).
            </div>
          </div>

          {/* 9:16 Format Selection + Standalone Window Button */}
          <div className="mb-3.5 text-left">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-extrabold text-amber-300 uppercase tracking-wider">
                Stream-Layout wählen:
              </span>
              <button
                type="button"
                onClick={() => {
                  onToggleStandalone916();
                  onStartOrResume();
                }}
                className="px-2.5 py-1 rounded-lg bg-emerald-800 hover:bg-emerald-700 border border-emerald-400 text-[11px] font-extrabold text-white cursor-pointer"
              >
                🗗 Als eigenständiges 9:16 Fenster starten
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onSelectLayoutMode('9:16')}
                className={`p-2.5 rounded-xl border-2 text-left transition-all cursor-pointer ${
                  layoutMode === '9:16'
                    ? 'bg-[#2b1e0a] border-yellow-400 text-white shadow-[0_0_16px_rgba(250,204,21,0.28)]'
                    : 'bg-[#1a1308] border-amber-500/30 text-amber-200/70 hover:border-amber-400/60'
                }`}
              >
                <div className="font-extrabold text-xs sm:text-sm text-yellow-300">
                  📱 9:16 HOCHFORMAT
                </div>
                <div className="text-[10.5px] text-amber-100/80 mt-0.5">
                  Optimale Stream-Lesbarkeit (Große Befehls-Tafel &amp; Kompakte Arena)
                </div>
              </button>

              <button
                type="button"
                onClick={() => onSelectLayoutMode('16:9')}
                className={`p-2.5 rounded-xl border-2 text-left transition-all cursor-pointer ${
                  layoutMode === '16:9'
                    ? 'bg-[#2b1e0a] border-yellow-400 text-white shadow-[0_0_16px_rgba(250,204,21,0.28)]'
                    : 'bg-[#1a1308] border-amber-500/30 text-amber-200/70 hover:border-amber-400/60'
                }`}
              >
                <div className="font-extrabold text-xs sm:text-sm text-amber-200">
                  🖥️ 16:9 VOLLBILD
                </div>
                <div className="text-[10.5px] text-amber-100/80 mt-0.5">
                  Breitbild-Arena für Desktop- &amp; Querformat-Streams
                </div>
              </button>
            </div>
          </div>

          {/* Bot Pups & TTS Settings */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <button
              type="button"
              onClick={onTogglePupBots}
              className={`px-2 py-2 rounded-lg border text-[11px] font-bold transition-colors cursor-pointer ${
                pupBotsEnabled
                  ? 'bg-emerald-950/90 border-emerald-400 text-emerald-200'
                  : 'bg-stone-900 border-stone-700 text-stone-400'
              }`}
            >
              🐾 Rudel-Welpen: {pupBotsEnabled ? 'AN' : 'AUS'}
            </button>

            <button
              type="button"
              onClick={onToggleFakeViewers}
              className={`px-2 py-2 rounded-lg border text-[11px] font-bold transition-colors cursor-pointer ${
                fakeViewersEnabled
                  ? 'bg-amber-950/90 border-amber-400 text-amber-200'
                  : 'bg-stone-900 border-stone-700 text-stone-400'
              }`}
            >
              🤖 Fake-Zuschauer: {fakeViewersEnabled ? 'AN' : 'AUS'}
            </button>

            <button
              type="button"
              onClick={onToggleTts}
              className={`px-2 py-2 rounded-lg border text-[11px] font-bold transition-colors cursor-pointer ${
                ttsEnabled
                  ? 'bg-amber-950/90 border-amber-400 text-amber-200'
                  : 'bg-stone-900 border-stone-700 text-stone-400'
              }`}
            >
              🎙️ Kommentator: {ttsEnabled ? 'AN' : 'AUS'}
            </button>
          </div>

          {/* Primary Start CTA */}
          <button
            type="button"
            data-start="true"
            onClick={(e) => {
              e.currentTarget.blur();
              onStartOrResume();
            }}
            className="w-full py-3 px-6 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-display-crest font-black text-base sm:text-lg tracking-wider border-2 border-yellow-200 shadow-lg transition-transform active:scale-98 cursor-pointer"
          >
            ⚔️ ARENA STARTEN (9:16 LIVE)
          </button>

          <div className="mt-2.5 text-[11px] text-amber-200/75">
            Solange kein Zuschauer schreibt, kämpfen nur namenlose Rudel-Welpen!
          </div>
        </div>
      )}

      {gameState === 'paused' && (
        <div className="w-full max-w-md bg-[#140e06] border-2 border-amber-400 rounded-2xl p-6 text-center shadow-2xl">
          <h2 className="font-display-crest text-2xl font-black text-amber-300 mb-2">
            ARENA PAUSIERT
          </h2>
          <p className="text-xs text-amber-100/80 mb-5">
            Zwischenstand: Löwen-Clan {lionWins} : {wolfWins} Wolfs-Rudel
          </p>

          <div className="flex flex-col gap-2.5">
            <button
              type="button"
              data-start="true"
              onClick={onStartOrResume}
              className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-extrabold text-sm cursor-pointer"
            >
              ▶️ Weiterkämpfen
            </button>
            <button
              type="button"
              onClick={onRestartRound}
              className="w-full py-2.5 rounded-xl bg-[#261b0a] hover:bg-[#34250e] border border-amber-500/60 text-amber-200 font-bold text-sm cursor-pointer"
            >
              🔄 Aktuelle Runde neu starten
            </button>
            <button
              type="button"
              onClick={onResetAll}
              className="w-full py-2.5 rounded-xl bg-red-950 hover:bg-red-900 border border-red-400 text-red-100 font-extrabold text-sm cursor-pointer"
            >
              🚨 Alles komplett neustarten (Reset auf 0:0)
            </button>
            <button
              type="button"
              onClick={onReturnToTitle}
              className="w-full py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-300 font-bold text-sm cursor-pointer"
            >
              🏠 TikTok-Name &amp; Hauptmenü
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
