const resolveAssetPath = (fileName) => {
  return new URL(`./static/${fileName}`, window.location.href).href;
};

const TEX_DATA = {
  "sun": resolveAssetPath("sun.jpg"),
  "mercury": resolveAssetPath("mercury.jpg"),
  "venus": resolveAssetPath("venus.jpg"),
  "earth": resolveAssetPath("earth.jpg"),
  "earthclouds": resolveAssetPath("earthclouds.jpg"),
  "moon": resolveAssetPath("moon.jpg"),
  "mars": resolveAssetPath("mars.jpg"),
  "phobos": resolveAssetPath("phobos.jpg"),
  "deimos": resolveAssetPath("deimos.jpg"),
  "jupiter": resolveAssetPath("jupiter.jpg"),
  "io": resolveAssetPath("io.jpg"),
  "europa": resolveAssetPath("europa.jpg"),
  "ganymede": resolveAssetPath("ganymede.jpg"),
  "callisto": resolveAssetPath("callisto.jpg"),
  "saturn": resolveAssetPath("saturn.jpg"),
  "saturnring": resolveAssetPath("saturnring.jpg"),
  "titan": resolveAssetPath("titan.jpg"),
  "rhea": resolveAssetPath("rhea.jpg"),
  "uranus": resolveAssetPath("uranus.jpg"),
  "titania": resolveAssetPath("titania.jpg"),
  "oberon": resolveAssetPath("oberon.jpg"),
  "neptune": resolveAssetPath("neptune.jpg"),
  "triton": resolveAssetPath("triton.jpg"),
  "background": resolveAssetPath("background.jpg"),
};

// ================= Scene / camera / renderer =================
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, window.innerWidth/window.innerHeight, 0.1, 50000);
camera.position.set(0, 220, 480);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 1;
controls.maxDistance = 18000;
controls.zoomSpeed = 2.5;

// ================= Loading =================
const loader = new THREE.TextureLoader();
const loadingScreen = document.getElementById('loadingScreen');
const loadFill = document.getElementById('loadFill');
const allKeys = Object.keys(TEX_DATA);
let loadedCount = 0;
let finishedLoading = false;

function finishLoading() {
  if (finishedLoading) return;
  finishedLoading = true;
  if (loadFill) {
    loadFill.style.width = '100%';
  }
  if (loadingScreen) {
    loadingScreen.style.display = 'none';
  }
}

const texCache = {};

function loadTex(key) {
  if (texCache[key]) return texCache[key];

  const t = loader.load(
    TEX_DATA[key],
    () => {
      loadedCount++;
      if (loadFill) {
        loadFill.style.width = Math.round((loadedCount / allKeys.length) * 100) + '%';
      }
      if (loadedCount >= allKeys.length) {
        finishLoading();
      }
    },
    undefined,
    () => {
      loadedCount++;
      if (loadFill) {
        loadFill.style.width = Math.round((loadedCount / allKeys.length) * 100) + '%';
      }
      if (loadedCount >= allKeys.length) {
        finishLoading();
      }
    }
  );
  t.encoding = THREE.sRGBEncoding;
  texCache[key] = t;
  return t;
}

// emissiveMap keeps surface detail visible at large orbital distances (weak sun falloff).
function createPlanetMaterial(textureKey) {
  const map = loadTex(textureKey);
  return new THREE.MeshStandardMaterial({
    map,
    emissive: 0xffffff,
    emissiveMap: map,
    emissiveIntensity: 0.45,
    roughness: 0.85,
    metalness: 0.05,
  });
}

setTimeout(() => {
  // In case textures are stuck or the callback never fires, avoid an indefinite loading screen.
  if (!finishedLoading) {
    finishLoading();
  }
}, 30000);

// ================= Starfield background =================
const bgGeo = new THREE.SphereGeometry(20000, 64, 64);
const bgMat = new THREE.MeshBasicMaterial({ map: loadTex("background"), side: THREE.BackSide, fog: false });
scene.add(new THREE.Mesh(bgGeo, bgMat));

// ================= Lighting =================
const sunLight = new THREE.PointLight(0xffffff, 3.2, 0, 0);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(2048, 2048);
sunLight.shadow.bias = -0.0005;
sunLight.shadow.radius = 2;
scene.add(sunLight);
scene.add(new THREE.AmbientLight(0x404040, 0.08));

// ================= Sun =================
const SUN_RADIUS = 12;
const PLANET_SIZE_SCALE = 2.35; // scale factor for Earth-sized planets, chosen for visibility
const sun = new THREE.Mesh(
  new THREE.SphereGeometry(SUN_RADIUS, 48, 48),
  new THREE.MeshBasicMaterial({ map: loadTex("sun") })
);
scene.add(sun);

const glowCanvas = document.createElement('canvas');
glowCanvas.width = glowCanvas.height = 256;
const gctx = glowCanvas.getContext('2d');
const grad = gctx.createRadialGradient(128,128,0,128,128,128);
grad.addColorStop(0, 'rgba(255,220,120,0.9)');
grad.addColorStop(1, 'rgba(255,220,120,0)');
gctx.fillStyle = grad;
gctx.fillRect(0,0,256,256);
const glowTex = new THREE.CanvasTexture(glowCanvas);
const glowSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false }));
glowSprite.scale.set(SUN_RADIUS * 5.2, SUN_RADIUS * 5.2, 1);
scene.add(glowSprite);

function createMoonGlow(radius, scale = 1.85, opacity = 0.16) {
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTex,
    transparent: true,
    opacity,
    depthWrite: false,
    depthTest: true,
    color: 0xe6ecff,
    blending: THREE.AdditiveBlending
  }));
  sprite.scale.set(radius * scale, radius * scale, 1);
  return sprite;
}

// =====================================================================
// REAL ORBITAL MECHANICS
// Keplerian elements at epoch J2000.0 (JD 2451545.0 = 2000-01-01 12:00 TT),
// with linear secular rates per Julian century where meaningful, sourced
// from standard low-precision planetary element tables (NASA JPL / Meeus).
// a = semi-major axis (AU), e = eccentricity, i = inclination (deg),
// Om = longitude of ascending node (deg), w = argument of periapsis (deg),
// L0 = mean longitude at epoch (deg), periodDays = sidereal orbital period.
// =====================================================================
const AU_SCALE = 60; // scene units per AU (real, linear, uniform) - large enough that Mercury's orbit (23) clears the Sun's radius (10)

function degToRad(d) { return d * Math.PI / 180; }

// Solve Kepler's equation M = E - e*sin(E) for E, given M and e (radians).
function solveKepler(M, e) {
  let E = M;
  for (let i = 0; i < 8; i++) {
    E = E - (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
  }
  return E;
}

// Returns heliocentric ecliptic {x, y, z} in scene units for a given
// set of orbital elements and days-since-J2000 (dt).
function keplerPosition(el, dt) {
  const n = 360 / el.periodDays;                 // mean motion, deg/day
  const M = degToRad(((el.L0 - el.w) + n * dt) % 360);
  const E = solveKepler(M, el.e);
  const xOrb = el.a * (Math.cos(E) - el.e);
  const yOrb = el.a * Math.sqrt(1 - el.e * el.e) * Math.sin(E);

  const w = degToRad(el.w - el.Om); // argument of periapsis
  const Om = degToRad(el.Om);
  const inc = degToRad(el.i);

  const cosW = Math.cos(w), sinW = Math.sin(w);
  const xw = xOrb * cosW - yOrb * sinW;
  const yw = xOrb * sinW + yOrb * cosW;

  const cosInc = Math.cos(inc), sinInc = Math.sin(inc);
  const xi = xw;
  const yi = yw * cosInc;
  const zi = yw * sinInc;

  const cosOm = Math.cos(Om), sinOm = Math.sin(Om);
  const X = xi * cosOm - yi * sinOm;
  const Y = xi * sinOm + yi * cosOm;
  const Z = zi;

  // Map ecliptic (X,Y) plane to scene's XZ plane, Z(ecliptic) -> scene Y (up)
  return {
    x: X * AU_SCALE,
    y: Z * AU_SCALE,
    z: Y * AU_SCALE,
  };
}

const J2000 = Date.UTC(2000, 0, 1, 12, 0, 0); // ms since epoch, matches JD 2451545.0

function daysSinceJ2000(date) {
  return (date.getTime() - J2000) / 86400000;
}

// ================= Planet + moon data (real orbital + rotation periods) =================
// rotHours: sidereal rotation period in hours (negative = retrograde spin)
const planetData = [
  { name: "Mercury", radius: 0.383 * PLANET_SIZE_SCALE, texture: "mercury", rotHours: 1407.6, tilt: 0.03,
    el: { a: 0.387098, e: 0.205630, i: 7.005, Om: 48.331, w: 77.457 + 48.331, L0: 252.250, periodDays: 87.9691 },
    moons: [] },

  { name: "Venus", radius: 0.949 * PLANET_SIZE_SCALE, texture: "venus", rotHours: -5832.5, tilt: 3.10,
    el: { a: 0.723332, e: 0.006772, i: 3.395, Om: 76.680, w: 131.533, L0: 181.980, periodDays: 224.701 },
    moons: [] },

  { name: "Earth", radius: 1.0 * PLANET_SIZE_SCALE, texture: "earth", cloudsTexture: "earthclouds", rotHours: 23.9345, tilt: 0.41,
    el: { a: 1.000000, e: 0.016709, i: 0.0005, Om: -11.261, w: 102.947, L0: 100.464, periodDays: 365.256 },
    moons: [ { name: "Moon", radius: 0.27 * PLANET_SIZE_SCALE, distanceScale: 1.894, texture: "moon", periodDays: 27.3217 } ] },

  { name: "Mars", radius: 0.532 * PLANET_SIZE_SCALE, texture: "mars", rotHours: 24.6229, tilt: 0.44,
    el: { a: 1.523679, e: 0.093400, i: 1.850, Om: 49.558, w: 336.041, L0: 355.453, periodDays: 686.980 },
    moons: [
      { name: "Phobos", radius: 0.12 * PLANET_SIZE_SCALE, distanceScale: 1.538, texture: "phobos", periodDays: 0.3189 },
      { name: "Deimos", radius: 0.09 * PLANET_SIZE_SCALE, distanceScale: 2.077, texture: "deimos", periodDays: 1.2624 }
    ] },

  { name: "Jupiter", radius: 11.21 * PLANET_SIZE_SCALE, texture: "jupiter", rotHours: 9.925, tilt: 0.05,
    el: { a: 5.204267, e: 0.048775, i: 1.303, Om: 100.464, w: 14.754, L0: 34.404, periodDays: 4332.59 },
    moons: [
      { name: "Io",       radius: 0.35 * PLANET_SIZE_SCALE, distanceScale: 1.462, texture: "io",       periodDays: 1.7691 },
      { name: "Europa",   radius: 0.32 * PLANET_SIZE_SCALE, distanceScale: 1.723, texture: "europa",   periodDays: 3.5512 },
      { name: "Ganymede", radius: 0.45 * PLANET_SIZE_SCALE, distanceScale: 2.031, texture: "ganymede", periodDays: 7.1546 },
      { name: "Callisto", radius: 0.42 * PLANET_SIZE_SCALE, distanceScale: 2.369, texture: "callisto", periodDays: 16.689 }
    ] },

  { name: "Saturn", radius: 11.45 * PLANET_SIZE_SCALE, texture: "saturn", rotHours: 10.656, tilt: 0.47,
    ring: { texture: "saturnring", innerScale: 1.35, outerScale: 2.35 },
    el: { a: 9.582017, e: 0.055723, i: 2.485, Om: 113.665, w: 92.432, L0: 49.944, periodDays: 10759.22 },
    moons: [
      { name: "Titan", radius: 0.5 * PLANET_SIZE_SCALE, distanceScale: 2.91, texture: "titan", periodDays: 15.945 },
      { name: "Rhea",  radius: 0.2 * PLANET_SIZE_SCALE, distanceScale: 2.18, texture: "rhea",  periodDays: 4.518 }
    ] },

  { name: "Uranus", radius: 4.01 * PLANET_SIZE_SCALE, texture: "uranus", rotHours: -17.24, tilt: 1.71,
    el: { a: 19.229411, e: 0.045724, i: 0.773, Om: 74.006, w: 170.964, L0: 313.232, periodDays: 30688.5 },
    moons: [
      { name: "Titania", radius: 0.22 * PLANET_SIZE_SCALE, distanceScale: 1.944, texture: "titania", periodDays: 8.706 },
      { name: "Oberon",  radius: 0.2 * PLANET_SIZE_SCALE, distanceScale: 2.500, texture: "oberon",  periodDays: 13.463 }
    ] },

  { name: "Neptune", radius: 3.88 * PLANET_SIZE_SCALE, texture: "neptune", rotHours: 16.11, tilt: 0.49,
    el: { a: 30.103658, e: 0.011214, i: 1.770, Om: 131.784, w: 44.971, L0: 304.880, periodDays: 60182 },
    moons: [
      { name: "Triton", radius: 0.3 * PLANET_SIZE_SCALE, distanceScale: 2.143, texture: "triton", periodDays: -5.877 }
    ] },
];

const planets = [];
const ORBIT_POINTS = 256;

planetData.forEach(p => {
  // Precompute a real elliptical orbit path (one full period sampled) as a line.
  const orbitPts = [];
  for (let k = 0; k <= ORBIT_POINTS; k++) {
    const dt = (k / ORBIT_POINTS) * p.el.periodDays;
    const pos = keplerPosition(p.el, dt);
    orbitPts.push(new THREE.Vector3(pos.x, pos.y, pos.z));
  }
  const orbitGeo = new THREE.BufferGeometry().setFromPoints(orbitPts);
  const orbitMat = new THREE.LineBasicMaterial({ color: 0x666666, transparent: true, opacity: 0.4 });
  const orbitLine = new THREE.Line(orbitGeo, orbitMat);
  orbitLine.userData.isOrbitLine = true;
  scene.add(orbitLine);

  const mat = createPlanetMaterial(p.texture);
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(p.radius, 48, 48), mat);
  mesh.rotation.z = p.tilt;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);

  if (p.cloudsTexture) {
    const cloudMat = new THREE.MeshBasicMaterial({
      map: loadTex(p.cloudsTexture), transparent: true, opacity: 0.55, depthWrite: false
    });
    const clouds = new THREE.Mesh(new THREE.SphereGeometry(p.radius * 1.02, 48, 48), cloudMat);
    mesh.add(clouds);
    mesh.userData.clouds = clouds;
  }

  if (p.ring) {
    const innerR = p.ring.innerScale != null ? p.ring.innerScale * p.radius : p.ring.inner;
    const outerR = p.ring.outerScale != null ? p.ring.outerScale * p.radius : p.ring.outer;
    const ringGeo = new THREE.RingGeometry(innerR, outerR, 128);
    const uv = ringGeo.attributes.uv;
    const posAttr = ringGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i), y = posAttr.getY(i);
      const r = Math.sqrt(x*x + y*y);
      const t = (r - innerR) / (outerR - innerR);
      uv.setXY(i, t, 1);
    }
    
    const ringMat = new THREE.MeshBasicMaterial({
      map: loadTex(p.ring.texture),
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
      alphaTest: 0.05
    });



    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = Math.PI / 2 - 0.4;
    ringMesh.position.y = 0.01; // offset slightly above the planet surface to avoid z-fighting
    ringMesh.renderOrder = 1;
    mesh.add(ringMesh);
  }

  const moonMeshes = [];
  (p.moons || []).forEach(m => {
    const mPivot = new THREE.Object3D();
    mPivot.rotation.y = Math.random() * Math.PI * 2; // arbitrary starting phase (real phase per-moon not modeled)
    mesh.add(mPivot);
    const mMat = new THREE.MeshStandardMaterial({ map: loadTex(m.texture), roughness: 0.9 });
    const mMesh = new THREE.Mesh(new THREE.SphereGeometry(m.radius, 20, 20), mMat);
    const moonDistance = (m.distanceScale || m.distance) * p.radius;
    mMesh.position.x = moonDistance;
    mMesh.castShadow = true;
    mMesh.receiveShadow = true;
    mMesh.add(createMoonGlow(m.radius));
    mPivot.add(mMesh);
    moonMeshes.push({ pivot: mPivot, mesh: mMesh, data: m });
  });

  planets.push({ mesh, data: p, moons: moonMeshes });
});

// ================= Asteroid belt (instanced, between Mars & Jupiter, real AU range ~2.1-3.3 AU) =================
const ASTEROID_COUNT = 2200;
const asteroidGeo = new THREE.IcosahedronGeometry(0.60, 0);
const asteroidMat = new THREE.MeshStandardMaterial({ color: 0x8a8378, roughness: 1.0 });
const asteroidBelt = new THREE.InstancedMesh(asteroidGeo, asteroidMat, ASTEROID_COUNT);
const dummy = new THREE.Object3D();
const beltInnerR = 140, beltOuterR = 200;
const asteroidSpeeds = [];
for (let i = 0; i < ASTEROID_COUNT; i++) {
  const r = beltInnerR + Math.random() * (beltOuterR - beltInnerR);
  const theta = Math.random() * Math.PI * 2;
  const y = (Math.random() - 0.5) * 2.2;
  dummy.position.set(Math.cos(theta) * r, y, Math.sin(theta) * r);
  const s = 0.4 + Math.random() * 1.6;
  dummy.scale.setScalar(s);
  dummy.rotation.set(Math.random()*6, Math.random()*6, Math.random()*6);
  dummy.updateMatrix();
  asteroidBelt.setMatrixAt(i, dummy.matrix);
  asteroidSpeeds.push({ r, theta, y, s });
}
scene.add(asteroidBelt);

// ================= Raycasting for hover labels =================
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const label = document.getElementById('planetLabel');
let labelsEnabled = true;
let clickFocusEnabled = false;

renderer.domElement.addEventListener('mousemove', (e) => {
  if (!labelsEnabled) { label.style.display = 'none'; return; }
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);

  const targets = [{ mesh: sun, key: 'sun', name: "Sun" }];
  planets.forEach(p => {
    targets.push({ mesh: p.mesh, key: p.data.name, name: p.data.name });
    p.moons.forEach(m => targets.push({ mesh: m.mesh, key: p.data.name + ':' + m.data.name, name: m.data.name }));
  });
  const hits = raycaster.intersectObjects(targets.map(t => t.mesh));
  if (hits.length > 0) {
    const found = targets.find(t => t.mesh === hits[0].object);
    label.style.display = 'block';
    label.style.left = (e.clientX + 14) + 'px';
    label.style.top = (e.clientY + 4) + 'px';
    label.textContent = found ? found.name : "";
    renderer.domElement.style.cursor = 'pointer';
  } else {
    label.style.display = 'none';
    renderer.domElement.style.cursor = 'default';
  }
});

renderer.domElement.addEventListener('click', (e) => {
  if (!clickFocusEnabled) return;
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);

  const targets = [{ mesh: sun, key: 'sun', name: "Sun" }];
  planets.forEach(p => {
    targets.push({ mesh: p.mesh, key: p.data.name, name: p.data.name });
    p.moons.forEach(m => targets.push({ mesh: m.mesh, key: p.data.name + ':' + m.data.name, name: m.data.name }));
  });
  const hits = raycaster.intersectObjects(targets.map(t => t.mesh));
  if (hits.length > 0) {
    const found = targets.find(t => t.mesh === hits[0].object);
    if (found) {
      applyFocus(found.key);
      const option = focusSelect.querySelector(`option[value="${found.key}"]`);
      if (option) focusSelect.value = found.key;
    }
  }
});

// ================= UI toggles =================
const toggleOrbits = document.getElementById('toggleOrbits');
if (toggleOrbits) {
  toggleOrbits.addEventListener('change', (e) => {
    scene.children.forEach(c => { if (c.userData.isOrbitLine) c.visible = e.target.checked; });
  });
}

const toggleMoons = document.getElementById('toggleMoons');
if (toggleMoons) {
  toggleMoons.addEventListener('change', (e) => {
    planets.forEach(p => p.moons.forEach(m => m.pivot.visible = e.target.checked));
  });
}

const toggleBelt = document.getElementById('toggleBelt');
if (toggleBelt) {
  toggleBelt.addEventListener('change', (e) => {
    asteroidBelt.visible = e.target.checked;
  });
}

const toggleLabels = document.getElementById('toggleLabels');
if (toggleLabels) {
  toggleLabels.addEventListener('change', (e) => {
    labelsEnabled = e.target.checked;
    if (!labelsEnabled) label.style.display = 'none';
  });
}

const toggleClickToFocus = document.getElementById('toggleClickToFocus');
if (toggleClickToFocus) {
  toggleClickToFocus.addEventListener('change', (e) => {
    clickFocusEnabled = e.target.checked;
  });
}

// ================= Real-time clock control =================
// simTime advances in real ms; secondsPerRealSecond controls how many
// simulated seconds pass per real second (0 = wall-clock real time).
let simTime = new Date(); // starts at the real "now"
let secondsPerRealSecond = 86400; // default: 1 sim day per real second
let paused = false;

const simDateEl = document.getElementById('simDate');
function formatSimDate(d) {
  return d.toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  }) + ' UTC';
}

const btnNow = document.getElementById('btnNow');
if (btnNow) {
  btnNow.addEventListener('click', () => {
    simTime = new Date();
  });
}

const btnPause = document.getElementById('btnPause');
if (btnPause) {
  btnPause.addEventListener('click', () => {
    paused = !paused;
    btnPause.textContent = paused ? 'Play' : 'Pause';
  });
}

const speedPreset = document.getElementById('speedPreset');
if (speedPreset) {
  speedPreset.addEventListener('change', (e) => {
    const v = parseFloat(e.target.value);
    secondsPerRealSecond = v === 0 ? 1 : v; // "Real time" = 1 sim second per real second
  });
}

// ================= Focus-on camera tracking =================
// Lets you jump the camera close to any body (e.g. the Moon) and have it
// keep following as that body moves along its real orbit.
const focusTargets = [{ key: "sun", name: "Sun", mesh: sun, radius: SUN_RADIUS }];
planets.forEach(p => {
  focusTargets.push({ key: p.data.name, name: p.data.name, mesh: p.mesh, radius: p.data.radius });
  p.moons.forEach(m => {
    focusTargets.push({ key: p.data.name + ":" + m.data.name, name: m.data.name + " (moon of " + p.data.name + ")", mesh: m.mesh, radius: m.data.radius });
  });
});

const focusSelect = document.getElementById('focusSelect');
if (focusSelect) {
  focusTargets.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t.key;
    opt.textContent = t.name;
    focusSelect.appendChild(opt);
  });
}

let focusedTarget = null;
let justFocused = false;
const focusOffset = new THREE.Vector3();

function applyFocus(key) {
  const found = focusTargets.find(t => t.key === key);
  focusedTarget = found || null;
  justFocused = !!found;
  if (focusedTarget) {
    focusOffset.set(0, Math.max(focusedTarget.radius * 7, 3), Math.max(focusedTarget.radius * 7, 3) * 1.2);
  }
}

if (focusSelect) {
  focusSelect.addEventListener('change', (e) => applyFocus(e.target.value));
  focusSelect.value = "";
  applyFocus("");
}

const focusWorldPos = new THREE.Vector3();
const focusDesiredPos = new THREE.Vector3();

// ================= Resize =================
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ================= Animation loop =================
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const dt = clock.getDelta(); // real seconds elapsed since last frame

  if (!paused) {
    simTime = new Date(simTime.getTime() + dt * secondsPerRealSecond * 1000);
  }
  if (simDateEl) {
    simDateEl.textContent = formatSimDate(simTime);
  }

  const dtDays = daysSinceJ2000(simTime);

  // Sun's own rotation (sidereal period ~25.4 days at equator)
  sun.rotation.y = (dtDays / 25.4) * Math.PI * 2;

  planets.forEach(p => {
    const pos = keplerPosition(p.data.el, dtDays);
    p.mesh.position.set(pos.x, pos.y, pos.z);

    // Rotation: full turns since epoch based on real sidereal period.
    const rotTurns = (dtDays * 24) / p.data.rotHours;
    p.mesh.rotation.y = rotTurns * Math.PI * 2;

    if (p.mesh.userData.clouds) p.mesh.userData.clouds.rotation.y += 0.15 * dt;

    p.moons.forEach(m => {
      const turns = dtDays / m.data.periodDays;
      m.pivot.rotation.y = turns * Math.PI * 2;
    });
  });

  asteroidBelt.rotation.y = (dtDays / 4332.59) * Math.PI * 2; // drifts with Jupiter's period, roughly

  if (focusedTarget) {
    focusedTarget.mesh.getWorldPosition(focusWorldPos);
    focusDesiredPos.copy(focusWorldPos).add(focusOffset);

    if (justFocused) {
      camera.position.copy(focusDesiredPos);
      justFocused = false;
    } else {
      camera.position.lerp(focusDesiredPos, 0.08);
    }

    controls.target.lerp(focusWorldPos, 0.08);
  }

  controls.update();
  renderer.render(scene, camera);
}
animate();
