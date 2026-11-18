import React from 'react';
import { CoinTier } from '../game/types';

interface CommandBoardProps {
  onQuickTriggerCoin: (coins: CoinTier) => void;
  onQuickTriggerFree: (team: 'lion' | 'wolf') => void;
  onQuickTriggerHeal: () => void;
  onQuickTriggerRage: () => void;
  chatCooldownRemainingSec?: number;
}

interface GiftTierRow {
  coins: CoinTier;
  giftIcon: string;
  coinBadge: string;
  giftLabel: string;
  unitName: string;
  unitEffect: string;
  beastIcon: string;
  highlightClass: string;
}

// Uses universally supported Windows/Android/iOS icons (no missing Unicode 14 boxes!)
const GIFT_TIERS: GiftTierRow[] = [
  {
    coins: 1,
    giftIcon: '🌹',
    coinBadge: '1 COIN',
    giftLabel: 'Rose / TikTok',
    unitName: 'WILDSCHWEIN-RAMMBOCK',
    unitEffect: 'Sturmangriff durch die Mitte!',
    beastIcon: '🐗',
    highlightClass: 'border-amber-500/60 bg-[#1b1408] hover:border-amber-400',
  },
  {
    coins: 5,
    giftIcon: '❤️',
    coinBadge: '5 COINS',
    giftLabel: 'Fingerherz',
    unitName: '5er HYÄNEN- / LUCHS-MEUTE',
    unitEffect: '5 schnelle Jäger in V-Formation!',
    beastIcon: '🐾',
    highlightClass: 'border-amber-500/60 bg-[#1b1408] hover:border-amber-400',
  },
  {
    coins: 10,
    giftIcon: '👑',
    coinBadge: '10 COINS',
    giftLabel: 'Krone / Armband',
    unitName: 'PANZER-NASHORN',
    unitEffect: 'Durchbricht feindliche Reihen!',
    beastIcon: '🦏',
    highlightClass: 'border-amber-500/70 bg-[#211809] hover:border-amber-400',
  },
  {
    coins: 30,
    giftIcon: '🍩',
    coinBadge: '30 COINS',
    giftLabel: 'Donut',
    unitName: 'GRIZZLYBÄR / GORILLA',
    unitEffect: 'Koloss mit Flächen-Erdbeben!',
    beastIcon: '🐻',
    highlightClass: 'border-amber-400/80 bg-[#261b08] hover:border-yellow-400',
  },
  {
    coins: 100,
    giftIcon: '🎉',
    coinBadge: '100 COINS',
    giftLabel: 'Handherz / Konfetti',
    unitName: 'KRIEGS-MAMMUT',
    unitEffect: 'Erdbeben-Schockwelle & Stoßzähne!',
    beastIcon: '🐘',
    highlightClass: 'border-yellow-400/80 bg-[#2d1f07] hover:border-yellow-300',
  },
  {
    coins: 500,
    giftIcon: '💸',
    coinBadge: '500 COINS',
    giftLabel: 'Geldregen',
    unitName: 'FEUER-PHÖNIX / EIS-DRACHE',
    unitEffect: 'Luftschlag + Heilt Verbündete!',
    beastIcon: '🐉',
    highlightClass: 'border-orange-400/90 bg-[#331d08] hover:border-orange-300',
  },
  {
    coins: 1000,
    giftIcon: '🌌',
    coinBadge: '1.000 COINS',
    giftLabel: 'Galaxie',
    unitName: 'GIGANTEN-TITAN (MEGA-KONG)',
    unitEffect: 'SOFORTIGE BURG-ZERSTÖRUNG & PLATZ 1 MVP-THRON!',
    beastIcon: '⚡',
    highlightClass:
      'border-2 border-yellow-300 bg-[#3b2506] shadow-[0_0_16px_rgba(250,204,21,0.35)] hover:border-white',
  },
];

export const CommandBoard: React.FC<CommandBoardProps> = ({
  onQuickTriggerCoin,
  onQuickTriggerFree,
  onQuickTriggerHeal,
  onQuickTriggerRage,
  chatCooldownRemainingSec = 0,
}) => {
  return (
    <div
      className="h-[49%] min-h-[290px] w-full bg-[#110c05] border-t-2 border-amber-500/90 px-2.5 py-1.5 flex flex-col justify-between gap-1 select-none shrink-0"
      role="region"
      aria-label="Coin- und Befehls-Tafel"
    >
      {/* Top Row: Large, High-Contrast Chat Commands & Likes/Tapps */}
      <div className="grid grid-cols-1 gap-1 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-1 bg-[#221708] border-2 border-amber-400/80 rounded-lg px-2.5 py-1 text-xs sm:text-[13px] font-black text-white shadow-sm">
          <span className="text-yellow-300">
            💬 CHAT (alle 15s):{' '}
            {chatCooldownRemainingSec > 0 && (
              <span
                className="text-orange-300 font-mono-num"
                data-testid="command-board-cooldown"
              >
                ⏳ {chatCooldownRemainingSec}s
              </span>
            )}
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => onQuickTriggerFree('lion')}
              className={`border rounded px-2 py-0.5 font-black cursor-pointer ${
                chatCooldownRemainingSec > 0
                  ? 'bg-stone-800 border-stone-600 text-stone-400'
                  : 'bg-amber-500/25 border-amber-400 text-amber-200 hover:bg-amber-500/40'
              }`}
            >
              [1] = Löwe 🦁
            </button>
            <button
              type="button"
              onClick={() => onQuickTriggerFree('wolf')}
              className={`border rounded px-2 py-0.5 font-black cursor-pointer ${
                chatCooldownRemainingSec > 0
                  ? 'bg-stone-800 border-stone-600 text-stone-400'
                  : 'bg-sky-500/25 border-sky-400 text-sky-200 hover:bg-sky-500/40'
              }`}
            >
              [2] = Wolf 🐺
            </button>
            <button
              type="button"
              onClick={onQuickTriggerHeal}
              className="bg-emerald-500/25 border border-emerald-400 rounded px-2 py-0.5 text-emerald-200 hover:bg-emerald-500/40 font-black cursor-pointer"
            >
              [!heilen] = Fleisch 🥩
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={onQuickTriggerRage}
          className="w-full flex items-center justify-between bg-[#281607] border-2 border-orange-400/80 hover:border-yellow-300 rounded-lg px-2.5 py-1 text-xs sm:text-[12.5px] font-black text-yellow-200 text-left transition-colors cursor-pointer"
        >
          <span>
            ❤️ <strong className="text-white">LIKES / TAPPS (10 = +1%):</strong> Füllt RUDEL-WUT ➡️ Bei 100%{' '}
            <span className="text-yellow-300 underline">2x TEMPO &amp; BLITZ-AURA!</span>
          </span>
          <span className="text-sm leading-none shrink-0 ml-1">⚡</span>
        </button>
      </div>

      {/* Coin Tiers Grid - Large, Clear, Zero Truncation & Zero Bottom Clipping */}
      <div className="grid grid-cols-2 gap-1 flex-1 min-h-0">
        {GIFT_TIERS.map((tier) => (
          <button
            key={tier.coins}
            type="button"
            onClick={() => onQuickTriggerCoin(tier.coins)}
            className={`flex items-center justify-between border rounded-lg px-2.5 py-1 text-left transition-colors cursor-pointer ${
              tier.coins === 1000 ? 'col-span-2 py-1.5' : ''
            } ${tier.highlightClass}`}
          >
            <div className="flex flex-col justify-center min-w-0 pr-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-sm leading-none shrink-0">
                  {tier.giftIcon}
                </span>
                <span className="bg-yellow-400 text-stone-950 font-mono-num text-[11px] font-black px-1.5 py-0.2 rounded whitespace-nowrap">
                  {tier.coinBadge}
                </span>
                <span className="text-[11px] font-bold text-amber-200 whitespace-nowrap">
                  ({tier.giftLabel})
                </span>
              </div>
              <div className="text-xs sm:text-[12.5px] font-black text-white leading-tight mt-0.5">
                {tier.unitName}
              </div>
              <div className="text-[10.5px] sm:text-[11px] font-bold text-amber-200/95 leading-tight">
                {tier.unitEffect}
              </div>
            </div>
            <span className="text-xl leading-none shrink-0 ml-1">
              {tier.beastIcon}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
