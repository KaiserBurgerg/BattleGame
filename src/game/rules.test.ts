import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CHAT_SPAWN_COOLDOWN_MS,
  FORTRESS_MAX_HP,
  ROUND_DURATION_SECONDS,
  VICTORY_CELEBRATION_SECONDS,
  addTeamRage,
  createInitialWorldState,
  getFortressOuterWallX,
  getMapForRound,
  getTopPodiumViewers,
  getUnitArchetype,
  getViewerChatCooldownRemainingMs,
  normalizeCoinTier,
  normalizeTeamInput,
  recordDonationAndUpdateMVP,
  registerViewerTeam,
  resetAllGameState,
  resetRoundState,
  resolveViewerTeam,
  spawnMeatDrop,
  spawnPackPupBot,
  spawnUnitByCoinTier,
  stepArenaSimulation,
} from './rules';
import { formatUsernameForSpeech } from './audio';

test('team and coin tier normalization', () => {
  assert.equal(normalizeTeamInput(1), 'lion');
  assert.equal(normalizeTeamInput('1'), 'lion');
  assert.equal(normalizeTeamInput('lion'), 'lion');
  assert.equal(normalizeTeamInput(2), 'wolf');
  assert.equal(normalizeTeamInput('2'), 'wolf');
  assert.equal(normalizeTeamInput('wolf'), 'wolf');

  assert.equal(normalizeCoinTier(0), 0);
  assert.equal(normalizeCoinTier(1), 1);
  assert.equal(normalizeCoinTier(5), 5);
  assert.equal(normalizeCoinTier(10), 10);
  assert.equal(normalizeCoinTier(30), 30);
  assert.equal(normalizeCoinTier(100), 100);
  assert.equal(normalizeCoinTier(500), 500);
  assert.equal(normalizeCoinTier(1000), 1000);
});

test('15-second cooldown on free chat 1 or 2 spawns per viewer', () => {
  const world = createInitialWorldState(760, 360);
  world.state = 'playing';

  const t0 = 100_000;
  assert.equal(CHAT_SPAWN_COOLDOWN_MS, 15_000);

  // First chat "1" from Lukas at t0 succeeds
  const firstSpawn = spawnUnitByCoinTier(world, 'lion', 'Lukas', 0, t0);
  assert.equal(firstSpawn.length, 1);
  assert.equal(world.beasts.length, 1);

  // Second chat "1" from Lukas 5 seconds later is blocked by 15s cooldown
  const blockedSpawn = spawnUnitByCoinTier(world, 'lion', 'Lukas', 0, t0 + 5_000);
  assert.equal(blockedSpawn.length, 0);
  assert.equal(world.beasts.length, 1);
  assert.equal(getViewerChatCooldownRemainingMs(world, 'Lukas', t0 + 5_000), 10_000);

  // Different viewer "Sarah" can still spawn immediately at t0 + 5_000
  const sarahSpawn = spawnUnitByCoinTier(world, 'wolf', 'Sarah', 0, t0 + 5_000);
  assert.equal(sarahSpawn.length, 1);
  assert.equal(world.beasts.length, 2);

  // Paid Coin gift from Lukas during his free-chat cooldown still works immediately!
  const coinSpawn = spawnUnitByCoinTier(world, 'lion', 'Lukas', 10, t0 + 6_000);
  assert.equal(coinSpawn.length, 1);

  // After 15 seconds (t0 + 15_000), Lukas can spawn a free chat unit again
  const afterCooldownSpawn = spawnUnitByCoinTier(world, 'lion', 'Lukas', 0, t0 + 15_000);
  assert.equal(afterCooldownSpawn.length, 1);

  // Natural speech username formatter cleans underscores, @ handles, AND strips all emojis/smileys!
  assert.equal(formatUsernameForSpeech('@Max_99'), 'Max 99');
  assert.equal(formatUsernameForSpeech('Leon_TV.live'), 'Leon TV live');
  assert.equal(formatUsernameForSpeech('🦁Lukas🔥👑 😂'), 'Lukas');
  assert.equal(formatUsernameForSpeech('✨Sarah_99💖😊'), 'Sarah 99');
  assert.equal(formatUsernameForSpeech('😂😂😂🔥🔥'), 'einem Zuschauer');
});

test('viewer team binding: once viewer types 1 or 2, all their spawns and buffs apply strictly to that team', () => {
  const world = createInitialWorldState(760, 520);
  world.state = 'playing';

  // Viewer Tim writes "2" in chat -> bound to Team Wolf
  const chosen = registerViewerTeam(world, 'Tim', 'wolf');
  assert.equal(chosen, 'wolf');
  assert.equal(resolveViewerTeam(world, 'tim', 'lion'), 'wolf');

  // Even if a gift or heal call passes 'lion' as fallback, Tim's actions apply ONLY to his chosen team ('wolf')!
  const [spawned] = spawnUnitByCoinTier(world, 'lion', 'Tim', 10);
  assert.equal(spawned.team, 'wolf');
  assert.equal(world.mvp?.team, 'wolf');

  // Tim triggers !heilen and Rage boost -> applies strictly to Team Wolf, not Team Lion
  const initialLionRage = world.teams.lion.rage;
  const initialWolfRage = world.teams.wolf.rage;
  addTeamRage(world, 'lion', 30, 'Tim');
  assert.equal(world.teams.lion.rage, initialLionRage);
  assert.equal(world.teams.wolf.rage, initialWolfRage + 30);

  spawnMeatDrop(world, 'lion', 'Tim');
  assert.equal(world.meatDrops[0].team, 'wolf');
});

test('resetAllGameState resets wins, round number, fortress HP, MVP throne, and viewerTeams', () => {
  const world = createInitialWorldState(760, 520);
  world.state = 'playing';
  world.roundNumber = 4;
  world.teams.lion.wins = 3;
  world.teams.wolf.wins = 2;
  world.teams.lion.hp = 5000;
  registerViewerTeam(world, 'Lukas', 'lion');
  spawnUnitByCoinTier(world, 'lion', 'Lukas', 100);

  resetAllGameState(world);

  assert.equal(world.roundNumber, 1);
  assert.equal(world.teams.lion.wins, 0);
  assert.equal(world.teams.wolf.wins, 0);
  assert.equal(world.teams.lion.hp, FORTRESS_MAX_HP);
  assert.equal(world.teams.wolf.hp, FORTRESS_MAX_HP);
  assert.equal(world.mvp, null);
  assert.equal(world.beasts.length, 0);
  assert.deepEqual(world.viewerTeams, {});
});

test('extended round duration (600s) and high fortress HP (15000) prevent fast round ends', () => {
  const world = createInitialWorldState(760, 520);
  assert.equal(world.teams.lion.maxHp, 15000);
  assert.equal(world.teams.wolf.maxHp, 15000);
  assert.equal(FORTRESS_MAX_HP, 15000);
  assert.equal(world.roundTimeRemaining, 600);
  assert.equal(ROUND_DURATION_SECONDS, 600);
});

test('spawnPackPupBot spawns nameless pack pups (Welpen) for both clans', () => {
  const world = createInitialWorldState(760, 520);
  const lionPup = spawnPackPupBot(world, 'lion');
  const wolfPup = spawnPackPupBot(world, 'wolf');

  assert.equal(lionPup.species, 'lion_pup');
  assert.equal(lionPup.isBotPup, true);
  assert.equal(lionPup.username, '');

  assert.equal(wolfPup.species, 'wolf_pup');
  assert.equal(wolfPup.isBotPup, true);
  assert.equal(wolfPup.username, '');
});

test('5 Coins spawns a 5-beast V-formation pack and updates MVP throne', () => {
  const world = createInitialWorldState(760, 520);
  world.state = 'playing';

  const pack = spawnUnitByCoinTier(world, 'lion', 'Lukas', 5);
  assert.equal(pack.length, 5);
  assert.equal(world.beasts.length, 5);
  assert.equal(pack[0].species, 'hyena');
  assert.equal(world.mvp?.username, 'Lukas');
  assert.equal(world.mvp?.totalCoins, 5);
  assert.ok(world.activeBanner?.text.includes('LUKAS SPENDET 5 COINS'));
});

test('30 Coins spawns Grizzly/Gorilla colossus and updates MVP leaderboard', () => {
  const world = createInitialWorldState(760, 520);
  world.state = 'playing';

  spawnUnitByCoinTier(world, 'lion', 'Anna', 10);
  spawnUnitByCoinTier(world, 'wolf', 'Lukas', 30);

  assert.equal(world.mvp?.username, 'Lukas');
  assert.equal(world.mvp?.totalCoins, 30);
  const bear = world.beasts.find((b) => b.username === 'Lukas');
  assert.ok(bear);
  assert.equal(bear.species, 'bear');
  assert.equal(bear.policy, 'colossus_aoe');
});

test('Rage meter starts at 0%, gains exact 1% per 10 taps (0.1% per tap), and activates 2x speed mode at 100%', () => {
  const world = createInitialWorldState(760, 520);
  world.state = 'playing';

  assert.equal(world.teams.lion.rage, 0);
  assert.equal(world.teams.wolf.rage, 0);

  // Simulate 10 individual taps (0.1% each) -> exact 1%
  for (let i = 0; i < 10; i++) {
    addTeamRage(world, 'lion', 0.1);
  }
  assert.equal(world.teams.lion.rage, 1);
  assert.equal(world.teams.lion.rageActiveTimer, 0);

  // Remaining 990 taps trigger 100% Blitz-Wut
  const triggered = addTeamRage(world, 'lion', 99);
  assert.equal(triggered, true);
  assert.equal(world.teams.lion.rage, 100);
  assert.ok(world.teams.lion.rageActiveTimer > 0);
});

test('1000 Coins Galaxy Titan crowns donor #1 MVP and destroys enemy fortress', () => {
  const world = createInitialWorldState(760, 520);
  world.state = 'playing';

  recordDonationAndUpdateMVP(world, 'Whale99', 'lion', 1500);
  assert.equal(world.mvp?.username, 'Whale99');

  spawnUnitByCoinTier(world, 'wolf', 'GalaxyKing', 1000);
  assert.equal(world.mvp?.username, 'GalaxyKing');
  assert.ok(world.titanSequence?.active);

  for (let i = 0; i < 60; i++) {
    stepArenaSimulation(world, 0.05);
  }

  assert.equal(world.teams.lion.hp, 0);
  assert.equal(world.winnerTeam, 'wolf');
  assert.equal(world.teams.wolf.wins, 1);
  assert.equal(world.state, 'gameover');
});

test('Meat drop (!heilen) heals allied beasts upon landing', () => {
  const world = createInitialWorldState(760, 520);
  world.state = 'playing';

  const [lion] = spawnUnitByCoinTier(world, 'lion', 'Simba', 0);
  lion.hp = 50;
  spawnMeatDrop(world, 'lion', 'Doctor');
  world.meatDrops[0].x = lion.x;
  world.meatDrops[0].y = lion.y;

  for (let i = 0; i < 25; i++) {
    stepArenaSimulation(world, 0.05);
  }

  assert.ok(lion.hp > 50);
  assert.ok(getUnitArchetype('lion', 0).hp >= lion.hp);
});

test('Victory triggers team confetti burst, top-3 viewer podium, and seamless auto-restart without blocking menu', () => {
  const world = createInitialWorldState(760, 360);
  world.state = 'playing';

  // Seed viewers for podium ranking
  spawnUnitByCoinTier(world, 'lion', 'FirstKing', 100, 10_000);
  spawnUnitByCoinTier(world, 'wolf', 'SecondHero', 30, 10_000);
  spawnUnitByCoinTier(world, 'lion', 'ThirdHelper', 0, 10_000);

  const podium = getTopPodiumViewers(world, 3);
  assert.equal(podium.length, 3);
  assert.equal(podium[0].username, 'FirstKing');
  assert.equal(podium[1].username, 'SecondHero');
  assert.equal(podium[2].username, 'ThirdHelper');

  // Trigger 1000-coin Titan win for Team Wolf
  spawnUnitByCoinTier(world, 'wolf', 'GalaxyChamp', 1000, 20_000);
  for (let i = 0; i < 55; i++) {
    stepArenaSimulation(world, 0.05);
  }

  assert.equal(world.winnerTeam, 'wolf');
  assert.ok(world.victoryCelebration);
  const activeConfetti = world.particles.filter((p) => p.active && p.kind === 'confetti');
  assert.ok(activeConfetti.length > 20);

  // Advance past the 6.5s celebration -> should automatically start Round 2 in 'playing' state!
  let autoRestarted = false;
  const totalSteps = Math.ceil((VICTORY_CELEBRATION_SECONDS + 0.5) / 0.05);
  for (let i = 0; i < totalSteps; i++) {
    const res = stepArenaSimulation(world, 0.05);
    if (res.autoRestartRound) {
      autoRestarted = true;
    }
  }

  assert.equal(autoRestarted, true);
  assert.equal(world.state, 'playing');
  assert.equal(world.roundNumber, 2);
  assert.equal(world.teams.lion.hp, FORTRESS_MAX_HP);
  assert.equal(world.teams.wolf.hp, FORTRESS_MAX_HP);
  assert.equal(world.teams.wolf.wins, 1);
  assert.equal(world.victoryCelebration, null);
});

test('Beasts stop outside the fortress outer wall and never clip inside while attacking', () => {
  const world = createInitialWorldState(760, 360);
  world.state = 'playing';

  const lion = spawnUnitByCoinTier(world, 'lion', 'Attacker', 0)[0];
  const wolfWallX = getFortressOuterWallX('wolf', world.width);

  // March all the way right toward Wolf fortress
  for (let i = 0; i < 300; i++) {
    stepArenaSimulation(world, 0.05);
  }

  // Must remain strictly to the left of Wolf's outer fortress wall while damaging the fortress
  assert.ok(lion.x < wolfWallX);
  assert.ok(world.teams.wolf.hp < FORTRESS_MAX_HP);
});

test('3 maps rotate automatically after each round and reset to Map 1 on full reset', () => {
  assert.equal(getMapForRound(1), 'savanna_frost');
  assert.equal(getMapForRound(2), 'volcano_obsidian');
  assert.equal(getMapForRound(3), 'jungle_ruins');
  assert.equal(getMapForRound(4), 'savanna_frost');

  const world = createInitialWorldState(760, 360);
  world.state = 'playing';
  assert.equal(world.mapId, 'savanna_frost');
  assert.ok(world.envProps.some((p) => p.kind === 'acacia_tree'));

  // Round 2 -> Volcano & Obsidian
  world.roundNumber = 2;
  resetRoundState(world);
  assert.equal(world.mapId, 'volcano_obsidian');
  assert.ok(world.envProps.some((p) => p.kind === 'obsidian_crystal'));

  // Round 3 -> Emerald Jungle & Moon Temple
  world.roundNumber = 3;
  resetRoundState(world);
  assert.equal(world.mapId, 'jungle_ruins');
  assert.ok(world.envProps.some((p) => p.kind === 'palm_tree'));

  // Round 4 -> Rotates back to Map 1
  world.roundNumber = 4;
  resetRoundState(world);
  assert.equal(world.mapId, 'savanna_frost');

  // Full reset returns to Round 1 & Map 1
  world.roundNumber = 3;
  resetRoundState(world);
  resetAllGameState(world);
  assert.equal(world.roundNumber, 1);
  assert.equal(world.mapId, 'savanna_frost');
});
