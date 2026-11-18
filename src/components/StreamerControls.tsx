import React from 'react';
import { CoinTier, LayoutMode, TeamId } from '../game/types';

interface StreamerControlsProps {
  tiktokChannel: string;
  onChangeTiktokChannel: (channel: string) => void;
  tiktokConnected: boolean;
  tiktokStatus?: 'idle' | 'connecting' | 'connected' | 'reconnecting';
  onConnectTiktok: () => void;
  username: string;
  onChangeUsername: (name: string) => void;
  selectedTeam: TeamId;
  boundViewerTeam: TeamId | null;
  chatCooldownRemainingSec: number;
  onSelectTeam: (team: TeamId) => void;
  onChatChooseTeam: (team: TeamId) => void;
  onSpawnCoin: (coins: CoinTier) => void;
  onRageBoost: () => void;
  onHealDrop: () => void;
  pupBotsEnabled: boolean;
  onTogglePupBots: () => void;
  fakeViewersEnabled: boolean;
  onToggleFakeViewers: () => void;
  layoutMode: LayoutMode;
  onToggleLayoutMode: () => void;
  isStandalone916: boolean;
  onToggleStandalone916: () => void;
  onResetAll: () => void;
}

const DIRECT_COIN_BUTTONS: CoinTier[] = [1, 5, 10, 30, 100, 500, 1000];

export const StreamerControls: React.FC<StreamerControlsProps> = ({
  tiktokChannel,
  onChangeTiktokChannel,
  tiktokConnected,
  tiktokStatus = 'idle',
  onConnectTiktok,
  username,
  onChangeUsername,
  selectedTeam,
  boundViewerTeam,
  chatCooldownRemainingSec,
  onSelectTeam,
  onChatChooseTeam,
  onSpawnCoin,
  onRageBoost,
  onHealDrop,
  pupBotsEnabled,
  onTogglePupBots,
  fakeViewersEnabled,
  onToggleFakeViewers,
  layoutMode,
  onToggleLayoutMode,
  isStandalone916,
  onToggleStandalone916,
  onResetAll,
}) => {
  const cleanHandle = tiktokChannel.trim().replace(/^@/, '');
  const effectiveTeam = boundViewerTeam ?? selectedTeam;

  return (
    <div
      className="w-full bg-[#090807] border-t border-amber-500/50 px-2 py-1 flex flex-wrap items-center justify-between gap-1.5 text-xs shrink-0"
      role="region"
      aria-label="Streamer-Steuerpult"
    >
      {/* Left 1: TikTok Channel Name for Live Chat Recognition */}
      <div className="flex items-center gap-1 bg-[#140f07] px-1.5 py-0.5 rounded border border-amber-500/40">
        <span className="text-[10.5px] font-extrabold text-amber-400 whitespace-nowrap">
          📡 TikTok:
        </span>
        <label htmlFor="bar-tiktok-channel" className="sr-only">
          Dein TikTok-Name für Livechat
        </label>
        <input
          id="bar-tiktok-channel"
          type="text"
          value={cleanHandle}
          onChange={(e) => onChangeTiktokChannel(e.target.value)}
          placeholder="@dein_tiktok_name"
          className="w-24 bg-[#0b0804] border border-amber-500/50 rounded px-1.5 py-0.5 text-[11px] font-bold text-white placeholder-amber-200/40 focus:outline-none focus:border-yellow-400"
        />
        <button
          type="button"
          onClick={onConnectTiktok}
          data-testid="tiktok-connect-btn"
          className={`px-1.5 py-0.5 rounded text-[10.5px] font-extrabold whitespace-nowrap cursor-pointer ${
            tiktokStatus === 'reconnecting' || tiktokStatus === 'connecting'
              ? 'bg-amber-700 text-yellow-100 border border-yellow-300'
              : tiktokConnected && cleanHandle
              ? 'bg-emerald-700 text-white border border-emerald-400'
              : 'bg-amber-500 text-stone-950 hover:bg-amber-400'
          }`}
        >
          {tiktokStatus === 'reconnecting' || tiktokStatus === 'connecting'
            ? '🔄 Verbinde...'
            : tiktokConnected && cleanHandle
            ? 'Verbunden'
            : 'Verbinden'}
        </button>
      </div>

      {/* Left 2: Viewer Name + Chat [1] / Chat [2] Team Binding */}
      <div className="flex items-center gap-1 flex-wrap">
        <label htmlFor="streamer-viewer-input" className="sr-only">
          Zuschauername für Test-Spawn
        </label>
        <input
          id="streamer-viewer-input"
          type="text"
          value={username}
          onChange={(e) => onChangeUsername(e.target.value)}
          placeholder="Zuschauername..."
          className="w-22 bg-[#18130a] border border-amber-500/60 rounded px-1.5 py-0.5 text-[11px] font-bold text-white placeholder-amber-200/40 focus:outline-none focus:border-yellow-400"
        />

        <div className="flex items-center bg-[#18130a] p-0.5 rounded border border-amber-500/40">
          <button
            type="button"
            data-testid="chat-choose-lion-btn"
            onClick={() => {
              onSelectTeam('lion');
              onChatChooseTeam('lion');
            }}
            title="Zuschauer schreibt '1' im Chat -> Fest im Team Löwe (Buffs & Geschenke nur für Löwe)"
            className={`px-1.5 py-0.5 rounded text-[10.5px] font-extrabold transition-colors whitespace-nowrap cursor-pointer ${
              effectiveTeam === 'lion'
                ? 'bg-amber-500 text-stone-950'
                : 'text-amber-200/80 hover:text-white'
            }`}
          >
            🦁 Chat [1]
          </button>
          <button
            type="button"
            data-testid="chat-choose-wolf-btn"
            onClick={() => {
              onSelectTeam('wolf');
              onChatChooseTeam('wolf');
            }}
            title="Zuschauer schreibt '2' im Chat -> Fest im Team Wolf (Buffs & Geschenke nur für Wolf)"
            className={`px-1.5 py-0.5 rounded text-[10.5px] font-extrabold transition-colors whitespace-nowrap cursor-pointer ${
              effectiveTeam === 'wolf'
                ? 'bg-sky-500 text-slate-950'
                : 'text-sky-200/80 hover:text-white'
            }`}
          >
            🐺 Chat [2]
          </button>
        </div>

        <span
          data-testid="viewer-bound-team-badge"
          className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold border whitespace-nowrap ${
            boundViewerTeam === 'lion'
              ? 'bg-amber-950/90 border-amber-400 text-amber-300'
              : boundViewerTeam === 'wolf'
              ? 'bg-sky-950/90 border-sky-400 text-sky-300'
              : 'bg-stone-900 border-stone-700 text-stone-400'
          }`}
        >
          {boundViewerTeam === 'lion'
            ? '🔒 Team Löwe'
            : boundViewerTeam === 'wolf'
            ? '🔒 Team Wolf'
            : 'Offen'}
          {chatCooldownRemainingSec > 0 ? ` (⏳ ${chatCooldownRemainingSec}s)` : ''}
        </span>

        <button
          type="button"
          data-testid="heal-drop-btn"
          onClick={onHealDrop}
          className="px-1.5 py-0.5 rounded bg-emerald-950 hover:bg-emerald-900 border border-emerald-500/60 text-[10.5px] font-bold text-emerald-200 whitespace-nowrap cursor-pointer"
        >
          🥩 !heilen
        </button>
      </div>

      {/* Center: Direct Coin Tier Buttons + Wut-Boost (Strictly buffs the viewer's chosen team) */}
      <div className="flex items-center gap-1 flex-wrap">
        {DIRECT_COIN_BUTTONS.map((c) => (
          <button
            key={c}
            type="button"
            data-testid={`spawn-coin-${c}-btn`}
            onClick={() => onSpawnCoin(c)}
            className={`px-1.5 py-0.5 rounded font-mono-num text-[10.5px] font-extrabold whitespace-nowrap transition-colors cursor-pointer ${
              c === 1000
                ? 'bg-yellow-400 hover:bg-yellow-300 text-stone-950 border border-white'
                : c >= 100
                ? 'bg-amber-600 hover:bg-amber-500 text-white border border-yellow-300/70'
                : 'bg-[#261b0a] hover:bg-[#36260d] text-amber-200 border border-amber-500/50'
            }`}
          >
            {c === 1 ? '1 Coin' : `${c} Coins`}
          </button>
        ))}

        <button
          type="button"
          data-testid="rage-boost-btn"
          onClick={onRageBoost}
          className="px-1.5 py-0.5 rounded bg-orange-600 hover:bg-orange-500 border border-yellow-300 text-[10.5px] font-extrabold text-white whitespace-nowrap cursor-pointer"
        >
          ⚡ Wut-Boost
        </button>
      </div>

      {/* Right: Rudel-Welpen Bots, Standalone 9:16 Window & Alles Neustarten */}
      <div className="flex items-center gap-1 flex-wrap">
        <button
          type="button"
          onClick={onTogglePupBots}
          aria-pressed={pupBotsEnabled}
          className={`px-1.5 py-0.5 rounded text-[10.5px] font-extrabold border whitespace-nowrap cursor-pointer ${
            pupBotsEnabled
              ? 'bg-emerald-900/80 border-emerald-400 text-emerald-200'
              : 'bg-stone-900 border-stone-700 text-stone-400'
          }`}
        >
          {pupBotsEnabled ? '🐾 Welpen: AN' : '🐾 Welpen: AUS'}
        </button>

        <button
          type="button"
          onClick={onToggleFakeViewers}
          aria-pressed={fakeViewersEnabled}
          className={`px-1.5 py-0.5 rounded text-[10.5px] font-extrabold border whitespace-nowrap cursor-pointer ${
            fakeViewersEnabled
              ? 'bg-amber-900/80 border-amber-400 text-amber-200'
              : 'bg-stone-900 border-stone-700 text-stone-400'
          }`}
        >
          {fakeViewersEnabled ? '🤖 Fake-Chat: AN' : '🤖 Fake-Chat: AUS'}
        </button>

        <button
          type="button"
          data-testid="standalone-916-btn"
          onClick={onToggleStandalone916}
          className={`px-1.5 py-0.5 rounded text-[10.5px] font-extrabold border whitespace-nowrap cursor-pointer ${
            isStandalone916
              ? 'bg-emerald-700 text-white border-emerald-300'
              : 'bg-[#1d1508] hover:bg-[#2a1e0b] border-amber-400 text-yellow-300'
          }`}
        >
          🗗 9:16 Fenster
        </button>

        <button
          type="button"
          onClick={onToggleLayoutMode}
          className="px-1.5 py-0.5 rounded bg-[#1d1508] hover:bg-[#2a1e0b] border border-amber-500/50 text-[10.5px] font-bold text-amber-200 whitespace-nowrap cursor-pointer"
        >
          📱 {layoutMode}
        </button>

        <button
          type="button"
          data-testid="reset-all-btn"
          onClick={onResetAll}
          className="px-1.5 py-0.5 rounded bg-red-900/90 hover:bg-red-800 border border-red-400 text-[10.5px] font-extrabold text-white whitespace-nowrap cursor-pointer"
        >
          🔄 Alles Neustarten
        </button>
      </div>
    </div>
  );
};
