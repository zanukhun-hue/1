(() => {
  'use strict';
  const stage = document.querySelector('.ae-experience');
  const mascot = stage?.querySelector('[data-mascot]');
  const demo = stage?.querySelector('.ae-demo-window');
  if (!stage || !mascot || !demo) return;

  mascot.innerHTML = `<svg viewBox="0 0 180 210" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <g class="ae-guide-stroke">
      <path data-guide-leg="left"/><path data-guide-leg="right"/>
      <path data-guide-arm="left"/><path data-guide-arm="right"/>
      <g data-guide-body>
        <path class="ae-guide-wire" d="M84 45C75 30 80 20 88 23 98 25 96 38 90 44"/>
        <path d="M40 55 104 44 133 64 131 130 66 142 42 120Z"/>
        <path class="ae-guide-wire" d="M40 55 66 74 133 64M66 74 66 142M66 74 104 44"/>
        <g data-guide-face>
          <ellipse class="ae-guide-eye" cx="88" cy="96" rx="2.1" ry="3.7" stroke="none"/>
          <ellipse class="ae-guide-eye" cx="111" cy="92.5" rx="2.1" ry="3.7" stroke="none"/>
          <path class="ae-guide-wire" d="M85 110Q98 127 115 105"/>
        </g>
      </g>
      <g class="ae-guide-effort ae-guide-wire"><path d="m28 57-7-5m11-7-2-8m8 4 3-7"/></g>
      <path class="ae-guide-wire" data-guide-grip="left"/><path class="ae-guide-wire" data-guide-grip="right"/>
    </g>
  </svg>`;
  const body = mascot.querySelector('[data-guide-body]');
  const face = mascot.querySelector('[data-guide-face]');
  const arms = ['left', 'right'].map(side => mascot.querySelector(`[data-guide-arm="${side}"]`));
  const legs = ['left', 'right'].map(side => mascot.querySelector(`[data-guide-leg="${side}"]`));
  const grips = ['left', 'right'].map(side => mascot.querySelector(`[data-guide-grip="${side}"]`));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const catalog = stage.querySelector('.ae-catalog-visual') || stage.querySelector('[data-plugin-theatre="catalog"]');
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const mix = (a, b, t) => a + (b - a) * t;
  const ease = v => { const t = clamp(v); return t * t * (3 - 2 * t); };
  const NODE_COUNT = 49;
  const PREPARE_SECONDS = .28;
  const LAND_SECONDS = .64;
  const PUSH_SECONDS = 4;
  const PUSH_END = 1 + PUSH_SECONDS;
  const lines = Array.from(stage.querySelectorAll('[data-elastic-line]'), (svg, index) => {
    const path = svg.querySelector('path') || svg.appendChild(document.createElementNS('http://www.w3.org/2000/svg', 'path'));
    return { svg, path, index, box: null, y: Array.from({ length: NODE_COUNT }, (_, i) => 26 + 3 * Math.sin(i / (NODE_COUNT - 1) * Math.PI)), velocity: Array(NODE_COUNT).fill(0) };
  });

  let geometry, raf = 0, measureRaf = 0, previousTime = 0, clock = 0;
  let support = null, transfer = null, actor = null, initialized = false;
  let landing = 0, resting = 0, lastRig = null;
  let scrollDirection = 1, lastScrollY = window.scrollY;
  let intro = { phase: 'waiting', elapsed: 0, complete: false };
  let galleryCue = { started: false, elapsed: 0, sent: false, replay: false };
  const pointer = { x: -1000, y: -1000, active: false };

  function layoutBox(element) {
    let x = 0, y = 0, node = element;
    while (node && node !== stage) {
      x += node.offsetLeft;
      y += node.offsetTop;
      node = node.offsetParent;
    }
    return { x, y, width: element.offsetWidth, height: element.offsetHeight };
  }

  function measure() {
    measureRaf = 0;
    const root = stage.getBoundingClientRect();
    const w = mascot.offsetWidth;
    const demoBox = layoutBox(demo);
    const mobile = innerWidth <= 700;
    const requestedDistance = mobile ? clamp(innerWidth * .12, 36, 64) : clamp(innerWidth * .25, 150, 400);
    geometry = {
      left: root.left + scrollX, top: root.top + scrollY,
      width: root.width, w, scale: w / 180,
      vh: innerHeight, mobile, demo: demoBox,
      pushDistance: Math.min(requestedDistance, mobile ? Math.max(0, demoBox.x - w * .94 - 12) : Math.max(90, demoBox.x - w * .76)),
      catalog: catalog ? layoutBox(catalog) : null,
    };
    for (const line of lines) {
      const rect = line.svg.getBoundingClientRect();
      line.box = { x: rect.left - root.left, y: rect.top - root.top, width: rect.width, height: rect.height };
    }
    if (intro.phase === 'waiting' && !reduced.matches) setWindowOffset(-geometry.pushDistance);
    else if (intro.complete || reduced.matches) setWindowOffset(0);
    wake();
  }

  function refresh() { if (!measureRaf) measureRaf = requestAnimationFrame(measure); }
  function viewportY(y) { return geometry.top + y - window.scrollY; }
  function setWindowOffset(x) {
    demo.style.setProperty('--mascot-push-x', `${x.toFixed(2)}px`);
    demo.style.setProperty('--mascot-push-rotate', '0deg');
  }

  function lineHeight(line, worldX) {
    const n = clamp((worldX - line.box.x) / Math.max(line.box.width, 1)) * (NODE_COUNT - 1);
    const i = Math.min(NODE_COUNT - 2, Math.floor(n));
    const t = n - i, u = 1 - t;
    const a = line.y[Math.max(0, i - 1)], b = line.y[i];
    const c = line.y[i + 1], d = line.y[Math.min(NODE_COUNT - 1, i + 2)];
    const y = u * u * u * b + 3 * u * u * t * (b + (c - a) / 6) + 3 * u * t * t * (c - (d - b) / 6) + t * t * t * c;
    return line.box.y + y / 80 * line.box.height;
  }

  function pathFor(line) {
    const step = 1440 / (NODE_COUNT - 1);
    let d = `M0 ${line.y[0].toFixed(2)}`;
    for (let i = 0; i < NODE_COUNT - 1; i++) {
      const a = line.y[Math.max(0, i - 1)], b = line.y[i];
      const c = line.y[i + 1], e = line.y[Math.min(NODE_COUNT - 1, i + 2)];
      d += `C${((i + 1 / 3) * step).toFixed(1)} ${(b + (c - a) / 6).toFixed(2)} ${((i + 2 / 3) * step).toFixed(1)} ${(c - (e - b) / 6).toFixed(2)} ${((i + 1) * step).toFixed(1)} ${c.toFixed(2)}`;
    }
    return d;
  }

  function lineSupport(line) {
    const poses = ['sit', 'hang', 'sit', 'hang'];
    return { kind: 'line', line, pose: poses[line.index % poses.length] };
  }

  function mount(on) {
    if (on.kind === 'demo') {
      const perchX = geometry.mobile ? geometry.demo.width - geometry.w * .66 : innerWidth <= 1100 ? geometry.demo.width * .5 : Math.min(geometry.demo.width * .35, 240);
      return { x: geometry.demo.x + perchX, y: geometry.demo.y + 1, localY: 188, pose: 'stand' };
    }
    const line = on.line;
    const fractions = geometry.mobile ? [.76, .73, .77, .69] : [.58, .66, .57, .72];
    const x = line.box.x + line.box.width * fractions[line.index % fractions.length];
    const seatX = x + 8.5 * geometry.scale;
    return { x, y: lineHeight(line, on.pose === 'sit' ? seatX : x), localY: on.pose === 'hang' ? 26 : on.pose === 'sit' ? 136 : 188, pose: on.pose, line };
  }

  function renderedMount(on) {
    const m = mount(on);
    return { ...m, top: m.y - m.localY * geometry.scale };
  }

  function candidateLine() {
    const relevant = lines.filter(line => line.box?.width && viewportY(line.box.y) <= geometry.vh * .75 && viewportY(line.box.y) >= -90);
    if (!relevant.length) return null;
    return relevant.reduce((best, line) => Math.abs(viewportY(line.box.y) - geometry.vh * .62) < Math.abs(viewportY(best.box.y) - geometry.vh * .62) ? line : best);
  }

  function beginTransfer(next) {
    if (support?.kind === 'line' && support.line === next.line) return;
    const end = renderedMount(next);
    const start = actor || end;
    const distance = Math.hypot(end.x - start.x, end.top - start.top);
    const upward = end.top < start.top && scrollDirection < 0;
    const duration = upward ? clamp(.48 + Math.sqrt(distance) * .011, .68, .98) : clamp(.5 + Math.sqrt(distance) * .027, .76, 1.55);
    const rise = Math.max(geometry.mobile ? 48 : 85, Math.max(0, end.top - start.top) * .38 + 42);
    transfer = { from: { x: start.x, top: start.top }, source: support, to: next, phase: 'prepare', elapsed: 0, duration, rise, end, upward, launchRig: null };
    mascot.dataset.jumpFrom = `${start.x.toFixed(1)},${start.top.toFixed(1)}`;
    mascot.dataset.jumpTo = `${end.x.toFixed(1)},${end.top.toFixed(1)}`;
    mascot.dataset.jumpDuration = duration.toFixed(3);
    mascot.dataset.jumpProgress = '0';
    mascot.dataset.activeJump = 'true';
    resting = 0;
  }

  function contactXs(on) {
    const m = mount(on), s = geometry.scale;
    if (on.pose === 'hang') return [m.x - 51 * s, m.x + 55 * s];
    if (on.pose === 'sit') return [m.x + 8.5 * s];
    return [m.x - 22 * s, m.x + 38 * s];
  }

  function impulse(on, strength) {
    if (on?.kind !== 'line') return;
    const line = on.line;
    for (const px of contactXs(on)) {
      const p = (px - line.box.x) / line.box.width;
      for (let i = 1; i < NODE_COUNT - 1; i++) {
        const x = i / (NODE_COUNT - 1);
        line.velocity[i] += Math.exp(-((x - p) ** 2) / .007) * strength / contactXs(on).length;
      }
    }
  }

  function updateSprings(dt) {
    // Released strings must settle even outside the viewport; culling here
    // freezes their last loaded shape until the user scrolls back.
    for (const line of lines) {
      if (!line.box?.width) continue;
      const loaded = support?.kind === 'line' && support.line === line;
      const contacts = loaded ? contactXs(support).map(x => (x - line.box.x) / line.box.width) : [];
      const preparing = loaded && transfer?.phase === 'prepare' ? ease(transfer.elapsed / PREPARE_SECONDS) : 0;
      const pointerX = (pointer.x - geometry.left - line.box.x) / line.box.width;
      const pointerY = pointer.y + scrollY - geometry.top - line.box.y;
      const pointerClose = pointer.active && pointerX > 0 && pointerX < 1 && Math.abs(pointerY - line.box.height * .4) < 45;
      for (let i = 1; i < NODE_COUNT - 1; i++) {
        const x = i / (NODE_COUNT - 1);
        let target = 26 + Math.sin(x * Math.PI) * 3;
        if (loaded) {
          // A wide catenary carries the weight to both ends; the local indentation
          // follows the seat or the two actual grips rather than the actor centre.
          const weight = (support.pose === 'hang' ? 43 : 37) * (1 + preparing * .34);
          for (const p of contacts) {
            const span = x < p ? x / p : (1 - x) / (1 - p);
            const local = Math.exp(-((x - p) ** 2) / .004);
            target += weight * (.79 * Math.sin(clamp(span) * Math.PI / 2) + .21 * local) / contacts.length;
          }
        }
        if (pointerClose && !geometry.mobile) target += Math.exp(-((x - pointerX) ** 2) / .006) * clamp(pointerY / line.box.height * 80 - 30, -12, 16) * .35;
        const force = (target - line.y[i]) * .028 + (line.y[i - 1] + line.y[i + 1] - 2 * line.y[i]) * .085;
        line.velocity[i] = (line.velocity[i] + force * dt) * Math.pow(.875, dt);
      }
      for (let i = 1; i < NODE_COUNT - 1; i++) line.y[i] += line.velocity[i] * dt;
      line.path.setAttribute('d', pathFor(line));
      line.svg.dataset.lineSag = ((Math.max(...line.y) - 29) / 80 * line.box.height).toFixed(2);
    }
  }

  function localLineY(line, x, place = actor) {
    return line ? (lineHeight(line, place.x + (x - 90) * geometry.scale) - place.top) / geometry.scale : 188;
  }

  // One rig drives the body and all four limb roots. Grips and seat anchors
  // stay in stage coordinates, so secondary motion cannot detach a hand.
  function makeRig(kind, time, opts = {}, place = actor) {
    const still = reduced.matches;
    const wave = still ? 0 : Math.sin(time * 1.75);
    const rig = {
      tx: 0, ty: still ? 0 : Math.sin(time * 2.2) * .65,
      angle: 0, sx: 1, sy: 1, px: 98.5, py: 136,
      elbows: [[24, 108], [149, 103]], hands: [[19, 131], [158, 127]],
      knees: [[76, 163], [115, 162]], feet: [[69, 188], [129, 188]],
      hook: 0, toe: [-1, 1]
    };
    if (kind === 'sit') {
      const seatWorld = place.x + 8.5 * geometry.scale;
      const slope = opts.line ? Math.atan2(lineHeight(opts.line, seatWorld + 6) - lineHeight(opts.line, seatWorld - 6), 12) * 180 / Math.PI : 0;
      rig.angle = 10.46 + slope + wave * .55;
      rig.ty = 0;
      rig.sx = 1 + wave * .003;
      rig.hands = [[43, localLineY(opts.line, 43, place) - 2], [147, localLineY(opts.line, 147, place) - 2]];
      rig.elbows = [[27, 116], [157, 112]];
      const kick = still ? 0 : Math.sin(time * 2.1) * 6;
      rig.knees = [[77 + kick * .3, 162], [116 - kick * .2, 157]];
      rig.feet = [[84 + kick, 189], [133 - kick * .85, 184]];
      rig.toe = [1, 1];
    } else if (kind === 'hang') {
      const swing = still ? 0 : Math.sin(time * 1.8);
      rig.tx = swing * 9;
      rig.ty = 13 + (still ? 0 : Math.cos(time * 3.6) * 1.3);
      rig.angle = -swing * 5;
      rig.hands = [[39, localLineY(opts.line, 39, place)], [145, localLineY(opts.line, 145, place)]];
      rig.elbows = [[30 + swing * 3, 63], [154 + swing * 3, 58]];
      const lag = still ? 0 : Math.sin(time * 1.8 - .65) * 12;
      rig.knees = [[80 + lag, 171], [121 + lag, 168]];
      rig.feet = [[67 + lag * 1.5, 199], [135 + lag * 1.3, 192]];
      rig.hook = 1;
    } else if (kind === 'jump') {
      const p = opts.flight ?? .5;
      const tuck = Math.sin(p * Math.PI);
      const direction = opts.direction || 1;
      rig.angle = direction * (8 - p * 15);
      rig.sx = 1 - Math.sin(p * Math.PI) * .035;
      rig.sy = 1 + Math.sin(p * Math.PI) * .045;
      rig.hands = [[15 - tuck * 2, 49 - tuck * 20], [158 + tuck * 7, 44 - tuck * 22]];
      rig.elbows = [[20, 78], [154, 69]];
      rig.knees = [[67 - tuck * 7, 157], [127 + tuck * 8, 151]];
      rig.feet = [[52 - tuck * 9, 177 - tuck * 9], [148 + tuck * 7, 171 - tuck * 14]];
    } else if (kind === 'push' || kind === 'brace') {
      const stride = kind === 'push' ? Math.sin(time * 11) : 0;
      rig.angle = kind === 'push' ? 9 : 4 + (opts.progress || 0) * 5;
      rig.ty = Math.abs(stride) * 1.4;
      rig.hands = [[169, 120], [169, 94]];
      rig.elbows = [[64, 132], [151, 94]];
      rig.knees = [[74 - stride * 4, 163], [114 + stride * 4, 163]];
      rig.feet = [[68 - stride * 14, 188 - Math.max(0, stride) * 5], [129 + stride * 14, 188 - Math.max(0, -stride) * 5]];
    } else {
      rig.feet = [[69, localLineY(opts.line, 69, place)], [129, localLineY(opts.line, 129, place)]];
    }
    const crouch = opts.crouch || 0;
    const impact = opts.impact || 0;
    if (kind === 'hang') {
      rig.ty += impact * 9 - crouch * 7;
      rig.sy += impact * .06;
    } else if (kind === 'sit') {
      rig.sy -= (crouch + impact) * .09;
      rig.sx += (crouch + impact) * .055;
      rig.angle -= crouch * 4;
    } else if (kind !== 'jump') {
      rig.ty += (crouch + impact) * 12;
      rig.sy -= (crouch + impact) * .055;
      rig.sx += (crouch + impact) * .035;
      rig.knees[0][0] -= crouch * 7;
      rig.knees[1][0] += crouch * 7;
    }
    return rig;
  }

  function blendRig(a, b, t) {
    const result = {};
    for (const key of ['tx', 'ty', 'angle', 'sx', 'sy', 'px', 'py', 'hook']) result[key] = mix(a[key], b[key], t);
    for (const key of ['elbows', 'hands', 'knees', 'feet']) result[key] = a[key].map((point, i) => point.map((n, j) => mix(n, b[key][i][j], t)));
    result.toe = b.toe;
    return result;
  }

  function bodyPoint(rig, x, y) {
    const angle = rig.angle * Math.PI / 180;
    const dx = (x - rig.px) * rig.sx, dy = (y - rig.py) * rig.sy;
    return [rig.px + rig.tx + dx * Math.cos(angle) - dy * Math.sin(angle), rig.py + rig.ty + dx * Math.sin(angle) + dy * Math.cos(angle)];
  }

  function limbPath(start, middle, end, width, toe = 0) {
    const normal = (a, b) => {
      const dx = b[0] - a[0], dy = b[1] - a[1], length = Math.max(1, Math.hypot(dx, dy));
      return [-dy / length * width, dx / length * width];
    };
    const a = normal(start, middle), b = normal(middle, end);
    const tip = toe ? [end[0] + toe * 11, end[1] + 1] : end;
    const f = n => n.toFixed(2);
    return 'M' + f(start[0] + a[0]) + ' ' + f(start[1] + a[1]) +
      'Q' + f(middle[0] + a[0]) + ' ' + f(middle[1] + a[1]) + ' ' + f(end[0] + b[0]) + ' ' + f(end[1] + b[1]) +
      'Q' + f(tip[0] + b[0]) + ' ' + f(tip[1] + b[1]) + ' ' + f(tip[0]) + ' ' + f(tip[1] + (toe ? 3 : 0)) +
      'L' + f(end[0] - b[0]) + ' ' + f(end[1] - b[1]) +
      'Q' + f(middle[0] - a[0]) + ' ' + f(middle[1] - a[1]) + ' ' + f(start[0] - a[0]) + ' ' + f(start[1] - a[1]) + 'Z';
  }

  function pose(kind, time, opts = {}) {
    mascot.dataset.pose = kind;
    let rig = opts.rig || makeRig(kind, time, opts);
    lastRig = rig;
    const transformedOrigin = bodyPoint(rig, 0, 0);
    const angle = rig.angle * Math.PI / 180;
    body.setAttribute('transform', 'matrix(' + [Math.cos(angle) * rig.sx, Math.sin(angle) * rig.sx, -Math.sin(angle) * rig.sy, Math.cos(angle) * rig.sy, ...transformedOrigin].map(v => v.toFixed(5)).join(' ') + ')');
    const gx = pointer.active ? clamp((pointer.x - geometry.left - actor.x) / 160, -2.5, 2.5) : kind === 'push' ? 2 : 0;
    const gy = pointer.active ? clamp((pointer.y + scrollY - geometry.top - actor.top - 100 * geometry.scale) / 160, -1.5, 1.5) : 0;
    face.setAttribute('transform', 'translate(' + gx.toFixed(2) + ' ' + gy.toFixed(2) + ')');
    const shoulders = [bodyPoint(rig, 45, 88), bodyPoint(rig, 130, 86)];
    const hips = [bodyPoint(rig, 83, 134), bodyPoint(rig, 116, 130)];
    for (let i = 0; i < 2; i++) {
      arms[i].setAttribute('d', limbPath(shoulders[i], rig.elbows[i], rig.hands[i], 3.5));
      legs[i].setAttribute('d', limbPath(hips[i], rig.knees[i], rig.feet[i], 5.2, rig.toe[i]));
      const [x, y] = rig.hands[i];
      grips[i].setAttribute('d', 'M' + (x - 3).toFixed(2) + ' ' + (y + 2).toFixed(2) + 'v-5q0-6 5-6q5 0 5 5v4');
      grips[i].style.opacity = rig.hook.toFixed(3);
    }
    if (opts.line && !opts.rig) {
      let error = 0;
      if (kind === 'hang') error = Math.max(...rig.hands.map(([x, y]) => Math.abs(y - localLineY(opts.line, x)) * geometry.scale));
      if (kind === 'sit') {
        const [x, y] = bodyPoint(rig, 98.5, 136);
        error = Math.abs(y - localLineY(opts.line, x)) * geometry.scale;
      }
      mascot.dataset.contactError = error.toFixed(3);
    } else mascot.dataset.contactError = '';
  }

  function draw(place, kind, opts = {}) {
    actor = place;
    mascot.dataset.motionState = opts.state || (kind === 'stand' && !opts.line && intro.complete ? 'perch' : kind);
    mascot.dataset.supportLine = support?.kind === 'line' ? String(support.line.index) : '';
    mascot.style.transform = `translate3d(${(place.x - geometry.w / 2).toFixed(2)}px,${place.top.toFixed(2)}px,0)`;
    mascot.style.opacity = '1';
    mascot.classList.add('is-ready');
    initialized = true;
    pose(kind, clock, opts);
  }

  function finishIntro() {
    intro.complete = true;
    intro.phase = 'complete';
    setWindowOffset(0);
    support = { kind: 'demo', pose: 'stand' };
    mascot.dataset.activeJump = 'false';
  }

  function updateIntro(seconds) {
    const box = geometry.demo;
    const top = viewportY(box.y), bottom = top + box.height;
    const visibleHeight = Math.min(bottom, geometry.vh) - Math.max(top, 0);
    const enoughVisible = visibleHeight >= Math.min(box.height * .25, 100) && top < geometry.vh * .84;
    if (bottom < 20) {
      finishIntro();
      if (!initialized) {
        const nearest = lines.filter(line => line.box?.width).reduce((best, line) => !best || Math.abs(viewportY(line.box.y) - geometry.vh * .6) < Math.abs(viewportY(best.box.y) - geometry.vh * .6) ? line : best, null);
        if (nearest) support = lineSupport(nearest);
        draw(renderedMount(support), support.pose, { line: support.line });
      }
      return false;
    }
    if (intro.phase === 'waiting') {
      if (!enoughVisible) { mascot.dataset.motionState = 'waiting'; return true; }
      intro.phase = 'brace';
      intro.ground = Math.min(box.y + box.height - 2, box.y + Math.max(geometry.w * .9, geometry.vh - top - 24));
    }
    if (bottom < -40 || top > geometry.vh + 60) { finishIntro(); return false; }
    intro.elapsed += seconds;
    const push = ease((intro.elapsed - 1) / PUSH_SECONDS);
    const offset = -geometry.pushDistance * (1 - push);
    setWindowOffset(offset);
    const ground = intro.ground ?? box.y + box.height - 2;
    const startX = box.x + offset - 79 * geometry.scale;
    const startTop = ground - 188 * geometry.scale;
    if (intro.elapsed < PUSH_END) {
      intro.phase = intro.elapsed < 1 ? 'brace' : 'push';
      draw({ x: startX, top: startTop }, intro.phase, { progress: clamp(intro.elapsed) });
      return true;
    }
    intro.phase = 'hop';
    const t = clamp((intro.elapsed - PUSH_END) / .85);
    const end = renderedMount({ kind: 'demo', pose: 'stand' });
    const fromX = box.x - 79 * geometry.scale;
    mascot.dataset.activeJump = 'true';
    mascot.dataset.jumpFrom = `${fromX.toFixed(1)},${startTop.toFixed(1)}`;
    mascot.dataset.jumpTo = `${end.x.toFixed(1)},${end.top.toFixed(1)}`;
    mascot.dataset.jumpDuration = '.850';
    mascot.dataset.jumpProgress = t.toFixed(3);
    const flight = makeRig('jump', clock, { flight: t });
    const ready = makeRig('stand', clock, {}, end);
    const rig = blendRig(flight, ready, ease((t - .68) / .32));
    draw({ x: mix(fromX, end.x, ease(t)), top: mix(startTop, end.top, t) - 4 * (geometry.mobile ? 48 : 95) * t * (1 - t) }, 'jump', { rig });
    if (t >= 1) { finishIntro(); landing = LAND_SECONDS; resting = 0; draw(renderedMount(support), 'stand'); }
    return true;
  }

  function updateGalleryCue(seconds) {
    if (!geometry.catalog || galleryCue.sent) return;
    const top = viewportY(geometry.catalog.y);
    const visible = top < geometry.vh * .91 && top + geometry.catalog.height > geometry.vh * .15;
    if (!visible) return;
    const firstLineVisible = lines[0]?.box && viewportY(lines[0].box.y) > 8 && viewportY(lines[0].box.y) < geometry.vh;
    const canPoint = support?.kind === 'line' && support.line.index === 0 && firstLineVisible && !transfer;
    if (firstLineVisible && !canPoint && !reduced.matches && viewportY(lines[0].box.y) <= geometry.vh * .75) {
      if (!transfer && !landing && resting > .7 && support?.kind !== 'line') beginTransfer(lineSupport(lines[0]));
      if (transfer?.to.line === lines[0]) return;
    }
    galleryCue.started = true;
    galleryCue.elapsed += seconds;
    if (!canPoint || galleryCue.elapsed >= .36 || reduced.matches) {
      galleryCue.sent = true;
      window.dispatchEvent(new CustomEvent('ae:gallery-reveal', { detail: { source: canPoint ? 'mascot' : 'viewport', replay: galleryCue.replay } }));
    }
  }

  function updateAttachment(seconds) {
    resting += seconds;
    const candidate = candidateLine();
    if (!transfer && !landing && resting > .7 && candidate && (support?.kind !== 'line' || support.line !== candidate)) {
      const origin = support ? renderedMount(support) : actor;
      const destination = renderedMount(lineSupport(candidate));
      // On reverse scroll the actor stays attached until the previous string
      // leaves the bottom of the viewport. The next jump then bursts from below.
      const reverseWaiting = scrollDirection < 0 && origin && destination.top < origin.top && viewportY(origin.top) < geometry.vh + 18;
      if (!reverseWaiting) beginTransfer(lineSupport(candidate));
    }
    if (transfer?.phase === 'prepare') {
      transfer.elapsed += seconds;
      const t = clamp(transfer.elapsed / PREPARE_SECONDS);
      const on = transfer.source || { kind: 'demo', pose: 'stand' };
      const start = renderedMount(on);
      draw(start, on.pose, { line: on.line, crouch: ease(t), state: 'anticipate' });
      if (t >= 1) {
        transfer.from = { x: start.x, top: start.top };
        transfer.launchRig = lastRig;
        transfer.phase = 'flight';
        transfer.elapsed = 0;
        mascot.dataset.jumpFrom = start.x.toFixed(1) + ',' + start.top.toFixed(1);
        impulse(support, -3.4);
        support = null;
      }
      return;
    }
    if (transfer) {
      transfer.elapsed += seconds;
      const end = renderedMount(transfer.to);
      transfer.end = end;
      const t = clamp(transfer.elapsed / transfer.duration);
      mascot.dataset.jumpProgress = t.toFixed(3);
      mascot.dataset.jumpTo = end.x.toFixed(1) + ',' + end.top.toFixed(1);
      const flight = makeRig('jump', clock, { flight: t, direction: Math.sign(end.x - transfer.from.x) || 1 });
      let rig = blendRig(transfer.launchRig, flight, ease(t / .2));
      const target = makeRig(transfer.to.pose, clock, { line: transfer.to.line }, end);
      rig = blendRig(rig, target, ease((t - .58) / .42));
      draw({ x: mix(transfer.from.x, end.x, ease(t)), top: mix(transfer.from.top, end.top, t) - 4 * transfer.rise * t * (1 - t) }, 'jump', { rig });
      if (t >= 1) {
        support = transfer.to;
        transfer = null;
        resting = 0;
        landing = LAND_SECONDS;
        impulse(support, 4.8);
        mascot.dataset.activeJump = 'false';
        draw(renderedMount(support), support.pose, { line: support.line, state: 'land' });
      }
      return;
    }
    if (!support) support = { kind: 'demo', pose: 'stand' };
    if (landing > 0) {
      landing = Math.max(0, landing - seconds);
      const p = 1 - landing / LAND_SECONDS;
      draw(renderedMount(support), support.pose, { line: support.line, impact: Math.sin(p * Math.PI) * Math.exp(-p * 1.6), state: landing ? 'land' : support.pose });
    } else {
      draw(renderedMount(support), support.pose, { line: support.line });
    }
    if (galleryCue.started && galleryCue.sent && galleryCue.elapsed < 1) galleryCue.elapsed += seconds;
  }

  function renderReduced() {
    if (!geometry) return;
    finishIntro();
    transfer = null;
    landing = 0;
    const candidate = candidateLine();
    support = candidate ? lineSupport(candidate) : { kind: 'demo', pose: 'stand' };
    for (let i = 0; i < 90; i++) updateSprings(1);
    const place = renderedMount(support);
    draw(place, support.pose, { line: place.line });
    updateGalleryCue(0);
  }

  function tick(timestamp) {
    raf = 0;
    if (document.hidden || !geometry) return;
    if (reduced.matches) { renderReduced(); return; }
    const seconds = previousTime ? clamp((timestamp - previousTime) / 1000, .001, .05) : 1 / 60;
    previousTime = timestamp;
    clock += seconds;
    const steps = Math.ceil(seconds * 60);
    for (let i = 0; i < steps; i++) updateSprings(seconds * 60 / steps);
    const inIntro = !intro.complete && updateIntro(seconds);
    if (!inIntro) {
      updateAttachment(seconds);
      updateGalleryCue(seconds);
    }
    raf = requestAnimationFrame(tick);
  }

  function wake() {
    if (!raf && !document.hidden) { previousTime = 0; raf = requestAnimationFrame(tick); }
  }

  function replayIntro() {
    intro = { phase: 'waiting', elapsed: 0, complete: false };
    galleryCue = { started: false, elapsed: 0, sent: false, replay: true };
    support = null;
    transfer = null;
    actor = null;
    lastRig = null;
    landing = 0;
    resting = 0;
    if (geometry) setWindowOffset(reduced.matches ? 0 : -geometry.pushDistance);
    mascot.dataset.motionState = 'waiting';
    mascot.dataset.activeJump = 'false';
    window.dispatchEvent(new CustomEvent('ae:intro-replay', { detail: { replay: true } }));
    wake();
  }

  window.AEMascot = { refresh, replayIntro, getState: () => ({ phase: intro.phase, elapsed: intro.elapsed, attachedLine: support?.line?.index ?? null, pose: mascot.dataset.pose, transferring: !!transfer, position: actor ? { x: actor.x, y: actor.top, viewportY: viewportY(actor.top) } : null, jump: transfer ? { from: transfer.from, to: { x: transfer.end.x, y: transfer.end.top }, duration: transfer.duration, elapsed: transfer.elapsed, progress: clamp(transfer.elapsed / transfer.duration) } : null }) };
  window.addEventListener('ae:replay-intro', replayIntro);
  stage.querySelector('[data-replay-intro]')?.addEventListener('click', replayIntro);
  window.addEventListener('pointermove', event => { pointer.x = event.clientX; pointer.y = event.clientY; pointer.active = event.pointerType !== 'touch'; }, { passive: true });
  document.addEventListener('pointerleave', () => { pointer.active = false; });
  window.addEventListener('scroll', () => {
    const delta = window.scrollY - lastScrollY;
    if (Math.abs(delta) > 2) scrollDirection = Math.sign(delta);
    lastScrollY = window.scrollY;
    if (reduced.matches) wake();
  }, { passive: true });
  window.addEventListener('resize', refresh, { passive: true });
  window.addEventListener('load', refresh, { once: true });
  document.fonts?.ready.then(refresh);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(raf); raf = 0; previousTime = 0; }
    else wake();
  });
  reduced.addEventListener('change', () => { cancelAnimationFrame(raf); raf = 0; refresh(); });
  if ('ResizeObserver' in window) new ResizeObserver(refresh).observe(stage);
  measure();
})();
