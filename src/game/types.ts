export type TeamId = 'lion' | 'wolf';

export type GameState = 'title' | 'playing' | 'paused' | 'gameover';

export type LayoutMode = '9:16' | '16:9';

export type ArenaMapId = 'savanna_frost' | 'volcano_obsidian' | 'jungle_ruins';

export type CoinTier = 0 | 1 | 5 | 10 | 30 | 100 | 500 | 1000;

export type SpeciesId =
  | 'lion_pup'
  | 'wolf_pup'
  | 'lion'
  | 'wolf'
  | 'boar'
  | 'hyena'
  | 'lynx'
  | 'rhino'
  | 'bear'
  | 'gorilla'
  | 'mammoth'
  | 'phoenix'
  | 'icedragon'
  | 'titan';

export type BehaviorPolicy =
  | 'brawler'      // Standard melee seeker with pounce
  | 'charger'      // High-speed line charge with knock-up / knockback (Boar, Rhino)
  | 'pack_flanker' // Fast V-formation flankers with high crit rate (Hyena, Lynx)
  | 'colossus_aoe' // Heavy ground-slam shockwave dealer (Bear, Gorilla, Mammoth)
  | 'sky_sweeper'  // Flying air-strike wave dealer + ally healer (Phoenix, Ice Dragon)
  | 'titan_nuke';  // 1,000 Coin screen-darkening mega shockwave finisher

export interface UnitArchetype {
  species: SpeciesId;
  nameDe: string;
  giftNameDe: string;
  coins: CoinTier;
  emoji: string;
  hp: number;
  damage: number;
  speed: number;
  attackRange: number;
  attackCooldown: number;
  scale: number;
  knockbackPower: number;
  mass: number;
  policy: BehaviorPolicy;
  isFlying?: boolean;
  packCount?: number;
  isBotPup?: boolean;
}

export interface BeastEntity {
  id: number;
  team: TeamId;
  species: SpeciesId;
  username: string;
  isBotPup?: boolean;
  coins: CoinTier;
  emoji: string;
  labelDe: string;
  x: number;
  y: number;
  z: number; // height above ground (for pounce, flying, knock-up)
  vx: number;
  vy: number;
  vz: number;
  hp: number;
  maxHp: number;
  damage: number;
  speed: number;
  attackRange: number;
  attackCooldown: number;
  attackTimer: number;
  windupTimer: number;
  attackAnimProgress: number; // 0..1 for claw/slam visual
  hitFlashTimer: number;
  walkPhase: number;
  scale: number;
  knockbackPower: number;
  mass: number;
  policy: BehaviorPolicy;
  isFlying: boolean;
  hasDealtChargeHit: boolean;
  koTimer: number; // >0 when dying (0.35s topple/dissolve)
  alive: boolean;
  targetId: number | null;
}

export interface ShockwaveRing {
  id: number;
  team: TeamId;
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  alpha: number;
  lineWidth: number;
}

export interface ElementalWave {
  id: number;
  team: TeamId;
  x: number;
  y: number;
  vx: number;
  width: number;
  height: number;
  kind: 'fire' | 'ice';
  life: number;
  maxLife: number;
  hitEntityIds: Set<number>;
}

export interface MeatDrop {
  id: number;
  team: TeamId;
  username: string;
  x: number;
  y: number;
  z: number;
  healAmount: number;
  collected: boolean;
  life: number;
}

export interface FloatingText {
  id: number;
  x: number;
  y: number;
  z: number;
  text: string;
  color: string;
  scale: number;
  life: number;
  maxLife: number;
  isCrit?: boolean;
}

export interface PooledParticle {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  kind: 'dust' | 'snow' | 'spark' | 'blood' | 'fire' | 'ice' | 'gold' | 'claw' | 'confetti';
}

export interface EventBannerItem {
  id: number;
  team: TeamId;
  username: string;
  coins: CoinTier;
  giftNameDe: string;
  unitNameDe: string;
  emoji: string;
  text: string;
  timer: number;
  maxTimer: number;
}

export interface DonorRecord {
  username: string;
  team: TeamId;
  totalCoins: number;
  lastGiftTime: number;
}

export interface TeamState {
  id: TeamId;
  nameDe: string;
  hp: number;
  maxHp: number;
  ghostHp: number;
  rage: number; // 0..100
  rageActiveTimer: number; // >0 when 100% rage triggered (8s of 2x speed & lightning aura)
  wins: number;
}

export interface TitanSequenceState {
  active: boolean;
  team: TeamId;
  username: string;
  timer: number;
  duration: number;
  hasStruckFortress: boolean;
  lightningBolts: Array<{ x1: number; y1: number; x2: number; y2: number; alpha: number }>;
}

export interface EnvProp {
  id: number;
  kind:
    | 'savanna_rock'
    | 'acacia_tree'
    | 'pine_tree'
    | 'snow_rock'
    | 'river_boulder'
    | 'lava_rock'
    | 'obsidian_crystal'
    | 'charred_tree'
    | 'palm_tree'
    | 'moss_pillar'
    | 'glow_crystal';
  x: number;
  y: number;
  scale: number;
}

export interface VictoryCelebrationState {
  winnerTeam: TeamId;
  timer: number;
  duration: number;
  fireworkCooldown: number;
}

export interface PodiumEntry {
  rank: 1 | 2 | 3;
  username: string;
  team: TeamId;
  totalCoins: number;
  actions: number;
}

export interface ArenaWorldState {
  state: GameState;
  mapId: ArenaMapId;
  width: number;
  height: number;
  roundTimeRemaining: number;
  roundNumber: number;
  hitstopTimer: number;
  cameraShakeTrauma: number;
  teams: Record<TeamId, TeamState>;
  beasts: BeastEntity[];
  shockwaves: ShockwaveRing[];
  waves: ElementalWave[];
  meatDrops: MeatDrop[];
  floatingTexts: FloatingText[];
  particles: PooledParticle[];
  particleCursor: number;
  donors: Record<string, DonorRecord>;
  viewerParticipants: Record<string, { username: string; team: TeamId; actions: number }>;
  viewerTeams: Record<string, TeamId>;
  viewerLastChatSpawn: Record<string, number>;
  mvp: DonorRecord | null;
  activeBanner: EventBannerItem | null;
  bannerQueue: EventBannerItem[];
  titanSequence: TitanSequenceState | null;
  victoryCelebration: VictoryCelebrationState | null;
  winnerTeam: TeamId | null;
  totalDamageDealt: Record<TeamId, number>;
  totalUnitsSpawned: Record<TeamId, number>;
  envProps: EnvProp[];
  nextEntityId: number;
}

export type TikTokEventType = 'chat_spawn' | 'heal' | 'like' | 'rage_boost' | 'gift';

declare global {
  interface Window {
    triggerTikTokEvent?: (
      type: TikTokEventType,
      team: TeamId | 1 | 2 | '1' | '2' | 'loewe' | 'loewen',
      username?: string,
      coins?: number
    ) => void;
    electronAPI?: {
      openStandalone916Window?: () => void;
      connectTikTokLive?: (username: string) => void;
      onTikTokLiveEvent?: (
        callback: (payload: Record<string, unknown>) => void
      ) => () => void;
    };
  }
}
