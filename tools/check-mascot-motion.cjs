#!/usr/bin/env node
'use strict';

// Execute the production animation against deterministic DOM geometry and RAF.
// This catches state-machine/contact regressions; browser QA still checks the art.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '..', 'assets', 'scene-motion.js'), 'utf8');

class Events {
  constructor() { this.listeners = new Map(); }
  addEventListener(type, listener) {
    const bucket = this.listeners.get(type) || [];
    bucket.push(listener);
    this.listeners.set(type, bucket);
  }
  removeEventListener(type, listener) {
    this.listeners.set(type, (this.listeners.get(type) || []).filter(item => item !== listener));
  }
  dispatchEvent(event) {
    for (const listener of [...(this.listeners.get(event.type) || [])]) listener.call(this, event);
    return true;
  }
}

function makeStyle() {
  const style = {
    setProperty(name, value) { this[name] = String(value); },
    getPropertyValue(name) { return this[name] || ''; },
    removeProperty(name) { delete this[name]; },
  };
  return style;
}

function createHarness({ width, height, fps, initiallyReduced = false }) {
  const window = new Events();
  Object.assign(window, { innerWidth: width, innerHeight: height, scrollX: 0, scrollY: 0 });
  const nodes = [];
  class Element extends Events {
    constructor(tag = 'div', box = {}) {
      super();
      this.tagName = tag.toUpperCase();
      this.style = makeStyle();
      this.dataset = {};
      this.attributes = new Map();
      this.children = [];
      this.box = { x: 0, y: 0, width: 0, height: 0, ...box };
      this.offsetParent = null;
      const classes = new Set();
      this.classList = {
        add: (...values) => values.forEach(value => classes.add(value)),
        remove: (...values) => values.forEach(value => classes.delete(value)),
        contains: value => classes.has(value),
        toggle: (value, force) => {
          const on = force === undefined ? !classes.has(value) : force;
          if (on) classes.add(value); else classes.delete(value);
          return on;
        },
      };
      nodes.push(this);
    }
    get offsetLeft() { return this.box.x; }
    get offsetTop() { return this.box.y; }
    get offsetWidth() { return this.box.width; }
    get offsetHeight() { return this.box.height; }
    get clientWidth() { return this.box.width; }
    get clientHeight() { return this.box.height; }
    getBoundingClientRect() {
      let x = this.box.x, y = this.box.y;
      for (let parent = this.offsetParent; parent; parent = parent.offsetParent) {
        x += parent.box.x;
        y += parent.box.y;
      }
      x -= window.scrollX;
      y -= window.scrollY;
      return { x, y, left: x, top: y, right: x + this.box.width, bottom: y + this.box.height, width: this.box.width, height: this.box.height };
    }
    setAttribute(name, value) {
      this.attributes.set(name, String(value));
      if (name.startsWith('data-')) this.dataset[name.slice(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = String(value);
      if (name === 'class') this.classList.add(...String(value).split(/\s+/));
    }
    getAttribute(name) { return this.attributes.get(name) ?? null; }
    removeAttribute(name) { this.attributes.delete(name); }
    appendChild(child) { this.children.push(child); child.parentElement = this; return child; }
    matches(selector) {
      if (selector.startsWith('.')) return this.classList.contains(selector.slice(1));
      const attribute = selector.match(/^\[([^=\]]+)(?:=["']?([^"'\]]+)["']?)?\]$/);
      if (attribute) return this.attributes.has(attribute[1]) && (attribute[2] === undefined || this.attributes.get(attribute[1]) === attribute[2]);
      return this.tagName.toLowerCase() === selector.toLowerCase();
    }
    querySelectorAll(selector) {
      return this.children.flatMap(child => [...(child.matches(selector) ? [child] : []), ...child.querySelectorAll(selector)]);
    }
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
    set innerHTML(markup) {
      this.children = [];
      // The injected mascot only uses element/attribute queries, not DOM traversal.
      // Preserve every declared element so a missing production selector stays null.
      for (const match of markup.matchAll(/<([a-z][\w:-]*)\b([^>]*)>/gi)) {
        const element = new Element(match[1]);
        for (const attr of match[2].matchAll(/([\w:-]+)(?:="([^"]*)"|='([^']*)')?/g)) {
          element.setAttribute(attr[1], attr[2] ?? attr[3] ?? '');
        }
        this.appendChild(element);
      }
    }
  }

  const mobile = width <= 700;
  const gutter = mobile ? 20 : 48;
  const stage = new Element('div', { x: gutter, width: width - 2 * gutter, height: mobile ? 3650 : 4600 });
  stage.classList.add('ae-experience');
  const mascot = new Element('div', { width: mobile ? 70 : 142, height: mobile ? 81.667 : 165.667 });
  mascot.setAttribute('data-mascot', '');
  const demo = new Element('div', { x: mobile ? 105 : 570, y: mobile ? 390 : 390, width: mobile ? 245 : 690, height: mobile ? 220 : 370 });
  demo.classList.add('ae-demo-window');
  // Desktop chapters have an 890px minimum; mobile chapters are more compact.
  const lineTops = mobile ? [900, 1610, 2320, 3030] : [980, 1870, 2760, 3650];
  const catalog = new Element('div', { x: mobile ? 0 : 490, y: lineTops[0] + 130, width: mobile ? 350 : 770, height: 600 });
  catalog.classList.add('ae-catalog-visual');
  const replay = new Element('button');
  replay.setAttribute('data-replay-intro', '');
  const lines = lineTops.map(y => {
    const line = new Element('svg', { x: 0, y, width: stage.box.width, height: mobile ? 60 : 80 });
    line.setAttribute('data-elastic-line', '');
    line.appendChild(new Element('path'));
    return line;
  });
  for (const element of [mascot, demo, catalog, replay, ...lines]) {
    stage.appendChild(element);
    element.offsetParent = stage;
  }
  const document = new Events();
  Object.assign(document, {
    hidden: false,
    querySelector: selector => selector === '.ae-experience' ? stage : null,
    createElementNS: (_, tag) => new Element(tag),
    fonts: { ready: { then: callback => callback() } },
  });
  const media = new Events();
  media.matches = initiallyReduced;
  window.matchMedia = () => media;
  let now = 1, id = 0;
  const scheduled = new Map();
  const raf = callback => { scheduled.set(++id, callback); return id; };
  const cancelRaf = token => scheduled.delete(token);
  class CustomEvent { constructor(type, options = {}) { this.type = type; this.detail = options.detail; } }
  const context = vm.createContext({
    window, document, console, CustomEvent,
    requestAnimationFrame: raf, cancelAnimationFrame: cancelRaf,
    performance: { now: () => now },
    ResizeObserver: class { constructor(callback) { this.callback = callback; } observe() {} disconnect() {} },
    setTimeout, clearTimeout,
  });
  for (const key of ['innerWidth', 'innerHeight', 'scrollX', 'scrollY']) {
    Object.defineProperty(context, key, { get: () => window[key], configurable: true });
  }
  Object.assign(window, { requestAnimationFrame: raf, cancelAnimationFrame: cancelRaf });
  vm.runInContext(source, context, { filename: 'assets/scene-motion.js' });
  const history = [], allStates = new Set();
  let maxContactError = 0;

  function frame() {
    now += 1000 / fps;
    const callbacks = [...scheduled.values()];
    scheduled.clear();
    for (const callback of callbacks) callback(now);
    for (const node of nodes) {
      for (const value of [...node.attributes.values(), ...Object.values(node.style)]) {
        if (typeof value === 'string') assert(!/(?:NaN|Infinity)/.test(value), `Non-finite DOM value: ${value}`);
      }
    }
    if (mascot.classList.contains('is-ready')) {
      assert.equal(String(mascot.style.opacity), '1', 'Visible mascot must not fade between supports');
      const transform = mascot.style.transform || '';
      assert(transform.includes('translate'), 'Visible mascot needs a position transform');
      const numbers = transform.match(/-?\d+(?:\.\d+)?/g) || [];
      assert(numbers.every(number => Number.isFinite(Number(number))), 'Position must remain finite');
    }
    const state = mascot.dataset.motionState || 'waiting';
    allStates.add(state);
    const contactValue = mascot.dataset.contactError;
    const entry = { state, support: mascot.dataset.supportLine, activeJump: mascot.dataset.activeJump, contactError: contactValue === undefined || contactValue === '' ? NaN : Number(contactValue), transform: mascot.style.transform };
    history.push(entry);
    if (Number.isFinite(entry.contactError)) maxContactError = Math.max(maxContactError, entry.contactError);
    return entry;
  }
  function step(seconds) { for (let i = 0; i < Math.ceil(seconds * fps); i++) frame(); }
  function scrollTo(y) { window.scrollY = y; window.dispatchEvent({ type: 'scroll' }); }
  function setReduced(value) { media.matches = value; media.dispatchEvent({ type: 'change', matches: value }); step(.15); }
  function assertRestingOnLine(index) {
    assert.equal(String(mascot.dataset.supportLine), String(index), `Expected settled support ${index}, got ${mascot.dataset.supportLine}`);
    assert.notEqual(mascot.dataset.activeJump, 'true', 'Jump must finish even when scroll stops');
    const stable = history.slice(-Math.ceil(fps * .8));
    assert(stable.length >= Math.floor(fps * .5), 'Collect stable contact samples');
    for (const entry of stable) {
      assert(Number.isFinite(entry.contactError), `Missing numeric data-contact-error in ${entry.state}`);
      assert(entry.contactError <= 2.5, `${entry.state} contact detached by ${entry.contactError}px`);
    }
    const sag = Number(lines[index].dataset.lineSag);
    assert(Number.isFinite(sag) && sag > 6, `Loaded line ${index} should visibly sag; got ${sag}px`);
  }
  return { mascot, demo, lines, replay, window, media, history, allStates, lineTops, frame, step, scrollTo, setReduced, assertRestingOnLine, get maxContactError() { return maxContactError; } };
}

function runScenario(width, height, fps) {
  const harness = createHarness({ width, height, fps });
  harness.step(12);
  assert.equal(parseFloat(harness.demo.style.getPropertyValue('--mascot-push-x')), 0, 'Intro must leave the window in its final position');
  assert.notEqual(harness.mascot.dataset.activeJump, 'true', 'Intro hop must finish');
  const settledPoses = new Set();
  for (let index = 0; index < harness.lines.length; index++) {
    const before = harness.history.length;
    harness.scrollTo(harness.lineTops[index] - height * .56);
    harness.step(7);
    harness.assertRestingOnLine(index);
    settledPoses.add(harness.mascot.dataset.pose || harness.mascot.dataset.motionState);
    const states = new Set(harness.history.slice(before).map(entry => entry.state));
    assert(states.has('anticipate'), `Transfer to line ${index} lacks visible preparation`);
    assert(states.has('jump'), `Transfer to line ${index} lacks a real flight`);
    assert(states.has('land'), `Transfer to line ${index} lacks a settling phase`);
  }
  assert(settledPoses.has('sit'), 'At least one string should support a seated pose');
  assert(settledPoses.has('hang'), 'At least one string should support a hanging pose');

  // On upward scroll the old support must remain loaded while the actor is
  // still visible at the bottom. Only after leaving may it spring up from below.
  const oldSupport = 3;
  const attachedY = harness.window.AEMascot.getState().position.y;
  harness.scrollTo(attachedY - (height - 8));
  const reverseStart = harness.history.length;
  harness.step(1.2);
  assert.equal(harness.mascot.dataset.supportLine, String(oldSupport), 'Upward scroll must keep the actor on its old string while still visible');
  assert(harness.history.slice(reverseStart).every(entry => !['anticipate', 'jump', 'land'].includes(entry.state)), 'Do not start the reverse jump before the actor leaves the viewport');
  assert(Number(harness.lines[oldSupport].dataset.lineSag) > 6, 'The old string must retain its load during the reverse wait');
  const visiblePosition = harness.window.AEMascot.getState().position.viewportY;
  assert(visiblePosition >= 0 && visiblePosition < height, 'Reverse-wait fixture must actually leave part of the actor visible');

  harness.scrollTo(attachedY - (height + 180));
  let sawReverseFlight = false;
  for (let i = 0; i < fps * 2; i++) {
    const entry = harness.frame();
    if (entry.state === 'jump') {
      sawReverseFlight = true;
      const originY = Number(harness.mascot.dataset.jumpFrom.split(',')[1]);
      assert(originY - harness.window.scrollY > height, 'The reverse jump must launch from below the viewport');
      assert(harness.lines[oldSupport].getBoundingClientRect().top > height, 'Released source string must be offscreen for the relaxation regression');
      break;
    }
  }
  assert(sawReverseFlight, 'Leaving the lower edge must trigger the reverse spring jump');
  harness.step(2);
  const releasedSagAtTwoSeconds = Number(harness.lines[oldSupport].dataset.lineSag);
  assert(Math.abs(releasedSagAtTwoSeconds) < 1, `Offscreen source string retains ${releasedSagAtTwoSeconds}px of load after two seconds`);
  for (let i = 0; i < 220; i++) {
    harness.frame();
    const sag = Number(harness.lines[oldSupport].dataset.lineSag);
    assert(Math.abs(sag) < 1, `Released offscreen source string developed residual sag ${sag}px`);
  }
  harness.assertRestingOnLine(2);

  // A reverse fast scroll must finish without fading or leaving an active flight.
  harness.scrollTo(harness.lineTops[0] - height * .56);
  harness.step(.35);
  harness.scrollTo(harness.lineTops[2] - height * .56);
  harness.step(10);
  harness.assertRestingOnLine(2);

  // Switching accessibility preferences mid-flight must cancel offsets and settle.
  harness.scrollTo(harness.lineTops[3] - height * .56);
  harness.step(.3);
  harness.setReduced(true);
  assert.equal(parseFloat(harness.demo.style.getPropertyValue('--mascot-push-x')), 0, 'Reduced motion must clear the intro offset');
  assert.notEqual(harness.mascot.dataset.activeJump, 'true', 'Reduced motion must cancel a live jump');
  harness.setReduced(false);
  harness.step(7);
  assert.equal(parseFloat(harness.demo.style.getPropertyValue('--mascot-push-x')), 0, 'Disabling reduced motion must not restore a stale intro offset');

  // Replaying uses the same public UI event, then returns to an actual support.
  harness.scrollTo(0);
  harness.replay.dispatchEvent({ type: 'click' });
  harness.step(12);
  assert.equal(parseFloat(harness.demo.style.getPropertyValue('--mascot-push-x')), 0, 'Replayed intro must complete');
  assert.notEqual(harness.mascot.dataset.activeJump, 'true', 'Replayed intro must land');
  return `${width}×${height} @ ${fps}fps: ${harness.history.length} frames; max contact error ${harness.maxContactError.toFixed(3)}px; sit + hang verified`;
}

const results = [];
for (const fps of [60, 30]) {
  results.push(runScenario(1440, 900, fps));
  results.push(runScenario(390, 844, fps));
  const reduced = createHarness({ width: 390, height: 844, fps, initiallyReduced: true });
  reduced.step(1);
  assert.equal(parseFloat(reduced.demo.style.getPropertyValue('--mascot-push-x')), 0, 'Initial reduced motion must never shift the window');
  reduced.setReduced(false);
  reduced.step(1);
  assert.equal(parseFloat(reduced.demo.style.getPropertyValue('--mascot-push-x')), 0, 'Turning motion back on must preserve a completed intro');
  results.push(`390×844 @ ${fps}fps: initial reduced-motion toggle verified`);
}
console.log(`PASS mascot motion\n${results.join('\n')}`);
