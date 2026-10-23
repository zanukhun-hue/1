(() => {
  'use strict';
  const experience = document.querySelector('.ae-experience');
  const mascot = experience?.querySelector('[data-mascot]');
  if (!experience || !mascot) return;

  mascot.innerHTML = `<svg viewBox="0 0 180 210" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <g class="ae-guide-stroke">
      <path data-guide-leg="left" d="M73 133 71 165 58 183 78 185 94 164 96 131Z"/>
      <path data-guide-leg="right" d="M107 130 108 164 120 179 137 177 123 158 124 127Z"/>
      <path data-guide-arm="left" d="M44 83Q29 91 24 113L14 128Q12 133 17 134L24 130Q28 132 31 128L39 115 48 105"/>
      <path data-guide-arm="right" d="M132 79Q146 89 151 109L161 124Q164 130 159 131L152 126Q148 129 145 124L134 107 128 101"/>
      <g data-guide-body>
        <path d="M84 45C75 30 80 20 88 23 98 25 96 38 90 44" class="ae-guide-wire"/>
        <path d="M40 55 104 44 133 64 131 130 66 142 42 120Z"/>
        <path d="M40 55 66 74 133 64M66 74 66 142M66 74 104 44" class="ae-guide-wire"/>
        <g data-guide-face>
          <ellipse class="ae-guide-eye" cx="88" cy="96" rx="2.1" ry="3.7" stroke="none"/>
          <ellipse class="ae-guide-eye" cx="111" cy="92.5" rx="2.1" ry="3.7" stroke="none"/>
          <path d="M85 110Q98 127 115 105" class="ae-guide-wire"/>
        </g>
      </g>
    </g>
  </svg>`;

  const body = mascot.querySelector('[data-guide-body]');
  const face = mascot.querySelector('[data-guide-face]');
  const armL = mascot.querySelector('[data-guide-arm="left"]');
  const armR = mascot.querySelector('[data-guide-arm="right"]');
  const legL = mascot.querySelector('[data-guide-leg="left"]');
  const legR = mascot.querySelector('[data-guide-leg="right"]');
  const demo = experience.querySelector('.ae-demo-window');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const NODES = 21;
  const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
  const mix = (a, b, t) => a + (b - a) * t;
  const ease = t => t * t * (3 - 2 * t);
  const points = Array.from(experience.querySelectorAll('[data-elastic-line]'), (svg, i) => {
    let path = svg.querySelector('path');
    if (!path) {
      path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      svg.appendChild(path);
    }
    return { svg, path, i, y: Array(NODES).fill(32), v: Array(NODES).fill(0), box: null };
  });
  let geometry, frameId = 0, geometryId = 0, startTime = 0, lastTime = 0;
  let position = null, lastScroll = window.scrollY, scrollSpeed = 0;
  const pointer = { x: -1000, y: -1000, active: false };

  function layoutBox(element) {
    let x = 0, y = 0, node = element;
    while (node && node !== experience) {
      x += node.offsetLeft;
      y += node.offsetTop;
      node = node.offsetParent;
    }
    return { x, y, width: element.offsetWidth, height: element.offsetHeight };
  }

  function measure() {
    geometryId = 0;
    const root = experience.getBoundingClientRect();
    // Offset geometry excludes the temporary push and rotation of the demo.
    const demoBox = demo ? layoutBox(demo) : null;
    const width = mascot.offsetWidth;
    geometry = {
      left: root.left + window.scrollX,
      top: root.top + window.scrollY,
      width: root.width,
      height: root.height,
      w: width,
      h: width * 210 / 180,
      mobile: window.innerWidth <= 760,
      viewport: window.innerHeight,
      intro: demoBox ? {
        x: demoBox.x - width * .35,
        y: demoBox.y + demoBox.height - 10,
        top: demoBox.y,
        left: demoBox.x,
        width: demoBox.width,
      } : { x: root.width * .12, y: Math.min(root.height, innerHeight) * .78, top: 230, left: root.width * .25, width: root.width * .65 }
    };
    for (const line of points) {
      const box = line.svg.getBoundingClientRect();
      line.box = { x: box.left - root.left, y: box.top - root.top, w: box.width, h: box.height };
    }
    if (reducedMotion.matches) renderStatic();
    else wake();
  }

  function refresh() {
    if (!geometryId) geometryId = requestAnimationFrame(measure);
  }

  // Catmull–Rom handles keep a continuous tangent through the spring points.
  function linePath(values) {
    const step = 1440 / (NODES - 1);
    let d = `M0 ${values[0].toFixed(2)}`;
    for (let i = 0; i < NODES - 1; i++) {
      const a = values[Math.max(0, i - 1)], b = values[i];
      const c = values[i + 1], e = values[Math.min(NODES - 1, i + 2)];
      d += `C${((i + 1 / 3) * step).toFixed(1)} ${(b + (c - a) / 6).toFixed(2)} ${((i + 2 / 3) * step).toFixed(1)} ${(c - (e - b) / 6).toFixed(2)} ${((i + 1) * step).toFixed(1)} ${c.toFixed(2)}`;
    }
    return d;
  }

  function lineHeight(line, x) {
    const n = clamp((x - line.box.x) / Math.max(1, line.box.w)) * (NODES - 1);
    const i = Math.min(NODES - 2, Math.floor(n));
    return line.box.y + mix(line.y[i], line.y[i + 1], n - i) / 80 * line.box.h;
  }

  function anchor(line) {
    const xPositions = geometry.mobile ? [.77, .24, .76, .3] : [.56, .44, .69, .35];
    const x = line.box.x + line.box.w * xPositions[line.i % xPositions.length];
    const y = lineHeight(line, x);
    return { x, y, line, scroll: Math.max(80, geometry.top + line.box.y - geometry.viewport * .63) };
  }

  function targetAt(scroll, elapsed) {
    const intro = geometry.intro;
    const w = geometry.w;
    const push = ease(clamp(elapsed / 2.8));
    const hop = ease(clamp((elapsed - 3.1) / 1.55));
    const home = {
      x: clamp(mix(intro.x + push * w * .095, intro.left + intro.width * .5, hop), w * .55, geometry.width - w * .55),
      y: mix(intro.y, intro.top + 12, hop) - Math.sin(hop * Math.PI) * w * .8,
      scroll: 0,
      line: null,
      pushing: elapsed < 3.3,
      airborne: hop > 0 && hop < 1,
    };
    if (geometry.mobile) {
      home.x = clamp(intro.left - 2, w * .65, geometry.width - w * .65);
      home.y = intro.y + 4;
      home.pushing = false;
      home.airborne = false;
    }
    const anchors = [home, ...points.filter(line => line.box?.w).map(anchor)];
    if (scroll <= anchors[0].scroll || anchors.length < 2) return home;
    for (let i = 1; i < anchors.length; i++) {
      if (scroll > anchors[i].scroll && i < anchors.length - 1) continue;
      const previous = anchors[i - 1], next = anchors[i];
      const progress = clamp((scroll - previous.scroll) / Math.max(1, next.scroll - previous.scroll));
      // A hold, a light leap, then a landing leave time to read each scene.
      const travel = ease(clamp((progress - .14) / .78));
      const arc = Math.sin(travel * Math.PI);
      return {
        x: mix(previous.x, next.x, travel) + arc * (geometry.mobile ? 8 : 32),
        y: mix(previous.y, next.y, travel) - arc * (geometry.mobile ? 26 : 80),
        line: travel < .04 ? previous.line : travel > .94 ? next.line : null,
        pushing: i === 1 && travel < .01 && home.pushing,
        airborne: travel > .02 && travel < .98,
      };
    }
    return anchors[anchors.length - 1];
  }

  function pose(time, speed, pushing, airborne) {
    const walking = clamp(Math.abs(speed) / 5);
    const stride = Math.sin(time * 8) * walking * 12;
    const breathe = Math.sin(time * 2.5) * 1.3;
    const pointerNear = pointer.active && position && Math.hypot(pointer.x - geometry.left - position.x, pointer.y + window.scrollY - geometry.top - position.y + geometry.h * .5) < 220;
    const waving = !pushing && !airborne && pointerNear;
    body.setAttribute('transform', `rotate(${clamp(speed * .5, -7, 7) + (pushing ? 7 : Math.sin(time * 1.8) * 1.6)} 87 133) translate(0 ${breathe.toFixed(2)})`);
    const gazeX = pointer.active ? clamp((pointer.x - geometry.left - position.x) / 180, -2.5, 2.5) : Math.sin(time * .7) * .8;
    const gazeY = pointer.active ? clamp((pointer.y + window.scrollY - geometry.top - position.y + geometry.h * .45) / 180, -1.7, 1.7) : 0;
    face.setAttribute('transform', `translate(${gazeX.toFixed(2)} ${gazeY.toFixed(2)})`);

    if (pushing) {
      armL.setAttribute('d', 'M43 85Q28 97 31 115L40 129Q44 134 48 130L45 121 44 109 51 104');
      armR.setAttribute('d', 'M132 81Q145 81 153 73L162 67Q167 65 169 69L166 75Q171 79 166 82L153 89 132 102');
    } else if (airborne) {
      armL.setAttribute('d', 'M44 86Q28 78 23 61L17 48Q15 43 11 45L10 52Q5 53 8 60L17 78 41 106');
      armR.setAttribute('d', 'M132 80Q147 74 152 56L157 45Q160 40 164 43L163 51Q169 51 167 57L158 77 131 102');
    } else if (waving) {
      const wave = Math.sin(time * 8) * 7;
      armL.setAttribute('d', `M44 83Q28 94 25 ${112 - stride / 4}L15 129Q13 134 18 135L25 131Q29 133 32 128L40 114 48 105`);
      armR.setAttribute('d', `M132 80Q150 76 153 58L${155 + wave} 40Q${157 + wave} 35 ${161 + wave} 38L${161 + wave} 45Q${167 + wave} 45 ${165 + wave} 52L162 72Q151 98 130 101`);
    } else {
      armL.setAttribute('d', `M44 83Q29 91 24 ${113 - stride / 3}L14 ${128 - stride / 3}Q12 133 17 134L24 130Q28 132 31 128L39 115 48 105`);
      armR.setAttribute('d', `M132 79Q146 89 151 ${109 + stride / 3}L161 ${124 + stride / 3}Q164 130 159 131L152 126Q148 129 145 124L134 107 128 101`);
    }
    const knee = airborne ? 10 : 0;
    legL.setAttribute('d', `M73 133  ${71 - stride * .3} ${165 - knee} ${58 - stride} ${183 - knee} ${78 - stride} ${185 - knee} ${94 - stride * .2} ${164 - knee} 96 131Z`);
    legR.setAttribute('d', `M107 130 ${108 + stride * .2} ${164 - knee} ${120 + stride} ${179 - knee * 1.8} ${137 + stride} ${177 - knee * 1.8} ${123 + stride * .3} ${158 - knee} 124 127Z`);
  }

  function springs(dt, time) {
    for (const line of points) {
      if (!line.box?.w) continue;
      const viewportY = geometry.top + line.box.y - window.scrollY;
      if (viewportY < -160 || viewportY > geometry.viewport + 160) continue;
      const underMascot = position ? Math.abs(position.y - lineHeight(line, position.x)) < 32 : false;
      const mascotX = position ? (position.x - line.box.x) / line.box.w : .5;
      const px = (pointer.x - geometry.left - line.box.x) / line.box.w;
      const py = pointer.y + window.scrollY - geometry.top - line.box.y;
      const pointerClose = pointer.active && px > 0 && px < 1 && Math.abs(py - 32 / 80 * line.box.h) < 65;
      for (let i = 1; i < NODES - 1; i++) {
        const x = i / (NODES - 1);
        let target = 26 + Math.sin(x * Math.PI) * 8;
        if (underMascot) target += Math.exp(-((x - mascotX) ** 2) / .018) * 17;
        if (pointerClose && !geometry.mobile) target += Math.exp(-((x - px) ** 2) / .008) * clamp(py / line.box.h * 80 - 32, -20, 24) * .65;
        const ripple = Math.sin(x * Math.PI) * Math.sin(x * 15 - time * 3) * clamp(Math.abs(scrollSpeed) * .11, 0, 3);
        const pull = (target + ripple - line.y[i]) * .035;
        const tension = (line.y[i - 1] + line.y[i + 1] - 2 * line.y[i]) * .065;
        line.v[i] = (line.v[i] + (pull + tension) * dt) * Math.pow(.83, dt);
      }
      for (let i = 1; i < NODES - 1; i++) line.y[i] += line.v[i] * dt;
      line.y[0] = line.y[NODES - 1] = 26;
      line.path.setAttribute('d', linePath(line.y));
    }
  }

  function renderStatic() {
    if (!geometry) return;
    for (const line of points) line.path.setAttribute('d', 'M0 26Q720 42 1440 26');
    const x = clamp(geometry.intro.x, geometry.w * .6, geometry.width - geometry.w * .6);
    mascot.style.transform = `translate3d(${x - geometry.w / 2}px,${geometry.intro.y - geometry.h * 195 / 210}px,0)`;
    mascot.classList.add('is-ready');
    demo?.style.setProperty('--mascot-push-x', '0px');
    demo?.style.setProperty('--mascot-push-rotate', '0deg');
  }

  function tick(timestamp) {
    frameId = 0;
    if (!geometry || document.hidden || reducedMotion.matches) return;
    if (!startTime) startTime = timestamp;
    const elapsed = (timestamp - startTime) / 1000;
    const dt = clamp((timestamp - (lastTime || timestamp - 16.7)) / 16.7, .2, 2);
    lastTime = timestamp;
    const scroll = window.scrollY;
    scrollSpeed = mix(scrollSpeed, scroll - lastScroll, .14);
    lastScroll = scroll;
    const target = targetAt(scroll, elapsed);
    if (!position) position = { x: target.x, y: target.y };
    const previousX = position.x;
    const smoothing = 1 - Math.pow(.84, dt);
    position.x = mix(position.x, target.x, smoothing);
    position.y = mix(position.y, target.y, smoothing);
    const speed = (position.x - previousX) / dt;
    const idle = target.line ? Math.sin(elapsed * 2.5) * .6 : 0;
    mascot.style.transform = `translate3d(${(position.x - geometry.w / 2).toFixed(2)}px,${(position.y - geometry.h * 195 / 210 + idle).toFixed(2)}px,0) rotate(${clamp(speed * .2, -4, 4).toFixed(2)}deg)`;
    mascot.classList.add('is-ready');
    pose(elapsed, speed, target.pushing, target.airborne);
    springs(dt, elapsed);
    if (demo && elapsed < 5) {
      const push = ease(clamp(elapsed / 2.8)) * (1 - ease(clamp((elapsed - 3.2) / 1.3))) * (geometry.mobile ? 0 : 15);
      demo.style.setProperty('--mascot-push-x', `${push.toFixed(2)}px`);
      demo.style.setProperty('--mascot-push-rotate', `${(-push / 28).toFixed(2)}deg`);
    }
    frameId = requestAnimationFrame(tick);
  }

  function wake() {
    if (!frameId && !document.hidden && !reducedMotion.matches) {
      lastTime = 0;
      frameId = requestAnimationFrame(tick);
    }
  }

  window.addEventListener('pointermove', event => {
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    pointer.active = event.pointerType !== 'touch';
  }, { passive: true });
  document.addEventListener('pointerleave', () => { pointer.active = false; });
  window.addEventListener('resize', refresh, { passive: true });
  window.addEventListener('load', refresh, { once: true });
  document.fonts?.ready.then(refresh);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(frameId);
      frameId = 0;
    } else wake();
  });
  reducedMotion.addEventListener('change', () => {
    cancelAnimationFrame(frameId);
    frameId = 0;
    refresh();
  });
  if ('ResizeObserver' in window) new ResizeObserver(refresh).observe(experience);
  window.AEMascot = { refresh };
  measure();
})();
