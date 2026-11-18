import React from 'react';
import { ArenaMapId, DonorRecord, TeamState } from '../game/types';
import { getMapLabelDe } from '../game/rules';

interface TopHeaderProps {
  lion: TeamState;
  wolf: TeamState;
  mvp: DonorRecord | null;
  roundNumber: number;
  mapId: ArenaMapId;
  sfxEnabled: boolean;
  ttsEnabled: boolean;
  isStandalone916: boolean;
  onToggleSfx: () => void;
  onToggleTts: () => void;
  onResetAll: () => void;
  onToggleStandalone916: () => void;
  onPause: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  lion,
  wolf,
  mvp,
  roundNumber,
  mapId,
  sfxEnabled,
  ttsEnabled,
  isStandalone916,
  onToggleSfx,
  onToggleTts,
  onResetAll,
  onToggleStandalone916,
  onPause,
}) => {
  const lionHpPct = Math.max(0, Math.min(100, (lion.hp / lion.maxHp) * 100));
  const lionGhostPct = Math.max(0, Math.min(100, (lion.ghostHp / lion.maxHp) * 100));
  const wolfHpPct = Math.max(0, Math.min(100, (wolf.hp / wolf.maxHp) * 100));
  const wolfGhostPct = Math.max(0, Math.min(100, (wolf.ghostHp / wolf.maxHp) * 100));

  return (
    <div
      className="h-[18%] min-h-[112px] w-full bg-[#120d07] border-b-2 border-amber-500/90 px-2.5 py-1.5 grid grid-cols-12 gap-2 items-center select-none shrink-0"
      role="region"
      aria-label="Arena Status Header"
    >
      {/* LEFT: TEAM LÖWE */}
      <div className="col-span-4 flex flex-col justify-between h-full bg-[#1d1409] border-2 border-amber-500/50 rounded-xl px-2.5 py-1.5">
        <div className="flex items-center justify-between gap-1">
          <span className="font-condensed-hud font-black text-amber-400 text-xs sm:text-sm tracking-tight whitespace-nowrap">
            🦁 TEAM LÖWE (1)
          </span>
          <span
            className="font-mono-num text-xs font-extrabold text-amber-200 bg-amber-950/80 px-1.5 py-0.5 rounded border border-amber-500/40 whitespace-nowrap"
            data-testid="lion-wins"
          >
            🏆 {lion.wins}
          </span>
        </div>

        {/* Fortress HP Bar with Delayed Ghost Trail */}
        <div className="w-full">
          <div className="flex justify-between text-[11px] font-extrabold text-white mb-0.5 tabular-nums">
            <span className="text-amber-300">FESTUNG</span>
            <span data-testid="lion-hp">
              {Math.round(lion.hp)} / {lion.maxHp}
            </span>
          </div>
          <div className="relative w-full h-3.5 bg-stone-950 rounded-md overflow-hidden border border-amber-400/70">
            <div
              className="absolute inset-y-0 left-0 bg-red-400/60 transition-all duration-75"
              style={{ width: `${lionGhostPct}%` }}
            />
            <div
              className="absolute inset-y-0 left-0 bg-amber-500"
              style={{ width: `${lionHpPct}%` }}
            />
          </div>
        </div>

        {/* Wut-Balken (Rage Meter) */}
        <div className="w-full">
          <div className="flex justify-between text-[10.5px] font-extrabold text-yellow-300 mb-0.5 tabular-nums">
            <span>{lion.rageActiveTimer > 0 ? '⚡ 2x BLITZ-WUT!' : 'RUDEL-WUT'}</span>
            <span data-testid="lion-rage">{Math.floor(lion.rage)}%</span>
          </div>
          <div className="relative w-full h-2.5 bg-stone-950 rounded-md overflow-hidden border border-yellow-500/50">
            <div
              className={`h-full transition-all duration-100 ${
                lion.rageActiveTimer > 0 ? 'bg-yellow-300' : 'bg-orange-500'
              }`}
              style={{ width: `${Math.min(100, Math.max(0, lion.rage))}%` }}
            />
          </div>
        </div>
      </div>

      {/* CENTER: GOLDEN THRONE MVP + UTILITY CONTROLS (NO TIMER!) */}
      <div className="col-span-4 flex flex-col justify-between items-center h-full bg-[#241a08] border-2 border-yellow-400 rounded-xl px-1.5 py-1.5 shadow-[0_0_15px_rgba(250,204,21,0.22)] overflow-hidden">
        <div className="w-full flex items-center justify-between gap-1">
          <div className="flex flex-col leading-none min-w-0">
            <span
              className="text-[11px] font-black text-yellow-300 uppercase tracking-tight whitespace-nowrap"
              data-testid="round-number"
            >
              RUNDE {roundNumber}
            </span>
            <span
              className="text-[9px] font-bold text-amber-200/85 truncate"
              data-testid="map-name"
            >
              🗺️ {getMapLabelDe(mapId)}
            </span>
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              type="button"
              tabIndex={-1}
              data-testid="header-reset-all-btn"
              onClick={(e) => {
                e.currentTarget.blur();
                onResetAll();
              }}
              aria-label="Alles komplett neustarten"
              title="Alles Neustarten (Kompletter Reset)"
              className="w-5 h-5 flex items-center justify-center rounded text-[10px] bg-red-950/90 border border-red-400/80 text-red-200 hover:bg-red-800/80 cursor-pointer"
            >
              🔄
            </button>
            <button
              type="button"
              tabIndex={-1}
              data-testid="header-standalone-916-btn"
              onClick={(e) => {
                e.currentTarget.blur();
                onToggleStandalone916();
              }}
              aria-label="Eigenständiges 9:16 Fenster umschalten"
              title="Eigenständiges 9:16 Fenster öffnen / umschalten"
              className={`w-5 h-5 flex items-center justify-center rounded text-[10px] border cursor-pointer ${
                isStandalone916
                  ? 'bg-emerald-700/90 border-emerald-300 text-white'
                  : 'bg-stone-900 border-amber-400/60 text-amber-200 hover:bg-amber-500/20'
              }`}
            >
              🗗
            </button>
            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onToggleSfx();
              }}
              aria-label={sfxEnabled ? 'Soundeffekte stummschalten' : 'Soundeffekte aktivieren'}
              title="Soundeffekte [M]"
              className={`w-5 h-5 flex items-center justify-center rounded text-[10px] border cursor-pointer ${
                sfxEnabled
                  ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                  : 'bg-stone-900 border-stone-700 text-stone-500'
              }`}
            >
              {sfxEnabled ? '🔊' : '🔇'}
            </button>
            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onToggleTts();
              }}
              aria-label={ttsEnabled ? 'Sprachausgabe ausschalten' : 'Sprachausgabe einschalten'}
              title="Stadion-Kommentator Deutsch [V]"
              className={`w-5 h-5 flex items-center justify-center rounded text-[10px] border cursor-pointer ${
                ttsEnabled
                  ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                  : 'bg-stone-900 border-stone-700 text-stone-500'
              }`}
            >
              🎙️
            </button>
            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onPause();
              }}
              aria-label="Spiel pausieren"
              title="Pause [P]"
              className="w-5 h-5 flex items-center justify-center rounded text-[10px] bg-stone-900 border border-amber-400/50 text-amber-200 hover:bg-amber-500/20 cursor-pointer"
            >
              ⏸
            </button>
          </div>
        </div>

        {/* GOLDEN THRONE FRAME */}
        <div className="w-full text-center my-auto py-1 bg-[#140e04] border border-yellow-400/80 rounded-lg px-1">
          <div className="font-condensed-hud text-xs font-black text-yellow-400 tracking-wide whitespace-nowrap">
            👑 KÖNIG DER ARENA (MVP)
          </div>
          {mvp ? (
            <div
              className="text-xs font-black text-white truncate tabular-nums mt-0.5"
              data-testid="mvp-display"
            >
              {mvp.team === 'lion' ? '🦁' : '🐺'} {mvp.username}{' '}
              <span className="text-yellow-300 font-mono-num">
                ({mvp.totalCoins} Coins)
              </span>
            </div>
          ) : (
            <div
              className="text-[10.5px] font-bold text-amber-200/95 whitespace-nowrap mt-0.5"
              data-testid="mvp-display"
            >
              Spende Coins für den Thron!
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: TEAM WOLF */}
      <div className="col-span-4 flex flex-col justify-between h-full bg-[#0c1624] border-2 border-sky-400/50 rounded-xl px-2.5 py-1.5">
        <div className="flex items-center justify-between gap-1">
          <span className="font-condensed-hud font-black text-sky-300 text-xs sm:text-sm tracking-tight whitespace-nowrap">
            🐺 TEAM WOLF (2)
          </span>
          <span
            className="font-mono-num text-xs font-extrabold text-sky-200 bg-sky-950/80 px-1.5 py-0.5 rounded border border-sky-400/40 whitespace-nowrap"
            data-testid="wolf-wins"
          >
            🏆 {wolf.wins}
          </span>
        </div>

        {/* Fortress HP Bar */}
        <div className="w-full">
          <div className="flex justify-between text-[11px] font-extrabold text-white mb-0.5 tabular-nums">
            <span className="text-sky-300">FESTUNG</span>
            <span data-testid="wolf-hp">
              {Math.round(wolf.hp)} / {wolf.maxHp}
            </span>
          </div>
          <div className="relative w-full h-3.5 bg-slate-950 rounded-md overflow-hidden border border-sky-400/70">
            <div
              className="absolute inset-y-0 right-0 bg-red-400/60 transition-all duration-75"
              style={{ width: `${wolfGhostPct}%` }}
            />
            <div
              className="absolute inset-y-0 right-0 bg-sky-500"
              style={{ width: `${wolfHpPct}%` }}
            />
          </div>
        </div>

        {/* Wut-Balken (Rage Meter) */}
        <div className="w-full">
          <div className="flex justify-between text-[10.5px] font-extrabold text-cyan-300 mb-0.5 tabular-nums">
            <span>{wolf.rageActiveTimer > 0 ? '⚡ 2x BLITZ-WUT!' : 'RUDEL-WUT'}</span>
            <span data-testid="wolf-rage">{Math.floor(wolf.rage)}%</span>
          </div>
          <div className="relative w-full h-2.5 bg-slate-950 rounded-md overflow-hidden border border-cyan-400/50">
            <div
              className={`h-full ml-auto transition-all duration-100 ${
                wolf.rageActiveTimer > 0 ? 'bg-yellow-300' : 'bg-cyan-400'
              }`}
              style={{ width: `${Math.min(100, Math.max(0, wolf.rage))}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
