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
    </g>
  </svg>`;
  const body = mascot.querySelector('[data-guide-body]');
  const face = mascot.querySelector('[data-guide-face]');
  const arms = ['left', 'right'].map(side => mascot.querySelector(`[data-guide-arm="${side}"]`));
  const legs = ['left', 'right'].map(side => mascot.querySelector(`[data-guide-leg="${side}"]`));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const catalog = stage.querySelector('.ae-catalog-visual') || stage.querySelector('[data-plugin-theatre="catalog"]');
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const mix = (a, b, t) => a + (b - a) * t;
  const ease = v => { const t = clamp(v); return t * t * (3 - 2 * t); };
  const NODE_COUNT = 25;
  const PUSH_SECONDS = 4;
  const PUSH_END = 1 + PUSH_SECONDS;
  const lines = Array.from(stage.querySelectorAll('[data-elastic-line]'), (svg, index) => {
    const path = svg.querySelector('path') || svg.appendChild(document.createElementNS('http://www.w3.org/2000/svg', 'path'));
    return { svg, path, index, box: null, y: Array.from({ length: NODE_COUNT }, (_, i) => 26 + 6 * Math.sin(i / (NODE_COUNT - 1) * Math.PI)), velocity: Array(NODE_COUNT).fill(0) };
  });

  let geometry, raf = 0, measureRaf = 0, previousTime = 0, clock = 0;
  let support = null, transfer = null, actor = null, initialized = false;
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
    const poses = ['stand', 'hang', 'sit', 'stand'];
    return { kind: 'line', line, pose: reduced.matches ? 'stand' : poses[line.index % poses.length] };
  }

  function mount(on) {
    if (on.kind === 'demo') {
      const perchX = geometry.mobile ? geometry.demo.width - geometry.w * .66 : innerWidth <= 1100 ? geometry.demo.width * .5 : Math.min(geometry.demo.width * .35, 240);
      return { x: geometry.demo.x + perchX, y: geometry.demo.y + 1, localY: 188, pose: 'stand' };
    }
    const line = on.line;
    const fractions = geometry.mobile ? [.76, .73, .77, .69] : [.58, .66, .57, .72];
    const x = line.box.x + line.box.width * fractions[line.index % fractions.length];
    return { x, y: lineHeight(line, x), localY: on.pose === 'hang' ? 33 : on.pose === 'sit' ? 138 : 188, pose: on.pose, line };
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
    const duration = clamp(distance / 1100, .55, 1);
    // The quadratic has constant downward acceleration and starts at the actual
    // previous support, including when that support has scrolled out of view.
    const rise = Math.max(geometry.mobile ? 36 : 64, Math.max(0, end.top - start.top) * .27 + 28);
    transfer = { from: { x: start.x, top: start.top }, to: next, elapsed: 0, duration, rise, end };
    mascot.dataset.jumpFrom = `${start.x.toFixed(1)},${start.top.toFixed(1)}`;
    mascot.dataset.jumpTo = `${end.x.toFixed(1)},${end.top.toFixed(1)}`;
    mascot.dataset.jumpDuration = duration.toFixed(3);
    mascot.dataset.jumpProgress = '0';
    mascot.dataset.activeJump = 'true';
    support = null;
  }

  function updateSprings(dt) {
    for (const line of lines) {
      if (!line.box?.width) continue;
      const lineY = viewportY(line.box.y);
      if (lineY < -250 || lineY > geometry.vh + 150) continue;
      const loaded = support?.kind === 'line' && support.line === line;
      const loadMount = loaded ? mount(support) : null;
      const loadX = loadMount ? (loadMount.x - line.box.x) / line.box.width : .5;
      const pointerX = (pointer.x - geometry.left - line.box.x) / line.box.width;
      const pointerY = pointer.y + scrollY - geometry.top - line.box.y;
      const pointerClose = pointer.active && pointerX > 0 && pointerX < 1 && Math.abs(pointerY - line.box.height * .4) < 45;
      for (let i = 1; i < NODE_COUNT - 1; i++) {
        const x = i / (NODE_COUNT - 1);
        let target = 26 + Math.sin(x * Math.PI) * 6;
        if (loaded) {
          const weight = support.pose === 'hang' ? 22 : support.pose === 'sit' ? 17 : 14;
          target += Math.exp(-((x - loadX) ** 2) / .012) * weight;
          if (galleryCue.started && !galleryCue.sent && line.index === 0) target += Math.exp(-((x - loadX + .045) ** 2) / .003) * Math.sin(clamp(galleryCue.elapsed / .75) * Math.PI) * 9;
        }
        if (pointerClose && !geometry.mobile) target += Math.exp(-((x - pointerX) ** 2) / .006) * clamp(pointerY / line.box.height * 80 - 30, -15, 19) * .6;
        const force = (target - line.y[i]) * .043 + (line.y[i - 1] + line.y[i + 1] - 2 * line.y[i]) * .07;
        line.velocity[i] = (line.velocity[i] + force * dt) * Math.pow(.81, dt);
      }
      for (let i = 1; i < NODE_COUNT - 1; i++) line.y[i] += line.velocity[i] * dt;
      line.path.setAttribute('d', pathFor(line));
    }
  }

  function pose(kind, time, opts = {}) {
    mascot.dataset.pose = kind;
    const s = geometry.scale;
    const stride = kind === 'push' ? Math.sin(time * 12) * 10 : 0;
    const breathe = kind === 'push' ? Math.sin(time * 12) * .6 : reduced.matches ? 0 : Math.sin(time * 2.5) * .7;
    const tilt = kind === 'push' ? 8 : kind === 'brace' ? 5 + (opts.progress || 0) * 3 : kind === 'jump' ? -5 : kind === 'hang' ? Math.sin(time * 1.5) * 1.5 : 0;
    body.setAttribute('transform', `translate(0 ${breathe.toFixed(2)}) rotate(${tilt.toFixed(2)} 87 132)`);
    const gx = pointer.active && actor ? clamp((pointer.x - geometry.left - actor.x) / 160, -2.5, 2.5) : kind === 'push' || kind === 'brace' || kind === 'point' ? 2 : 0;
    const gy = pointer.active && actor ? clamp((pointer.y + scrollY - geometry.top - actor.top - 100 * s) / 160, -1.5, 1.5) : 0;
    face.setAttribute('transform', `translate(${gx.toFixed(2)} ${gy.toFixed(2)})`);
    let footL = 188, footR = 188;
    if (opts.line && actor) {
      footL = (lineHeight(opts.line, actor.x - 20 * s) - actor.top) / s;
      footR = (lineHeight(opts.line, actor.x + 35 * s) - actor.top) / s;
    }
    if (kind === 'push' || kind === 'brace') {
      arms[0].setAttribute('d', 'M44 86Q39 112 81 119L164 111Q170 109 169 115L169 121Q169 126 163 124L81 132Q45 132 40 111');
      arms[1].setAttribute('d', 'M132 81Q148 86 163 85Q169 84 169 90L169 98Q169 103 164 101L150 100 132 105');
    } else if (kind === 'jump') {
      arms[0].setAttribute('d', 'M44 86Q28 78 23 61L17 48Q15 43 11 45L10 52Q5 53 8 60L17 78 41 106');
      arms[1].setAttribute('d', 'M132 80Q147 74 152 56L157 45Q160 40 164 43L163 51Q169 51 167 57L158 77 131 102');
    } else if (kind === 'hang') {
      const hookL = opts.line ? (lineHeight(opts.line, actor.x - 53 * s) - actor.top) / s : 33;
      const hookR = opts.line ? (lineHeight(opts.line, actor.x + 58 * s) - actor.top) / s : 33;
      arms[0].setAttribute('d', `M44 88Q27 71 32 ${hookL + 11}L32 ${hookL - 2}Q33 ${hookL - 8} 39 ${hookL - 6}L44 ${hookL - 2}Q47 ${hookL + 2} 43 ${hookL + 5}L40 ${hookL + 3} 41 ${hookL + 14} 54 83`);
      arms[1].setAttribute('d', `M132 82Q154 66 151 ${hookR + 10}L152 ${hookR - 2}Q151 ${hookR - 8} 145 ${hookR - 6}L140 ${hookR - 2}Q137 ${hookR + 2} 141 ${hookR + 5}L145 ${hookR + 3} 143 ${hookR + 15} 125 103`);
    } else if (kind === 'point') {
      const pullY = opts.line ? (lineHeight(opts.line, actor.x - 55 * s) - actor.top) / s : 185;
      const extend = ease(clamp((galleryCue.elapsed - .08) / .35));
      const handX = mix(153, 179, extend), handY = mix(125, 94, extend);
      arms[0].setAttribute('d', `M44 86Q24 116 31 ${pullY - 12}L31 ${pullY - 2}Q27 ${pullY - 5} 25 ${pullY - 1}Q25 ${pullY + 4} 32 ${pullY + 4}L39 ${pullY + 2} 42 ${pullY - 15} 50 105`);
      arms[1].setAttribute('d', `M132 80Q151 85 ${handX - 8} ${handY - 4}L${handX} ${handY - 4}Q${handX + 5} ${handY - 3} ${handX + 2} ${handY + 1}L${handX - 6} ${handY + 2}Q${handX - 5} ${handY + 7} ${handX - 10} ${handY + 6}L146 105 130 103`);
    } else if (kind === 'sit') {
      arms[0].setAttribute('d', 'M44 86Q25 108 41 135L49 140Q55 140 54 135L47 128 48 109');
      arms[1].setAttribute('d', 'M132 80Q151 108 142 132L134 141Q129 145 126 140L132 130 127 103');
    } else {
      arms[0].setAttribute('d', 'M44 83Q29 91 24 113L14 128Q12 133 17 134L24 130Q28 132 31 128L39 115 48 105');
      arms[1].setAttribute('d', 'M132 79Q146 89 151 109L161 124Q164 130 159 131L152 126Q148 129 145 124L134 107 128 101');
    }
    if (kind === 'sit') {
      legs[0].setAttribute('d', 'M73 133 69 162 80 184 94 183 83 158 97 132Z');
      legs[1].setAttribute('d', 'M107 130 113 160 130 180 144 176 126 154 124 127Z');
    } else if (kind === 'hang' || kind === 'jump') {
      legs[0].setAttribute('d', 'M73 133 67 159 52 172 66 180 86 166 96 131Z');
      legs[1].setAttribute('d', 'M107 130 114 156 131 169 145 162 127 149 124 127Z');
    } else {
      const liftL = kind === 'push' ? Math.max(0, stride) * .45 : 0;
      const liftR = kind === 'push' ? Math.max(0, -stride) * .45 : 0;
      legs[0].setAttribute('d', `M73 133 ${71 - stride * .3} 163 ${58 - stride} ${footL - liftL} ${78 - stride} ${footL - liftL} ${94 - stride * .2} 164 96 131Z`);
      legs[1].setAttribute('d', `M107 130 ${108 + stride * .2} 164 ${119 + stride} ${footR - liftR} ${138 + stride} ${footR - liftR} ${123 + stride * .3} 158 124 127Z`);
    }
  }

  function draw(place, kind, opts = {}) {
    actor = place;
    mascot.dataset.motionState = kind === 'stand' && !opts.line && intro.complete ? 'perch' : kind;
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
    const t = clamp((intro.elapsed - PUSH_END) / .55);
    const end = renderedMount({ kind: 'demo', pose: 'stand' });
    const fromX = box.x - 79 * geometry.scale;
    mascot.dataset.activeJump = 'true';
    mascot.dataset.jumpFrom = `${fromX.toFixed(1)},${startTop.toFixed(1)}`;
    mascot.dataset.jumpTo = `${end.x.toFixed(1)},${end.top.toFixed(1)}`;
    mascot.dataset.jumpDuration = '.550';
    mascot.dataset.jumpProgress = t.toFixed(3);
    draw({ x: mix(fromX, end.x, t), top: mix(startTop, end.top, t) - 4 * (geometry.mobile ? 36 : 74) * t * (1 - t) }, 'jump');
    if (t >= 1) { finishIntro(); draw(renderedMount(support), 'stand'); }
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
      if (!transfer && support?.kind !== 'line') beginTransfer(lineSupport(lines[0]));
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
    const candidate = candidateLine();
    if (!transfer && candidate && (support?.kind !== 'line' || support.line !== candidate)) beginTransfer(lineSupport(candidate));
    if (transfer) {
      transfer.elapsed += seconds;
      const end = renderedMount(transfer.to);
      transfer.end = end;
      const t = clamp(transfer.elapsed / transfer.duration);
      mascot.dataset.jumpProgress = t.toFixed(3);
      mascot.dataset.jumpTo = `${end.x.toFixed(1)},${end.top.toFixed(1)}`;
      draw({ x: mix(transfer.from.x, end.x, t), top: mix(transfer.from.top, end.top, t) - 4 * transfer.rise * t * (1 - t) }, 'jump');
      if (t >= 1) {
        support = transfer.to;
        transfer = null;
        mascot.dataset.activeJump = 'false';
        const landed = renderedMount(support);
        draw(landed, support.pose, { line: landed.line });
      }
      return;
    }
    if (!support) support = { kind: 'demo', pose: 'stand' };
    const place = renderedMount(support);
    const pointing = support.kind === 'line' && support.line.index === 0 && galleryCue.started && galleryCue.elapsed < .95;
    draw(place, pointing ? 'point' : support.pose, { line: place.line });
    if (galleryCue.started && galleryCue.sent && galleryCue.elapsed < 1) galleryCue.elapsed += seconds;
  }

  function renderReduced() {
    if (!geometry) return;
    finishIntro();
    transfer = null;
    const candidate = candidateLine();
    support = candidate ? lineSupport(candidate) : { kind: 'demo', pose: 'stand' };
    for (const line of lines) line.path.setAttribute('d', pathFor(line));
    const place = renderedMount(support);
    draw(place, 'stand', { line: place.line });
    updateGalleryCue(0);
  }

  function tick(timestamp) {
    raf = 0;
    if (document.hidden || !geometry) return;
    if (reduced.matches) { renderReduced(); return; }
    const seconds = previousTime ? Math.max((timestamp - previousTime) / 1000, .001) : 1 / 60;
    previousTime = timestamp;
    clock += seconds;
    updateSprings(Math.min(seconds * 60, 2));
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
  window.addEventListener('scroll', () => { if (reduced.matches) wake(); }, { passive: true });
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
