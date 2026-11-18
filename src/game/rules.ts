import {
  ArenaMapId,
  ArenaWorldState,
  BeastEntity,
  CoinTier,
  DonorRecord,
  EnvProp,
  EventBannerItem,
  PodiumEntry,
  PooledParticle,
  TeamId,
  UnitArchetype,
} from './types';

export const ARENA_MAP_ROTATION: readonly ArenaMapId[] = [
  'savanna_frost',
  'volcano_obsidian',
  'jungle_ruins',
];

export function getMapForRound(roundNumber: number): ArenaMapId {
  const safeRound = Math.max(1, Math.floor(roundNumber));
  return ARENA_MAP_ROTATION[(safeRound - 1) % ARENA_MAP_ROTATION.length];
}

export function getMapLabelDe(mapId: ArenaMapId): string {
  switch (mapId) {
    case 'savanna_frost':
      return 'Savanne & Nordfrost';
    case 'volcano_obsidian':
      return 'Vulkan & Obsidian';
    case 'jungle_ruins':
      return 'Smaragd & Mondtempel';
  }
}

export const FORTRESS_MAX_HP = 15000;
export const ROUND_DURATION_SECONDS = 600;
export const RAGE_DURATION_SECONDS = 8.5;
export const VICTORY_CELEBRATION_SECONDS = 6.5;
export const RAGE_PER_TAP = 0.1; // 10 Tapps / Likes = 1% Rudel-Wut (1000 Tapps = 100%)
export const PARTICLE_POOL_SIZE = 320;
export const FORTRESS_ARMOR_FACTOR = 0.28;
export const FORTRESS_WALL_HALF_WIDTH = 46;

export function getFortressX(team: TeamId, worldWidth: number): number {
  return team === 'lion' ? Math.round(worldWidth * 0.085) : Math.round(worldWidth * 0.915);
}

export function getFortressOuterWallX(team: TeamId, worldWidth: number): number {
  const centerX = getFortressX(team, worldWidth);
  return team === 'lion'
    ? centerX + FORTRESS_WALL_HALF_WIDTH
    : centerX - FORTRESS_WALL_HALF_WIDTH;
}

export function normalizeTeamInput(
  raw: TeamId | 1 | 2 | '1' | '2' | 'loewe' | 'loewen' | string
): TeamId {
  const s = String(raw).trim().toLowerCase();
  if (s === '2' || s === 'wolf' || s === 'woelfe' || s === 'wölfe') {
    return 'wolf';
  }
  return 'lion';
}

export function normalizeCoinTier(coins?: number): CoinTier {
  if (!coins || coins <= 0) return 0;
  if (coins >= 1000) return 1000;
  if (coins >= 500) return 500;
  if (coins >= 100) return 100;
  if (coins >= 30) return 30;
  if (coins >= 10) return 10;
  if (coins >= 5) return 5;
  return 1;
}

export function getUnitArchetype(team: TeamId, coins: CoinTier): UnitArchetype {
  switch (coins) {
    case 0:
      return team === 'lion'
        ? {
            species: 'lion',
            nameDe: 'SAVANNEN-LÖWE',
            giftNameDe: 'Chat [1]',
            coins: 0,
            emoji: '🦁',
            hp: 135,
            damage: 19,
            speed: 74,
            attackRange: 38,
            attackCooldown: 0.95,
            scale: 1.0,
            knockbackPower: 28,
            mass: 1.0,
            policy: 'brawler',
          }
        : {
            species: 'wolf',
            nameDe: 'SCHATTEN-WOLF',
            giftNameDe: 'Chat [2]',
            coins: 0,
            emoji: '🐺',
            hp: 135,
            damage: 19,
            speed: 74,
            attackRange: 38,
            attackCooldown: 0.95,
            scale: 1.0,
            knockbackPower: 28,
            mass: 1.0,
            policy: 'brawler',
          };

    case 1:
      return {
        species: 'boar',
        nameDe: 'WILDSCHWEIN-RAMMBOCK',
        giftNameDe: 'Rose',
        coins: 1,
        emoji: '🐗',
        hp: 210,
        damage: 32,
        speed: 148,
        attackRange: 40,
        attackCooldown: 0.85,
        scale: 1.12,
        knockbackPower: 95,
        mass: 1.4,
        policy: 'charger',
      };

    case 5:
      return team === 'lion'
        ? {
            species: 'hyena',
            nameDe: 'HYÄNEN-MEUTE',
            giftNameDe: 'Fingerherz',
            coins: 5,
            emoji: '🐾',
            hp: 115,
            damage: 22,
            speed: 112,
            attackRange: 34,
            attackCooldown: 0.65,
            scale: 0.88,
            knockbackPower: 24,
            mass: 0.85,
            policy: 'pack_flanker',
            packCount: 5,
          }
        : {
            species: 'lynx',
            nameDe: 'LUCHS-MEUTE',
            giftNameDe: 'Fingerherz',
            coins: 5,
            emoji: '🐾',
            hp: 115,
            damage: 22,
            speed: 112,
            attackRange: 34,
            attackCooldown: 0.65,
            scale: 0.88,
            knockbackPower: 24,
            mass: 0.85,
            policy: 'pack_flanker',
            packCount: 5,
          };

    case 10:
      return {
        species: 'rhino',
        nameDe: 'PANZER-NASHORN',
        giftNameDe: 'Krone',
        coins: 10,
        emoji: '🦏',
        hp: 580,
        damage: 54,
        speed: 115,
        attackRange: 48,
        attackCooldown: 1.15,
        scale: 1.45,
        knockbackPower: 145,
        mass: 2.8,
        policy: 'charger',
      };

    case 30:
      return team === 'lion'
        ? {
            species: 'gorilla',
            nameDe: 'SILBERRÜCKEN-GORILLA',
            giftNameDe: 'Donut',
            coins: 30,
            emoji: '🦍',
            hp: 1180,
            damage: 88,
            speed: 64,
            attackRange: 58,
            attackCooldown: 1.35,
            scale: 1.78,
            knockbackPower: 165,
            mass: 4.2,
            policy: 'colossus_aoe',
          }
        : {
            species: 'bear',
            nameDe: 'RIESEN-GRIZZLYBÄR',
            giftNameDe: 'Donut',
            coins: 30,
            emoji: '🐻',
            hp: 1180,
            damage: 88,
            speed: 64,
            attackRange: 58,
            attackCooldown: 1.35,
            scale: 1.78,
            knockbackPower: 165,
            mass: 4.2,
            policy: 'colossus_aoe',
          };

    case 100:
      return {
        species: 'mammoth',
        nameDe: 'KRIEGS-MAMMUT',
        giftNameDe: 'Handherz',
        coins: 100,
        emoji: '🦣',
        hp: 2650,
        damage: 145,
        speed: 52,
        attackRange: 74,
        attackCooldown: 1.55,
        scale: 2.35,
        knockbackPower: 230,
        mass: 8.5,
        policy: 'colossus_aoe',
      };

    case 500:
      return team === 'lion'
        ? {
            species: 'phoenix',
            nameDe: 'FEUER-PHÖNIX',
            giftNameDe: 'Geldregen',
            coins: 500,
            emoji: '🦅',
            hp: 1950,
            damage: 130,
            speed: 98,
            attackRange: 110,
            attackCooldown: 1.25,
            scale: 2.05,
            knockbackPower: 120,
            mass: 5.0,
            policy: 'sky_sweeper',
            isFlying: true,
          }
        : {
            species: 'icedragon',
            nameDe: 'EIS-DRACHE',
            giftNameDe: 'Geldregen',
            coins: 500,
            emoji: '🐉',
            hp: 1950,
            damage: 130,
            speed: 98,
            attackRange: 110,
            attackCooldown: 1.25,
            scale: 2.05,
            knockbackPower: 120,
            mass: 5.0,
            policy: 'sky_sweeper',
            isFlying: true,
          };

    case 1000:
      return {
        species: 'titan',
        nameDe: 'GIGANTEN-TITAN (MEGA-KONG)',
        giftNameDe: 'Galaxie',
        coins: 1000,
        emoji: '⚡',
        hp: 9999,
        damage: 9999,
        speed: 85,
        attackRange: 250,
        attackCooldown: 0.8,
        scale: 3.3,
        knockbackPower: 420,
        mass: 25.0,
        policy: 'titan_nuke',
      };
  }
}

export function createEnvironmentProps(
  width: number,
  height: number,
  mapId: ArenaMapId = 'savanna_frost'
): EnvProp[] {
  const topY = height * 0.22;
  const botY = height * 0.88;

  if (mapId === 'volcano_obsidian') {
    return [
      { id: 1, kind: 'charred_tree', x: width * 0.21, y: topY + 18, scale: 1.05 },
      { id: 2, kind: 'lava_rock', x: width * 0.28, y: botY - 12, scale: 0.96 },
      { id: 3, kind: 'charred_tree', x: width * 0.34, y: botY + 8, scale: 0.9 },
      { id: 4, kind: 'lava_rock', x: width * 0.18, y: height * 0.78, scale: 0.85 },
      { id: 5, kind: 'lava_rock', x: width * 0.47, y: topY + 26, scale: 0.9 },
      { id: 6, kind: 'obsidian_crystal', x: width * 0.53, y: botY - 8, scale: 0.98 },
      { id: 7, kind: 'obsidian_crystal', x: width * 0.79, y: topY + 18, scale: 1.12 },
      { id: 8, kind: 'obsidian_crystal', x: width * 0.72, y: botY - 14, scale: 0.95 },
      { id: 9, kind: 'charred_tree', x: width * 0.66, y: botY + 10, scale: 0.92 },
      { id: 10, kind: 'obsidian_crystal', x: width * 0.83, y: height * 0.81, scale: 1.0 },
    ];
  }

  if (mapId === 'jungle_ruins') {
    return [
      { id: 1, kind: 'palm_tree', x: width * 0.21, y: topY + 18, scale: 1.06 },
      { id: 2, kind: 'moss_pillar', x: width * 0.28, y: botY - 12, scale: 0.95 },
      { id: 3, kind: 'palm_tree', x: width * 0.34, y: botY + 8, scale: 0.9 },
      { id: 4, kind: 'river_boulder', x: width * 0.18, y: height * 0.78, scale: 0.85 },
      { id: 5, kind: 'river_boulder', x: width * 0.47, y: topY + 26, scale: 0.9 },
      { id: 6, kind: 'moss_pillar', x: width * 0.53, y: botY - 8, scale: 0.96 },
      { id: 7, kind: 'palm_tree', x: width * 0.79, y: topY + 16, scale: 1.08 },
      { id: 8, kind: 'glow_crystal', x: width * 0.72, y: botY - 14, scale: 0.98 },
      { id: 9, kind: 'moss_pillar', x: width * 0.66, y: botY + 10, scale: 0.94 },
      { id: 10, kind: 'glow_crystal', x: width * 0.83, y: height * 0.81, scale: 1.0 },
    ];
  }

  return [
    { id: 1, kind: 'acacia_tree', x: width * 0.21, y: topY + 18, scale: 1.05 },
    { id: 2, kind: 'savanna_rock', x: width * 0.28, y: botY - 12, scale: 0.95 },
    { id: 3, kind: 'acacia_tree', x: width * 0.34, y: botY + 8, scale: 0.88 },
    { id: 4, kind: 'savanna_rock', x: width * 0.18, y: height * 0.78, scale: 0.82 },
    { id: 5, kind: 'river_boulder', x: width * 0.47, y: topY + 26, scale: 0.9 },
    { id: 6, kind: 'river_boulder', x: width * 0.53, y: botY - 8, scale: 1.0 },
    { id: 7, kind: 'pine_tree', x: width * 0.79, y: topY + 16, scale: 1.1 },
    { id: 8, kind: 'snow_rock', x: width * 0.72, y: botY - 14, scale: 0.95 },
    { id: 9, kind: 'pine_tree', x: width * 0.66, y: botY + 10, scale: 0.92 },
    { id: 10, kind: 'pine_tree', x: width * 0.83, y: height * 0.81, scale: 0.96 },
  ];
}

export function createInitialParticlePool(): PooledParticle[] {
  const pool: PooledParticle[] = [];
  for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
    pool.push({
      active: false,
      x: 0,
      y: 0,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      size: 3,
      color: '#ffffff',
      alpha: 0,
      life: 0,
      maxLife: 1,
      kind: 'dust',
    });
  }
  return pool;
}

export function createInitialWorldState(width = 760, height = 520): ArenaWorldState {
  const initialMap = getMapForRound(1);
  return {
    state: 'title',
    mapId: initialMap,
    width,
    height,
    roundTimeRemaining: ROUND_DURATION_SECONDS,
    roundNumber: 1,
    hitstopTimer: 0,
    cameraShakeTrauma: 0,
    teams: {
      lion: {
        id: 'lion',
        nameDe: 'TEAM LÖWE',
        hp: FORTRESS_MAX_HP,
        maxHp: FORTRESS_MAX_HP,
        ghostHp: FORTRESS_MAX_HP,
        rage: 0,
        rageActiveTimer: 0,
        wins: 0,
      },
      wolf: {
        id: 'wolf',
        nameDe: 'TEAM WOLF',
        hp: FORTRESS_MAX_HP,
        maxHp: FORTRESS_MAX_HP,
        ghostHp: FORTRESS_MAX_HP,
        rage: 0,
        rageActiveTimer: 0,
        wins: 0,
      },
    },
    beasts: [],
    shockwaves: [],
    waves: [],
    meatDrops: [],
    floatingTexts: [],
    particles: createInitialParticlePool(),
    particleCursor: 0,
    donors: {},
    viewerParticipants: {},
    viewerTeams: {},
    viewerLastChatSpawn: {},
    mvp: null,
    activeBanner: null,
    bannerQueue: [],
    titanSequence: null,
    victoryCelebration: null,
    winnerTeam: null,
    totalDamageDealt: { lion: 0, wolf: 0 },
    totalUnitsSpawned: { lion: 0, wolf: 0 },
    envProps: createEnvironmentProps(width, height, initialMap),
    nextEntityId: 1,
  };
}

export function normalizeViewerKey(username: string): string {
  return username.trim().toLowerCase();
}

/**
 * Registers a viewer's team choice when they write 1 or 2 in chat.
 * Once a viewer has chosen a team in the round, they belong to that team
 * so all their spawns, coins, and buffs apply strictly to their chosen team.
 */
export function registerViewerTeam(
  world: ArenaWorldState,
  username: string,
  chosenTeam: TeamId,
  allowSwitch = false
): TeamId {
  const key = normalizeViewerKey(username);
  if (!key) return chosenTeam;
  const existing = world.viewerTeams[key];
  if (existing && !allowSwitch) {
    return existing;
  }
  world.viewerTeams[key] = chosenTeam;
  return chosenTeam;
}

/**
 * Resolves the team for a viewer's action (gift, !heilen, like/rage buff).
 * Always returns the team the viewer chose in chat (1 = Löwe, 2 = Wolf),
 * or binds them to fallbackTeam if they haven't typed 1 or 2 yet.
 */
export function resolveViewerTeam(
  world: ArenaWorldState,
  username: string,
  fallbackTeam: TeamId
): TeamId {
  const key = normalizeViewerKey(username);
  if (!key) return fallbackTeam;
  const boundTeam = world.viewerTeams[key];
  if (boundTeam) {
    return boundTeam;
  }
  world.viewerTeams[key] = fallbackTeam;
  return fallbackTeam;
}

export const CHAT_SPAWN_COOLDOWN_MS = 15_000;

/**
 * Returns the remaining cooldown in milliseconds before a viewer can trigger another free [1] or [2] chat spawn.
 */
export function getViewerChatCooldownRemainingMs(
  world: ArenaWorldState,
  username: string,
  nowMs = Date.now()
): number {
  const key = normalizeViewerKey(username);
  if (!key) return 0;
  const lastTime = world.viewerLastChatSpawn[key];
  if (lastTime === undefined) return 0;
  const elapsed = nowMs - lastTime;
  return elapsed < CHAT_SPAWN_COOLDOWN_MS ? CHAT_SPAWN_COOLDOWN_MS - elapsed : 0;
}

export function resetRoundState(world: ArenaWorldState): void {
  world.mapId = getMapForRound(world.roundNumber);
  world.envProps = createEnvironmentProps(world.width, world.height, world.mapId);
  world.roundTimeRemaining = ROUND_DURATION_SECONDS;
  world.hitstopTimer = 0;
  world.cameraShakeTrauma = 0;
  world.teams.lion.hp = FORTRESS_MAX_HP;
  world.teams.lion.ghostHp = FORTRESS_MAX_HP;
  world.teams.lion.rage = 0;
  world.teams.lion.rageActiveTimer = 0;

  world.teams.wolf.hp = FORTRESS_MAX_HP;
  world.teams.wolf.ghostHp = FORTRESS_MAX_HP;
  world.teams.wolf.rage = 0;
  world.teams.wolf.rageActiveTimer = 0;

  world.beasts = [];
  world.shockwaves = [];
  world.waves = [];
  world.meatDrops = [];
  world.floatingTexts = [];
  world.viewerParticipants = {};
  world.viewerTeams = {};
  world.viewerLastChatSpawn = {};
  world.titanSequence = null;
  world.victoryCelebration = null;
  world.winnerTeam = null;
  world.activeBanner = null;
  world.bannerQueue = [];
  world.totalDamageDealt = { lion: 0, wolf: 0 };
  world.totalUnitsSpawned = { lion: 0, wolf: 0 };
}

/**
 * Completely resets the entire game (all rounds, wins, MVP throne, donors, viewer teams, and entities).
 */
export function resetAllGameState(world: ArenaWorldState): void {
  world.roundNumber = 1;
  world.teams.lion.wins = 0;
  world.teams.wolf.wins = 0;
  world.donors = {};
  world.mvp = null;
  resetRoundState(world);
}

export function emitPooledParticle(
  world: ArenaWorldState,
  opts: Omit<PooledParticle, 'active'>
): void {
  const p = world.particles[world.particleCursor];
  world.particleCursor = (world.particleCursor + 1) % world.particles.length;
  p.active = true;
  p.x = opts.x;
  p.y = opts.y;
  p.z = opts.z;
  p.vx = opts.vx;
  p.vy = opts.vy;
  p.vz = opts.vz;
  p.size = opts.size;
  p.color = opts.color;
  p.alpha = opts.alpha;
  p.life = opts.life;
  p.maxLife = opts.maxLife;
  p.kind = opts.kind;
}

export function addFloatingText(
  world: ArenaWorldState,
  x: number,
  y: number,
  z: number,
  text: string,
  color: string,
  scale = 1,
  isCrit = false
): void {
  if (world.floatingTexts.length > 42) {
    world.floatingTexts.shift();
  }
  world.floatingTexts.push({
    id: world.nextEntityId++,
    x,
    y,
    z,
    text,
    color,
    scale,
    life: 0,
    maxLife: isCrit ? 1.15 : 0.85,
    isCrit,
  });
}

export function recordDonationAndUpdateMVP(
  world: ArenaWorldState,
  username: string,
  team: TeamId,
  coins: number,
  forceMvpThrone = false
): DonorRecord {
  const cleanName = username.trim() || (team === 'lion' ? 'LöwenHerz' : 'NordWolf');
  const effectiveTeam = resolveViewerTeam(world, cleanName, team);
  const existing = world.donors[cleanName];
  const now = Date.now();
  let newTotal = (existing ? existing.totalCoins : 0) + coins;

  if (forceMvpThrone && world.mvp && world.mvp.username !== cleanName) {
    if (newTotal <= world.mvp.totalCoins) {
      newTotal = world.mvp.totalCoins + Math.max(100, coins);
    }
  }

  const record: DonorRecord = {
    username: cleanName,
    team: effectiveTeam,
    totalCoins: newTotal,
    lastGiftTime: now,
  };
  world.donors[cleanName] = record;

  let best: DonorRecord | null = null;
  for (const key of Object.keys(world.donors)) {
    const d = world.donors[key];
    if (
      !best ||
      d.totalCoins > best.totalCoins ||
      (d.totalCoins === best.totalCoins && d.lastGiftTime >= best.lastGiftTime)
    ) {
      best = d;
    }
  }
  world.mvp = best;
  return record;
}

export function recordViewerParticipation(
  world: ArenaWorldState,
  rawUsername: string,
  team: TeamId,
  weight = 1
): void {
  const cleanName = rawUsername.trim();
  const key = normalizeViewerKey(cleanName);
  if (!key) return;
  const existing = world.viewerParticipants[key];
  if (existing) {
    existing.actions += weight;
    existing.team = team;
  } else {
    world.viewerParticipants[key] = {
      username: cleanName,
      team,
      actions: weight,
    };
  }
}

/**
 * Returns the Top 3 viewers for the victory podium, prioritizing Coin donors first,
 * then filling remaining podium slots with active chat/heal/like participants.
 */
export function getTopPodiumViewers(
  world: ArenaWorldState,
  limit = 3
): PodiumEntry[] {
  const donorByKey = new Map<string, DonorRecord>();
  for (const key of Object.keys(world.donors)) {
    const d = world.donors[key];
    donorByKey.set(normalizeViewerKey(d.username), d);
  }

  const combined = new Map<
    string,
    { username: string; team: TeamId; totalCoins: number; actions: number }
  >();

  for (const [k, d] of donorByKey.entries()) {
    combined.set(k, {
      username: d.username,
      team: d.team,
      totalCoins: d.totalCoins,
      actions: world.viewerParticipants[k]?.actions ?? 0,
    });
  }

  for (const key of Object.keys(world.viewerParticipants)) {
    const p = world.viewerParticipants[key];
    if (!combined.has(key)) {
      combined.set(key, {
        username: p.username,
        team: p.team,
        totalCoins: 0,
        actions: p.actions,
      });
    }
  }

  const sorted = Array.from(combined.values()).sort((a, b) => {
    if (b.totalCoins !== a.totalCoins) return b.totalCoins - a.totalCoins;
    return b.actions - a.actions;
  });

  return sorted.slice(0, limit).map((item, idx) => ({
    rank: (idx + 1) as 1 | 2 | 3,
    username: item.username,
    team: item.team,
    totalCoins: item.totalCoins,
    actions: item.actions,
  }));
}

export function emitTeamConfettiBurst(
  world: ArenaWorldState,
  team: TeamId,
  originX: number,
  originY: number,
  originZ: number,
  count = 28
): void {
  const palette =
    team === 'lion'
      ? ['#facc15', '#f59e0b', '#fb923c', '#fef08a', '#ffffff']
      : ['#38bdf8', '#0ea5e9', '#a5f3fc', '#facc15', '#ffffff'];

  for (let i = 0; i < count; i++) {
    const angle = (Math.random() - 0.5) * Math.PI * 1.8;
    const speed = 65 + Math.random() * 145;
    const isSpark = i % 5 === 0;
    emitPooledParticle(world, {
      x: originX + (Math.random() - 0.5) * 18,
      y: originY + (Math.random() - 0.5) * 16,
      z: originZ,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed * 0.45,
      vz: 85 + Math.random() * 150,
      size: isSpark ? 3.5 : 4.5 + Math.random() * 3,
      color: palette[i % palette.length],
      alpha: 1,
      life: 0,
      maxLife: isSpark ? 0.75 : 2.1 + Math.random() * 1.1,
      kind: isSpark ? 'spark' : 'confetti',
    });
  }
}

export function triggerVictoryCelebration(
  world: ArenaWorldState,
  winnerTeam: TeamId
): void {
  world.winnerTeam = winnerTeam;
  world.teams[winnerTeam].wins += 1;
  world.state = 'gameover';
  world.cameraShakeTrauma = Math.max(world.cameraShakeTrauma, 0.85);
  world.victoryCelebration = {
    winnerTeam,
    timer: 0,
    duration: VICTORY_CELEBRATION_SECONDS,
    fireworkCooldown: 0.28,
  };

  // Initial celebratory confetti & firework salvo across left, center, and right
  emitTeamConfettiBurst(world, winnerTeam, world.width * 0.25, world.height * 0.56, 130, 34);
  emitTeamConfettiBurst(world, winnerTeam, world.width * 0.5, world.height * 0.52, 160, 42);
  emitTeamConfettiBurst(world, winnerTeam, world.width * 0.75, world.height * 0.56, 130, 34);
}

export function enqueueEventBanner(
  world: ArenaWorldState,
  team: TeamId,
  username: string,
  arch: UnitArchetype
): EventBannerItem {
  const upperUser = username.toUpperCase();
  const text = `🚨 ${upperUser} SPENDET ${arch.coins} ${
    arch.coins === 1 ? 'COIN' : 'COINS'
  } (${arch.giftNameDe.toUpperCase()}) -> ${arch.nameDe} BETRITT DIE ARENA!`;

  const item: EventBannerItem = {
    id: world.nextEntityId++,
    team,
    username,
    coins: arch.coins,
    giftNameDe: arch.giftNameDe,
    unitNameDe: arch.nameDe,
    emoji: arch.emoji,
    text,
    timer: 0,
    maxTimer: arch.coins >= 100 ? 4.2 : 3.0,
  };

  if (!world.activeBanner || arch.coins >= world.activeBanner.coins) {
    world.activeBanner = item;
  } else {
    world.bannerQueue.push(item);
  }
  return item;
}

export function addTeamRage(
  world: ArenaWorldState,
  team: TeamId,
  amount: number,
  username?: string
): boolean {
  const effectiveTeam = username
    ? resolveViewerTeam(world, username, team)
    : team;
  if (username) {
    recordViewerParticipation(world, username, effectiveTeam, 1);
  }
  const t = world.teams[effectiveTeam];
  if (t.rageActiveTimer > 0) {
    t.rage = 100;
    return false;
  }
  t.rage = Math.min(100, Math.round((t.rage + amount) * 100) / 100);
  if (t.rage >= 100) {
    t.rage = 100;
    t.rageActiveTimer = RAGE_DURATION_SECONDS;
    world.cameraShakeTrauma = Math.min(1, world.cameraShakeTrauma + 0.35);
    const fxX = effectiveTeam === 'lion' ? world.width * 0.28 : world.width * 0.72;
    const teamTitle = effectiveTeam === 'lion' ? 'LÖWEN-WUT' : 'WOLFS-WUT';
    addFloatingText(
      world,
      fxX,
      world.height * 0.5,
      55,
      `⚡ ${teamTitle} 100%! 2x TEMPO!`,
      '#facc15',
      1.35,
      true
    );
    return true;
  }
  return false;
}

export function spawnMeatDrop(
  world: ArenaWorldState,
  team: TeamId,
  username: string
): void {
  const cleanName = username.trim() || 'Heiler';
  const effectiveTeam = resolveViewerTeam(world, cleanName, team);
  recordViewerParticipation(world, cleanName, effectiveTeam, 2);
  const baseX = effectiveTeam === 'lion' ? world.width * 0.32 : world.width * 0.68;
  const x = baseX + (Math.random() - 0.5) * (world.width * 0.16);
  const y = world.height * 0.36 + Math.random() * (world.height * 0.38);

  world.meatDrops.push({
    id: world.nextEntityId++,
    team: effectiveTeam,
    username: cleanName,
    x,
    y,
    z: 140,
    healAmount: 85,
    collected: false,
    life: 0,
  });

  // Immediately heal ONLY allied beasts of effectiveTeam nearby
  for (const b of world.beasts) {
    if (b.team === effectiveTeam && b.alive && b.koTimer === 0) {
      b.hp = Math.min(b.maxHp, b.hp + 25);
    }
  }
  const teamLabel = effectiveTeam === 'lion' ? 'Team Löwe' : 'Team Wolf';
  addFloatingText(
    world,
    x,
    y,
    60,
    `🥩 !heilen ${teamLabel} (${cleanName})`,
    '#4ade80',
    1.05,
    false
  );
}

export function spawnPackPupBot(world: ArenaWorldState, team: TeamId): BeastEntity {
  const spawnBaseX =
    team === 'lion'
      ? getFortressOuterWallX('lion', world.width) + 10
      : getFortressOuterWallX('wolf', world.width) - 10;
  const centerY = world.height * 0.56;
  const laneSpan = world.height * 0.3;
  const yPos = Math.max(
    world.height * 0.35,
    Math.min(world.height * 0.83, centerY + (Math.random() - 0.5) * laneSpan)
  );

  const pup: BeastEntity = {
    id: world.nextEntityId++,
    team,
    species: team === 'lion' ? 'lion_pup' : 'wolf_pup',
    username: '', // Important: No viewer name for Rudel-Welpen bots!
    isBotPup: true,
    coins: 0,
    emoji: team === 'lion' ? '🦁' : '🐺',
    labelDe: team === 'lion' ? 'LÖWEN-WELPE' : 'WOLFS-WELPE',
    x: spawnBaseX,
    y: yPos,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    hp: 105,
    maxHp: 105,
    damage: 11,
    speed: 62,
    attackRange: 30,
    attackCooldown: 1.15,
    attackTimer: Math.random() * 0.35,
    windupTimer: 0,
    attackAnimProgress: 0,
    hitFlashTimer: 0,
    walkPhase: Math.random() * Math.PI * 2,
    scale: 0.72,
    knockbackPower: 14,
    mass: 0.65,
    policy: 'brawler',
    isFlying: false,
    hasDealtChargeHit: false,
    koTimer: 0,
    alive: true,
    targetId: null,
  };

  world.beasts.push(pup);
  world.totalUnitsSpawned[team] += 1;
  return pup;
}

export function spawnUnitByCoinTier(
  world: ArenaWorldState,
  rawTeam: TeamId,
  rawUsername: string,
  rawCoins: number,
  nowMs = Date.now()
): BeastEntity[] {
  const coins = normalizeCoinTier(rawCoins);
  const username = rawUsername.trim() || (rawTeam === 'lion' ? 'LöwenFan' : 'WolfsRudler');
  // Enforce viewer's chosen team! If they typed 1 or 2 in chat, all their spawns & coins belong to that team.
  const team = resolveViewerTeam(world, username, rawTeam);
  recordViewerParticipation(world, username, team, coins > 0 ? Math.max(3, coins) : 2);

  // Enforce 15-second cooldown on free chat [1] / [2] spawns!
  if (coins === 0) {
    const remainingMs = getViewerChatCooldownRemainingMs(world, username, nowMs);
    if (remainingMs > 0) {
      const waitSecs = Math.ceil(remainingMs / 1000);
      const fxX =
        team === 'lion'
          ? getFortressX('lion', world.width) + 75
          : getFortressX('wolf', world.width) - 75;
      addFloatingText(
        world,
        fxX,
        world.height * 0.45,
        45,
        `⏳ ${username}: ${waitSecs}s Cooldown`,
        '#cbd5e1',
        0.9,
        false
      );
      return [];
    }
    const key = normalizeViewerKey(username);
    if (key) {
      world.viewerLastChatSpawn[key] = nowMs;
    }
  }

  const arch = getUnitArchetype(team, coins);

  if (coins > 0) {
    recordDonationAndUpdateMVP(world, username, team, coins, coins === 1000);
    enqueueEventBanner(world, team, username, arch);
  }

  const dir = team === 'lion' ? 1 : -1;
  const spawnBaseX =
    team === 'lion'
      ? getFortressOuterWallX('lion', world.width) + 12
      : getFortressOuterWallX('wolf', world.width) - 12;
  const centerY = world.height * 0.56;
  const laneSpan = world.height * 0.34;

  // 1000 Coins triggers the Titan Nuke Sequence + spawns the colossal Titan in center
  if (coins === 1000) {
    world.titanSequence = {
      active: true,
      team,
      username,
      timer: 0,
      duration: 3.4,
      hasStruckFortress: false,
      lightningBolts: [],
    };
    world.cameraShakeTrauma = 1.0;
    const titan: BeastEntity = {
      id: world.nextEntityId++,
      team,
      species: arch.species,
      username,
      coins,
      emoji: arch.emoji,
      labelDe: arch.nameDe,
      x: world.width * 0.5 - dir * 55,
      y: centerY,
      z: 220, // stamps down from the sky!
      vx: dir * 30,
      vy: 0,
      vz: -380,
      hp: arch.hp,
      maxHp: arch.hp,
      damage: arch.damage,
      speed: arch.speed,
      attackRange: arch.attackRange,
      attackCooldown: arch.attackCooldown,
      attackTimer: 0,
      windupTimer: 0,
      attackAnimProgress: 0,
      hitFlashTimer: 0,
      walkPhase: 0,
      scale: arch.scale,
      knockbackPower: arch.knockbackPower,
      mass: arch.mass,
      policy: arch.policy,
      isFlying: false,
      hasDealtChargeHit: false,
      koTimer: 0,
      alive: true,
      targetId: null,
    };
    world.beasts.push(titan);
    world.totalUnitsSpawned[team] += 1;
    return [titan];
  }

  // 5 Coins spawns a 5-unit V-formation pack
  const count = arch.packCount ?? 1;
  const spawned: BeastEntity[] = [];

  for (let i = 0; i < count; i++) {
    let offsetX = 0;
    let offsetY = (Math.random() - 0.5) * laneSpan;

    if (count === 5) {
      // V-formation offsets
      const rank = Math.floor((i + 1) / 2); // 0, 1, 1, 2, 2
      const side = i === 0 ? 0 : i % 2 === 1 ? -1 : 1;
      offsetX = -dir * rank * 24;
      offsetY = side * rank * 28;
    }

    const yPos = Math.max(
      world.height * 0.34,
      Math.min(world.height * 0.84, centerY + offsetY)
    );

    const entity: BeastEntity = {
      id: world.nextEntityId++,
      team,
      species: arch.species,
      username,
      coins,
      emoji: arch.emoji,
      labelDe: arch.nameDe,
      x: spawnBaseX + offsetX,
      y: yPos,
      z: arch.isFlying ? 68 : 0,
      vx: 0,
      vy: 0,
      vz: 0,
      hp: arch.hp,
      maxHp: arch.hp,
      damage: arch.damage,
      speed: arch.speed,
      attackRange: arch.attackRange,
      attackCooldown: arch.attackCooldown,
      attackTimer: Math.random() * 0.25,
      windupTimer: 0,
      attackAnimProgress: 0,
      hitFlashTimer: 0,
      walkPhase: Math.random() * Math.PI * 2,
      scale: arch.scale,
      knockbackPower: arch.knockbackPower,
      mass: arch.mass,
      policy: arch.policy,
      isFlying: Boolean(arch.isFlying),
      hasDealtChargeHit: false,
      koTimer: 0,
      alive: true,
      targetId: null,
    };

    world.beasts.push(entity);
    spawned.push(entity);
  }

  world.totalUnitsSpawned[team] += count;
  if (coins >= 30) {
    world.cameraShakeTrauma = Math.min(1, world.cameraShakeTrauma + (coins >= 100 ? 0.55 : 0.3));
  }
  return spawned;
}

export interface SimStepEvents {
  heavyHitOccurred: boolean;
  boarChargeHit: boolean;
  colossusSlamOccurred: boolean;
  elementalWaveFired: 'fire' | 'ice' | null;
  titanThunderStrike: boolean;
  roundWonBy: TeamId | null;
  autoRestartRound: boolean;
}

export function stepArenaSimulation(world: ArenaWorldState, rawDt: number): SimStepEvents {
  const dt = Math.min(Math.max(rawDt, 0.001), 0.05);
  const events: SimStepEvents = {
    heavyHitOccurred: false,
    boarChargeHit: false,
    colossusSlamOccurred: false,
    elementalWaveFired: null,
    titanThunderStrike: false,
    roundWonBy: null,
    autoRestartRound: false,
  };

  // Decay camera shake trauma and hitstop in real dt
  world.cameraShakeTrauma = Math.max(0, world.cameraShakeTrauma - dt * 1.45);
  if (world.hitstopTimer > 0) {
    world.hitstopTimer = Math.max(0, world.hitstopTimer - dt);
  }

  // Banner timer
  if (world.activeBanner) {
    world.activeBanner.timer += dt;
    if (world.activeBanner.timer >= world.activeBanner.maxTimer) {
      world.activeBanner = world.bannerQueue.shift() || null;
    }
  } else if (world.bannerQueue.length > 0) {
    world.activeBanner = world.bannerQueue.shift() || null;
  }

  // Trailing ghost HP bars for both fortresses
  for (const teamId of ['lion', 'wolf'] as const) {
    const t = world.teams[teamId];
    if (t.ghostHp > t.hp) {
      t.ghostHp = Math.max(t.hp, t.ghostHp - dt * 420);
    } else {
      t.ghostHp = t.hp;
    }
    if (t.rageActiveTimer > 0) {
      t.rageActiveTimer = Math.max(0, t.rageActiveTimer - dt);
      t.rage = (t.rageActiveTimer / RAGE_DURATION_SECONDS) * 100;
    }
  }

  // Victory Fireworks + Confetti + Top Viewer Podium phase -> seamless auto-restart!
  if (world.state === 'gameover') {
    for (let i = world.shockwaves.length - 1; i >= 0; i--) {
      const sw = world.shockwaves[i];
      sw.radius += dt * 340;
      sw.alpha = Math.max(0, 1 - sw.radius / sw.maxRadius);
      if (sw.radius >= sw.maxRadius) {
        world.shockwaves.splice(i, 1);
      }
    }

    for (let i = 0; i < world.particles.length; i++) {
      const p = world.particles[i];
      if (!p.active) continue;
      p.life += dt;
      if (p.life >= p.maxLife) {
        p.active = false;
        continue;
      }
      if (p.kind === 'confetti') {
        p.vx *= Math.pow(0.25, dt);
        p.x += (p.vx + Math.sin(p.life * 8 + p.y * 0.05) * 32) * dt;
        p.y += p.vy * dt;
        p.z = Math.max(0, p.z + p.vz * dt);
        p.vz -= 52 * dt;
        const progress = p.life / p.maxLife;
        p.alpha = progress < 0.72 ? 1 : 1 - (progress - 0.72) / 0.28;
      } else {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.z = Math.max(0, p.z + p.vz * dt);
        p.vz -= 90 * dt;
        p.alpha = 1 - p.life / p.maxLife;
      }
    }

    for (let i = world.floatingTexts.length - 1; i >= 0; i--) {
      const ft = world.floatingTexts[i];
      ft.life += dt;
      ft.z += dt * 36;
      if (ft.life >= ft.maxLife) {
        world.floatingTexts.splice(i, 1);
      }
    }

    if (world.victoryCelebration) {
      const cel = world.victoryCelebration;
      cel.timer += dt;
      cel.fireworkCooldown -= dt;
      if (cel.fireworkCooldown <= 0 && cel.timer < cel.duration - 0.8) {
        cel.fireworkCooldown = 0.36;
        const fxX = world.width * (0.14 + Math.random() * 0.72);
        const fxY = world.height * (0.44 + Math.random() * 0.24);
        const fxZ = 105 + Math.random() * 85;
        emitTeamConfettiBurst(world, cel.winnerTeam, fxX, fxY, fxZ, 26);
      }
      if (cel.timer >= cel.duration) {
        world.roundNumber += 1;
        resetRoundState(world);
        world.state = 'playing';
        events.autoRestartRound = true;
        addFloatingText(
          world,
          world.width * 0.5,
          world.height * 0.44,
          40,
          `🗺️ RUNDE ${world.roundNumber}: ${getMapLabelDe(world.mapId).toUpperCase()}!`,
          '#fde047',
          1.25,
          true
        );
      }
    }
    return events;
  }

  if (world.state !== 'playing') {
    return events;
  }

  // Handle 1,000-Coin Titan Sequence
  if (world.titanSequence && world.titanSequence.active) {
    const seq = world.titanSequence;
    seq.timer += dt;

    // Generate lightning bolts randomly
    if (Math.random() < dt * 14) {
      seq.lightningBolts.push({
        x1: world.width * (0.15 + Math.random() * 0.7),
        y1: 0,
        x2: world.width * (0.15 + Math.random() * 0.7),
        y2: world.height * (0.45 + Math.random() * 0.4),
        alpha: 1.0,
      });
      events.titanThunderStrike = true;
    }
    for (let i = seq.lightningBolts.length - 1; i >= 0; i--) {
      seq.lightningBolts[i].alpha -= dt * 3.5;
      if (seq.lightningBolts[i].alpha <= 0) {
        seq.lightningBolts.splice(i, 1);
      }
    }

    const enemyTeam: TeamId = seq.team === 'lion' ? 'wolf' : 'lion';
    const enemyFortressX = getFortressX(enemyTeam, world.width);

    if (seq.timer >= 1.55 && !seq.hasStruckFortress) {
      seq.hasStruckFortress = true;
      world.cameraShakeTrauma = 1.0;
      world.hitstopTimer = 0.08;
      events.titanThunderStrike = true;
      events.colossusSlamOccurred = true;

      // Mega shockwave ring across the entire arena
      world.shockwaves.push({
        id: world.nextEntityId++,
        team: seq.team,
        x: world.width * 0.5,
        y: world.height * 0.58,
        radius: 20,
        maxRadius: world.width * 0.85,
        color: '#facc15',
        alpha: 1.0,
        lineWidth: 12,
      });

      // Launch all enemy units into the air and KO them
      for (const b of world.beasts) {
        if (b.team === enemyTeam && b.alive) {
          b.hp = 0;
          b.koTimer = 0.45;
          b.vz = 260;
          b.vx = (enemyTeam === 'lion' ? -1 : 1) * 280;
        }
      }

      // Destroy enemy fortress immediately
      const dmg = world.teams[enemyTeam].hp;
      world.teams[enemyTeam].hp = 0;
      world.totalDamageDealt[seq.team] += dmg;

      addFloatingText(
        world,
        enemyFortressX,
        world.height * 0.44,
        75,
        '⚡ GIGANTEN-ZERSTÖRUNG! -15000!',
        '#facc15',
        1.55,
        true
      );
    }

    if (seq.timer >= 2.35 && world.teams[enemyTeam].hp <= 0 && !world.winnerTeam) {
      seq.active = false;
      triggerVictoryCelebration(world, seq.team);
      events.roundWonBy = seq.team;
      return events;
    }
  }

  const simDt = world.hitstopTimer > 0 ? dt * 0.12 : dt;

  // Update Meat Drops (!heilen)
  for (let i = world.meatDrops.length - 1; i >= 0; i--) {
    const m = world.meatDrops[i];
    m.life += simDt;
    if (m.z > 0) {
      m.z = Math.max(0, m.z - simDt * 185);
      if (m.z === 0) {
        // Upon landing, heal friendly units in radius + fortress slightly
        for (const b of world.beasts) {
          if (b.team === m.team && b.alive && b.koTimer === 0) {
            const dist = Math.hypot(b.x - m.x, b.y - m.y);
            if (dist < 130) {
              b.hp = Math.min(b.maxHp, b.hp + m.healAmount);
              addFloatingText(world, b.x, b.y, b.z + 32, `+${m.healAmount} HP`, '#4ade80', 0.95);
            }
          }
        }
        const teamState = world.teams[m.team];
        teamState.hp = Math.min(teamState.maxHp, teamState.hp + 90);
      }
    }
    if (m.life >= 2.8) {
      world.meatDrops.splice(i, 1);
    }
  }

  // Update Shockwave Rings
  for (let i = world.shockwaves.length - 1; i >= 0; i--) {
    const sw = world.shockwaves[i];
    sw.radius += simDt * 340;
    sw.alpha = Math.max(0, 1 - sw.radius / sw.maxRadius);
    if (sw.radius >= sw.maxRadius) {
      world.shockwaves.splice(i, 1);
    }
  }

  // Update Elemental Waves (500 Coins Phoenix Fire / Dragon Ice Roller)
  for (let i = world.waves.length - 1; i >= 0; i--) {
    const w = world.waves[i];
    w.life += simDt;
    w.x += w.vx * simDt;

    for (const b of world.beasts) {
      if (!b.alive || b.koTimer > 0 || w.hitEntityIds.has(b.id)) continue;
      if (Math.abs(b.x - w.x) < w.width * 0.65 && Math.abs(b.y - w.y) < w.height * 0.65) {
        w.hitEntityIds.add(b.id);
        if (b.team === w.team) {
          // Heal allied beast!
          const heal = 95;
          b.hp = Math.min(b.maxHp, b.hp + heal);
          addFloatingText(world, b.x, b.y, b.z + 36, `+${heal} HEILUNG`, '#4ade80', 1.0);
        } else {
          // Burn / Freeze enemy beast!
          const dmg = 115;
          b.hp -= dmg;
          b.hitFlashTimer = 0.09;
          b.vx += (w.team === 'lion' ? 1 : -1) * 95;
          world.totalDamageDealt[w.team] += dmg;
          addFloatingText(
            world,
            b.x,
            b.y,
            b.z + 38,
            w.kind === 'fire' ? `🔥 -${dmg}!` : `❄️ -${dmg}!`,
            w.kind === 'fire' ? '#fb923c' : '#38bdf8',
            1.15,
            true
          );
          if (b.hp <= 0) {
            b.hp = 0;
            b.koTimer = 0.38;
            b.vz = 110;
          }
        }
      }
    }

    if (w.life >= w.maxLife || w.x < 30 || w.x > world.width - 30) {
      world.waves.splice(i, 1);
    }
  }

  // Update Beasts
  const minY = world.height * 0.32;
  const maxY = world.height * 0.86;

  for (let i = world.beasts.length - 1; i >= 0; i--) {
    const b = world.beasts[i];

    if (b.hitFlashTimer > 0) {
      b.hitFlashTimer = Math.max(0, b.hitFlashTimer - dt);
    }
    if (b.attackAnimProgress > 0) {
      b.attackAnimProgress = Math.max(0, b.attackAnimProgress - simDt * 3.2);
    }

    // Handle KO transition (0.38s topple/knockback arc)
    if (b.koTimer > 0) {
      b.koTimer -= dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.z = Math.max(0, b.z + b.vz * dt);
      b.vz -= 480 * dt;
      if (b.koTimer <= 0) {
        b.alive = false;
        world.beasts.splice(i, 1);
      }
      continue;
    }

    const dir = b.team === 'lion' ? 1 : -1;
    const enemyTeam: TeamId = b.team === 'lion' ? 'wolf' : 'lion';
    const enemyFortressX = getFortressX(enemyTeam, world.width);
    const rageMultiplier = world.teams[b.team].rageActiveTimer > 0 ? 2.0 : 1.0;

    // Gravity for jumping / knock-up
    if (!b.isFlying) {
      if (b.z > 0 || b.vz !== 0) {
        b.z += b.vz * simDt;
        b.vz -= 620 * simDt;
        if (b.z <= 0) {
          b.z = 0;
          b.vz = 0;
        }
      }
    } else {
      // Hovering bob for Phoenix / Ice Dragon
      b.z = 66 + Math.sin(b.walkPhase * 1.4) * 10;
    }

    // Friction on knockback velocity
    b.vx *= Math.pow(0.08, simDt);
    b.vy *= Math.pow(0.08, simDt);

    // Find closest enemy beast in front or nearby
    let closestEnemy: BeastEntity | null = null;
    let closestDist = Infinity;

    for (const other of world.beasts) {
      if (!other.alive || other.koTimer > 0 || other.team === b.team) continue;
      const dx = other.x - b.x;
      const dy = (other.y - b.y) * 1.35;
      const d = Math.hypot(dx, dy);
      if (d < closestDist) {
        closestDist = d;
        closestEnemy = other;
      }
    }

    const enemyFortressWallX = getFortressOuterWallX(enemyTeam, world.width);
    const distToFortressWall =
      enemyTeam === 'lion'
        ? Math.max(0, b.x - enemyFortressWallX)
        : Math.max(0, enemyFortressWallX - b.x);
    const effectiveRange = b.attackRange + (closestEnemy ? closestEnemy.scale * 14 : 0);

    const hasEnemyInRange = closestEnemy !== null && closestDist <= effectiveRange;
    const hasFortressInRange = distToFortressWall <= b.attackRange + 8;

    // Movement when not in attack range
    if (!hasEnemyInRange && !hasFortressInRange && b.policy !== 'titan_nuke') {
      let moveX = dir;
      let moveY = 0;

      if (closestEnemy && closestDist < 260) {
        const dx = closestEnemy.x - b.x;
        const dy = closestEnemy.y - b.y;
        const len = Math.hypot(dx, dy) || 1;
        moveX = dx / len;
        moveY = (dy / len) * 0.65;
      }

      const prevPhase = b.walkPhase;
      const curSpeed = b.speed * rageMultiplier;
      b.x += (moveX * curSpeed + b.vx) * simDt;
      b.y = Math.max(minY, Math.min(maxY, b.y + (moveY * curSpeed + b.vy) * simDt));
      b.walkPhase += (curSpeed * simDt) * 0.14;

      // Mammoth earthquake footsteps!
      if (
        b.species === 'mammoth' &&
        Math.floor(prevPhase / Math.PI) !== Math.floor(b.walkPhase / Math.PI)
      ) {
        world.cameraShakeTrauma = Math.min(1, world.cameraShakeTrauma + 0.18);
        emitPooledParticle(world, {
          x: b.x,
          y: b.y + 8,
          z: 2,
          vx: (Math.random() - 0.5) * 45,
          vy: (Math.random() - 0.5) * 20,
          vz: 25,
          size: 8,
          color: '#d6d3d1',
          alpha: 0.75,
          life: 0,
          maxLife: 0.55,
          kind: 'dust',
        });
      }

      // Boar / Rhino high-speed dust trail
      if (b.policy === 'charger' && Math.random() < simDt * 18) {
        emitPooledParticle(world, {
          x: b.x - dir * 18,
          y: b.y + (Math.random() - 0.5) * 10,
          z: 4,
          vx: -dir * (30 + Math.random() * 30),
          vy: (Math.random() - 0.5) * 18,
          vz: 18 + Math.random() * 20,
          size: b.species === 'rhino' ? 7 : 5,
          color: b.team === 'lion' ? '#eab308' : '#cbd5e1',
          alpha: 0.7,
          life: 0,
          maxLife: 0.45,
          kind: b.team === 'lion' ? 'dust' : 'snow',
        });
      }
    } else {
      // Apply residual knockback even while fighting
      b.x += b.vx * simDt;
      b.y = Math.max(minY, Math.min(maxY, b.y + b.vy * simDt));
    }

    // Hard wall collision boundary so beasts NEVER stand inside either castle!
    const bodyRadius = Math.max(8, Math.round(b.scale * 10));
    const leftWallStop = getFortressOuterWallX('lion', world.width) + bodyRadius;
    const rightWallStop = getFortressOuterWallX('wolf', world.width) - bodyRadius;
    if (b.x <= leftWallStop) {
      b.x = leftWallStop;
      if (b.vx < 0) b.vx = 0;
    } else if (b.x >= rightWallStop) {
      b.x = rightWallStop;
      if (b.vx > 0) b.vx = 0;
    }

    // Combat Attack Execution
    b.attackTimer = Math.max(0, b.attackTimer - simDt * rageMultiplier);

    if ((hasEnemyInRange || hasFortressInRange) && b.attackTimer <= 0 && b.policy !== 'titan_nuke') {
      b.attackTimer = b.attackCooldown;
      b.attackAnimProgress = 1.0;

      // Small pounce hop on melee attack (only surge forward against units, not into castle walls)
      if (!b.isFlying && b.z === 0 && b.scale <= 1.5) {
        b.vz = 115;
        if (hasEnemyInRange) {
          b.vx += dir * 32;
        }
      }

      const isCrit =
        Math.random() < (b.policy === 'pack_flanker' ? 0.35 : 0.16) ||
        world.teams[b.team].rageActiveTimer > 0;
      const finalDamage = Math.round(b.damage * (isCrit ? 1.65 : 1.0));

      // Policy-Specific Special Attack Effects
      if (b.policy === 'charger') {
        // 1 Coin Boar (tosses small beasts up) & 10 Coins Rhino (pierces and knocks back rows)
        events.boarChargeHit = true;
        const aoeRadius = b.species === 'rhino' ? 88 : 62;
        for (const other of world.beasts) {
          if (!other.alive || other.koTimer > 0 || other.team === b.team) continue;
          if (Math.hypot(other.x - b.x, other.y - b.y) <= aoeRadius) {
            other.hp -= finalDamage;
            other.hitFlashTimer = 0.08;
            const kb = b.knockbackPower / Math.max(0.7, other.mass);
            other.vx += dir * kb * 1.45;
            if (b.species === 'boar' && other.mass <= 1.5) {
              // Schleudert kleine Tiere nach oben!
              other.vz = 235;
            }
            if (other.hp <= 0) {
              other.hp = 0;
              other.koTimer = 0.38;
              other.vz = Math.max(other.vz, 150);
            }
          }
        }
      } else if (b.policy === 'colossus_aoe') {
        // 30 Coins Bear/Gorilla (Ground slam ring) & 100 Coins Mammoth (Tusk & Trunk shockwave)
        events.colossusSlamOccurred = true;
        events.heavyHitOccurred = true;
        world.cameraShakeTrauma = Math.min(
          1,
          world.cameraShakeTrauma + (b.species === 'mammoth' ? 0.42 : 0.25)
        );
        world.hitstopTimer = 0.045;

        const slamX = b.x + dir * 28;
        const slamRadius = b.species === 'mammoth' ? 135 : 95;
        world.shockwaves.push({
          id: world.nextEntityId++,
          team: b.team,
          x: slamX,
          y: b.y,
          radius: 14,
          maxRadius: slamRadius,
          color: b.team === 'lion' ? '#f59e0b' : '#38bdf8',
          alpha: 0.95,
          lineWidth: b.species === 'mammoth' ? 7 : 5,
        });

        for (const other of world.beasts) {
          if (!other.alive || other.koTimer > 0 || other.team === b.team) continue;
          if (Math.hypot(other.x - slamX, other.y - b.y) <= slamRadius) {
            other.hp -= finalDamage;
            other.hitFlashTimer = 0.09;
            const kb = b.knockbackPower / Math.max(0.8, other.mass);
            other.vx += dir * kb * 1.6;
            other.vz = b.species === 'mammoth' ? 210 : 135;
            if (other.hp <= 0) {
              other.hp = 0;
              other.koTimer = 0.42;
            }
          }
        }
      } else if (b.policy === 'sky_sweeper') {
        // 500 Coins Phoenix / Ice Dragon shoots an elemental roller across enemies + heals allies
        const kind = b.species === 'phoenix' ? 'fire' : 'ice';
        events.elementalWaveFired = kind;
        world.waves.push({
          id: world.nextEntityId++,
          team: b.team,
          x: b.x + dir * 24,
          y: b.y,
          vx: dir * 240,
          width: 70,
          height: 145,
          kind,
          life: 0,
          maxLife: 1.55,
          hitEntityIds: new Set<number>(),
        });
      }

      // Single-target / primary target damage & floating numbers
      if (hasEnemyInRange && closestEnemy) {
        if (b.policy === 'brawler' || b.policy === 'pack_flanker') {
          closestEnemy.hp -= finalDamage;
          closestEnemy.hitFlashTimer = 0.07;
          const kb = b.knockbackPower / Math.max(0.7, closestEnemy.mass);
          closestEnemy.vx += dir * kb;
          if (closestEnemy.hp <= 0) {
            closestEnemy.hp = 0;
            closestEnemy.koTimer = 0.35;
            closestEnemy.vz = 120;
            closestEnemy.vx += dir * 90;
          }
        }

        world.totalDamageDealt[b.team] += finalDamage;

        addFloatingText(
          world,
          closestEnemy.x,
          closestEnemy.y,
          closestEnemy.z + 28,
          isCrit ? `💥 KRIT -${finalDamage}!` : `-${finalDamage}`,
          isCrit ? '#facc15' : '#f87171',
          isCrit ? 1.22 : 0.95,
          isCrit
        );

        // Emit claw/hit sparks
        for (let p = 0; p < (isCrit ? 7 : 4); p++) {
          emitPooledParticle(world, {
            x: closestEnemy.x,
            y: closestEnemy.y,
            z: closestEnemy.z + 16,
            vx: (Math.random() - 0.5) * 110,
            vy: (Math.random() - 0.5) * 60,
            vz: 40 + Math.random() * 65,
            size: isCrit ? 5 : 3.5,
            color: isCrit ? '#facc15' : '#ef4444',
            alpha: 1,
            life: 0,
            maxLife: 0.38,
            kind: 'spark',
          });
        }
      } else if (hasFortressInRange) {
        // Damage enemy fortress (mitigated by FORTRESS_ARMOR_FACTOR so rounds last much longer!)
        const enemyState = world.teams[enemyTeam];
        const fortressDamage = Math.max(
          2,
          Math.round(finalDamage * (b.isBotPup ? 0.12 : FORTRESS_ARMOR_FACTOR))
        );
        enemyState.hp = Math.max(0, enemyState.hp - fortressDamage);
        world.totalDamageDealt[b.team] += fortressDamage;

        addFloatingText(
          world,
          enemyFortressWallX + (enemyTeam === 'lion' ? 10 : -10),
          b.y,
          52,
          isCrit ? `💥 KRIT -${fortressDamage}!` : `-${fortressDamage}`,
          isCrit ? '#facc15' : '#fb7185',
          isCrit ? 1.25 : 1.0,
          isCrit
        );

        if (enemyState.hp <= 0 && !world.winnerTeam) {
          triggerVictoryCelebration(world, b.team);
          events.roundWonBy = b.team;
          return events;
        }
      }
    }
  }

  // Update Pooled Particles
  for (let i = 0; i < world.particles.length; i++) {
    const p = world.particles[i];
    if (!p.active) continue;
    p.life += dt;
    if (p.life >= p.maxLife) {
      p.active = false;
      continue;
    }
    if (p.kind === 'confetti') {
      p.vx *= Math.pow(0.25, dt);
      p.x += (p.vx + Math.sin(p.life * 8 + p.y * 0.05) * 32) * dt;
      p.y += p.vy * dt;
      p.z = Math.max(0, p.z + p.vz * dt);
      p.vz -= 52 * dt;
      const progress = p.life / p.maxLife;
      p.alpha = progress < 0.72 ? 1 : 1 - (progress - 0.72) / 0.28;
    } else {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z = Math.max(0, p.z + p.vz * dt);
      p.vz -= 90 * dt;
      p.alpha = 1 - p.life / p.maxLife;
    }
  }

  // Map-Specific Ambient Particles (Dust/Snow, Volcano Embers/Ice Sparks, Jungle Pollen/Fireflies)
  if (Math.random() < dt * 16) {
    const isLeft = Math.random() < 0.5;
    let color = isLeft ? '#fde047' : '#e0f2fe';
    let kind: PooledParticle['kind'] = isLeft ? 'dust' : 'snow';
    let vz = isLeft ? 8 : -22;
    let z = isLeft ? 4 : 60;

    if (world.mapId === 'volcano_obsidian') {
      color = isLeft ? '#fb923c' : '#c084fc';
      kind = isLeft ? 'fire' : 'spark';
      vz = isLeft ? 28 : 14;
      z = 4;
    } else if (world.mapId === 'jungle_ruins') {
      color = isLeft ? '#bef264' : '#2dd4bf';
      kind = 'spark';
      vz = 12;
      z = 12 + Math.random() * 26;
    }

    emitPooledParticle(world, {
      x: isLeft
        ? Math.random() * (world.width * 0.48)
        : world.width * 0.52 + Math.random() * (world.width * 0.48),
      y: world.height * (0.25 + Math.random() * 0.65),
      z,
      vx: isLeft ? 18 : -16,
      vy: isLeft ? -4 : 12,
      vz,
      size: isLeft ? 3 : 3.5,
      color,
      alpha: 0.6,
      life: 0,
      maxLife: 1.4,
      kind,
    });
  }

  // Update Floating Texts
  for (let i = world.floatingTexts.length - 1; i >= 0; i--) {
    const ft = world.floatingTexts[i];
    ft.life += dt;
    ft.z += dt * 36;
    if (ft.life >= ft.maxLife) {
      world.floatingTexts.splice(i, 1);
    }
  }

  return events;
}
