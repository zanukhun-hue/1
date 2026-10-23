import {
  ACESFilmicToneMapping, AmbientLight, Box3, DirectionalLight,
  Color, DoubleSide, Float32BufferAttribute, Group, InstancedBufferAttribute,
  InstancedBufferGeometry, Mesh, PerspectiveCamera, PMREMGenerator, Scene,
  ShaderMaterial, SRGBColorSpace, Vector3, WebGLRenderer
} from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { MeshSurfaceSampler } from 'three/addons/math/MeshSurfaceSampler.js';

// Each fibre is a tapered, bent strip, instanced on the actual sculpture.
// This gives the silhouette real depth without downloading a giant hair mesh.
function growFur(model, count) {
  let seed = 82031;
  const random = () => ((seed = (Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  model.updateMatrixWorld(true);
  const surfaces = [];
  let area = 0;
  model.traverse(object => {
    if (!object.isMesh) return;
    const sampler = new MeshSurfaceSampler(object).setRandomGenerator(random).build();
    area += sampler.distribution[sampler.distribution.length-1];
    surfaces.push({object,sampler,until:area});
    // The undercoat must stay matte even if a cached GLB has older materials.
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      material.metalness = 0;
      material.roughness = .98;
      material.envMapIntensity = .22;
      if ('clearcoat' in material) material.clearcoat = 0;
    }
  });
  const roots = new Float32Array(count*3), normals = new Float32Array(count*3);
  const tangents = new Float32Array(count*3), params = new Float32Array(count*3);
  const point = new Vector3(), normal = new Vector3(), tangent = new Vector3();
  const cross = new Vector3(), groom = new Vector3(), up = new Vector3(0,1,0), alternate = new Vector3(1,0,0);
  for (let i=0;i<count;i++) {
    const target = random()*area;
    const {object,sampler} = surfaces.find(surface=>target<=surface.until) || surfaces[surfaces.length-1];
    sampler.sample(point,normal);
    point.applyMatrix4(object.matrixWorld);
    normal.transformDirection(object.matrixWorld);
    tangent.crossVectors(normal,Math.abs(normal.y)>.9 ? alternate : up).normalize();
    cross.crossVectors(normal,tangent).normalize();
    const angle = random()*Math.PI*2;
    tangent.multiplyScalar(Math.cos(angle)).addScaledVector(cross,Math.sin(angle));
    // Neighbouring fibres share a soft downward comb. Entirely random growth
    // reads as grain at page scale instead of the longer strokes of wool.
    groom.set(.22,-1,.25).addScaledVector(normal,-(.22*normal.x-normal.y+.25*normal.z)).normalize();
    tangent.multiplyScalar(.38).addScaledVector(groom,.62).normalize();
    point.toArray(roots,i*3);
    normal.toArray(normals,i*3);
    tangent.toArray(tangents,i*3);
    params.set([.055+random()*.05,random(),random()],i*3);
  }
  const geometry = new InstancedBufferGeometry();
  const vertices = [];
  for (let i=0;i<4;i++) {
    const a=i/4,b=(i+1)/4;
    vertices.push(-1,a,0, 1,a,0, -1,b,0, 1,a,0, 1,b,0, -1,b,0);
  }
  geometry.setAttribute('position',new Float32BufferAttribute(vertices,3));
  geometry.setAttribute('aRoot',new InstancedBufferAttribute(roots,3));
  geometry.setAttribute('aNormal',new InstancedBufferAttribute(normals,3));
  geometry.setAttribute('aTangent',new InstancedBufferAttribute(tangents,3));
  geometry.setAttribute('aParams',new InstancedBufferAttribute(params,3));
  geometry.instanceCount = count;
  const material = new ShaderMaterial({
    uniforms:{uPink:{value:new Color(0xcd397d)}},
    side:DoubleSide,alphaToCoverage:true,
    vertexShader:`
      attribute vec3 aRoot, aNormal, aTangent, aParams;
      varying vec3 vNormal;
      varying float vHeight, vSide, vVariation;
      void main() {
        float t=position.y;
        vec3 across=normalize(cross(aNormal,aTangent));
        float curl=sin(t*5.0+aParams.y*6.283)-sin(aParams.y*6.283);
        vec3 centre=aRoot+aNormal*aParams.x*.78*t;
        centre+=aTangent*aParams.x*(.7*t+.8*t*t);
        centre+=across*curl*aParams.x*.16*t;
        vec4 viewCentre=modelViewMatrix*vec4(centre,1.0);
        vec3 axis=normalize(mat3(modelViewMatrix)*(aNormal*.78+aTangent*(.7+1.6*t)));
        vec3 cameraFacing=normalize(cross(axis,normalize(-viewCentre.xyz)));
        float width=(.003+aParams.z*.001)*(1.0-.93*t);
        viewCentre.xyz+=cameraFacing*position.x*width;
        gl_Position=projectionMatrix*viewCentre;
        vNormal=normalize(mat3(modelMatrix)*aNormal);
        vHeight=t; vSide=position.x; vVariation=aParams.z;
      }
    `,
    fragmentShader:`
      uniform vec3 uPink;
      varying vec3 vNormal;
      varying float vHeight, vSide, vVariation;
      void main() {
        float edge=1.0-smoothstep(.55,1.0,abs(vSide));
        if(edge<.08) discard;
        vec3 n=normalize(vNormal);
        float key=max(0.0,dot(n,normalize(vec3(-.5,.8,1.0))));
        float rim=max(0.0,dot(n,normalize(vec3(.7,.3,-.5))));
        float light=.32+key*.8+rim*.27;
        float root=mix(.82,1.12,pow(vHeight,.48));
        vec3 color=uPink*light*root*mix(.9,1.1,vVariation);
        color+=vec3(.045,.015,.03)*pow(vHeight,3.0)*key;
        gl_FragColor=vec4(color,edge);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `
  });
  const fibres = new Mesh(geometry,material);
  fibres.name = 'Rose wool / instanced tapered fibres';
  fibres.frustumCulled = false;
  model.add(fibres);
  return count;
}

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
      renderer.toneMappingExposure = 1;
      scene = new Scene();
      camera = new PerspectiveCamera(35,1,.1,50);
      camera.position.set(0,0,8.3);
      const room = new RoomEnvironment();
      const pmrem = new PMREMGenerator(renderer);
      environment = pmrem.fromScene(room,.035);
      scene.environment = environment.texture;
      scene.environmentIntensity = .38;
      room.dispose();
      pmrem.dispose();
      scene.add(new AmbientLight(0xffd8e9,.5));
      const key = new DirectionalLight(0xffd8e9,2.2);
      key.position.set(-3,5,5); scene.add(key);
      const rim = new DirectionalLight(0xffc1df,1.4);
      rim.position.set(4,1,-2); scene.add(rim);
      const fill = new DirectionalLight(0xf4deed,.55);
      fill.position.set(2,-3,4); scene.add(fill);
      const model = await new GLTFLoader().loadAsync('/assets/models/ae-sculpture.glb?v=plush-v1');
      const bounds = new Box3().setFromObject(model.scene);
      const center = bounds.getCenter(new Vector3());
      const extent = bounds.getSize(new Vector3());
      stage.dataset.modelFibres = growFur(model.scene,matchMedia('(max-width: 680px)').matches ? 42000 : 82000);
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
