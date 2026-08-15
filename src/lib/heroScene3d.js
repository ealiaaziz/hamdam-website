// Real WebGL depth layer for the hero starfield, added 2026-07-20 at Ealia's explicit
// instruction, overriding the redesign's original "no WebGL" hero decision (see
// docs/website-redesign/22-dependency-decision.md, "2026-07-20 override" entry).
//
// Deliberately scoped narrow: replaces only the flat SVG star field with real 3D points that
// have genuine depth (size-attenuated by distance) and respond to pointer movement with a small,
// damped parallax, never scroll-independent idle motion (motion-specification.md principle 2
// still applies even though this module sits outside that spec's original no-WebGL scope).
//
// The WebGL layer stays. `three` does not, as of 2026-08-07.
//
// A Lighthouse run isolated it: with the star layer the homepage scored 70, with it stubbed out
// it scored 100. Total Blocking Time 1350ms against 0, Time to Interactive 5473ms against 805ms.
// Nothing else on the site scores below 99. The cause was not the effect, it was the library
// carrying it: 179KB of JavaScript, 105KB of it never executed, to draw forty points. The
// dynamic import kept it off the critical path for the *download*, but the parse, the shader
// compile and the first frame all still landed on the main thread during load.
//
// What three.js was actually used for is the whole of the API surface replaced below: one
// perspective camera, one BufferGeometry with a position and a colour attribute, one
// PointsMaterial with size attenuation, one Points, one draw call. That is a vertex shader, a
// fragment shader and two 4x4 matrices. The visual is unchanged, verified by screenshot against
// the three.js build at ?dawn=0, 0.15 and 0.3; the arithmetic below reproduces three's own
// formulas deliberately and the comments say which.
//
// Kept async, and still called the same way, so HeroCinematic.astro is untouched and the
// null-return contract (no WebGL, context creation failure, blocked GPU) still holds.

const STAR_COUNT = 40;
const STAR_SEED = 43; // deliberately different from cinematic.js's seed 42 (SVG fallback field)
                        // so the two are visibly distinct if both ever render at once mid-init.

// PointsMaterial.size, unchanged from the three.js version.
const STAR_SIZE = 0.055;
// Base star colour, #F5EEE0. Written straight through in sRGB on purpose: three converted this
// to linear on the way in and back to sRGB on output, which round-trips to itself, so doing
// neither lands on the same pixels.
const STAR_BASE_RGB = [245 / 255, 238 / 255, 224 / 255];

const FOV_DEGREES = 50;
const NEAR = 0.1;
const FAR = 20;
const CAMERA_Z = 4;
const LOOK_AT = [0, 4, -4];

function mulberry32(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --- Camera dolly (2026-08-15) ----------------------------------------------
// The star field had depth but the camera never used it: the eye sat at a fixed
// z and only the pointer nudged it sideways, so on a touch device -- where
// pointermove never fires -- the layer was a still image that faded out. The
// depth was real and nothing expressed it.
//
// The camera now moves forward through the field as the hero's own sunrise
// progresses, so the near stars slide outward past the far ones and the night
// opens rather than simply dimming. That is parallax the flat SVG fallback
// cannot imitate, which is the only honest reason for the WebGL layer to exist.
//
// Two constraints fixed the numbers. It is driven by scroll progress, never by
// a clock, because motion-specification.md principle 2 rules out idle motion --
// and reduced-motion visitors never reach this module at all, since
// HeroCinematic only imports it outside that branch. And the travel stops well
// short of the field: the nearest star sits at z = -1.5 against a camera at
// z = 4, so 5.5 world units separate them, and moving 1.4 leaves 4.1. Nothing
// clips through the near plane at any progress.
//
// The window matches the star fade exactly (0 to 0.4). Past 0.4 opacity is 0
// and the draw is skipped, so travelling further would move a camera looking at
// nothing.
export const DOLLY_DEPTH = 1.4;
const DOLLY_WINDOW = 0.4;

/**
 * @param {number} p hero scroll progress, 0..1
 * @returns {number} world units to move the eye forward, 0..DOLLY_DEPTH
 */
export function cameraDollyForProgress(p) {
  const c = Math.max(0, Math.min(1, p));
  const t = Math.min(1, c / DOLLY_WINDOW);
  // Ease-out quadratic: the movement is quickest while the stars are brightest
  // and has all but stopped by the time they finish fading, so the layer never
  // draws attention to itself on the way out.
  return DOLLY_DEPTH * (1 - (1 - t) * (1 - t));
}

function deterministicStars(count, seed) {
  const rand = mulberry32(seed);
  const stars = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      x: (rand() - 0.5) * 16, // world units, spread across the visible sky width
      y: 1.5 + rand() * 6.5, // upper sky only, matches the SVG field's "upper 65%" framing
      z: -1.5 - rand() * 7, // depth: nearer stars render larger via size attenuation
      brightness: 0.35 + rand() * 0.65,
    });
  }
  return stars;
}

// --- Foreground motes (2026-08-15) ------------------------------------------
// The hero had a mid plane and a far plane and nothing in front of them, so the
// dolly moved the camera through a field that was entirely in the distance.
// These eighteen warm points sit between the camera and the stars, which is
// what turns the travel into something you can read: at full dolly a mote at
// z = -0.6 sweeps outward roughly four times as fast as a star at -8, and that
// ratio is the depth cue. Without a near plane the whole field drifts almost
// uniformly and the effect is close to a zoom.
//
// They are dust caught by first light, so they arrive as the sun does and are
// gone before the hero resolves -- see moteOpacityForProgress. Nothing here is
// clock-driven: the motes never move in world space at all. Every bit of their
// motion is the camera passing them, which keeps this inside
// motion-specification.md principle 2 exactly as the star layer is.
const MOTE_COUNT = 18;
const MOTE_SEED = 44; // distinct from the star seed (43) and the SVG field's (42)
// Larger than a star (0.055) because they are nearer and because dust catching
// light reads as a soft bloom rather than a point.
const MOTE_SIZE = 0.08;
// --hamdam-night-gold, #F0C878. Warm against the cream stars, so the two planes
// separate by hue as well as by parallax.
const MOTE_BASE_RGB = [240 / 255, 200 / 255, 120 / 255];

function deterministicMotes(count, seed) {
  const rand = mulberry32(seed);
  const motes = [];
  for (let i = 0; i < count; i++) {
    motes.push({
      // Narrower than the star spread: these are close enough to the camera
      // that a wide spread would put most of them outside the frustum.
      x: (rand() - 0.5) * 9,
      // Lower in the frame than the stars, which sit at 1.5 and above. This is
      // where the sun rises and where lit dust would actually be.
      y: -0.5 + rand() * 5,
      // In front of the star field's -1.5 nearest, and never nearer than the
      // camera's closest approach: the eye stops at z = 2.6 after a full 1.4
      // dolly, so 2.4 world units of clearance remain at the very nearest.
      z: -0.2 - rand() * 2.2,
      brightness: 0.4 + rand() * 0.6,
    });
  }
  return motes;
}

/**
 * Motes rise with the sun and are gone before the hero resolves: nothing at
 * first, a peak through the middle of the dawn, nothing again by the time the
 * sky is morning. The star field is doing the opposite over the same window, so
 * the two planes hand over rather than overlapping into clutter.
 * @param {number} p hero scroll progress, 0..1
 * @returns {number} 0..MOTE_PEAK_OPACITY
 */
export const MOTE_PEAK_OPACITY = 0.55;
const MOTE_IN = 0.12;
const MOTE_PEAK = 0.38;
const MOTE_OUT = 0.72;

export function moteOpacityForProgress(p) {
  const c = Math.max(0, Math.min(1, p));
  if (c <= MOTE_IN || c >= MOTE_OUT) return 0;
  const t =
    c < MOTE_PEAK
      ? (c - MOTE_IN) / (MOTE_PEAK - MOTE_IN)
      : 1 - (c - MOTE_PEAK) / (MOTE_OUT - MOTE_PEAK);
  // Smoothstep so neither end pops on. A linear ramp is visible as a hard
  // corner at this opacity against a sky that is itself changing colour.
  return MOTE_PEAK_OPACITY * t * t * (3 - 2 * t);
}

// --- Matrices ---------------------------------------------------------------
// Column-major, the order gl.uniformMatrix4fv wants with transpose = false.

/** Same projection three.PerspectiveCamera builds for (fov, aspect, near, far). */
function perspective(out, fovDegrees, aspect, near, far) {
  const f = 1 / Math.tan((fovDegrees * Math.PI) / 180 / 2);
  const nf = 1 / (near - far);
  out[0] = f / aspect; out[1] = 0; out[2] = 0; out[3] = 0;
  out[4] = 0; out[5] = f; out[6] = 0; out[7] = 0;
  out[8] = 0; out[9] = 0; out[10] = (far + near) * nf; out[11] = -1;
  out[12] = 0; out[13] = 0; out[14] = 2 * far * near * nf; out[15] = 0;
  return out;
}

/** The view matrix for camera.position + camera.lookAt(target), up = +Y. */
function lookAt(out, eye, target) {
  let zx = eye[0] - target[0], zy = eye[1] - target[1], zz = eye[2] - target[2];
  let len = Math.hypot(zx, zy, zz) || 1;
  zx /= len; zy /= len; zz /= len;
  // x = normalize(cross(up, z)), up = (0, 1, 0)
  let xx = zz * 1 - 0 * zy;
  let xy = 0 * zx - zz * 0;
  let xz = 0 * zy - 1 * zx;
  len = Math.hypot(xx, xy, xz);
  if (len === 0) { xx = 1; xy = 0; xz = 0; } else { xx /= len; xy /= len; xz /= len; }
  // y = cross(z, x)
  const yx = zy * xz - zz * xy;
  const yy = zz * xx - zx * xz;
  const yz = zx * xy - zy * xx;
  out[0] = xx; out[1] = yx; out[2] = zx; out[3] = 0;
  out[4] = xy; out[5] = yy; out[6] = zy; out[7] = 0;
  out[8] = xz; out[9] = yz; out[10] = zz; out[11] = 0;
  out[12] = -(xx * eye[0] + xy * eye[1] + xz * eye[2]);
  out[13] = -(yx * eye[0] + yy * eye[1] + yz * eye[2]);
  out[14] = -(zx * eye[0] + zy * eye[1] + zz * eye[2]);
  out[15] = 1;
  return out;
}

// --- Shaders ----------------------------------------------------------------

// gl_PointSize reproduces three's points vertex shader under USE_SIZEATTENUATION:
//   gl_PointSize = size * ( scale / -mvPosition.z )
// with `scale` being the uniform three sets to half the drawing buffer height.
const VERTEX_SRC = `
attribute vec3 aPosition;
attribute vec3 aColor;
uniform mat4 uView;
uniform mat4 uProjection;
uniform float uSize;
uniform float uScale;
varying vec3 vColor;
void main() {
  vColor = aColor;
  vec4 mv = uView * vec4(aPosition, 1.0);
  gl_Position = uProjection * mv;
  gl_PointSize = uSize * (uScale / -mv.z);
}
`;

// A soft disc rather than the hard square three draws for a mapless PointsMaterial. At two to
// four pixels the shapes are indistinguishable, and the feathered edge is what antialias: true
// was doing for the square anyway.
const FRAGMENT_SRC = `
precision mediump float;
varying vec3 vColor;
uniform float uOpacity;
void main() {
  float r = length(gl_PointCoord - vec2(0.5));
  if (r > 0.5) discard;
  gl_FragColor = vec4(vColor, uOpacity * smoothstep(0.5, 0.32, r));
}
`;

function compile(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

/**
 * @param {HTMLCanvasElement} canvas
 * @returns {Promise<{ setProgress: (p: number) => void, destroy: () => void } | null>}
 *   null if WebGL is unavailable or context creation fails, so the caller can leave the
 *   existing SVG star field as the only star layer, no visual gap.
 */
export async function initHeroScene3d(canvas) {
  let gl;
  try {
    gl = canvas.getContext('webgl', {
      alpha: true,
      antialias: true,
      premultipliedAlpha: false,
      depth: false,
      powerPreference: 'low-power',
    });
  } catch {
    return null;
  }
  if (!gl) return null;

  const vs = compile(gl, gl.VERTEX_SHADER, VERTEX_SRC);
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SRC);
  if (!vs || !fs) return null;

  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  gl.useProgram(program);

  const stars = deterministicStars(STAR_COUNT, STAR_SEED);
  const positions = new Float32Array(stars.length * 3);
  const colors = new Float32Array(stars.length * 3);
  stars.forEach((s, i) => {
    positions[i * 3] = s.x;
    positions[i * 3 + 1] = s.y;
    positions[i * 3 + 2] = s.z;
    colors[i * 3] = STAR_BASE_RGB[0] * s.brightness;
    colors[i * 3 + 1] = STAR_BASE_RGB[1] * s.brightness;
    colors[i * 3 + 2] = STAR_BASE_RGB[2] * s.brightness;
  });

  const motes = deterministicMotes(MOTE_COUNT, MOTE_SEED);
  const motePositions = new Float32Array(motes.length * 3);
  const moteColors = new Float32Array(motes.length * 3);
  motes.forEach((m, i) => {
    motePositions[i * 3] = m.x;
    motePositions[i * 3 + 1] = m.y;
    motePositions[i * 3 + 2] = m.z;
    moteColors[i * 3] = MOTE_BASE_RGB[0] * m.brightness;
    moteColors[i * 3 + 1] = MOTE_BASE_RGB[1] * m.brightness;
    moteColors[i * 3 + 2] = MOTE_BASE_RGB[2] * m.brightness;
  });

  const aPosition = gl.getAttribLocation(program, 'aPosition');
  const aColor = gl.getAttribLocation(program, 'aColor');
  gl.enableVertexAttribArray(aPosition);
  gl.enableVertexAttribArray(aColor);

  const makeBuffer = (data) => {
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    return buf;
  };
  const positionBuffer = makeBuffer(positions);
  const colorBuffer = makeBuffer(colors);
  const motePositionBuffer = makeBuffer(motePositions);
  const moteColorBuffer = makeBuffer(moteColors);

  const uView = gl.getUniformLocation(program, 'uView');
  const uProjection = gl.getUniformLocation(program, 'uProjection');
  const uSize = gl.getUniformLocation(program, 'uSize');
  const uScale = gl.getUniformLocation(program, 'uScale');
  const uOpacity = gl.getUniformLocation(program, 'uOpacity');

  // transparent: true, depthWrite: false. Straight (non-premultiplied) alpha, matching the
  // premultipliedAlpha: false context above.
  gl.disable(gl.DEPTH_TEST);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(0, 0, 0, 0);
  // uSize and uOpacity are set per draw call now that there are two planes;
  // no useful default to seed here.

  const projection = new Float32Array(16);
  const view = new Float32Array(16);

  const resize = () => {
    const { clientWidth: w, clientHeight: h } = canvas.parentElement;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(w * dpr));
    canvas.height = Math.max(1, Math.round(h * dpr));
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    gl.viewport(0, 0, canvas.width, canvas.height);
    perspective(projection, FOV_DEGREES, w / h || 1, NEAR, FAR);
    gl.uniformMatrix4fv(uProjection, false, projection);
    gl.uniform1f(uScale, canvas.height * 0.5);
  };
  // resize() is called once here, before the render loop below exists, so it
  // must not reach for wake(): needsRender starts true, so the first frame is
  // already accounted for. Later resizes go through onResize, which does wake.
  resize();
  const onResize = () => {
    resize();
    wake();
  };
  window.addEventListener('resize', onResize, { passive: true });

  // Pointer parallax: small, damped, desktop-only in practice (touch never fires
  // pointermove without a touch-drag, so mobile stays visually static between scroll
  // updates, consistent with "motion responds to a deliberate input" -- there is no
  // deliberate hover input on touch).
  let targetX = 0, targetY = 0, curX = 0, curY = 0;
  // Listen on the whole .hero section, not just the sky layer, so the parallax responds
  // across the full hero area including where the content stack visually sits on top.
  const pointerTarget = canvas.closest('.hero') || canvas.parentElement;
  const onPointerMove = (e) => {
    const rect = pointerTarget.getBoundingClientRect();
    targetX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    targetY = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    wake();
  };
  pointerTarget.addEventListener('pointermove', onPointerMove, { passive: true });

  // On-demand rendering, changed 2026-08-07. The loop used to re-schedule itself
  // unconditionally for as long as the hero was on screen, so it redrew an
  // identical frame sixty times a second forever: the pointer damping converges
  // within about a second and then nothing changes, but the draw kept going.
  //
  // Lighthouse is what surfaced it (a wall of 100-500ms long tasks, all
  // attributed to this script, holding Total Blocking Time at 1.6s), and there
  // the per-frame cost is inflated by headless Chrome rasterising in software
  // with no GPU. The waste is real on a real device regardless: a phone kept
  // awake compositing a still image is spending battery for nothing.
  //
  // So the loop now stops when it has nothing to do and is woken by the three
  // things that can change a pixel: the pointer moving, the scroll progress
  // changing the fade, and a resize. Steady state is zero work.
  let running = false;   // hero is on screen
  let rafId = 0;         // 0 means no frame is scheduled
  let needsRender = true;
  let opacity = 1;
  let moteOpacity = 0;
  let dolly = 0;
  const PARALLAX_AMOUNT = 0.35;
  const SETTLE_EPSILON = 1e-4; // below this the damping is visually finished
  const eye = [0, 0, CAMERA_Z];

  // Both planes share one program, one pair of attributes and one pair of
  // uniforms; only the bound buffers and the two scalars change between them.
  // An invisible plane is skipped entirely rather than drawn at zero alpha,
  // which matters because for most of the page's scroll depth both are zero and
  // the frame should cost nothing.
  const drawPlane = (posBuf, colBuf, count, size, alpha) => {
    if (alpha <= 0) return;
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
    gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, colBuf);
    gl.vertexAttribPointer(aColor, 3, gl.FLOAT, false, 0, 0);
    gl.uniform1f(uSize, size);
    gl.uniform1f(uOpacity, alpha);
    gl.drawArrays(gl.POINTS, 0, count);
  };

  const draw = () => {
    eye[0] = curX * PARALLAX_AMOUNT;
    eye[1] = -curY * PARALLAX_AMOUNT * 0.6;
    // Forward through the field, not a zoom: the eye moves while LOOK_AT stays
    // put, so near and far stars separate at different rates. A change to the
    // projection would only have scaled everything uniformly.
    eye[2] = CAMERA_Z - dolly;
    lookAt(view, eye, LOOK_AT);
    gl.uniformMatrix4fv(uView, false, view);
    gl.clear(gl.COLOR_BUFFER_BIT);
    // Far plane first, near plane second. Depth testing is off (the layer is
    // additive-ish transparency over a sky it does not own), so draw order is
    // the only thing deciding what sits in front of what.
    drawPlane(positionBuffer, colorBuffer, stars.length, STAR_SIZE, opacity);
    drawPlane(motePositionBuffer, moteColorBuffer, motes.length, MOTE_SIZE, moteOpacity);
  };

  const step = () => {
    rafId = 0;
    const dx = targetX - curX;
    const dy = targetY - curY;
    const moving = Math.abs(dx) > SETTLE_EPSILON || Math.abs(dy) > SETTLE_EPSILON;
    if (moving) {
      curX += dx * 0.06;
      curY += dy * 0.06;
    }
    if (moving || needsRender) {
      needsRender = false;
      draw();
    }
    // Only keep the loop alive while the parallax is still catching up.
    if (running && moving) rafId = requestAnimationFrame(step);
  };

  const wake = () => {
    needsRender = true;
    if (running && !rafId) rafId = requestAnimationFrame(step);
  };

  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries[0]?.isIntersecting;
      if (visible && !running) {
        running = true;
        wake();
      } else if (!visible && running) {
        running = false;
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
    },
    { threshold: 0 },
  );
  observer.observe(canvas.parentElement);

  return {
    // p: 0..1 hero scroll progress, same value driving every other hero uniform.
    // Stars fade out across the same NIGHT -> FIRST_LIGHT window as the SVG fallback
    // field did (matches starsOpacityForProgress(p) in cinematic.js exactly, kept as a
    // literal duplicate here rather than an import to keep this module's only coupling
    // to cinematic.js at the caller level, not a cross-module dependency).
    setProgress(p) {
      const c = Math.max(0, Math.min(1, p));
      const next = 1 - Math.min(1, c / 0.4);
      const nextDolly = cameraDollyForProgress(c);
      const nextMote = moteOpacityForProgress(c);
      // Every value the frame depends on, not just opacity. The early return is
      // what keeps scrolling the rest of the page free of work once the hero
      // has gone, so it has to be exhaustive -- checking opacity alone would
      // have frozen the camera and the motes at whatever they held when the
      // star fade finished, and the motes are still changing well past that.
      if (next === opacity && nextDolly === dolly && nextMote === moteOpacity) return;
      opacity = next;
      dolly = nextDolly;
      moteOpacity = nextMote;
      wake();
    },
    destroy() {
      running = false;
      cancelAnimationFrame(rafId);
      observer.disconnect();
      window.removeEventListener('resize', onResize);
      pointerTarget.removeEventListener('pointermove', onPointerMove);
      gl.deleteBuffer(positionBuffer);
      gl.deleteBuffer(colorBuffer);
      gl.deleteBuffer(motePositionBuffer);
      gl.deleteBuffer(moteColorBuffer);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    },
  };
}
