import {
  ACESFilmicToneMapping, AmbientLight, Box3, DirectionalLight,
  Group, PerspectiveCamera, PMREMGenerator, Scene, SRGBColorSpace,
  Vector3, WebGLRenderer
} from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const stage = document.querySelector('[data-ae-model]');
if (stage) {
  const canvas = stage.querySelector('canvas');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let renderer, scene, camera, sculpture, environment, frame = 0;
  let visible = false, loaded = false, loading = false, last = 0, elapsed = 0;
  let pointerX = 0, pointerY = 0, yaw = -.2, pitch = .045;
  let contextLost = false;

  function size() {
    if (!renderer) return;
    const width = stage.clientWidth, height = stage.clientHeight;
    camera.aspect = width / Math.max(1,height);
    camera.position.z = camera.aspect < .85 ? 9.6 : 8.3;
    camera.updateProjectionMatrix();
    renderer.setSize(width,height,false);
    draw();
  }
  function draw() {
    if (!loaded || !renderer || contextLost) return;
    renderer.render(scene,camera);
  }
  function stop() { cancelAnimationFrame(frame); frame = 0; last = 0; }
  function wake() {
    if (!loaded || !visible || document.hidden || contextLost) return;
    if (reduced.matches) { draw(); return; }
    if (!frame) frame = requestAnimationFrame(tick);
  }
  function tick(now) {
    frame = 0;
    if (!visible || document.hidden || !loaded) { last = 0; return; }
    const delta = last ? Math.min((now-last)/1000,.05) : 1/60;
    last = now;
    elapsed += delta;
    // Rock around the readable front. Never turn the word into mirrored text.
    const targetYaw = -.17 + Math.sin(elapsed*.32)*.24 + pointerX*.11;
    const targetPitch = .035 + Math.sin(elapsed*.25)*.055 - pointerY*.07;
    yaw += (targetYaw-yaw)*Math.min(1,delta*4);
    pitch += (targetPitch-pitch)*Math.min(1,delta*4);
    sculpture.rotation.set(pitch,yaw,Math.sin(elapsed*.19)*.035);
    sculpture.position.y = Math.sin(elapsed*.45)*.045;
    draw();
    wake();
  }
  async function load() {
    if (loading) return;
    loading = true;
    try {
      renderer = new WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});
      renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
      renderer.outputColorSpace = SRGBColorSpace;
      renderer.toneMapping = ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;
      scene = new Scene();
      camera = new PerspectiveCamera(35,1,.1,50);
      camera.position.set(0,0,8.3);
      const room = new RoomEnvironment();
      const pmrem = new PMREMGenerator(renderer);
      environment = pmrem.fromScene(room,.035);
      scene.environment = environment.texture;
      scene.environmentIntensity = .85;
      room.dispose();
      pmrem.dispose();
      scene.add(new AmbientLight(0xffffff,.65));
      const key = new DirectionalLight(0xffecf6,3.3);
      key.position.set(-3,5,5); scene.add(key);
      const rim = new DirectionalLight(0xd7c5ff,2.1);
      rim.position.set(4,1,-2); scene.add(rim);
      const fill = new DirectionalLight(0xffffff,1);
      fill.position.set(2,-3,4); scene.add(fill);
      const model = await new GLTFLoader().loadAsync('/assets/models/ae-sculpture.glb');
      const bounds = new Box3().setFromObject(model.scene);
      const center = bounds.getCenter(new Vector3());
      const extent = bounds.getSize(new Vector3());
      model.scene.position.sub(center);
      const normalizer = new Group();
      normalizer.add(model.scene);
      normalizer.scale.setScalar(4.15/Math.max(extent.x,extent.y,extent.z));
      sculpture = new Group();
      sculpture.add(normalizer);
      sculpture.rotation.set(.045,-.2,0);
      scene.add(sculpture);
      loaded = true;
      stage.dataset.modelRenderer = 'webgl';
      size();
      stage.classList.add('is-loaded');
      wake();
    } catch (_) {
      // The rendered Blender poster is the complete fallback for no WebGL.
      stage.dataset.modelRenderer = 'poster';
      renderer?.dispose();
      environment?.dispose();
    }
  }
  new IntersectionObserver(entries=>{
    visible = entries[0].isIntersecting;
    if (visible) { load(); wake(); } else stop();
  },{rootMargin:'180px'}).observe(stage);
  new ResizeObserver(size).observe(stage);
  stage.addEventListener('pointermove',event=>{
    if (reduced.matches) return;
    const r = stage.getBoundingClientRect();
    pointerX = (event.clientX-r.left)/r.width-.5;
    pointerY = (event.clientY-r.top)/r.height-.5;
  },{passive:true});
  stage.addEventListener('pointerleave',()=>{pointerX=pointerY=0;});
  canvas.addEventListener('webglcontextlost',event=>{
    event.preventDefault();
    contextLost = true;
    stop();
    stage.classList.remove('is-loaded');
    stage.dataset.modelRenderer = 'poster';
  });
  canvas.addEventListener('webglcontextrestored',()=>{
    contextLost = false;
    if (!loaded) return;
    size();
    stage.classList.add('is-loaded');
    stage.dataset.modelRenderer = 'webgl';
    wake();
  });
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();else wake();});
  reduced.addEventListener('change',()=>{stop();wake();});
}
