/* Illustrative, animated AE effect studies, drawn locally without dependencies. */
(() => {
  'use strict';
  const clamp = (value, low = 0, high = 1) => Math.max(low, Math.min(high, value));
  const mix = (a, b, t) => a + (b - a) * t;
  const ease = t => t * t * (3 - 2 * t);
  const tau = Math.PI * 2;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const duration = 10;
  const scenes = [
    { key: 'glow', name: 'Deep Glow v2', href: '/plugin/deep-glow-v2', accent: '#b5f5ff',
      caption: 'Яркие границы превращаются в мягкий свет. Сравни исходный контур и свечение.' },
    { key: 'twixtor', name: 'Twixtor', href: '/plugin/twixtor', accent: '#cebcff',
      caption: 'Один момент — в разном темпе. Сравни обычное движение и плавное замедление.' },
    { key: 'saber', name: 'Saber', href: '/plugin/saber', accent: '#b6d7ff',
      caption: 'Неоновый луч следует по контуру и собирает светящуюся траекторию.' },
    { key: 'flow', name: 'Flow', href: '/plugin/flow', accent: '#d0c2ff',
      caption: 'Одинаковый путь, разный характер. Кривая скорости превращает линейный сдвиг в выразительное движение.' },
    { key: 'newton', name: 'Newton', href: '/plugin/newton', accent: '#ff9d79',
      caption: 'Формы получают вес. Падение, упругий отскок и затухание складываются в живую композицию.' },
    { key: 'optical-flares', name: 'Optical Flares', href: '/plugin/optical-flares', accent: '#f3cd9b',
      caption: 'Свет проходит через линзу: мягкий ореол, тонкий луч и отражения меняются вслед за источником.' }
  ];
  const instances = [];

  function text(ctx, value, x, y, size = 12, color = '#8b8b98', align = 'left', weight = 400) {
    ctx.font = `${weight} ${size}px Arial, sans-serif`;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(value, x, y);
  }

  function line(ctx, x1, y1, x2, y2, color = '#ffffff22', width = 1) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
  }

  function dot(ctx, x, y, radius, color) {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, tau);
    ctx.fillStyle = color;
    ctx.fill();
  }

  function frame(ctx, name) {
    text(ctx, name, 46, 62, 10, '#777780');
    const corners = [[38, 104, 1, 1], [882, 104, -1, 1], [38, 486, 1, -1], [882, 486, -1, -1]];
    corners.forEach(([x, y, sx, sy]) => {
      line(ctx, x, y, x + sx * 14, y, '#ffffff2a');
      line(ctx, x, y, x, y + sy * 14, '#ffffff2a');
    });
    text(ctx, 'NULL—OBJECT / EFFECT STUDIES', 46, 524, 9, '#53535d');
    text(ctx, 'AFTER EFFECTS', 876, 524, 9, '#53535d', 'right');
  }

  function glowText(ctx, t, glow) {
    const gradient = ctx.createLinearGradient(210, 150, 690, 440);
    gradient.addColorStop(0, '#b1faff');
    gradient.addColorStop(.42, '#f9f5ff');
    gradient.addColorStop(.7, '#c2a4ff');
    gradient.addColorStop(1, '#ff8cd4');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.lineJoin = 'round';
    const phrases = [['MAKE', 256, 172], ['IT MOVE', 394, 133]];
    const breath = .8 + .2 * Math.sin(t * 1.65);
    phrases.forEach(([phrase, y, size]) => {
      ctx.font = `800 ${size}px Arial, sans-serif`;
      if (glow) {
        ctx.strokeStyle = '#ae85ff';
        ctx.lineWidth = 5;
        ctx.shadowColor = '#a469ff';
        ctx.shadowBlur = 38 * breath;
        ctx.globalAlpha = .65;
        ctx.strokeText(phrase, 460, y);
        ctx.shadowColor = '#79eaff';
        ctx.shadowBlur = 14 * breath;
        ctx.globalAlpha = 1;
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 2.5;
        ctx.strokeText(phrase, 460, y);
        ctx.fillStyle = '#d8ddff12';
        ctx.fillText(phrase, 460, y);
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#f4faff';
        ctx.lineWidth = .8;
        ctx.strokeText(phrase, 460, y);
      } else {
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#89919d';
        ctx.lineWidth = 1.2;
        ctx.strokeText(phrase, 460, y);
      }
    });
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }

  function renderGlow(ctx, t) {
    frame(ctx, '01 / LIGHT & GLOW');
    const split = 460 + Math.sin(t * .59 - .6) * 180;
    ctx.save();
    ctx.beginPath(); ctx.rect(38, 104, split - 38, 382); ctx.clip();
    glowText(ctx, t, false);
    ctx.restore();
    ctx.save();
    ctx.beginPath(); ctx.rect(split, 104, 882 - split, 382); ctx.clip();
    glowText(ctx, t, true);
    for (let i = 0; i < 13; i++) {
      const x = 180 + (i * 137.3) % 580, y = 155 + (i * 71.7) % 280;
      const alpha = Math.max(0, Math.sin(t * 1.15 + i * 2.4)) * .65;
      dot(ctx, x, y, i % 3 ? 1 : 1.6, `rgba(188,222,255,${alpha})`);
    }
    ctx.restore();
    text(ctx, 'BEFORE', 62, 130, 9, '#7f8590');
    text(ctx, 'AFTER / DEEP GLOW', 856, 130, 9, '#d9c9ff', 'right');
    line(ctx, split, 112, split, 472, '#ffffff99', .8);
    dot(ctx, split, 454, 8, '#09090e');
    ctx.beginPath(); ctx.arc(split, 454, 8, 0, tau); ctx.strokeStyle = '#ffffff99'; ctx.lineWidth = .8; ctx.stroke();
    line(ctx, split - 3, 451, split - 3, 457, '#fff', .8);
    line(ctx, split + 3, 451, split + 3, 457, '#fff', .8);
  }

  function chrome(ctx, x, y, radius, alpha = 1) {
    ctx.save();
    ctx.globalAlpha = alpha;
    const shine = ctx.createRadialGradient(x - radius * .35, y - radius * .45, 1, x + radius * .1, y, radius * 1.1);
    shine.addColorStop(0, '#fff');
    shine.addColorStop(.18, '#eceaff');
    shine.addColorStop(.32, '#8da2c0');
    shine.addColorStop(.47, '#eef5ff');
    shine.addColorStop(.51, '#392f52');
    shine.addColorStop(.72, '#9b78c1');
    shine.addColorStop(1, '#171525');
    ctx.shadowColor = '#ae8aff'; ctx.shadowBlur = 20;
    dot(ctx, x, y, radius, shine);
    ctx.shadowBlur = 0;
    ctx.beginPath(); ctx.arc(x, y, radius - .5, 0, tau); ctx.strokeStyle = '#d9e2ff8c'; ctx.lineWidth = .8; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(x, y, radius * .93, radius * .25, -.23, 0, tau);
    ctx.strokeStyle = '#ffffff6c'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.restore();
  }

  function glass(ctx, x, y) {
    ctx.save();
    const fill = ctx.createLinearGradient(x - 22, y - 55, x + 24, y + 55);
    fill.addColorStop(0, '#c9d5ff15'); fill.addColorStop(.46, '#d2e1ff03'); fill.addColorStop(.5, '#dce9ff28'); fill.addColorStop(1, '#a8b6ff08');
    ctx.beginPath(); ctx.moveTo(x - 10, y - 57); ctx.lineTo(x + 21, y - 45); ctx.lineTo(x + 11, y + 57); ctx.lineTo(x - 20, y + 43); ctx.closePath();
    ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = '#c7d5ff55'; ctx.lineWidth = .8; ctx.stroke();
    line(ctx, x - 7, y - 53, x - 17, y + 39, '#ffffff6b', .7);
    ctx.restore();
  }

  function projectileLane(ctx, t, y, speed, slow) {
    const cycle = 1.65 / speed;
    const phase = (t % cycle) / cycle;
    const x = 120 + phase * 680;
    const pathY = value => y + Math.sin(value * Math.PI * 1.4) * 14;
    const opacity = Math.min(1, phase * 10, (1 - phase) * 12);
    const step = slow ? .018 : .069;
    for (let i = 10; i >= 1; i--) {
      const p = phase - i * step;
      if (p < 0) continue;
      const px = 120 + p * 680;
      ctx.globalAlpha = opacity * (1 - i / 12) * (slow ? .13 : .075);
      ctx.beginPath(); ctx.arc(px, pathY(p), 20, 0, tau);
      ctx.strokeStyle = slow ? '#dbccff' : '#87cafa'; ctx.lineWidth = .8; ctx.stroke();
      dot(ctx, px, y + 65, 1.5, slow ? '#d1bbff' : '#a4d9ff');
    }
    ctx.globalAlpha = 1;
    const trail = ctx.createLinearGradient(Math.max(120, x - 180), y, x, y);
    trail.addColorStop(0, '#a399ff00'); trail.addColorStop(1, slow ? '#c9b5ff80' : '#87d8ff80');
    ctx.beginPath();
    const tail = Math.max(0, phase - (slow ? .15 : .29));
    for (let j = 0; j <= 22; j++) {
      const p = mix(tail, phase, j / 22);
      const px = 120 + p * 680, py = pathY(p);
      if (j) ctx.lineTo(px, py); else ctx.moveTo(px, py);
    }
    ctx.strokeStyle = trail; ctx.lineWidth = 1.5; ctx.stroke();
    glass(ctx, 635, y + 7);
    const impact = clamp(1 - Math.abs(x - 635) / 75) * opacity;
    for (let k = 0; k < 11; k++) {
      const angle = k * 2.399 + t * .4;
      const length = 9 + (k * 11) % 44;
      const sx = 635 + Math.cos(angle) * length * .5, sy = y + Math.sin(angle) * length;
      line(ctx, sx, sy, sx + Math.cos(angle) * (8 + k % 4 * 3), sy + Math.sin(angle) * (8 + k % 4 * 3), `rgba(213,210,255,${impact * .7})`, .8);
    }
    chrome(ctx, x, pathY(phase), 23, opacity);
    line(ctx, 120, y + 65, 800, y + 65, '#ffffff18');
    const cursor = 120 + phase * 680;
    line(ctx, cursor, y + 61, cursor, y + 69, '#d8ceff', 1);
    text(ctx, slow ? 'SLOW MOTION  ×4' : 'ORIGINAL SPEED', 120, y - 54, 10, slow ? '#cdb8ff' : '#969eaa');
    const frameCount = Math.floor((t * speed % 6) * 24);
    text(ctx, `00:${String(Math.floor(frameCount / 24)).padStart(2, '0')}:${String(frameCount % 24).padStart(2, '0')}`, 800, y - 54, 11, '#8a8b98', 'right');
  }

  function renderTwixtor(ctx, t) {
    frame(ctx, '02 / TIME & MOTION');
    projectileLane(ctx, t + .38, 202, 1, false);
    line(ctx, 82, 294, 838, 294, '#ffffff12');
    projectileLane(ctx, t + .38, 386, .25, true);
  }

  const diamond = [[460, 133], [614, 287], [460, 441], [306, 287], [460, 133]];
  function traceDiamond(ctx, progress, color, width, glow = 0, t = 0, electric = false) {
    const distance = clamp(progress) * 4;
    ctx.beginPath();
    ctx.moveTo(...diamond[0]);
    for (let edge = 0; edge < 4; edge++) {
      const part = clamp(distance - edge);
      if (!part) break;
      const from = diamond[edge], to = diamond[edge + 1];
      const pieces = 18;
      for (let n = 1; n <= Math.ceil(part * pieces); n++) {
        const p = Math.min(part, n / pieces);
        const jitter = electric ? Math.sin(n * 5.9 + t * 28 + edge * 3) * Math.sin(p * Math.PI) * 1.3 : 0;
        ctx.lineTo(mix(from[0], to[0], p) + jitter, mix(from[1], to[1], p) - jitter);
      }
    }
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.shadowColor = color; ctx.shadowBlur = glow; ctx.stroke(); ctx.shadowBlur = 0;
  }

  function diamondPoint(progress) {
    const distance = (progress % 1) * 4, edge = Math.floor(distance), p = distance - edge;
    return [mix(diamond[edge][0], diamond[edge + 1][0], p), mix(diamond[edge][1], diamond[edge + 1][1], p)];
  }

  function renderSaber(ctx, t) {
    frame(ctx, '03 / ENERGY & PATHS');
    text(ctx, 'ONE PATH. PURE ENERGY.', 62, 130, 9, '#9694a9');
    const phase = (t % 10) / 10;
    const progress = ease(clamp(phase / .56));
    const breathe = .8 + Math.sin(t * 2.1) * .2;
    traceDiamond(ctx, 1, '#7c70a72c', .9);
    traceDiamond(ctx, progress, '#6e3aff', 6, 27 * breathe);
    traceDiamond(ctx, progress, '#b794ff', 2.8, 13);
    traceDiamond(ctx, progress, '#ecf4ff', 1.05, 4, t, true);
    diamond.slice(0, 4).forEach(([x, y], i) => {
      const on = progress >= i / 4;
      ctx.fillStyle = on ? '#d3c0ff' : '#26232f';
      ctx.fillRect(x - 3, y - 3, 6, 6);
      text(ctx, String(i + 1).padStart(2, '0'), x + (i === 1 ? 18 : -18), y + (i === 2 ? 26 : -14), 8, on ? '#a293b9' : '#45404e', i === 1 ? 'left' : 'right');
    });
    const travel = progress < 1 ? progress * .995 : (.995 + (t % 10 - 5.6) * .14) % 1;
    const [x, y] = diamondPoint(travel);
    ctx.save();
    ctx.translate(x, y); ctx.rotate(Math.sin(t * .6) * .16);
    ctx.shadowColor = '#9c6aff'; ctx.shadowBlur = 19;
    ctx.fillStyle = '#151120'; ctx.fillRect(-20, -20, 40, 40);
    ctx.strokeStyle = '#e5d8ff'; ctx.lineWidth = 1.1; ctx.strokeRect(-20, -20, 40, 40);
    ctx.shadowBlur = 0;
    text(ctx, 'Ae', 0, 7, 19, '#e8dcff', 'center', 500);
    ctx.restore();
    for (let i = 0; i < 16; i++) {
      const age = (t * .63 + i * .113) % 1;
      const angle = i * 2.399;
      const radius = 10 + age * 65;
      dot(ctx, x + Math.cos(angle) * radius, y + Math.sin(angle) * radius, i % 4 ? .8 : 1.4, `rgba(187,159,255,${(1 - age) * .75})`);
    }
    line(ctx, 176, 287, 238, 287, '#7c679e45');
    line(ctx, 682, 287, 744, 287, '#7c679e45');
    text(ctx, 'VECTOR', 176, 309, 8, '#665d78');
    text(ctx, 'LIGHT', 744, 309, 8, '#88769e', 'right');
  }

  function keyframe(ctx, x, y, radius, color) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(Math.PI / 4);
    ctx.fillStyle = color; ctx.fillRect(-radius, -radius, radius * 2, radius * 2);
    ctx.restore();
  }

  const flowEase = p => p < .5 ? 8 * p ** 4 : 1 - (-2 * p + 2) ** 4 / 2;

  function renderFlow(ctx, t) {
    frame(ctx, '04 / CURVES & CHARACTER');
    const phase = (t % 5) / 5;
    const p = clamp((phase - .1) / .72);
    const position = flowEase(p);
    const x0 = 100, y0 = 384, size = 220;
    text(ctx, 'YOUR CURVE', x0, 133, 9, '#c6b7e6');
    for (let i = 0; i <= 4; i++) {
      line(ctx, x0 + i * size / 4, y0 - size, x0 + i * size / 4, y0, '#ffffff0c');
      line(ctx, x0, y0 - i * size / 4, x0 + size, y0 - i * size / 4, '#ffffff0c');
    }
    line(ctx, x0, y0, x0 + size, y0 - size, '#ffffff28');
    ctx.beginPath();
    for (let i = 0; i <= 100; i++) {
      const x = x0 + i / 100 * size, y = y0 - flowEase(i / 100) * size;
      if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    }
    ctx.strokeStyle = '#c5aff7'; ctx.lineWidth = 2; ctx.stroke();
    line(ctx, x0 + p * size, y0, x0 + p * size, y0 - position * size, '#cab6ff55');
    dot(ctx, x0 + p * size, y0 - position * size, 5.5, '#f4eaff');
    keyframe(ctx, x0, y0, 3, '#baa0ed'); keyframe(ctx, x0 + size, y0 - size, 3, '#baa0ed');
    text(ctx, '0', x0, y0 + 24, 9, '#65616c');
    text(ctx, '1', x0 + size, y0 + 24, 9, '#65616c', 'right');
    text(ctx, 'EASE IN / EASE OUT', x0, 451, 10, '#9988b1');
    line(ctx, 376, 151, 376, 448, '#ffffff18');
    text(ctx, 'LINEAR', 424, 146, 9, '#777580');
    text(ctx, 'FLOW', 424, 265, 9, '#cbb5f1');
    [197, 318].forEach((y, i) => {
      line(ctx, 438, y, 816, y, '#ffffff12');
      for (let j = 0; j < 9; j++) dot(ctx, 438 + j * 47.25, y, 1, '#5d526c');
      const progress = i ? position : p;
      const x = 446 + progress * 346;
      keyframe(ctx, x, y, i ? 18 : 11, i ? '#c9b0ff' : '#696770');
    });
    const travel = position * 67;
    ctx.save(); ctx.translate(565 + travel, 433);
    ctx.scale(.92 + .08 * position, 1);
    text(ctx, 'MOVE', 0, 0, 77, '#eee8f5', 'center', 700);
    ctx.restore();
    text(ctx, `${Math.round(position * 100)}%`, 816, 458, 10, '#9b8ab5', 'right');
  }

  // Analytic parabolic bounces keep the same gravity at every frame rate.
  function bounce(time, height, restitution) {
    if (time < 0) return { height, impact: 0 };
    const gravity = 850, drop = Math.sqrt(2 * height / gravity);
    if (time < drop) return { height: height - gravity * time * time / 2, impact: 0 };
    let left = time - drop, speed = gravity * drop * restitution;
    for (let i = 0; i < 9 && speed > 3; i++) {
      const flight = 2 * speed / gravity;
      if (left < flight) return { height: Math.max(0, speed * left - gravity * left * left / 2), impact: Math.exp(-left * 22) * speed / 650 };
      left -= flight;
      speed *= restitution;
    }
    return { height: 0, impact: 0 };
  }

  function renderNewton(ctx, t) {
    frame(ctx, '05 / WEIGHT & PHYSICS');
    text(ctx, 'GRAVITY ON', 62, 130, 9, '#d99b82');
    text(ctx, 'FALL. BOUNCE. SETTLE.', 856, 130, 9, '#8f8680', 'right');
    const phase = t % 7.5;
    const bodies = [
      { x: 248, radius: 66, delay: .1, height: 198, bounce: .67, color: '#ff956e', shape: 'ball' },
      { x: 463, radius: 76, delay: .55, height: 186, bounce: .48, color: '#c9b4f1', shape: 'box' },
      { x: 685, radius: 66, delay: 1.05, height: 207, bounce: .77, color: '#eeeee7', shape: 'ring' }
    ];
    const reset = ease(clamp((phase - 6.4) / 1.1));
    line(ctx, 98, 444, 824, 444, '#c1aca04c');
    bodies.forEach((body, i) => {
      const state = bounce(phase - body.delay, body.height, body.bounce);
      const height = mix(state.height, body.height, reset);
      const squash = clamp(state.impact) * .1 * (1 - reset);
      const radius = body.radius;
      const y = 443 - radius * (1 - squash) - height;
      ctx.save(); ctx.globalAlpha = .18 + .42 * (1 - height / body.height);
      ctx.beginPath(); ctx.ellipse(body.x, 443, radius * (1.1 - height / body.height * .4), 3.5, 0, 0, tau);
      ctx.fillStyle = body.color; ctx.fill(); ctx.restore();
      ctx.save(); ctx.translate(body.x, y); ctx.scale(1 + squash, 1 - squash);
      if (body.shape === 'ball') {
        const gradient = ctx.createRadialGradient(-22, -27, 5, 0, 0, radius * 1.25);
        gradient.addColorStop(0, '#ffc1a5'); gradient.addColorStop(.68, body.color); gradient.addColorStop(1, '#8b3b30');
        dot(ctx, 0, 0, radius, gradient);
        ctx.beginPath(); ctx.arc(0, 0, radius * .7, -.6, 2.5); ctx.strokeStyle = '#ffffff3b'; ctx.lineWidth = 1; ctx.stroke();
      } else if (body.shape === 'box') {
        const gradient = ctx.createLinearGradient(-radius, -radius, radius, radius);
        gradient.addColorStop(0, '#e1d6fa'); gradient.addColorStop(1, '#9c7bc2');
        ctx.beginPath(); ctx.roundRect(-radius, -radius, radius * 2, radius * 2, 17);
        ctx.fillStyle = gradient; ctx.fill();
        ctx.strokeStyle = '#ffffff55'; ctx.lineWidth = 1; ctx.stroke();
        text(ctx, 'Ae', 0, 22, 59, '#342c40', 'center', 500);
      } else {
        ctx.beginPath(); ctx.arc(0, 0, radius - 16, 0, tau); ctx.strokeStyle = body.color; ctx.lineWidth = 32; ctx.stroke();
        ctx.beginPath(); ctx.arc(-2, -2, radius - 17, 0, tau); ctx.strokeStyle = '#ffffff70'; ctx.lineWidth = 1; ctx.stroke();
      }
      ctx.restore();
      text(ctx, ['01 / ELASTIC', '02 / SOLID', '03 / LIGHT'][i], body.x, 475, 9, '#8b8080', 'center');
    });
  }

  function halo(ctx, x, y, radius, color, opacity = 1) {
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, `rgba(${color},${opacity})`);
    gradient.addColorStop(.15, `rgba(${color},${opacity * .42})`);
    gradient.addColorStop(.48, `rgba(${color},${opacity * .1})`);
    gradient.addColorStop(1, `rgba(${color},0)`);
    dot(ctx, x, y, radius, gradient);
  }

  function renderFlares(ctx, t) {
    frame(ctx, '06 / LENS & LIGHT');
    text(ctx, 'A LITTLE LIGHT. ANOTHER ATMOSPHERE.', 62, 130, 9, '#b2a393');
    text(ctx, 'OPTICAL STUDY', 856, 465, 9, '#82796d', 'right');
    const x = 460 + Math.sin(t * .51 - .7) * 275;
    const y = 270 + Math.sin(t * .37) * 50;
    ctx.save();
    ctx.font = '700 146px Arial, sans-serif'; ctx.textAlign = 'center';
    ctx.strokeStyle = '#b4ada24a'; ctx.lineWidth = 1; ctx.strokeText('LIGHT', 460, 352);
    ctx.fillStyle = '#ffffff04'; ctx.fillText('LIGHT', 460, 352);
    ctx.globalCompositeOperation = 'lighter';
    halo(ctx, x, y, 205, '239,126,61', .45);
    halo(ctx, x, y, 82, '255,204,148', .85);
    for (let i = 0; i < 5; i++) {
      const amount = .35 + i * .43;
      const gx = mix(x, 460, amount * 2), gy = mix(y, 292, amount * 2);
      const radius = [21, 48, 11, 64, 29][i];
      halo(ctx, gx, gy, radius, i % 2 ? '111,178,194' : '244,162,108', .15);
      ctx.beginPath();
      for (let edge = 0; edge < 6; edge++) {
        const angle = edge / 6 * tau + .16;
        const px = gx + Math.cos(angle) * radius, py = gy + Math.sin(angle) * radius;
        if (edge) ctx.lineTo(px, py); else ctx.moveTo(px, py);
      }
      ctx.closePath(); ctx.strokeStyle = i % 2 ? '#9fddf122' : '#ffc9a425'; ctx.lineWidth = .8; ctx.stroke();
    }
    ctx.save(); ctx.translate(x, y); ctx.scale(6.5, .055);
    halo(ctx, 0, 0, 78, '164,208,255', .85); ctx.restore();
    ctx.save(); ctx.translate(x, y); ctx.scale(.035, 2.2);
    halo(ctx, 0, 0, 53, '255,216,173', .65); ctx.restore();
    halo(ctx, x, y, 27, '255,236,202', .9);
    dot(ctx, x, y, 3.6, '#fffaf0');
    ctx.restore();
    line(ctx, 108, 465, 291, 465, '#b4a38d33');
    dot(ctx, 108 + (x - 185) / 550 * 183, 465, 3, '#d6bc97');
  }

  const renderers = [renderGlow, renderTwixtor, renderSaber, renderFlow, renderNewton, renderFlares];
  const stillTimes = [3.2, 2.4, 6, 2.3, 1.7, 2.8];

  class PluginTheatre {
    constructor(root) {
      this.root = root;
      this.canvas = root.querySelector('[data-theatre-canvas]');
      this.screen = root.querySelector('.ae-theatre-screen');
      this.ctx = this.canvas?.getContext('2d', { alpha: false });
      if (!this.ctx || !this.screen) return;
      this.hero = root.dataset.variant === 'hero';
      this.index = this.time = this.exposure = this.last = this.frame = 0;
      this.visible = false;
      this.started = this.hero;
      this.auto = true;
      this.pendingCue = false;
      this.width = this.height = 0;
      this.buttons = [...root.querySelectorAll('[data-theatre-select]')];
      this.timeline = root.querySelector('.ae-theatre-timeline');
      if (this.timeline) {
        this.timeline.setAttribute('aria-hidden', 'true');
        this.timeline.innerHTML = scenes.map(() => '<span><i></i></span>').join('');
        this.bars = [...this.timeline.querySelectorAll('i')];
      } else this.bars = [];
      root.querySelector('.ae-theatre-controls')?.setAttribute('aria-label', 'Демонстрации плагинов');
      this.animate = this.animate.bind(this);
      this.resize = this.resize.bind(this);
      this.buttons.forEach(button => {
        button.addEventListener('click', () => this.select(button.dataset.theatreSelect, true));
        button.addEventListener('keydown', event => {
          if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
          event.preventDefault();
          const index = event.key === 'Home' ? 0 : event.key === 'End' ? scenes.length - 1 :
            (this.index + (event.key === 'ArrowLeft' ? scenes.length - 1 : 1)) % scenes.length;
          this.select(scenes[index].key, true);
          this.buttons.find(candidate => candidate.dataset.theatreSelect === scenes[index].key)?.focus();
        });
      });
      root.querySelector('[data-theatre-auto]')?.addEventListener('click', () => {
        this.auto = !this.auto;
        this.time = 0;
        this.started = true;
        this.updateControls();
        this.wake();
      });
      root.querySelector('[data-theatre-replay]')?.addEventListener('click', () => {
        this.time = 0;
        this.started = true;
        this.paint();
        this.wake();
      });
      this.resizeObserver = new ResizeObserver(this.resize);
      this.resizeObserver.observe(this.screen);
      this.intersectionObserver = new IntersectionObserver(entries => {
        const entry = entries[0];
        this.visible = entry.isIntersecting && entry.intersectionRatio > .04;
        root.dataset.theatreVisible = String(this.visible);
        if (this.visible) {
          if (this.pendingCue) this.reveal(true);
          this.paint();
          this.wake();
        } else {
          cancelAnimationFrame(this.frame);
          this.frame = this.last = 0;
        }
      }, { threshold: [0, .05, .25] });
      this.intersectionObserver.observe(this.screen);
      this.updateControls();
      this.resize();
      instances.push(this);
    }

    resize() {
      this.width = this.screen.clientWidth;
      this.height = this.screen.clientHeight;
      if (!this.width || !this.height) return;
      this.dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      this.canvas.width = Math.round(this.width * this.dpr);
      this.canvas.height = Math.round(this.height * this.dpr);
      this.paint();
      this.wake();
    }

    select(key, manual = false) {
      const index = scenes.findIndex(scene => scene.key === key || scene.href.endsWith(`/${key}`));
      if (index < 0) return;
      this.index = index;
      this.time = 0;
      this.started = true;
      if (manual) {
        this.auto = false;
        this.pendingCue = false;
      }
      this.updateControls();
      this.paint();
      this.wake();
      window.dispatchEvent(new CustomEvent('ae:plugin-scene-change', {
        detail: { plugin: scenes[index].key, variant: this.hero ? 'hero' : 'catalog', manual }
      }));
    }

    reveal(replay = false) {
      if (!this.visible) { this.pendingCue = true; return; }
      this.pendingCue = false;
      if (this.started && !replay) return;
      this.auto = true;
      this.select('glow');
    }

    updateControls() {
      const scene = scenes[this.index];
      this.root.dataset.theatreScene = scene.key;
      this.root.dataset.theatreMode = this.auto ? 'auto' : 'manual';
      this.root.style.setProperty('--theatre-accent', scene.accent);
      const number = this.root.querySelector('[data-theatre-number]');
      if (number) number.textContent = `${String(this.index + 1).padStart(2, '0')} / ${String(scenes.length).padStart(2, '0')}`;
      const link = this.root.querySelector('[data-theatre-plugin]');
      if (link) { link.textContent = `${scene.name} ↗`; link.href = scene.href; }
      const caption = this.root.querySelector('[data-theatre-caption]');
      if (caption) caption.textContent = scene.caption;
      this.buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.theatreSelect === scene.key)));
      const auto = this.root.querySelector('[data-theatre-auto]');
      if (auto) {
        auto.setAttribute('aria-pressed', String(this.auto));
        auto.textContent = this.auto ? 'Автопоказ · вкл' : 'Продолжить автопоказ';
      }
    }

    wake() {
      if (!this.visible || this.frame || document.hidden || reduced.matches) return;
      this.frame = requestAnimationFrame(this.animate);
    }

    animate(now) {
      this.frame = 0;
      if (!this.visible || document.hidden) { this.last = 0; return; }
      const delta = this.last ? Math.min((now - this.last) / 1000, .05) : 1 / 60;
      this.last = now;
      this.exposure += delta;
      if (!this.started && this.exposure > 1.2) this.reveal();
      if (this.started) {
        this.time += delta;
        if (this.auto && this.time >= duration) this.select(scenes[(this.index + 1) % scenes.length].key);
      }
      this.paint();
      this.wake();
    }

    paint() {
      if (!this.width || !this.height) return;
      const ctx = this.ctx;
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      ctx.fillStyle = '#030304';
      ctx.fillRect(0, 0, this.width, this.height);
      const scale = Math.min(this.width / 920, this.height / 560);
      ctx.save();
      ctx.translate((this.width - 920 * scale) / 2, (this.height - 560 * scale) / 2);
      ctx.scale(scale, scale);
      const time = reduced.matches ? stillTimes[this.index] : this.time;
      renderers[this.index](ctx, time);
      ctx.restore();
      const progress = reduced.matches ? 1 : clamp(this.time / duration);
      this.bars.forEach((bar, i) => { bar.style.transform = `scaleX(${i < this.index ? 1 : i === this.index ? progress.toFixed(4) : 0})`; });
      this.root.dataset.theatreClock = this.time.toFixed(1);
    }
  }

  const init = () => document.querySelectorAll('[data-plugin-theatre]').forEach(root => new PluginTheatre(root));
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
  window.addEventListener('ae:gallery-reveal', event => {
    instances.forEach(theatre => { if (!theatre.hero) theatre.reveal(Boolean(event.detail?.replay)); });
  });
  window.addEventListener('ae:intro-replay', () => {
    instances.forEach(theatre => { if (theatre.hero) theatre.reveal(true); });
  });
  window.addEventListener('ae:plugin-scene', event => {
    instances.forEach(theatre => {
      const variant = theatre.hero ? 'hero' : 'catalog';
      if ((event.detail?.variant || 'catalog') === variant) theatre.select(event.detail?.plugin, Boolean(event.detail?.manual));
    });
  });
  document.addEventListener('visibilitychange', () => instances.forEach(theatre => {
    theatre.last = 0;
    if (document.hidden) { cancelAnimationFrame(theatre.frame); theatre.frame = 0; }
    else theatre.wake();
  }));
  reduced.addEventListener('change', () => instances.forEach(theatre => {
    if (reduced.matches) { cancelAnimationFrame(theatre.frame); theatre.frame = 0; }
    theatre.paint();
    theatre.wake();
  }));
})();
