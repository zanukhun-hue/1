/* Run the production theatre in a small DOM/canvas harness. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const keys = ['glow', 'twixtor', 'saber', 'flow', 'newton', 'optical-flares'];
class Element {
  constructor(dataset = {}) { this.dataset = dataset; this.events = {}; this.attributes = {}; this.style = { setProperty() {} }; }
  addEventListener(name, fn) { this.events[name] = fn; }
  setAttribute(name, value) { this.attributes[name] = value; }
  focus() { this.focused = true; }
  fire(name, data = {}) { this.events[name]?.({ preventDefault() {}, ...data }); }
}
let canvasCalls = 0;
const ctx = new Proxy({}, { get(target, name) {
  if (name in target) return target[name];
  return (...args) => {
    canvasCalls++;
    const required = { ellipse: 7, arc: 5, roundRect: 4, rect: 4, fillRect: 4, strokeRect: 4, createRadialGradient: 6, createLinearGradient: 4 }[name];
    if (required) assert(args.length >= required, `${String(name)} requires ${required} arguments, got ${args.length}`);
    args.forEach(value => { if (typeof value === 'number') assert(Number.isFinite(value), `${String(name)} got a nonfinite coordinate`); });
    if (String(name).startsWith('create')) return { addColorStop() {} };
  };
} });
function root(variant, width) {
  const element = new Element({ variant });
  const screen = { clientWidth: width, clientHeight: width < 400 ? 225 : 490 };
  const buttons = keys.map(key => new Element({ theatreSelect: key }));
  const auto = new Element();
  const timeline = new Element();
  const bars = keys.map(() => new Element());
  timeline.querySelectorAll = () => bars;
  const selectors = {
    '[data-theatre-canvas]': { getContext: () => ctx }, '.ae-theatre-screen': screen,
    '.ae-theatre-timeline': timeline, '.ae-theatre-controls': new Element(),
    '[data-theatre-auto]': auto, '[data-theatre-number]': new Element(),
    '[data-theatre-plugin]': new Element(), '[data-theatre-caption]': new Element()
  };
  element.querySelector = query => selectors[query];
  element.querySelectorAll = () => buttons;
  return Object.assign(element, { buttons, auto, selectors, bars });
}
const roots = [root('hero', 580), root('catalog', 340)];
const frames = new Map();
const observers = [];
let frameId = 0, now = 100;
const window = new Element();
window.devicePixelRatio = 2;
window.dispatchEvent = event => window.fire(event.type, event);
const document = new Element();
document.readyState = 'complete'; document.hidden = false;
document.querySelectorAll = () => roots;
const reduced = new Element(); reduced.matches = false;
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../assets/plugin-theatre.js'), 'utf8'), {
  window, document, matchMedia: () => reduced,
  requestAnimationFrame(fn) { frames.set(++frameId, fn); return frameId; },
  cancelAnimationFrame(id) { frames.delete(id); },
  ResizeObserver: class { observe() {} },
  IntersectionObserver: class { constructor(fn) { this.fn = fn; observers.push(this); } observe() {} },
  CustomEvent: class { constructor(type, detail) { this.type = type; Object.assign(this, detail); } }
});
function tick(count = 1) {
  for (let i = 0; i < count; i++) {
    now += 1000 / 60;
    const current = [...frames.values()]; frames.clear(); current.forEach(fn => fn(now));
  }
}
observers.forEach(observer => observer.fn([{ isIntersecting: true, intersectionRatio: 1 }]));
tick(90);
for (const element of roots) {
  keys.forEach((key, i) => {
    element.buttons[i].fire('click'); tick(480);
    assert.equal(element.dataset.theatreScene, key);
    assert.equal(element.dataset.theatreMode, 'manual');
    assert.equal(element.selectors['[data-theatre-number]'].textContent, `0${i + 1} / 06`);
    assert.equal(element.buttons.filter(button => button.attributes['aria-pressed'] === 'true').length, 1);
  });
  element.buttons[5].fire('keydown', { key: 'ArrowRight' });
  assert.equal(element.dataset.theatreScene, 'glow');
  element.buttons[0].fire('keydown', { key: 'ArrowLeft' });
  assert.equal(element.dataset.theatreScene, 'optical-flares');
  element.buttons[5].fire('keydown', { key: 'Home' });
  assert.equal(element.dataset.theatreScene, 'glow');
  element.buttons[0].fire('keydown', { key: 'End' });
  assert.equal(element.dataset.theatreScene, 'optical-flares');
}
roots[1].auto.fire('click');
tick(610);
assert.equal(roots[1].dataset.theatreScene, 'glow', 'autoplay wraps all six scenes');
assert.equal(roots[0].dataset.theatreScene, 'optical-flares', 'manual scene stays selected');
const clock = roots[1].dataset.theatreClock;
observers.forEach(observer => observer.fn([{ isIntersecting: false, intersectionRatio: 0 }]));
tick(120); assert.equal(roots[1].dataset.theatreClock, clock, 'offscreen clocks pause');
assert.equal(frames.size, 0);
observers.forEach(observer => observer.fn([{ isIntersecting: true, intersectionRatio: 1 }]));
document.hidden = true; document.fire('visibilitychange');
assert.equal(frames.size, 0, 'hidden document stops animation');
document.hidden = false; document.fire('visibilitychange');
reduced.matches = true; reduced.fire('change');
keys.forEach((key, i) => roots[1].buttons[i].fire('click'));
assert.equal(frames.size, 0, 'reduced motion renders six still frames without animation');
assert(canvasCalls > 10000);
console.log(`PASS six plugin scenes; finite canvas coordinates (${canvasCalls} calls), keyboard wrap, manual/autoplay, offscreen pause, reduced motion; 580px + 340px surfaces.`);
