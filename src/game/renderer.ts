import {
  ArenaMapId,
  ArenaWorldState,
  BeastEntity,
  EnvProp,
  MeatDrop,
  TeamId,
} from './types';
import { getFortressX } from './rules';

type RenderableItem =
  | { kind: 'beast'; y: number; beast: BeastEntity }
  | { kind: 'prop'; y: number; prop: EnvProp }
  | { kind: 'meat'; y: number; meat: MeatDrop };

export function renderArenaFrame(
  ctx: CanvasRenderingContext2D,
  world: ArenaWorldState,
  timeSec: number
): void {
  const w = world.width;
  const h = world.height;

  ctx.save();

  // Apply decaying trauma^2 camera shake
  if (world.cameraShakeTrauma > 0.01) {
    const shake = world.cameraShakeTrauma * world.cameraShakeTrauma * 14;
    const ox = (Math.random() - 0.5) * 2 * shake;
    const oy = (Math.random() - 0.5) * 2 * shake;
    ctx.translate(ox, oy);
  }

  // 1. Sky & Distant Horizon Backdrop (Top 28% of canvas)
  drawSkyAndHorizon(ctx, w, h, timeSec, world);

  // 2. Ground Biomes, River Crossing & Center Battle Bridge
  drawBattlefieldTerrain(ctx, w, h, timeSec, world.mapId);

  // 3. Shockwave Rings on the ground
  for (const sw of world.shockwaves) {
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(sw.x, sw.y, sw.radius, sw.radius * 0.48, 0, 0, Math.PI * 2);
    ctx.strokeStyle = sw.color;
    ctx.globalAlpha = sw.alpha;
    ctx.lineWidth = sw.lineWidth;
    ctx.stroke();
    ctx.restore();
  }

  // 4. Left & Right Fortresses with map-themed atmospheric plinth/vines
  drawFortress(ctx, 'lion', getFortressX('lion', w), h * 0.56, world.teams.lion.hp, world.teams.lion.maxHp, timeSec, world.mapId);
  drawFortress(ctx, 'wolf', getFortressX('wolf', w), h * 0.56, world.teams.wolf.hp, world.teams.wolf.maxHp, timeSec, world.mapId);

  // 5. Build Y-Sorted Render List for all 2.5D Entities
  const renderables: RenderableItem[] = [];
  for (const prop of world.envProps) {
    renderables.push({ kind: 'prop', y: prop.y, prop });
  }
  for (const meat of world.meatDrops) {
    renderables.push({ kind: 'meat', y: meat.y, meat });
  }
  for (const beast of world.beasts) {
    renderables.push({ kind: 'beast', y: beast.y, beast });
  }

  renderables.sort((a, b) => a.y - b.y);

  // 6. Draw Y-Sorted Entities
  for (const item of renderables) {
    if (item.kind === 'prop') {
      drawEnvProp(ctx, item.prop, timeSec);
    } else if (item.kind === 'meat') {
      drawMeatDrop(ctx, item.meat);
    } else {
      const teamRageActive = world.teams[item.beast.team].rageActiveTimer > 0;
      drawBeast25D(ctx, item.beast, teamRageActive, timeSec);
    }
  }

  // 7. Draw Elemental Waves (500 Coins Phoenix Fire / Ice Dragon Roller)
  for (const wave of world.waves) {
    drawElementalWave(ctx, wave.x, wave.y, wave.width, wave.height, wave.kind, timeSec);
  }

  // 8. Draw Pooled Particles (including Confetti Ribbons & Fireworks)
  for (let i = 0; i < world.particles.length; i++) {
    const p = world.particles[i];
    if (!p.active) continue;
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, p.alpha));
    ctx.fillStyle = p.color;
    if (p.kind === 'confetti') {
      ctx.translate(p.x, p.y - p.z);
      ctx.rotate(p.life * 8 + p.x * 0.08);
      const flutterW = Math.max(0.3, Math.abs(Math.cos(p.life * 11 + p.y * 0.1))) * p.size * 1.4;
      const ribbonH = p.size * 0.85;
      ctx.fillRect(-flutterW * 0.5, -ribbonH * 0.5, flutterW, ribbonH);
    } else {
      ctx.beginPath();
      ctx.arc(p.x, p.y - p.z, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // 9. Draw 1,000-Coin Galaxy Titan Sky Darkening & Lightning Bolts
  if (world.titanSequence && world.titanSequence.active) {
    drawTitanLightningOverlay(ctx, w, h, world.titanSequence);
  }

  // 10. Draw Floating Damage / Crit / Heal Numbers on top
  for (const ft of world.floatingTexts) {
    const progress = ft.life / ft.maxLife;
    const alpha = progress < 0.7 ? 1 : 1 - (progress - 0.7) / 0.3;
    ctx.save();
    ctx.globalAlpha = Math.max(0, alpha);
    const fontSize = Math.round((ft.isCrit ? 19 : 14) * ft.scale);
    ctx.font = `800 ${fontSize}px "Plus Jakarta Sans", sans-serif`;
    ctx.textAlign = 'center';
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#090807';
    ctx.strokeText(ft.text, ft.x, ft.y - ft.z);
    ctx.fillStyle = ft.color;
    ctx.fillText(ft.text, ft.x, ft.y - ft.z);
    ctx.restore();
  }

  ctx.restore();
}

function drawSkyAndHorizon(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  timeSec: number,
  world: ArenaWorldState
): void {
  const horizonY = h * 0.27;
  const mapId = world.mapId;

  if (mapId === 'volcano_obsidian') {
    // === MAP 2 SKY: VOLCANO EMBER CANYON (LEFT) -> OBSIDIAN STORM (RIGHT) ===
    const skyGrad = ctx.createLinearGradient(0, 0, w, horizonY);
    skyGrad.addColorStop(0, '#450a0a');
    skyGrad.addColorStop(0.26, '#991b1b');
    skyGrad.addColorStop(0.45, '#c2410c');
    skyGrad.addColorStop(0.55, '#3b0764');
    skyGrad.addColorStop(0.78, '#1e1b4b');
    skyGrad.addColorStop(1, '#090d1e');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, horizonY + 14);

    // Rising Lava Glow from Left Horizon
    const lavaSkyGlow = ctx.createRadialGradient(w * 0.18, horizonY, 8, w * 0.18, horizonY, w * 0.36);
    lavaSkyGlow.addColorStop(0, 'rgba(251, 146, 60, 0.55)');
    lavaSkyGlow.addColorStop(0.5, 'rgba(220, 38, 38, 0.22)');
    lavaSkyGlow.addColorStop(1, 'rgba(69, 10, 10, 0)');
    ctx.fillStyle = lavaSkyGlow;
    ctx.fillRect(0, 0, w * 0.55, horizonY + 12);

    // Obsidian Storm Aurora & Twinkling Violet Stars (Right)
    ctx.save();
    for (let i = 0; i < 16; i++) {
      const sx = w * (0.54 + ((i * 37) % 44) / 100);
      const sy = 8 + ((i * 23) % Math.max(24, Math.floor(horizonY - 18)));
      const twinkle = 0.35 + 0.65 * Math.abs(Math.sin(timeSec * 2.1 + i * 1.4));
      ctx.fillStyle = `rgba(216, 180, 254, ${twinkle.toFixed(2)})`;
      ctx.fillRect(sx, sy, i % 3 === 0 ? 2 : 1.3, i % 3 === 0 ? 2 : 1.3);
    }

    // Violet Nebula / Storm Ribbon
    const nebGrad = ctx.createLinearGradient(w * 0.52, 0, w, horizonY);
    nebGrad.addColorStop(0, 'rgba(168, 85, 247, 0.26)');
    nebGrad.addColorStop(0.55, 'rgba(56, 189, 248, 0.18)');
    nebGrad.addColorStop(1, 'rgba(15, 23, 42, 0)');
    ctx.fillStyle = nebGrad;
    ctx.beginPath();
    ctx.moveTo(w * 0.52, horizonY * 0.42);
    for (let x = w * 0.52; x <= w; x += 28) {
      const wave = Math.sin(x * 0.03 + timeSec * 1.1) * 8;
      ctx.lineTo(x, horizonY * 0.34 + wave);
    }
    ctx.lineTo(w, horizonY + 8);
    ctx.lineTo(w * 0.52, horizonY + 8);
    ctx.closePath();
    ctx.fill();

    // Pale Obsidian Moon on Right
    const moonX = w * 0.82;
    const moonY = horizonY * 0.45;
    const moonHalo = ctx.createRadialGradient(moonX, moonY, 6, moonX, moonY, 40);
    moonHalo.addColorStop(0, 'rgba(192, 132, 252, 0.48)');
    moonHalo.addColorStop(1, 'rgba(30, 27, 75, 0)');
    ctx.fillStyle = moonHalo;
    ctx.beginPath();
    ctx.arc(moonX, moonY, 40, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ede9fe';
    ctx.beginPath();
    ctx.arc(moonX, moonY, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Erupting Distant Volcano Peak on Left
    ctx.fillStyle = '#291512';
    ctx.beginPath();
    ctx.moveTo(0, horizonY + 8);
    ctx.lineTo(w * 0.09, horizonY - 26);
    ctx.lineTo(w * 0.15, horizonY - 46);
    ctx.lineTo(w * 0.21, horizonY - 46);
    ctx.lineTo(w * 0.3, horizonY - 14);
    ctx.lineTo(w * 0.39, horizonY - 30);
    ctx.lineTo(w * 0.48, horizonY + 8);
    ctx.closePath();
    ctx.fill();

    // Glowing Crater Magma & Smoke Plume
    const craterPulse = 0.75 + Math.sin(timeSec * 4) * 0.25;
    ctx.fillStyle = `rgba(251, 146, 60, ${craterPulse.toFixed(2)})`;
    ctx.beginPath();
    ctx.ellipse(w * 0.18, horizonY - 46, 22, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(28, 25, 23, 0.45)';
    for (let s = 0; s < 3; s++) {
      const drift = (timeSec * 12 + s * 14) % 34;
      ctx.beginPath();
      ctx.ellipse(w * 0.18 + Math.sin(timeSec + s) * 8, horizonY - 50 - drift, 14 + s * 4, 6, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Jagged Obsidian Crystal Spires on Right
    ctx.fillStyle = '#1e1b4b';
    ctx.beginPath();
    ctx.moveTo(w * 0.52, horizonY + 8);
    ctx.lineTo(w * 0.6, horizonY - 38);
    ctx.lineTo(w * 0.66, horizonY - 14);
    ctx.lineTo(w * 0.74, horizonY - 52);
    ctx.lineTo(w * 0.82, horizonY - 22);
    ctx.lineTo(w * 0.91, horizonY - 44);
    ctx.lineTo(w, horizonY - 18);
    ctx.lineTo(w, horizonY + 8);
    ctx.closePath();
    ctx.fill();

    // Cyan-Violet Crystal Rim Highlights on Spires
    ctx.strokeStyle = 'rgba(192, 132, 252, 0.65)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(w * 0.6, horizonY - 38);
    ctx.lineTo(w * 0.66, horizonY - 14);
    ctx.moveTo(w * 0.74, horizonY - 52);
    ctx.lineTo(w * 0.82, horizonY - 22);
    ctx.moveTo(w * 0.91, horizonY - 44);
    ctx.lineTo(w, horizonY - 18);
    ctx.stroke();
  } else if (mapId === 'jungle_ruins') {
    // === MAP 3 SKY: EMERALD JUNGLE SUNRISE (LEFT) -> BIOLUMINESCENT MOON TEMPLE (RIGHT) ===
    const skyGrad = ctx.createLinearGradient(0, 0, w, horizonY);
    skyGrad.addColorStop(0, '#065f46');
    skyGrad.addColorStop(0.24, '#0d9488');
    skyGrad.addColorStop(0.42, '#eab308');
    skyGrad.addColorStop(0.55, '#0f766e');
    skyGrad.addColorStop(0.78, '#0f172a');
    skyGrad.addColorStop(1, '#042f2e');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, horizonY + 14);

    // Warm Golden Dawn Sun (Left)
    const sunX = w * 0.21;
    const sunY = horizonY * 0.56;
    const sunGlow = ctx.createRadialGradient(sunX, sunY, 8, sunX, sunY, 54);
    sunGlow.addColorStop(0, 'rgba(254, 249, 195, 0.9)');
    sunGlow.addColorStop(0.45, 'rgba(250, 204, 21, 0.35)');
    sunGlow.addColorStop(1, 'rgba(13, 148, 136, 0)');
    ctx.fillStyle = sunGlow;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 54, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(sunX, sunY, 18, 0, Math.PI * 2);
    ctx.fill();

    // Glowing Emerald-Cyan Full Moon & Fireflies (Right)
    const moonX = w * 0.8;
    const moonY = horizonY * 0.45;
    const moonHalo = ctx.createRadialGradient(moonX, moonY, 8, moonX, moonY, 46);
    moonHalo.addColorStop(0, 'rgba(94, 234, 212, 0.52)');
    moonHalo.addColorStop(1, 'rgba(4, 47, 46, 0)');
    ctx.fillStyle = moonHalo;
    ctx.beginPath();
    ctx.arc(moonX, moonY, 46, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ccfbf1';
    ctx.beginPath();
    ctx.arc(moonX, moonY, 16, 0, Math.PI * 2);
    ctx.fill();

    for (let i = 0; i < 14; i++) {
      const fx = w * (0.55 + ((i * 29) % 42) / 100);
      const fy = 10 + ((i * 19) % Math.max(20, Math.floor(horizonY - 14)));
      const glow = 0.4 + 0.6 * Math.abs(Math.sin(timeSec * 2.4 + i));
      ctx.fillStyle = `rgba(94, 234, 212, ${glow.toFixed(2)})`;
      ctx.beginPath();
      ctx.arc(fx, fy, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Lush Jungle Cliffs & Waterfall Silhouettes (Left)
    ctx.fillStyle = '#064e3b';
    ctx.beginPath();
    ctx.moveTo(0, horizonY + 8);
    ctx.quadraticCurveTo(w * 0.1, horizonY - 38, w * 0.22, horizonY - 18);
    ctx.quadraticCurveTo(w * 0.34, horizonY - 42, w * 0.48, horizonY + 8);
    ctx.closePath();
    ctx.fill();

    // Distant Jungle Waterfall Mist Strip
    ctx.fillStyle = 'rgba(153, 246, 228, 0.58)';
    ctx.fillRect(w * 0.31, horizonY - 30, 8, 36);

    // Ancient Stepped Moon Temple Pyramid Silhouette (Right)
    ctx.fillStyle = '#134e4a';
    ctx.beginPath();
    ctx.moveTo(w * 0.54, horizonY + 8);
    ctx.lineTo(w * 0.62, horizonY - 18);
    ctx.lineTo(w * 0.65, horizonY - 18);
    ctx.lineTo(w * 0.68, horizonY - 32);
    ctx.lineTo(w * 0.72, horizonY - 32);
    ctx.lineTo(w * 0.75, horizonY - 44);
    ctx.lineTo(w * 0.81, horizonY - 44);
    ctx.lineTo(w * 0.84, horizonY - 32);
    ctx.lineTo(w * 0.89, horizonY - 32);
    ctx.lineTo(w * 0.94, horizonY - 16);
    ctx.lineTo(w, horizonY - 16);
    ctx.lineTo(w, horizonY + 8);
    ctx.closePath();
    ctx.fill();
  } else {
    // === MAP 1 SKY: SAVANNA SUNSET (LEFT) -> ARCTIC AURORA NIGHT (RIGHT) ===
    const skyGrad = ctx.createLinearGradient(0, 0, w, horizonY);
    skyGrad.addColorStop(0, '#5c1d0c');
    skyGrad.addColorStop(0.24, '#9a3412');
    skyGrad.addColorStop(0.42, '#b45309');
    skyGrad.addColorStop(0.52, '#1e293b');
    skyGrad.addColorStop(0.72, '#0f172a');
    skyGrad.addColorStop(1, '#082f49');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, horizonY + 14);

    const horizonGlow = ctx.createLinearGradient(0, horizonY - 40, 0, horizonY + 12);
    horizonGlow.addColorStop(0, 'rgba(251, 146, 60, 0)');
    horizonGlow.addColorStop(1, 'rgba(251, 191, 36, 0.22)');
    ctx.fillStyle = horizonGlow;
    ctx.fillRect(0, horizonY - 40, w * 0.52, 52);

    ctx.save();
    for (let i = 0; i < 16; i++) {
      const sx = w * (0.54 + ((i * 37) % 44) / 100);
      const sy = 8 + ((i * 23) % Math.max(24, Math.floor(horizonY - 18)));
      const twinkle = 0.35 + 0.65 * Math.abs(Math.sin(timeSec * 1.8 + i * 1.7));
      ctx.fillStyle = `rgba(224, 242, 254, ${twinkle.toFixed(2)})`;
      ctx.fillRect(sx, sy, i % 3 === 0 ? 2 : 1.3, i % 3 === 0 ? 2 : 1.3);
    }

    for (let band = 0; band < 2; band++) {
      const aGrad = ctx.createLinearGradient(w * 0.55, 0, w * 0.95, horizonY);
      aGrad.addColorStop(0, band === 0 ? 'rgba(56, 189, 248, 0.24)' : 'rgba(52, 211, 153, 0.18)');
      aGrad.addColorStop(0.5, band === 0 ? 'rgba(34, 211, 238, 0.30)' : 'rgba(129, 140, 248, 0.20)');
      aGrad.addColorStop(1, 'rgba(15, 23, 42, 0)');
      ctx.fillStyle = aGrad;
      ctx.beginPath();
      ctx.moveTo(w * 0.52, horizonY * (0.38 + band * 0.12));
      for (let x = w * 0.52; x <= w; x += 28) {
        const wave = Math.sin(x * 0.025 + timeSec * (0.9 + band * 0.4) + band) * 9;
        ctx.lineTo(x, horizonY * (0.28 + band * 0.14) + wave);
      }
      ctx.lineTo(w, horizonY + 8);
      ctx.lineTo(w * 0.52, horizonY + 8);
      ctx.closePath();
      ctx.fill();
    }

    const sunX = w * 0.19;
    const sunY = horizonY * 0.54;
    const sunCorona = ctx.createRadialGradient(sunX, sunY, 8, sunX, sunY, 52);
    sunCorona.addColorStop(0, 'rgba(254, 240, 138, 0.85)');
    sunCorona.addColorStop(0.42, 'rgba(251, 191, 36, 0.38)');
    sunCorona.addColorStop(1, 'rgba(251, 146, 60, 0)');
    ctx.fillStyle = sunCorona;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 52 + Math.sin(timeSec * 1.4) * 2.5, 0, Math.PI * 2);
    ctx.fill();

    const sunDisc = ctx.createLinearGradient(sunX, sunY - 20, sunX, sunY + 20);
    sunDisc.addColorStop(0, '#fef9c3');
    sunDisc.addColorStop(1, '#f59e0b');
    ctx.fillStyle = sunDisc;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 19, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(251, 146, 60, 0.25)';
    const cloudDrift = Math.sin(timeSec * 0.2) * 8;
    ctx.beginPath();
    ctx.ellipse(w * 0.33 + cloudDrift, horizonY * 0.36, 36, 7, 0, 0, Math.PI * 2);
    ctx.ellipse(w * 0.1 + cloudDrift * 0.6, horizonY * 0.28, 28, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    const moonX = w * 0.81;
    const moonY = horizonY * 0.48;
    const moonHalo = ctx.createRadialGradient(moonX, moonY, 8, moonX, moonY, 44);
    moonHalo.addColorStop(0, 'rgba(186, 230, 253, 0.45)');
    moonHalo.addColorStop(0.5, 'rgba(56, 189, 248, 0.16)');
    moonHalo.addColorStop(1, 'rgba(15, 23, 42, 0)');
    ctx.fillStyle = moonHalo;
    ctx.beginPath();
    ctx.arc(moonX, moonY, 44, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#e0f2fe';
    ctx.beginPath();
    ctx.arc(moonX, moonY, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(148, 163, 184, 0.35)';
    ctx.beginPath();
    ctx.arc(moonX - 4, moonY - 3, 3.5, 0, Math.PI * 2);
    ctx.arc(moonX + 5, moonY + 4, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.beginPath();
    ctx.moveTo(0, horizonY);
    ctx.lineTo(w * 0.07, horizonY - 22);
    ctx.lineTo(w * 0.16, horizonY - 24);
    ctx.lineTo(w * 0.27, horizonY - 12);
    ctx.lineTo(w * 0.37, horizonY - 36);
    ctx.lineTo(w * 0.49, horizonY - 14);
    ctx.lineTo(w * 0.61, horizonY - 42);
    ctx.lineTo(w * 0.72, horizonY - 20);
    ctx.lineTo(w * 0.84, horizonY - 48);
    ctx.lineTo(w * 0.94, horizonY - 26);
    ctx.lineTo(w, horizonY - 34);
    ctx.lineTo(w, horizonY + 10);
    ctx.lineTo(0, horizonY + 10);
    ctx.closePath();
    const farMtGrad = ctx.createLinearGradient(0, 0, w, 0);
    farMtGrad.addColorStop(0, '#6b230d');
    farMtGrad.addColorStop(0.45, '#7c2d12');
    farMtGrad.addColorStop(0.55, '#1e3a8a');
    farMtGrad.addColorStop(1, '#1e293b');
    ctx.fillStyle = farMtGrad;
    ctx.fill();

    const mesaGrad = ctx.createLinearGradient(0, horizonY - 34, 0, horizonY + 8);
    mesaGrad.addColorStop(0, '#c2410c');
    mesaGrad.addColorStop(1, '#7c2d12');
    ctx.fillStyle = mesaGrad;
    ctx.beginPath();
    ctx.moveTo(0, horizonY + 8);
    ctx.lineTo(w * 0.04, horizonY - 22);
    ctx.lineTo(w * 0.14, horizonY - 22);
    ctx.lineTo(w * 0.19, horizonY - 4);
    ctx.lineTo(w * 0.25, horizonY - 26);
    ctx.lineTo(w * 0.35, horizonY - 26);
    ctx.lineTo(w * 0.42, horizonY - 6);
    ctx.lineTo(w * 0.47, horizonY + 8);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = 'rgba(253, 224, 71, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(w * 0.04, horizonY - 22);
    ctx.lineTo(w * 0.14, horizonY - 22);
    ctx.moveTo(w * 0.25, horizonY - 26);
    ctx.lineTo(w * 0.35, horizonY - 26);
    ctx.stroke();

    const peakGrad = ctx.createLinearGradient(w * 0.52, horizonY - 48, w, horizonY + 8);
    peakGrad.addColorStop(0, '#334155');
    peakGrad.addColorStop(1, '#0f172a');
    ctx.fillStyle = peakGrad;
    ctx.beginPath();
    ctx.moveTo(w * 0.52, horizonY + 8);
    ctx.lineTo(w * 0.59, horizonY - 28);
    ctx.lineTo(w * 0.67, horizonY - 12);
    ctx.lineTo(w * 0.76, horizonY - 46);
    ctx.lineTo(w * 0.86, horizonY - 18);
    ctx.lineTo(w * 0.94, horizonY - 38);
    ctx.lineTo(w, horizonY - 18);
    ctx.lineTo(w, horizonY + 8);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(224, 242, 254, 0.72)';
    for (const [px, py, pw, ph] of [
      [w * 0.59, horizonY - 28, 12, 11],
      [w * 0.76, horizonY - 46, 17, 17],
      [w * 0.94, horizonY - 38, 14, 14],
    ]) {
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px - pw * 0.7, py + ph);
      ctx.lineTo(px + pw * 0.25, py + ph * 0.65);
      ctx.lineTo(px + pw * 0.75, py + ph);
      ctx.closePath();
      ctx.fill();
    }
  }

  // Darken sky if 1,000-Coin Titan sequence is active
  if (world.titanSequence && world.titanSequence.active) {
    ctx.fillStyle = 'rgba(5, 5, 15, 0.68)';
    ctx.fillRect(0, 0, w, horizonY + 14);
  }
}

function drawBattlefieldTerrain(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  timeSec: number,
  mapId: ArenaMapId
): void {
  const horizonY = h * 0.27;
  const groundH = h - horizonY;

  // Main Biome Ground Gradient
  const groundGrad = ctx.createLinearGradient(0, horizonY, w, horizonY);
  if (mapId === 'volcano_obsidian') {
    groundGrad.addColorStop(0, '#451a03');
    groundGrad.addColorStop(0.22, '#7c2d12');
    groundGrad.addColorStop(0.42, '#57534e');
    groundGrad.addColorStop(0.55, '#334155');
    groundGrad.addColorStop(0.78, '#1e1b4b');
    groundGrad.addColorStop(1, '#312e81');
  } else if (mapId === 'jungle_ruins') {
    groundGrad.addColorStop(0, '#365314');
    groundGrad.addColorStop(0.22, '#4d7c0f');
    groundGrad.addColorStop(0.42, '#65a30d');
    groundGrad.addColorStop(0.55, '#0f766e');
    groundGrad.addColorStop(0.8, '#115e59');
    groundGrad.addColorStop(1, '#134e4a');
  } else {
    groundGrad.addColorStop(0, '#9a3412');
    groundGrad.addColorStop(0.18, '#c26d18');
    groundGrad.addColorStop(0.38, '#d97706');
    groundGrad.addColorStop(0.46, '#92400e');
    groundGrad.addColorStop(0.54, '#64748b');
    groundGrad.addColorStop(0.66, '#94a3b8');
    groundGrad.addColorStop(0.84, '#cbd5e1');
    groundGrad.addColorStop(1, '#e2e8f0');
  }
  ctx.fillStyle = groundGrad;
  ctx.fillRect(0, horizonY, w, groundH);

  // Top-to-bottom depth shading on ground
  const depthGrad = ctx.createLinearGradient(0, horizonY, 0, h);
  depthGrad.addColorStop(0, 'rgba(15, 10, 5, 0.26)');
  depthGrad.addColorStop(0.25, 'rgba(255, 255, 255, 0.04)');
  depthGrad.addColorStop(0.85, 'rgba(0, 0, 0, 0.08)');
  depthGrad.addColorStop(1, 'rgba(0, 0, 0, 0.32)');
  ctx.fillStyle = depthGrad;
  ctx.fillRect(0, horizonY, w, groundH);

  // Winding Organic Battle Trail from Left Gate -> Bridge -> Right Gate
  ctx.save();
  const pathGrad = ctx.createLinearGradient(w * 0.08, h * 0.56, w * 0.92, h * 0.56);
  if (mapId === 'volcano_obsidian') {
    pathGrad.addColorStop(0, 'rgba(120, 53, 15, 0.45)');
    pathGrad.addColorStop(0.5, 'rgba(68, 64, 60, 0.52)');
    pathGrad.addColorStop(1, 'rgba(67, 56, 202, 0.35)');
  } else if (mapId === 'jungle_ruins') {
    pathGrad.addColorStop(0, 'rgba(217, 119, 6, 0.42)');
    pathGrad.addColorStop(0.5, 'rgba(168, 162, 158, 0.45)');
    pathGrad.addColorStop(1, 'rgba(20, 184, 166, 0.35)');
  } else {
    pathGrad.addColorStop(0, 'rgba(180, 110, 42, 0.55)');
    pathGrad.addColorStop(0.45, 'rgba(161, 98, 7, 0.45)');
    pathGrad.addColorStop(0.55, 'rgba(100, 116, 139, 0.45)');
    pathGrad.addColorStop(1, 'rgba(148, 163, 184, 0.52)');
  }
  ctx.fillStyle = pathGrad;
  ctx.beginPath();
  ctx.moveTo(w * 0.08, h * 0.48);
  ctx.quadraticCurveTo(w * 0.3, h * 0.44, w * 0.5, h * 0.47);
  ctx.quadraticCurveTo(w * 0.7, h * 0.44, w * 0.92, h * 0.48);
  ctx.lineTo(w * 0.92, h * 0.69);
  ctx.quadraticCurveTo(w * 0.7, h * 0.72, w * 0.5, h * 0.69);
  ctx.quadraticCurveTo(w * 0.3, h * 0.72, w * 0.08, h * 0.69);
  ctx.closePath();
  ctx.fill();

  // Map-Specific Ground Details
  if (mapId === 'volcano_obsidian') {
    // Glowing Magma Floor Cracks (Left)
    ctx.strokeStyle = 'rgba(251, 146, 60, 0.68)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 7; i++) {
      const cx = w * (0.13 + (i % 3) * 0.11);
      const cy = h * (0.35 + Math.floor(i / 3) * 0.22);
      ctx.beginPath();
      ctx.moveTo(cx - 14, cy);
      ctx.lineTo(cx - 3, cy - 6);
      ctx.lineTo(cx + 8, cy + 4);
      ctx.lineTo(cx + 16, cy - 2);
      ctx.stroke();
    }
    // Frost-Violet Obsidian Shards (Right)
    for (let i = 0; i < 7; i++) {
      const ox = w * (0.58 + (i % 3) * 0.11);
      const oy = h * (0.36 + Math.floor(i / 3) * 0.22);
      ctx.fillStyle = 'rgba(167, 139, 250, 0.35)';
      ctx.beginPath();
      ctx.ellipse(ox, oy, 18, 5, 0.2, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (mapId === 'jungle_ruins') {
    // Temple Stone Pavers & Tropical Ferns (Left)
    for (let i = 0; i < 10; i++) {
      const px = w * (0.14 + (i % 4) * 0.08);
      const py = h * (0.35 + Math.floor(i / 4) * 0.22);
      ctx.fillStyle = 'rgba(214, 211, 209, 0.25)';
      ctx.beginPath();
      ctx.roundRect(px - 10, py - 4, 20, 8, 2);
      ctx.fill();
    }
    // Glowing Teal Moon-Runes (Right)
    for (let i = 0; i < 6; i++) {
      const rx = w * (0.6 + (i % 3) * 0.1);
      const ry = h * (0.37 + Math.floor(i / 3) * 0.35);
      ctx.strokeStyle = 'rgba(94, 234, 212, 0.38)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.ellipse(rx, ry, 14, 6, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else {
    // Scattered Savanna Gold Grass Clusters (Left)
    for (let i = 0; i < 14; i++) {
      const gx = w * (0.12 + ((i * 19) % 31) / 100);
      const gy = h * (0.31 + ((i * 29) % 58) / 100);
      ctx.strokeStyle = i % 2 === 0 ? '#fde047' : '#854d0e';
      ctx.lineWidth = 1.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(gx, gy);
      ctx.quadraticCurveTo(gx - 3, gy - 6, gx - 6, gy - 9);
      ctx.moveTo(gx, gy);
      ctx.quadraticCurveTo(gx + 1, gy - 7, gx + 1, gy - 11);
      ctx.moveTo(gx, gy);
      ctx.quadraticCurveTo(gx + 4, gy - 5, gx + 6, gy - 8);
      ctx.stroke();
    }
    // Sculpted Snowdrifts (Right)
    for (let i = 0; i < 9; i++) {
      const sx = w * (0.58 + (i % 3) * 0.11 + (i % 2) * 0.02);
      const sy = h * (0.33 + Math.floor(i / 3) * 0.24);
      ctx.fillStyle = 'rgba(148, 163, 184, 0.35)';
      ctx.beginPath();
      ctx.ellipse(sx + 2, sy + 2, 24, 7, -0.05, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(248, 250, 252, 0.68)';
      ctx.beginPath();
      ctx.ellipse(sx, sy, 22, 6, -0.05, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Central River / Magma Chasm / Jungle Lagoon
  const riverTopX = w * 0.49;
  const riverBotX = w * 0.51;
  const riverTopW = w * 0.075;
  const riverBotW = w * 0.135;

  ctx.beginPath();
  ctx.moveTo(riverTopX - riverTopW * 0.62, horizonY);
  ctx.quadraticCurveTo(w * 0.43, h * 0.6, riverBotX - riverBotW * 0.6, h);
  ctx.lineTo(riverBotX + riverBotW * 0.6, h);
  ctx.quadraticCurveTo(w * 0.57, h * 0.6, riverTopX + riverTopW * 0.62, horizonY);
  ctx.closePath();
  ctx.fillStyle = mapId === 'volcano_obsidian' ? 'rgba(69, 10, 10, 0.62)' : 'rgba(28, 25, 23, 0.45)';
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(riverTopX - riverTopW * 0.5, horizonY);
  ctx.quadraticCurveTo(w * 0.44, h * 0.6, riverBotX - riverBotW * 0.5, h);
  ctx.lineTo(riverBotX + riverBotW * 0.5, h);
  ctx.quadraticCurveTo(w * 0.56, h * 0.6, riverTopX + riverTopW * 0.5, horizonY);
  ctx.closePath();

  const riverGrad = ctx.createLinearGradient(w * 0.45, horizonY, w * 0.55, h);
  if (mapId === 'volcano_obsidian') {
    riverGrad.addColorStop(0, '#b91c1c');
    riverGrad.addColorStop(0.5, '#f97316');
    riverGrad.addColorStop(1, '#dc2626');
  } else if (mapId === 'jungle_ruins') {
    riverGrad.addColorStop(0, '#0f766e');
    riverGrad.addColorStop(0.5, '#2dd4bf');
    riverGrad.addColorStop(1, '#0d9488');
  } else {
    riverGrad.addColorStop(0, '#0369a1');
    riverGrad.addColorStop(0.5, '#0ea5e9');
    riverGrad.addColorStop(1, '#0284c7');
  }
  ctx.fillStyle = riverGrad;
  ctx.fill();

  ctx.lineWidth = 3;
  ctx.strokeStyle =
    mapId === 'volcano_obsidian'
      ? 'rgba(253, 224, 71, 0.7)'
      : mapId === 'jungle_ruins'
      ? 'rgba(153, 246, 228, 0.72)'
      : 'rgba(186, 230, 253, 0.65)';
  ctx.stroke();

  // Animated Ripples / Magma Bubbles
  ctx.strokeStyle =
    mapId === 'volcano_obsidian'
      ? 'rgba(254, 240, 138, 0.72)'
      : 'rgba(240, 249, 255, 0.58)';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  for (let r = 0; r < 7; r++) {
    const offset = ((timeSec * 44 + r * 48) % groundH) + horizonY;
    const rx = w * 0.5 + ((r % 3) - 1) * 14 + Math.sin(timeSec * 2 + r) * 3;
    ctx.beginPath();
    ctx.moveTo(rx, offset);
    ctx.lineTo(rx - 1.5, Math.min(h - 2, offset + 15));
    ctx.stroke();
  }

  // Grand Center Battle Bridge styled per map
  const bridgeY = h * 0.58;
  const bridgeH = h * 0.27;
  const bridgeW = w * 0.165;
  const bx = w * 0.5 - bridgeW * 0.5;
  const by = bridgeY - bridgeH * 0.5;

  ctx.fillStyle = 'rgba(2, 6, 23, 0.5)';
  ctx.beginPath();
  ctx.roundRect(bx + 3, by + 7, bridgeW, bridgeH + 4, 8);
  ctx.fill();

  ctx.fillStyle =
    mapId === 'volcano_obsidian'
      ? '#44403c'
      : mapId === 'jungle_ruins'
      ? '#a8a29e'
      : '#78716c';
  ctx.strokeStyle = '#1c1917';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(bx - 6, by + 2, 14, bridgeH - 4, 4);
  ctx.roundRect(bx + bridgeW - 8, by + 2, 14, bridgeH - 4, 4);
  ctx.fill();
  ctx.stroke();

  const deckGrad = ctx.createLinearGradient(bx, by, bx + bridgeW, by);
  if (mapId === 'volcano_obsidian') {
    deckGrad.addColorStop(0, '#57534e');
    deckGrad.addColorStop(0.5, '#292524');
    deckGrad.addColorStop(1, '#334155');
  } else if (mapId === 'jungle_ruins') {
    deckGrad.addColorStop(0, '#d6b475');
    deckGrad.addColorStop(0.5, '#a89060');
    deckGrad.addColorStop(1, '#64748b');
  } else {
    deckGrad.addColorStop(0, '#92400e');
    deckGrad.addColorStop(0.5, '#78350f');
    deckGrad.addColorStop(1, '#57534e');
  }
  ctx.fillStyle = deckGrad;
  ctx.beginPath();
  ctx.roundRect(bx, by, bridgeW, bridgeH, 6);
  ctx.fill();
  ctx.stroke();

  const plankCount = 8;
  for (let p = 1; p < plankCount; p++) {
    const px = bx + (bridgeW / plankCount) * p;
    ctx.strokeStyle =
      mapId === 'volcano_obsidian'
        ? '#1c1917'
        : mapId === 'jungle_ruins'
        ? '#57534e'
        : '#451a03';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(px, by + 4);
    ctx.lineTo(px, by + bridgeH - 4);
    ctx.stroke();
  }

  ctx.fillStyle =
    mapId === 'volcano_obsidian'
      ? '#1c1917'
      : mapId === 'jungle_ruins'
      ? '#4d7c0f'
      : '#451a03';
  ctx.strokeStyle = '#1c1917';
  ctx.lineWidth = 1.6;
  ctx.fillRect(bx + 4, by - 3, bridgeW - 8, 6);
  ctx.strokeRect(bx + 4, by - 3, bridgeW - 8, 6);
  ctx.fillRect(bx + 4, by + bridgeH - 3, bridgeW - 8, 6);
  ctx.strokeRect(bx + 4, by + bridgeH - 3, bridgeW - 8, 6);

  const leftLantern =
    mapId === 'volcano_obsidian'
      ? '#fb923c'
      : mapId === 'jungle_ruins'
      ? '#fde047'
      : '#fbbf24';
  const rightLantern =
    mapId === 'volcano_obsidian'
      ? '#c084fc'
      : mapId === 'jungle_ruins'
      ? '#2dd4bf'
      : '#38bdf8';

  const corners: Array<[number, number, string]> = [
    [bx + 4, by, leftLantern],
    [bx + 4, by + bridgeH, leftLantern],
    [bx + bridgeW - 4, by, rightLantern],
    [bx + bridgeW - 4, by + bridgeH, rightLantern],
  ];
  for (const [cx, cy, glow] of corners) {
    ctx.fillStyle = '#a8a29e';
    ctx.beginPath();
    ctx.roundRect(cx - 5, cy - 6, 10, 12, 3);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy - 1, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawFortress(
  ctx: CanvasRenderingContext2D,
  team: TeamId,
  x: number,
  y: number,
  hp: number,
  maxHp: number,
  timeSec: number,
  mapId: ArenaMapId
): void {
  const hpRatio = Math.max(0, hp / maxHp);
  const isLion = team === 'lion';
  const dir = isLion ? 1 : -1;

  ctx.save();
  ctx.translate(x, y);

  // Ground shadow under fortress footprint
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.beginPath();
  ctx.ellipse(0, 48, 52, 20, 0, 0, Math.PI * 2);
  ctx.fill();

  // Stone foundation plinth / steps styled per map
  ctx.fillStyle =
    mapId === 'volcano_obsidian'
      ? '#292524'
      : mapId === 'jungle_ruins'
      ? isLion
        ? '#854d0e'
        : '#134e4a'
      : isLion
      ? '#78350f'
      : '#1e293b';
  ctx.strokeStyle = '#090807';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-46, 36, 92, 13, 4);
  ctx.fill();
  ctx.stroke();

  if (isLion) {
    // === LÖWEN-CLAN: SONNENFELS-ZITADELLE (Golden Savanna Bastion) ===
    // Rear Flanking Turret Tower
    const rearGrad = ctx.createLinearGradient(-44, -90, -14, 38);
    rearGrad.addColorStop(0, '#d97706');
    rearGrad.addColorStop(1, '#78350f');
    ctx.fillStyle = rearGrad;
    ctx.beginPath();
    ctx.roundRect(-44, -84, 24, 124, 3);
    ctx.fill();
    ctx.stroke();

    // Tall Royal Flagpole & Fluttering Crimson-Gold Lion Pennant
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-32, -84);
    ctx.lineTo(-32, -112);
    ctx.stroke();

    const wave = Math.sin(timeSec * 5) * 3;
    ctx.fillStyle = '#dc2626';
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-31, -111);
    ctx.quadraticCurveTo(-18, -114 + wave, -6, -106 - wave);
    ctx.lineTo(-14, -100);
    ctx.lineTo(-6, -94 + wave);
    ctx.quadraticCurveTo(-18, -98 - wave, -31, -96);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Main Sun-Sandstone Citadel Keep
    const wallGrad = ctx.createLinearGradient(-34, -76, 44, 40);
    wallGrad.addColorStop(0, '#fbbf24');
    wallGrad.addColorStop(0.45, '#d97706');
    wallGrad.addColorStop(1, '#78350f');
    ctx.fillStyle = wallGrad;
    ctx.strokeStyle = '#1c1107';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(-36, 40);
    ctx.lineTo(-31, -68);
    ctx.lineTo(35, -68);
    ctx.lineTo(44, 40);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Sandstone Brick Masonry Texture
    ctx.strokeStyle = 'rgba(69, 26, 3, 0.42)';
    ctx.lineWidth = 1.2;
    for (let row = -50; row <= 24; row += 18) {
      ctx.beginPath();
      ctx.moveTo(-28, row);
      ctx.lineTo(34, row);
      ctx.stroke();
    }

    // Connected Crenellated Battlements across the top
    ctx.fillStyle = '#f59e0b';
    ctx.strokeStyle = '#1c1107';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-33, -68);
    ctx.lineTo(-33, -80);
    ctx.lineTo(-22, -80);
    ctx.lineTo(-22, -72);
    ctx.lineTo(-10, -72);
    ctx.lineTo(-10, -80);
    ctx.lineTo(2, -80);
    ctx.lineTo(2, -72);
    ctx.lineTo(14, -72);
    ctx.lineTo(14, -80);
    ctx.lineTo(26, -80);
    ctx.lineTo(26, -72);
    ctx.lineTo(37, -72);
    ctx.lineTo(37, -68);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Forward Defense Watch-Bastion Pillar on Gate Side (x = +46 outer wall face!)
    ctx.fillStyle = '#b45309';
    ctx.beginPath();
    ctx.roundRect(26, -42, 20, 82, 3);
    ctx.fill();
    ctx.stroke();

    // Golden Sun-Medallion Crest
    const crestGrad = ctx.createRadialGradient(2, -38, 2, 2, -38, 16);
    crestGrad.addColorStop(0, '#fef9c3');
    crestGrad.addColorStop(0.65, '#facc15');
    crestGrad.addColorStop(1, '#b45309');
    ctx.fillStyle = crestGrad;
    ctx.beginPath();
    ctx.arc(2, -38, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Ornate Arched Fortress Gate with Iron Portcullis
    ctx.fillStyle = '#29170a';
    ctx.beginPath();
    ctx.arc(10, 14, 15, Math.PI, 0);
    ctx.lineTo(25, 40);
    ctx.lineTo(-5, 40);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Portcullis Bars
    ctx.strokeStyle = '#78716c';
    ctx.lineWidth = 1.6;
    for (const gx of [1, 7, 13, 19]) {
      ctx.beginPath();
      ctx.moveTo(gx, 4);
      ctx.lineTo(gx, 38);
      ctx.stroke();
    }
  } else {
    // === WOLFS-RUDEL: NORDFROST-FESTUNG (Arctic Frost Citadel) ===
    // Rear Flanking Ice-Granite Keep Tower
    const rearGrad = ctx.createLinearGradient(16, -92, 46, 38);
    rearGrad.addColorStop(0, '#64748b');
    rearGrad.addColorStop(1, '#1e293b');
    ctx.fillStyle = rearGrad;
    ctx.beginPath();
    ctx.roundRect(20, -86, 24, 126, 3);
    ctx.fill();
    ctx.stroke();

    // Tall Frost Banner Pole & Fluttering Wolf Pennant
    ctx.strokeStyle = '#bae6fd';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(32, -86);
    ctx.lineTo(32, -114);
    ctx.stroke();

    const wave = Math.sin(timeSec * 5 + 1.2) * 3;
    ctx.fillStyle = '#0284c7';
    ctx.strokeStyle = '#e0f2fe';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(31, -113);
    ctx.quadraticCurveTo(18, -116 + wave, 6, -108 - wave);
    ctx.lineTo(14, -102);
    ctx.lineTo(6, -96 + wave);
    ctx.quadraticCurveTo(18, -100 - wave, 31, -98);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Main Dark Granite Citadel Keep
    const wallGrad = ctx.createLinearGradient(-44, -72, 34, 40);
    wallGrad.addColorStop(0, '#94a3b8');
    wallGrad.addColorStop(0.45, '#475569');
    wallGrad.addColorStop(1, '#0f172a');
    ctx.fillStyle = wallGrad;
    ctx.strokeStyle = '#090d16';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(-44, 40);
    ctx.lineTo(-35, -68);
    ctx.lineTo(31, -68);
    ctx.lineTo(36, 40);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Basalt Masonry Lines
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.5)';
    ctx.lineWidth = 1.2;
    for (let row = -50; row <= 24; row += 18) {
      ctx.beginPath();
      ctx.moveTo(-34, row);
      ctx.lineTo(28, row);
      ctx.stroke();
    }

    // Steep Snow-Capped Roof with Hanging Icicles
    const roofGrad = ctx.createLinearGradient(-38, -106, 36, -66);
    roofGrad.addColorStop(0, '#f8fafc');
    roofGrad.addColorStop(0.55, '#bae6fd');
    roofGrad.addColorStop(1, '#38bdf8');
    ctx.fillStyle = roofGrad;
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-40, -65);
    ctx.lineTo(-2, -106);
    ctx.lineTo(36, -65);
    ctx.lineTo(25, -62);
    ctx.lineTo(16, -67);
    ctx.lineTo(4, -61);
    ctx.lineTo(-10, -67);
    ctx.lineTo(-24, -62);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Forward Watch-Bastion Pillar on Gate Side (x = -46 outer wall face!)
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.roundRect(-46, -42, 20, 82, 3);
    ctx.fill();
    ctx.stroke();

    // Glowing Frost Rune Medallion
    ctx.fillStyle = '#0ea5e9';
    ctx.beginPath();
    ctx.arc(-2, -38, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#e0f2fe';
    ctx.beginPath();
    ctx.moveTo(-2, -47);
    ctx.lineTo(5, -38);
    ctx.lineTo(-2, -29);
    ctx.lineTo(-9, -38);
    ctx.closePath();
    ctx.fill();

    // Iron-Reinforced Wolf Gate
    ctx.fillStyle = '#090d16';
    ctx.beginPath();
    ctx.arc(-10, 14, 15, Math.PI, 0);
    ctx.lineTo(5, 40);
    ctx.lineTo(-25, 40);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1.6;
    for (const gx of [-19, -13, -7, -1]) {
      ctx.beginPath();
      ctx.moveTo(gx, 4);
      ctx.lineTo(gx, 38);
      ctx.stroke();
    }
  }

  // Animated Brazier Flames on Outer Bastion Wall
  const brazierX = dir * 35;
  const brazierY = -44;
  ctx.fillStyle = '#292524';
  ctx.strokeStyle = '#090807';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(brazierX - 7, brazierY);
  ctx.lineTo(brazierX + 7, brazierY);
  ctx.lineTo(brazierX + 4, brazierY + 6);
  ctx.lineTo(brazierX - 4, brazierY + 6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  const flicker = Math.sin(timeSec * 14) * 2.5;
  ctx.fillStyle = isLion ? '#fb923c' : '#38bdf8';
  ctx.beginPath();
  ctx.moveTo(brazierX - 6, brazierY);
  ctx.quadraticCurveTo(brazierX, brazierY - 16 - flicker, brazierX + 6, brazierY);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = isLion ? '#fef08a' : '#e0f2fe';
  ctx.beginPath();
  ctx.moveTo(brazierX - 3, brazierY);
  ctx.quadraticCurveTo(brazierX, brazierY - 10 - flicker * 0.6, brazierX + 3, brazierY);
  ctx.closePath();
  ctx.fill();

  // Map-specific fortress accents (overgrown emerald jungle vines in Map 3 or magma rune glow in Map 2)
  if (mapId === 'jungle_ruins') {
    ctx.strokeStyle = isLion ? '#65a30d' : '#2dd4bf';
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-26, -64);
    ctx.quadraticCurveTo(-20, -40, -28, -14);
    ctx.moveTo(24, -44);
    ctx.quadraticCurveTo(30, -24, 22, -4);
    ctx.stroke();
  } else if (mapId === 'volcano_obsidian') {
    ctx.strokeStyle = isLion ? 'rgba(251, 146, 60, 0.55)' : 'rgba(192, 132, 252, 0.55)';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-42, 36);
    ctx.lineTo(42, 36);
    ctx.stroke();
  }

  // Dynamic Siege Damage Cracks (< 75% and < 40% HP)
  if (hpRatio < 0.75) {
    ctx.strokeStyle = '#090807';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(-16, -48);
    ctx.lineTo(-4, -22);
    ctx.lineTo(-14, 2);
    if (hpRatio < 0.4) {
      ctx.moveTo(18, -50);
      ctx.lineTo(6, -18);
      ctx.lineTo(20, 10);
    }
    ctx.stroke();
  }

  ctx.restore();
}

function drawEnvProp(ctx: CanvasRenderingContext2D, prop: EnvProp, timeSec: number): void {
  ctx.save();
  ctx.translate(prop.x, prop.y);
  ctx.scale(prop.scale, prop.scale);

  // Soft 2.5D ground shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.32)';
  ctx.beginPath();
  ctx.ellipse(2, 4, 21, 7.5, 0, 0, Math.PI * 2);
  ctx.fill();

  if (prop.kind === 'acacia_tree') {
    const sway = Math.sin(timeSec * 1.5 + prop.id) * 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 5.5;
    ctx.beginPath();
    ctx.moveTo(0, 4);
    ctx.quadraticCurveTo(3, -18, sway, -38);
    ctx.stroke();

    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(sway * 0.6, -24);
    ctx.quadraticCurveTo(sway - 12, -32, sway - 17, -41);
    ctx.moveTo(sway * 0.6, -25);
    ctx.quadraticCurveTo(sway + 12, -33, sway + 17, -41);
    ctx.stroke();

    ctx.strokeStyle = '#1a2e05';
    ctx.lineWidth = 1.6;
    const puffs: Array<[number, number, number, number, string]> = [
      [sway - 15, -42, 16, 7, '#4d7c0f'],
      [sway + 15, -42, 16, 7, '#4d7c0f'],
      [sway, -47, 25, 9, '#65a30d'],
    ];
    for (const [px, py, rx, ry, col] of puffs) {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.ellipse(px, py, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(253, 224, 71, 0.32)';
    ctx.beginPath();
    ctx.ellipse(sway, -50, 18, 4, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (prop.kind === 'pine_tree') {
    const sway = Math.sin(timeSec * 1.7 + prop.id) * 1.5;
    ctx.fillStyle = '#451a03';
    ctx.strokeStyle = '#1c1917';
    ctx.lineWidth = 1.5;
    ctx.fillRect(-3.5, -14, 7, 17);
    ctx.strokeRect(-3.5, -14, 7, 17);

    for (let layer = 0; layer < 3; layer++) {
      const ly = -12 - layer * 14;
      const lw = 23 - layer * 4.5;
      const tipX = sway * (0.4 + layer * 0.3);
      const boughGrad = ctx.createLinearGradient(-lw, ly - 24, lw, ly);
      boughGrad.addColorStop(0, '#0d9488');
      boughGrad.addColorStop(1, '#042f2e');
      ctx.fillStyle = boughGrad;
      ctx.strokeStyle = '#042f2e';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(tipX, ly - 24);
      ctx.lineTo(-lw, ly);
      ctx.quadraticCurveTo(0, ly + 4, lw, ly);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.moveTo(tipX, ly - 24);
      ctx.lineTo(tipX - lw * 0.45, ly - 12);
      ctx.quadraticCurveTo(tipX, ly - 9, tipX + lw * 0.45, ly - 12);
      ctx.closePath();
      ctx.fill();
    }
  } else if (prop.kind === 'charred_tree') {
    // Twisted Volcanic Deadwood with Glowing Ember Tips
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1c1917';
    ctx.lineWidth = 5.5;
    ctx.beginPath();
    ctx.moveTo(0, 4);
    ctx.quadraticCurveTo(-4, -18, 2, -38);
    ctx.stroke();
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, -22);
    ctx.quadraticCurveTo(-12, -30, -16, -42);
    ctx.moveTo(1, -28);
    ctx.quadraticCurveTo(11, -34, 15, -45);
    ctx.stroke();
    ctx.fillStyle = '#fb923c';
    ctx.beginPath();
    ctx.arc(-16, -42, 2.6, 0, Math.PI * 2);
    ctx.arc(15, -45, 2.4, 0, Math.PI * 2);
    ctx.arc(2, -38, 2.2, 0, Math.PI * 2);
    ctx.fill();
  } else if (prop.kind === 'palm_tree') {
    // Tropical Jungle Palm with Curved Trunk & Lush Swaying Fronds
    const sway = Math.sin(timeSec * 1.9 + prop.id) * 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(0, 4);
    ctx.quadraticCurveTo(-7, -18, sway + 2, -42);
    ctx.stroke();
    ctx.strokeStyle = '#14532d';
    ctx.lineWidth = 1.4;
    for (const ang of [-2.6, -1.9, -0.9, -0.2, 0.5]) {
      ctx.save();
      ctx.translate(sway + 2, -42);
      ctx.rotate(ang + Math.sin(timeSec * 2 + prop.id) * 0.05);
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.ellipse(14, 0, 15, 4.5, 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  } else if (prop.kind === 'obsidian_crystal' || prop.kind === 'glow_crystal') {
    // Multi-shard Obsidian / Bioluminescent Crystal Cluster
    const isObsidian = prop.kind === 'obsidian_crystal';
    const cGrad = ctx.createLinearGradient(-12, -36, 14, 4);
    cGrad.addColorStop(0, isObsidian ? '#c084fc' : '#5eead4');
    cGrad.addColorStop(1, isObsidian ? '#3b0764' : '#0f766e');
    ctx.fillStyle = cGrad;
    ctx.strokeStyle = '#09090b';
    ctx.lineWidth = 1.6;
    const shards: Array<[number, number, number]> = [
      [-9, -22, 7],
      [0, -34, 9],
      [10, -20, 6.5],
    ];
    for (const [sx, sh, sw] of shards) {
      ctx.beginPath();
      ctx.moveTo(sx - sw, 3);
      ctx.lineTo(sx - sw * 0.55, sh * 0.72);
      ctx.lineTo(sx, sh);
      ctx.lineTo(sx + sw * 0.65, sh * 0.68);
      ctx.lineTo(sx + sw, 3);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  } else if (prop.kind === 'moss_pillar') {
    // Ancient Carved Temple Ruin Pillar with Moss Crown
    ctx.fillStyle = '#a8a29e';
    ctx.strokeStyle = '#1c1917';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.roundRect(-11, -28, 22, 32, 3);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#65a30d';
    ctx.beginPath();
    ctx.ellipse(0, -28, 13, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else {
    // Multi-faceted 3D-shaded Boulder / Lava Rock / Snow Rock
    const isSavanna = prop.kind === 'savanna_rock';
    const isSnow = prop.kind === 'snow_rock';
    const isLava = prop.kind === 'lava_rock';
    const rockGrad = ctx.createLinearGradient(-14, -16, 16, 5);
    if (isSavanna) {
      rockGrad.addColorStop(0, '#d97706');
      rockGrad.addColorStop(1, '#78350f');
    } else if (isSnow) {
      rockGrad.addColorStop(0, '#f1f5f9');
      rockGrad.addColorStop(1, '#64748b');
    } else if (isLava) {
      rockGrad.addColorStop(0, '#57534e');
      rockGrad.addColorStop(1, '#1c1917');
    } else {
      rockGrad.addColorStop(0, '#78716c');
      rockGrad.addColorStop(1, '#292524');
    }

    ctx.fillStyle = rockGrad;
    ctx.strokeStyle = '#1c1917';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-17, 4);
    ctx.lineTo(-13, -10);
    ctx.lineTo(-2, -16);
    ctx.lineTo(13, -9);
    ctx.lineTo(18, 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    if (isLava) {
      ctx.strokeStyle = '#fb923c';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-8, 1);
      ctx.lineTo(-1, -7);
      ctx.lineTo(8, -2);
      ctx.stroke();
    } else {
      ctx.fillStyle = isSnow ? '#ffffff' : 'rgba(255, 255, 255, 0.22)';
      ctx.beginPath();
      ctx.moveTo(-11, -9);
      ctx.lineTo(-2, -14);
      ctx.lineTo(7, -8);
      ctx.lineTo(-3, -5);
      ctx.closePath();
      ctx.fill();
    }
  }

  ctx.restore();
}

function drawMeatDrop(ctx: CanvasRenderingContext2D, meat: MeatDrop): void {
  ctx.save();
  ctx.translate(meat.x, meat.y);

  // Ground shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.beginPath();
  ctx.ellipse(0, 4, 14, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.translate(0, -meat.z);

  // Parachute if still falling
  if (meat.z > 5) {
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-12, -22);
    ctx.lineTo(-4, -6);
    ctx.moveTo(12, -22);
    ctx.lineTo(4, -6);
    ctx.stroke();

    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.arc(0, -22, 14, Math.PI, 0);
    ctx.fill();
  }

  // Bone-in Steak / Haunch of Meat
  ctx.fillStyle = '#dc2626';
  ctx.strokeStyle = '#450a0a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, -4, 12, 8, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // White bone center
  ctx.fillStyle = '#fef2f2';
  ctx.beginPath();
  ctx.arc(4, -5, 3.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawBeast25D(
  ctx: CanvasRenderingContext2D,
  b: BeastEntity,
  teamRageActive: boolean,
  timeSec: number
): void {
  const dir = b.team === 'lion' ? 1 : -1;
  const s = b.scale;

  ctx.save();
  ctx.translate(b.x, b.y);

  // 1. Oval 2.5D Ground Shadow (scales dynamically with height z)
  const shadowScale = Math.max(0.45, 1 - b.z / 240);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
  ctx.beginPath();
  ctx.ellipse(0, 6, 22 * s * shadowScale, 9 * s * shadowScale, 0, 0, Math.PI * 2);
  ctx.fill();

  // 2. Elevate by z (jump, knock-up, flying)
  ctx.translate(0, -b.z);

  // KO topple rotation if dying
  if (b.koTimer > 0) {
    ctx.globalAlpha = Math.max(0, b.koTimer / 0.4);
    ctx.rotate(-dir * (1 - b.koTimer / 0.4) * 1.1);
  }

  // 3. Team Rage Lightning Aura (when 100% Wut is active!)
  if (teamRageActive) {
    ctx.save();
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(
      0,
      -14 * s,
      26 * s + Math.sin(timeSec * 25) * 3,
      18 * s + Math.cos(timeSec * 25) * 3,
      0,
      0,
      Math.PI * 2
    );
    ctx.stroke();
    ctx.restore();
  }

  // Flip horizontally to face movement direction (`dir === 1` faces right, `dir === -1` faces left)
  ctx.save();
  ctx.scale(dir * s, s);

  const legSwing1 = Math.sin(b.walkPhase) * 7;
  const legSwing2 = Math.cos(b.walkPhase) * 7;
  const bodyBob = Math.abs(Math.sin(b.walkPhase)) * 2.5;

  ctx.translate(0, -bodyBob);

  // Palette selection per species (or white flash on hit)
  const isFlashing = b.hitFlashTimer > 0;
  drawCompositeAnimalBody(ctx, b, legSwing1, legSwing2, isFlashing, timeSec);

  // 4. Attack Claw Marks / Slash Effect in front of beast
  if (b.attackAnimProgress > 0.1) {
    drawClawSlashEffect(ctx, b.attackAnimProgress, b.team);
  }

  ctx.restore(); // undo horizontal flip & scale

  // 5. Viewer Nameplate & Health Bar above EVERY Beast!
  drawViewerNameplate(ctx, b, s);

  ctx.restore();
}

function makeBodyGrad(
  ctx: CanvasRenderingContext2D,
  yTop: number,
  yBot: number,
  topCol: string,
  midCol: string,
  botCol: string,
  isFlashing: boolean
): string | CanvasGradient {
  if (isFlashing) return '#ffffff';
  const g = ctx.createLinearGradient(0, yTop, 0, yBot);
  g.addColorStop(0, topCol);
  g.addColorStop(0.55, midCol);
  g.addColorStop(1, botCol);
  return g;
}

function drawJointedLeg(
  ctx: CanvasRenderingContext2D,
  hipX: number,
  hipY: number,
  swing: number,
  upperLen: number,
  lowerLen: number,
  topW: number,
  botW: number,
  colUpper: string,
  colPaw: string,
  isFlashing: boolean,
  outlineCol: string
): void {
  const kneeX = hipX + swing * 0.42;
  const kneeY = hipY + upperLen * 0.65;
  const footX = hipX + swing * 0.72;
  const footY = hipY + upperLen + lowerLen;

  ctx.save();
  ctx.strokeStyle = isFlashing ? '#ffffff' : outlineCol;
  ctx.lineWidth = 1.4;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // Upper thigh + shin polygon
  ctx.fillStyle = isFlashing ? '#ffffff' : colUpper;
  ctx.beginPath();
  ctx.moveTo(hipX - topW * 0.5, hipY);
  ctx.quadraticCurveTo(kneeX - topW * 0.35, kneeY, footX - botW * 0.45, footY - 2);
  ctx.lineTo(footX + botW * 0.55, footY - 2);
  ctx.quadraticCurveTo(kneeX + topW * 0.4, kneeY, hipX + topW * 0.5, hipY);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Paw / Hoof
  ctx.fillStyle = isFlashing ? '#ffffff' : colPaw;
  ctx.beginPath();
  ctx.ellipse(footX + 1.5, footY - 1, botW * 0.75, Math.max(2.2, botW * 0.42), 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawExpressiveEye(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  irisColor: string,
  angryBrow = false,
  isFlashing = false
): void {
  if (isFlashing) return;
  ctx.save();
  // Dark socket
  ctx.fillStyle = '#09090b';
  ctx.beginPath();
  ctx.ellipse(x, y, r * 1.15, r * 0.95, -0.1, 0, Math.PI * 2);
  ctx.fill();

  // Glowing / Colored Iris
  ctx.fillStyle = irisColor;
  ctx.beginPath();
  ctx.arc(x + r * 0.08, y, r * 0.76, 0, Math.PI * 2);
  ctx.fill();

  // Sharp Pupil
  ctx.fillStyle = '#09090b';
  ctx.beginPath();
  ctx.ellipse(x + r * 0.16, y, r * 0.32, r * 0.55, 0, 0, Math.PI * 2);
  ctx.fill();

  // Specular Catchlight
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(x - r * 0.22, y - r * 0.28, Math.max(0.75, r * 0.34), 0, Math.PI * 2);
  ctx.fill();

  // Fierce Brow Ridge
  if (angryBrow) {
    ctx.strokeStyle = '#0f0a06';
    ctx.lineWidth = Math.max(1.2, r * 0.55);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x - r * 1.25, y - r * 1.15);
    ctx.lineTo(x + r * 1.15, y - r * 0.6);
    ctx.stroke();
  }
  ctx.restore();
}

function drawCompositeAnimalBody(
  ctx: CanvasRenderingContext2D,
  b: BeastEntity,
  leg1: number,
  leg2: number,
  isFlashing: boolean,
  timeSec: number
): void {
  const isLionTeam = b.team === 'lion';
  const outline = isLionTeam ? '#1f1206' : '#0b172a';
  const isPouncing = b.attackAnimProgress > 0.2;
  ctx.lineWidth = 1.5;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = isFlashing ? '#ffffff' : outline;

  const setFill = (style: string | CanvasGradient) => {
    ctx.fillStyle = isFlashing ? '#ffffff' : style;
  };

  if (b.species === 'lion_pup' || b.species === 'wolf_pup') {
    const isLionPup = b.species === 'lion_pup';
    const wag = Math.sin(timeSec * 12 + b.id) * 3;

    // Far legs
    drawJointedLeg(ctx, -9, -10, leg2 * 0.85, 5, 4, 4.5, 3, isLionPup ? '#b45309' : '#475569', isLionPup ? '#fde68a' : '#cbd5e1', isFlashing, outline);
    drawJointedLeg(ctx, 6, -10, -leg2 * 0.85, 5, 4, 4.5, 3, isLionPup ? '#b45309' : '#475569', isLionPup ? '#fde68a' : '#cbd5e1', isFlashing, outline);

    // Wagging Fluffy Tail
    setFill(isLionPup ? '#d97706' : '#94a3b8');
    ctx.beginPath();
    ctx.moveTo(-11, -14);
    ctx.quadraticCurveTo(-20, -22 + wag, -21, -14 + wag * 0.6);
    ctx.quadraticCurveTo(-17, -11, -11, -11);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Plump Shaded Torso
    setFill(
      makeBodyGrad(
        ctx,
        -22,
        -4,
        isLionPup ? '#fde047' : '#cbd5e1',
        isLionPup ? '#f59e0b' : '#94a3b8',
        isLionPup ? '#b45309' : '#475569',
        isFlashing
      )
    );
    ctx.beginPath();
    ctx.ellipse(0, -13, 13, 8.2, -0.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Soft Cream / Snow Belly
    if (!isFlashing) {
      ctx.fillStyle = isLionPup ? '#fef3c7' : '#f1f5f9';
      ctx.beginPath();
      ctx.ellipse(2, -9.5, 8.5, 3.6, 0, 0, Math.PI);
      ctx.fill();
    }

    // Near legs
    drawJointedLeg(ctx, -6, -9, leg1 * 0.85, 5, 4, 5, 3.3, isLionPup ? '#f59e0b' : '#94a3b8', isLionPup ? '#fef3c7' : '#f1f5f9', isFlashing, outline);
    drawJointedLeg(ctx, 8, -9, -leg1 * 0.85, 5, 4, 5, 3.3, isLionPup ? '#f59e0b' : '#94a3b8', isLionPup ? '#fef3c7' : '#f1f5f9', isFlashing, outline);

    // Cute Big Head + Fluffy Cheeks
    setFill(
      makeBodyGrad(
        ctx,
        -28,
        -10,
        isLionPup ? '#fef08a' : '#e2e8f0',
        isLionPup ? '#fbbf24' : '#94a3b8',
        isLionPup ? '#d97706' : '#64748b',
        isFlashing
      )
    );
    ctx.beginPath();
    ctx.arc(11, -18.5, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Cute Muzzle
    setFill(isLionPup ? '#fef3c7' : '#f8fafc');
    ctx.beginPath();
    ctx.ellipse(16.8, -16.5, 4.2, 3.2, 0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Tiny Nose
    if (!isFlashing) {
      ctx.fillStyle = isLionPup ? '#78350f' : '#0f172a';
      ctx.beginPath();
      ctx.ellipse(20, -17.5, 1.7, 1.2, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Ears
    if (isLionPup) {
      setFill('#d97706');
      ctx.beginPath();
      ctx.arc(7.5, -25.5, 3.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      if (!isFlashing) {
        ctx.fillStyle = '#fca5a5';
        ctx.beginPath();
        ctx.arc(7.5, -25.5, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      setFill('#64748b');
      ctx.beginPath();
      ctx.moveTo(6.5, -23.5);
      ctx.lineTo(9.5, -33);
      ctx.lineTo(14.5, -24.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      if (!isFlashing) {
        ctx.fillStyle = '#e2e8f0';
        ctx.beginPath();
        ctx.moveTo(8.5, -24.5);
        ctx.lineTo(10, -30.5);
        ctx.lineTo(12.8, -25);
        ctx.closePath();
        ctx.fill();
      }
    }

    drawExpressiveEye(ctx, 14, -19.5, 2.3, isLionPup ? '#fbbf24' : '#38bdf8', false, isFlashing);
  } else if (b.species === 'lion' || b.species === 'hyena') {
    const isLion = b.species === 'lion';

    // Far legs
    drawJointedLeg(ctx, -12, -11, leg2, 6, 5, 6, 3.8, isLion ? '#b45309' : '#854d0e', isLion ? '#fde68a' : '#d6d3d1', isFlashing, outline);
    drawJointedLeg(ctx, 10, -11, -leg2, 6, 5, 6, 3.8, isLion ? '#b45309' : '#854d0e', isLion ? '#fde68a' : '#d6d3d1', isFlashing, outline);

    // Whipping Tail with Tuft
    const tailWave = Math.sin(timeSec * 8 + b.id) * 3;
    ctx.save();
    ctx.strokeStyle = isFlashing ? '#ffffff' : isLion ? '#b45309' : '#713f12';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(-16, -16);
    ctx.bezierCurveTo(-25, -26 + tailWave, -30, -14 + tailWave, -26, -9 + tailWave);
    ctx.stroke();
    setFill(isLion ? '#7c2d12' : '#292524');
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(-26, -8.5 + tailWave, 4.2, 2.6, 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Muscular Big-Cat / Hyena Silhouette (arched shoulders, tucked waist)
    setFill(
      makeBodyGrad(
        ctx,
        -26,
        -4,
        isLion ? '#fde047' : '#eab308',
        isLion ? '#f59e0b' : '#ca8a04',
        isLion ? '#b45309' : '#713f12',
        isFlashing
      )
    );
    ctx.beginPath();
    ctx.moveTo(-17, -14);
    ctx.quadraticCurveTo(-14, -24, -2, -23);
    ctx.quadraticCurveTo(8, -26, 15, -20);
    ctx.quadraticCurveTo(18, -11, 10, -8);
    ctx.quadraticCurveTo(0, -6, -12, -9);
    ctx.quadraticCurveTo(-18, -10, -17, -14);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Belly Highlight or Hyena Dorsal Ridge + Spots
    if (!isFlashing) {
      if (isLion) {
        ctx.fillStyle = '#fef3c7';
        ctx.beginPath();
        ctx.ellipse(0, -9, 10, 3.2, 0.05, 0, Math.PI);
        ctx.fill();
      } else {
        // Dark Hyena Mohawk & Rosette Spots
        ctx.fillStyle = '#292524';
        ctx.beginPath();
        ctx.moveTo(-12, -21);
        ctx.lineTo(-9, -26);
        ctx.lineTo(-5, -22.5);
        ctx.lineTo(-1, -27);
        ctx.lineTo(3, -23);
        ctx.lineTo(7, -27);
        ctx.lineTo(11, -22);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#422006';
        for (const [sx, sy, sr] of [[-9, -15, 2.2], [-3, -17, 2.4], [3, -13, 2], [-5, -12, 1.8], [7, -16, 1.9]]) {
          ctx.beginPath();
          ctx.arc(sx, sy, sr, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Near legs
    drawJointedLeg(ctx, -9, -10, leg1, 6, 5, 6.4, 4, isLion ? '#f59e0b' : '#ca8a04', isLion ? '#fef3c7' : '#a16207', isFlashing, outline);
    drawJointedLeg(ctx, 11, -10, -leg1, 6.5, 5, 6.8, 4.2, isLion ? '#fbbf24' : '#eab308', isLion ? '#fef3c7' : '#a16207', isFlashing, outline);

    // Royal Layered Mane (Lion) or Shaggy Ruff (Hyena)
    if (isLion) {
      setFill(
        makeBodyGrad(ctx, -34, -4, '#9a3412', '#7c2d12', '#451a03', isFlashing)
      );
      ctx.beginPath();
      const spikes = 14;
      for (let a = 0; a < spikes; a++) {
        const ang = (a / spikes) * Math.PI * 2;
        const rad = a % 2 === 0 ? 15.5 : 11.8;
        const mx = 13 + Math.cos(ang) * rad;
        const my = -19 + Math.sin(ang) * rad;
        if (a === 0) ctx.moveTo(mx, my);
        else ctx.lineTo(mx, my);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Inner warm amber ruff
      if (!isFlashing) {
        ctx.fillStyle = '#b45309';
        ctx.beginPath();
        ctx.arc(14, -19, 10.5, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      setFill('#451a03');
      ctx.beginPath();
      ctx.arc(12, -20, 9.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // Rounded Ear
    setFill(isLion ? '#f59e0b' : '#854d0e');
    ctx.beginPath();
    ctx.arc(10.5, -26.5, 3.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Chiseled Head & Snout
    setFill(
      makeBodyGrad(
        ctx,
        -28,
        -10,
        isLion ? '#fde047' : '#eab308',
        isLion ? '#f59e0b' : '#a16207',
        isLion ? '#d97706' : '#713f12',
        isFlashing
      )
    );
    ctx.beginPath();
    ctx.arc(15.5, -19, 8.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Muzzle (Dark mask on hyena, warm cream on lion)
    setFill(isLion ? '#fef3c7' : '#292524');
    ctx.beginPath();
    ctx.ellipse(22.2, -16.8, 5.4, 3.8, 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Roaring fangs when attacking
    if (isPouncing && !isFlashing) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(22, -15);
      ctx.lineTo(23.5, -12);
      ctx.lineTo(25, -15);
      ctx.fill();
    }

    // Nose
    if (!isFlashing) {
      ctx.fillStyle = isLion ? '#7c2d12' : '#09090b';
      ctx.beginPath();
      ctx.ellipse(26.2, -18, 2, 1.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    drawExpressiveEye(ctx, 17.5, -21, 2.2, isLion ? '#fde047' : '#fb923c', true, isFlashing);
  } else if (b.species === 'wolf' || b.species === 'lynx') {
    const isWolf = b.species === 'wolf';

    // Far legs
    drawJointedLeg(ctx, -12, -11, leg2, 6, 5, 5.5, 3.5, isWolf ? '#334155' : '#64748b', '#cbd5e1', isFlashing, outline);
    drawJointedLeg(ctx, 10, -11, -leg2, 6, 5, 5.5, 3.5, isWolf ? '#334155' : '#64748b', '#cbd5e1', isFlashing, outline);

    // Bushy Tail (Long flowing Wolf tail or short black-tipped Lynx bobtail)
    setFill(
      makeBodyGrad(ctx, -25, -8, '#e2e8f0', isWolf ? '#64748b' : '#94a3b8', '#334155', isFlashing)
    );
    ctx.beginPath();
    if (isWolf) {
      const sway = Math.sin(timeSec * 7 + b.id) * 2.5;
      ctx.moveTo(-15, -16);
      ctx.quadraticCurveTo(-28, -24 + sway, -30, -13 + sway);
      ctx.quadraticCurveTo(-24, -8 + sway, -15, -12);
    } else {
      ctx.ellipse(-18.5, -17, 6.2, 3.2, -0.5, 0, Math.PI * 2);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    if (!isWolf && !isFlashing) {
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(-22.5, -19, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Sleek Lupine / Feline Torso
    setFill(
      makeBodyGrad(
        ctx,
        -25,
        -5,
        isWolf ? '#94a3b8' : '#e2e8f0',
        isWolf ? '#64748b' : '#cbd5e1',
        isWolf ? '#334155' : '#64748b',
        isFlashing
      )
    );
    ctx.beginPath();
    ctx.moveTo(-17, -15);
    ctx.quadraticCurveTo(-8, -24, 3, -22);
    ctx.quadraticCurveTo(14, -24, 16, -15);
    ctx.quadraticCurveTo(10, -6, -11, -9);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Snow White Belly / Lynx Spots
    if (!isFlashing) {
      ctx.fillStyle = '#f1f5f9';
      ctx.beginPath();
      ctx.ellipse(1, -9.5, 11, 3.4, 0, 0, Math.PI);
      ctx.fill();

      if (!isWolf) {
        ctx.fillStyle = '#475569';
        for (const [sx, sy] of [[-7, -15], [0, -17], [5, -13], [-3, -12]]) {
          ctx.beginPath();
          ctx.arc(sx, sy, 1.6, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Near legs
    drawJointedLeg(ctx, -9, -10, leg1, 6, 5, 5.8, 3.6, isWolf ? '#64748b' : '#94a3b8', '#f1f5f9', isFlashing, outline);
    drawJointedLeg(ctx, 11, -10, -leg1, 6, 5, 6, 3.8, isWolf ? '#94a3b8' : '#cbd5e1', '#f1f5f9', isFlashing, outline);

    // Frost Neck Ruff
    setFill(isWolf ? '#cbd5e1' : '#f8fafc');
    ctx.beginPath();
    ctx.moveTo(8, -24);
    ctx.lineTo(15, -27);
    ctx.lineTo(20, -18);
    ctx.lineTo(14, -10);
    ctx.lineTo(7, -15);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Wolf / Lynx Head & Sharp Snout
    setFill(
      makeBodyGrad(
        ctx,
        -29,
        -11,
        isWolf ? '#cbd5e1' : '#f1f5f9',
        isWolf ? '#64748b' : '#cbd5e1',
        isWolf ? '#475569' : '#64748b',
        isFlashing
      )
    );
    ctx.beginPath();
    ctx.arc(15, -20, 8.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Muzzle wedge
    setFill('#f8fafc');
    ctx.beginPath();
    ctx.moveTo(19, -22.5);
    ctx.lineTo(28.5, -17.5);
    ctx.lineTo(20, -13.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Pointed Ears (with black Lynx plume tips!)
    setFill(isWolf ? '#475569' : '#94a3b8');
    ctx.beginPath();
    ctx.moveTo(10, -25.5);
    ctx.lineTo(12.5, -36);
    ctx.lineTo(17.5, -26.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    if (!isWolf && !isFlashing) {
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(12.5, -36);
      ctx.lineTo(11, -41);
      ctx.stroke();
      ctx.lineWidth = 1.5;
    }

    // Black nose + glowing ice eye
    if (!isFlashing) {
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(28, -17.8, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }

    drawExpressiveEye(ctx, 18, -21, 2.2, isWolf ? '#38bdf8' : '#34d399', true, isFlashing);
  } else if (b.species === 'boar' || b.species === 'rhino') {
    const isRhino = b.species === 'rhino';

    // Stocky Articulated Charger Legs
    drawJointedLeg(ctx, -13, -10, leg2 * 0.9, 5.5, 4.5, 6.8, 4.5, isRhino ? '#475569' : '#44403c', '#1c1917', isFlashing, outline);
    drawJointedLeg(ctx, 11, -10, -leg2 * 0.9, 5.5, 4.5, 6.8, 4.5, isRhino ? '#475569' : '#44403c', '#1c1917', isFlashing, outline);

    // Armored / Bristled Barrel Torso
    setFill(
      makeBodyGrad(
        ctx,
        -30,
        -3,
        isRhino ? '#94a3b8' : '#78716c',
        isRhino ? '#64748b' : '#57534e',
        isRhino ? '#334155' : '#292524',
        isFlashing
      )
    );
    ctx.beginPath();
    ctx.ellipse(0, -16, 20.5, 13.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Near Legs
    drawJointedLeg(ctx, -8, -9, leg1 * 0.9, 5.5, 4.5, 7.2, 4.8, isRhino ? '#64748b' : '#57534e', '#1c1917', isFlashing, outline);
    drawJointedLeg(ctx, 13, -9, -leg1 * 0.9, 5.5, 4.5, 7.2, 4.8, isRhino ? '#64748b' : '#57534e', '#1c1917', isFlashing, outline);

    if (isRhino) {
      // Riveted War Armor Saddle & Shoulder Plate
      setFill(
        makeBodyGrad(
          ctx,
          -30,
          -10,
          isLionTeam ? '#fcd34d' : '#7dd3fc',
          isLionTeam ? '#b45309' : '#1e40af',
          isLionTeam ? '#78350f' : '#172554',
          isFlashing
        )
      );
      ctx.beginPath();
      ctx.moveTo(-12, -26);
      ctx.quadraticCurveTo(0, -31, 13, -24);
      ctx.lineTo(10, -11);
      ctx.quadraticCurveTo(0, -13, -10, -11);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Brass Rivets
      if (!isFlashing) {
        ctx.fillStyle = '#fde047';
        for (const [rx, ry] of [[-7, -23], [0, -25], [7, -22], [1, -15]]) {
          ctx.beginPath();
          ctx.arc(rx, ry, 1.4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else {
      // Boar Bristled Spine Mohawk + War Leather Harness
      setFill('#292524');
      ctx.beginPath();
      ctx.moveTo(-14, -26);
      ctx.lineTo(-9, -33);
      ctx.lineTo(-4, -28);
      ctx.lineTo(2, -34);
      ctx.lineTo(7, -28);
      ctx.lineTo(13, -32);
      ctx.lineTo(16, -24);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Leather harness belt
      setFill('#92400e');
      ctx.beginPath();
      ctx.roundRect(-2, -28, 6, 22, 2);
      ctx.fill();
      ctx.stroke();
    }

    // Lowered Charging Head
    setFill(
      makeBodyGrad(
        ctx,
        -24,
        -6,
        isRhino ? '#94a3b8' : '#78716c',
        isRhino ? '#475569' : '#44403c',
        '#1c1917',
        isFlashing
      )
    );
    ctx.beginPath();
    ctx.ellipse(18.5, -14.5, 10.5, 8.5, 0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    if (!isRhino) {
      // Flat Snout Disc
      setFill('#f4a29e');
      ctx.beginPath();
      ctx.ellipse(28, -13.5, 2.8, 4.4, 0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // Gleaming Twin Horns (Rhino) or Curved Ivory Tusks (Boar)
    setFill(
      makeBodyGrad(ctx, -32, -8, '#ffffff', '#fef9c3', '#ca8a04', isFlashing)
    );
    ctx.beginPath();
    if (isRhino) {
      // Big Front Scimitar Horn
      ctx.moveTo(23.5, -16.5);
      ctx.quadraticCurveTo(34, -22, 37.5, -33);
      ctx.quadraticCurveTo(31, -18, 28, -11);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Smaller Rear Horn
      ctx.beginPath();
      ctx.moveTo(19, -19.5);
      ctx.lineTo(23.5, -26.5);
      ctx.lineTo(23, -18);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.moveTo(23, -11);
      ctx.quadraticCurveTo(32, -13, 31.5, -23);
      ctx.quadraticCurveTo(28, -12, 25, -8.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    drawExpressiveEye(ctx, 19.5, -16.5, 2.3, '#ef4444', true, isFlashing);
  } else if (b.species === 'bear' || b.species === 'gorilla') {
    const isGorilla = b.species === 'gorilla';

    // Hind Legs
    drawJointedLeg(ctx, -11, -11, leg2 * 0.8, 6, 5, 8, 5.5, isGorilla ? '#1e293b' : '#451a03', '#09090b', isFlashing, outline);
    drawJointedLeg(ctx, 5, -11, -leg2 * 0.8, 6, 5, 8, 5.5, isGorilla ? '#1e293b' : '#451a03', '#09090b', isFlashing, outline);

    // Massive Hulking Torso + Shoulder Hump
    setFill(
      makeBodyGrad(
        ctx,
        -38,
        -6,
        isGorilla ? '#475569' : '#92400e',
        isGorilla ? '#334155' : '#78350f',
        isGorilla ? '#0f172a' : '#451a03',
        isFlashing
      )
    );
    ctx.beginPath();
    ctx.moveTo(-18, -12);
    ctx.quadraticCurveTo(-20, -34, 0, -36);
    ctx.quadraticCurveTo(16, -34, 15, -16);
    ctx.quadraticCurveTo(4, -6, -18, -12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Silverback Glowing Saddle / Grizzly Chest Fur
    setFill(
      makeBodyGrad(
        ctx,
        -34,
        -12,
        isGorilla ? '#e2e8f0' : '#fcd34d',
        isGorilla ? '#94a3b8' : '#b45309',
        isGorilla ? '#64748b' : '#78350f',
        isFlashing
      )
    );
    ctx.beginPath();
    ctx.ellipse(-2, -24, 11.5, 8.5, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // Articulated Muscular Slamming Forearm (No boxy rectangle!)
    const slamOffset = b.attackAnimProgress > 0 ? Math.sin(b.attackAnimProgress * Math.PI) * -13 : 0;
    const armSwing = -leg1 * 0.5;
    setFill(
      makeBodyGrad(
        ctx,
        -28,
        0,
        isGorilla ? '#475569' : '#92400e',
        isGorilla ? '#1e293b' : '#78350f',
        '#09090b',
        isFlashing
      )
    );
    ctx.beginPath();
    ctx.moveTo(5, -24 + slamOffset);
    ctx.quadraticCurveTo(16 + armSwing * 0.3, -20 + slamOffset, 15 + armSwing * 0.5, -3 + slamOffset * 0.6);
    ctx.lineTo(6 + armSwing * 0.5, -2 + slamOffset * 0.6);
    ctx.quadraticCurveTo(8, -13 + slamOffset, 2, -18 + slamOffset);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Knuckle Fist / Bear Paw Claws
    if (!isFlashing) {
      ctx.fillStyle = isGorilla ? '#0f172a' : '#fef3c7';
      for (let c = 0; c < 3; c++) {
        ctx.beginPath();
        ctx.arc(8 + armSwing * 0.5 + c * 3, -1.5 + slamOffset * 0.6, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Head with Fierce Brow & Roaring Jaw
    setFill(isGorilla ? '#1e293b' : '#78350f');
    ctx.beginPath();
    ctx.arc(12.5, -29.5, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Bear Round Ears or Gorilla Brow Plate
    if (!isGorilla) {
      setFill('#451a03');
      ctx.beginPath();
      ctx.arc(6.5, -38.5, 4.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // Snout / Roaring Mouth
    setFill(isGorilla ? '#334155' : '#b45309');
    ctx.beginPath();
    ctx.ellipse(18.5, -27, 6.2, 4.6, 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Open Roar + Fangs
    if (!isFlashing) {
      ctx.fillStyle = '#7f1d1d';
      ctx.beginPath();
      ctx.ellipse(20, -25.2, 3.8, 2.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(18.5, -26.5);
      ctx.lineTo(19.6, -24);
      ctx.lineTo(20.8, -26.5);
      ctx.fill();
    }

    drawExpressiveEye(ctx, 15, -31.5, 2.3, '#facc15', true, isFlashing);
  } else if (b.species === 'mammoth') {
    // Colossal 100-Coin War Mammoth
    // Far Pillar Legs
    drawJointedLeg(ctx, -14, -12, leg2 * 0.65, 7, 5, 9, 7, '#44403c', '#d6d3d1', isFlashing, outline);
    drawJointedLeg(ctx, 10, -12, -leg2 * 0.65, 7, 5, 9, 7, '#44403c', '#d6d3d1', isFlashing, outline);

    // Shaggy Russet Wool Body with Layered Fur Skirt
    setFill(
      makeBodyGrad(ctx, -40, -5, '#b45309', '#7c2d12', '#451a03', isFlashing)
    );
    ctx.beginPath();
    ctx.ellipse(-2, -22, 23, 17, -0.06, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Shaggy fur fringe along belly
    setFill('#451a03');
    ctx.beginPath();
    ctx.moveTo(-20, -13);
    for (let x = -18; x <= 14; x += 6) {
      ctx.lineTo(x + 2, -6);
      ctx.lineTo(x + 5, -12);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Team War Blanket / Saddle on Back
    setFill(
      makeBodyGrad(
        ctx,
        -39,
        -15,
        isLionTeam ? '#fbbf24' : '#38bdf8',
        isLionTeam ? '#b45309' : '#0369a1',
        isLionTeam ? '#78350f' : '#1e3a8a',
        isFlashing
      )
    );
    ctx.beginPath();
    ctx.moveTo(-14, -35);
    ctx.quadraticCurveTo(-2, -39, 10, -34);
    ctx.lineTo(8, -18);
    ctx.lineTo(-12, -18);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Near Pillar Legs
    drawJointedLeg(ctx, -8, -11, leg1 * 0.65, 7, 5, 9.5, 7.2, '#7c2d12', '#e7e5e4', isFlashing, outline);
    drawJointedLeg(ctx, 13, -11, -leg1 * 0.65, 7, 5, 9.5, 7.2, '#7c2d12', '#e7e5e4', isFlashing, outline);

    // Domed Woolly Head
    setFill(
      makeBodyGrad(ctx, -40, -13, '#9a3412', '#7c2d12', '#451a03', isFlashing)
    );
    ctx.beginPath();
    ctx.arc(16, -26, 12.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Golden Armored War Headplate
    setFill(makeBodyGrad(ctx, -39, -22, '#fef08a', '#f59e0b', '#92400e', isFlashing));
    ctx.beginPath();
    ctx.moveTo(11, -37);
    ctx.quadraticCurveTo(22, -38, 27, -27);
    ctx.quadraticCurveTo(18, -28, 12, -32);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Large Shaded Ear
    setFill('#57534e');
    ctx.beginPath();
    ctx.ellipse(8.5, -24, 5.5, 9, 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Articulated Trumpeting Trunk (curved tapering tube)
    const trunkWave = Math.sin(timeSec * 5 + b.id) * 4 + (isPouncing ? -7 : 0);
    setFill(makeBodyGrad(ctx, -28, 0, '#9a3412', '#7c2d12', '#451a03', isFlashing));
    ctx.beginPath();
    ctx.moveTo(23, -25);
    ctx.quadraticCurveTo(35, -16, 32 + trunkWave * 0.6, -5 + trunkWave * 0.4);
    ctx.quadraticCurveTo(33 + trunkWave, 0 + trunkWave * 0.6, 26 + trunkWave, -2 + trunkWave * 0.6);
    ctx.quadraticCurveTo(27, -14, 19, -20);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Colossal Sweeping Ivory Tusks with Gold War-Rings
    setFill(makeBodyGrad(ctx, -32, -8, '#ffffff', '#fefce8', '#d6d3d1', isFlashing));
    ctx.beginPath();
    ctx.moveTo(20, -17);
    ctx.quadraticCurveTo(37, -11, 41, -28);
    ctx.quadraticCurveTo(35, -7, 19, -12.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    if (!isFlashing) {
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(28, -14.5);
      ctx.lineTo(30, -11);
      ctx.stroke();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = outline;
    }

    drawExpressiveEye(ctx, 20.5, -27.5, 2.3, '#fde047', true, isFlashing);
  } else if (b.species === 'phoenix' || b.species === 'icedragon') {
    const isPhoenix = b.species === 'phoenix';
    const wingFlap = Math.sin(timeSec * 11 + b.id) * 14;

    // Back Sweeping Feathered / Crystal Wing
    setFill(
      makeBodyGrad(
        ctx,
        -48,
        -12,
        isPhoenix ? '#fef08a' : '#e0f2fe',
        isPhoenix ? '#f97316' : '#38bdf8',
        isPhoenix ? '#b91c1c' : '#1e3a8a',
        isFlashing
      )
    );
    ctx.beginPath();
    ctx.moveTo(-2, -19);
    ctx.quadraticCurveTo(-18, -42 - wingFlap * 0.7, -28, -32 - wingFlap * 0.6);
    ctx.quadraticCurveTo(-12, -26 - wingFlap * 0.3, 9, -22);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Flowing Flame Tail Plumes / Spiked Frost Tail
    const tailWave = Math.sin(timeSec * 9 + b.id) * 4;
    if (!isFlashing) {
      ctx.strokeStyle = isPhoenix ? '#fde047' : '#bae6fd';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(-24, -14);
      ctx.quadraticCurveTo(-36, -20 + tailWave, -44, -13 - tailWave);
      ctx.moveTo(-24, -12);
      ctx.quadraticCurveTo(-35, -8 - tailWave, -43, -4 + tailWave);
      ctx.stroke();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = outline;
    }

    // Streamlined Aerial Body
    setFill(
      makeBodyGrad(
        ctx,
        -26,
        -8,
        isPhoenix ? '#fb923c' : '#38bdf8',
        isPhoenix ? '#dc2626' : '#0284c7',
        isPhoenix ? '#7f1d1d' : '#1e3a8a',
        isFlashing
      )
    );
    ctx.beginPath();
    ctx.moveTo(-27, -14);
    ctx.quadraticCurveTo(-4, -26, 20, -19);
    ctx.quadraticCurveTo(4, -7, -27, -14);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Front Articulated Wing with Feathers / Wing Ribs
    setFill(
      makeBodyGrad(
        ctx,
        -50,
        -12,
        isPhoenix ? '#fef9c3' : '#f0f9ff',
        isPhoenix ? '#fbbf24' : '#7dd3fc',
        isPhoenix ? '#ea580c' : '#0369a1',
        isFlashing
      )
    );
    ctx.beginPath();
    ctx.moveTo(-1, -17);
    ctx.quadraticCurveTo(-12, -46 + wingFlap, -25, -36 + wingFlap * 0.85);
    ctx.lineTo(-14, -29 + wingFlap * 0.5);
    ctx.lineTo(-19, -25 + wingFlap * 0.35);
    ctx.lineTo(11, -18);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Head, Crown Plumes / Dragon Horns & Beak/Snout
    setFill(isPhoenix ? '#ea580c' : '#0284c7');
    ctx.beginPath();
    ctx.arc(20, -20, 7.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Crown Crest or Frost Horns
    setFill(isPhoenix ? '#fde047' : '#bae6fd');
    ctx.beginPath();
    ctx.moveTo(16, -26);
    ctx.lineTo(8, -36);
    ctx.lineTo(19, -27);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Hooked Beak / Snout
    setFill(isPhoenix ? '#facc15' : '#38bdf8');
    ctx.beginPath();
    ctx.moveTo(26, -22);
    ctx.lineTo(34, -18);
    ctx.lineTo(26, -15);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    drawExpressiveEye(ctx, 22, -21, 2.2, isPhoenix ? '#fef08a' : '#e0f2fe', true, isFlashing);
  } else {
    // 1,000-Coin Galaxy Titan (Mega-Kong Storm Colossus)
    drawJointedLeg(ctx, -13, -12, leg2 * 0.5, 7, 5, 9.5, 7, '#1e1b4b', '#312e81', isFlashing, outline);
    drawJointedLeg(ctx, 13, -12, -leg2 * 0.5, 7, 5, 9.5, 7, '#1e1b4b', '#312e81', isFlashing, outline);

    // Muscular Cosmic Chest & Shoulder Pauldrons
    setFill(makeBodyGrad(ctx, -46, -6, '#4338ca', '#312e81', '#0f172a', isFlashing));
    ctx.beginPath();
    ctx.ellipse(0, -25, 25, 21, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Golden Cosmic Shoulder Pauldrons
    setFill(makeBodyGrad(ctx, -44, -24, '#fef08a', '#facc15', '#b45309', isFlashing));
    ctx.beginPath();
    ctx.ellipse(-18, -34, 9, 6, -0.35, 0, Math.PI * 2);
    ctx.ellipse(18, -34, 9, 6, 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Blazing Lightning Chest Crest
    setFill(isFlashing ? '#ffffff' : '#fde047');
    ctx.beginPath();
    ctx.moveTo(-6, -34);
    ctx.lineTo(7, -25);
    ctx.lineTo(-1, -23);
    ctx.lineTo(9, -13);
    ctx.lineTo(-4, -21);
    ctx.closePath();
    ctx.fill();

    // Crowned Titan Head
    setFill('#1e1b4b');
    ctx.beginPath();
    ctx.arc(3, -45, 12.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 3-Spire Golden Crown
    setFill('#facc15');
    ctx.beginPath();
    ctx.moveTo(-6, -55);
    ctx.lineTo(-4, -64);
    ctx.lineTo(0, -57);
    ctx.lineTo(4, -66);
    ctx.lineTo(8, -57);
    ctx.lineTo(12, -64);
    ctx.lineTo(13, -54);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    drawExpressiveEye(ctx, 8, -46, 3, '#fde047', true, isFlashing);
  }
}

function drawClawSlashEffect(
  ctx: CanvasRenderingContext2D,
  progress: number,
  team: TeamId
): void {
  ctx.save();
  ctx.strokeStyle = team === 'lion' ? '#fde047' : '#38bdf8';
  ctx.lineWidth = 2.6;
  ctx.lineCap = 'round';
  ctx.globalAlpha = progress;
  for (let c = -1; c <= 1; c++) {
    ctx.beginPath();
    ctx.arc(27, -16 + c * 6, 13, -0.75, 0.75);
    ctx.stroke();
  }
  ctx.restore();
}

function drawViewerNameplate(
  ctx: CanvasRenderingContext2D,
  b: BeastEntity,
  scale: number
): void {
  // Rudel-Welpen (Bots) have NO viewer nameplate! Only show a tiny health bar if damaged.
  if (b.isBotPup || !b.username) {
    if (b.hp < b.maxHp) {
      const hpRatio = Math.max(0, Math.min(1, b.hp / b.maxHp));
      const barW = 24;
      const barH = 3;
      const topY = -28 * scale;
      ctx.save();
      ctx.fillStyle = 'rgba(9, 8, 7, 0.75)';
      ctx.fillRect(-barW * 0.5 - 1, topY, barW + 2, barH + 2);
      ctx.fillStyle = b.team === 'lion' ? '#f59e0b' : '#38bdf8';
      ctx.fillRect(-barW * 0.5, topY + 1, barW * hpRatio, barH);
      ctx.restore();
    }
    return;
  }

  const isCoinBeast = b.coins >= 1;
  // Stagger pack flanker vertical label offset slightly so V-formation packs stay readable
  const packStagger = b.coins === 5 ? (b.id % 3) * 14 : 0;
  const topY = -36 * scale - (isCoinBeast ? 11 : 4) - packStagger;

  ctx.save();

  // Individual HP bar right under the nameplate
  const hpRatio = Math.max(0, Math.min(1, b.hp / b.maxHp));
  const barW = isCoinBeast ? 50 : 32;
  const barH = isCoinBeast ? 4.5 : 3.5;
  ctx.fillStyle = 'rgba(9, 8, 7, 0.85)';
  ctx.fillRect(-barW * 0.5 - 1, topY + 4, barW + 2, barH + 2);
  ctx.fillStyle = b.team === 'lion' ? '#f59e0b' : '#38bdf8';
  ctx.fillRect(-barW * 0.5, topY + 5, barW * hpRatio, barH);

  // Viewer Nameplate Text
  const labelText = isCoinBeast
    ? `👑 ${b.username} [${b.coins} Coins] ${b.emoji}`
    : b.username;

  ctx.font = isCoinBeast
    ? '800 10.5px "Plus Jakarta Sans", sans-serif'
    : '700 9px "Plus Jakarta Sans", sans-serif';
  const textMetrics = ctx.measureText(labelText);
  const padX = isCoinBeast ? 7 : 5;
  const boxW = textMetrics.width + padX * 2;
  const boxH = isCoinBeast ? 16 : 13;
  const boxY = topY - boxH + 1;

  // Nameplate background & golden border for Coin animals
  ctx.fillStyle = isCoinBeast ? 'rgba(24, 16, 4, 0.92)' : 'rgba(15, 23, 42, 0.84)';
  ctx.strokeStyle = isCoinBeast
    ? '#facc15'
    : b.team === 'lion'
    ? '#f59e0b'
    : '#38bdf8';
  ctx.lineWidth = isCoinBeast ? 1.8 : 1.1;

  ctx.beginPath();
  ctx.roundRect(-boxW * 0.5, boxY, boxW, boxH, 4);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = isCoinBeast ? '#fef08a' : '#f8fafc';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(labelText, 0, boxY + boxH * 0.52);

  ctx.restore();
}

function drawElementalWave(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  kind: 'fire' | 'ice',
  timeSec: number
): void {
  ctx.save();
  ctx.translate(x, y);

  const grad = ctx.createRadialGradient(0, -20, 8, 0, -20, height * 0.55);
  if (kind === 'fire') {
    grad.addColorStop(0, '#fef08a');
    grad.addColorStop(0.5, 'rgba(249, 115, 22, 0.85)');
    grad.addColorStop(1, 'rgba(220, 38, 38, 0)');
  } else {
    grad.addColorStop(0, '#f0f9ff');
    grad.addColorStop(0.5, 'rgba(56, 189, 248, 0.85)');
    grad.addColorStop(1, 'rgba(2, 132, 199, 0)');
  }

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(0, -18, width * 0.6, height * 0.5 + Math.sin(timeSec * 20) * 6, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawTitanLightningOverlay(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  seq: NonNullable<ArenaWorldState['titanSequence']>
): void {
  ctx.save();
  for (const bolt of seq.lightningBolts) {
    ctx.strokeStyle = `rgba(250, 204, 21, ${bolt.alpha})`;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(bolt.x1, bolt.y1);
    const midX = (bolt.x1 + bolt.x2) * 0.5 + (Math.random() - 0.5) * 40;
    const midY = (bolt.y1 + bolt.y2) * 0.5;
    ctx.lineTo(midX, midY);
    ctx.lineTo(bolt.x2, bolt.y2);
    ctx.stroke();

    ctx.strokeStyle = `rgba(255, 255, 255, ${bolt.alpha})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  ctx.restore();
}
