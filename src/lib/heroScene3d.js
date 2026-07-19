// Real WebGL depth layer for the hero starfield, added 2026-07-20 at Ealia's explicit
// instruction, overriding the redesign's original "no WebGL" hero decision (see
// docs/website-redesign/22-dependency-decision.md, "2026-07-20 override" entry).
//
// Deliberately scoped narrow: replaces only the flat SVG star field with real 3D points that
// have genuine depth (size-attenuated by distance) and respond to pointer movement with a small,
// damped parallax, never scroll-independent idle motion (motion-specification.md principle 2
// still applies even though this module sits outside that spec's original no-WebGL scope).
//
// `three` is dynamically imported so its ~150KB+ chunk is never fetched for
// prefers-reduced-motion visitors (the caller only invokes this module inside the same
// reduced-motion-gated branch HeroCinematic.astro already uses) and is Vite/Rollup code-split
// automatically, so it never blocks the hero's own LCP text/image paint.

const STAR_COUNT = 40;
const STAR_SEED = 43; // deliberately different from cinematic.js's seed 42 (SVG fallback field)
                        // so the two are visibly distinct if both ever render at once mid-init.

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

/**
 * @param {HTMLCanvasElement} canvas
 * @returns {Promise<{ setProgress: (p: number) => void, destroy: () => void } | null>}
 *   null if WebGL is unavailable or context creation fails, so the caller can leave the
 *   existing SVG star field as the only star layer, no visual gap.
 */
export async function initHeroScene3d(canvas) {
  let THREE;
  try {
    THREE = await import('three');
  } catch {
    return null;
  }

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
  } catch {
    return null;
  }
  if (!renderer.getContext()) return null;

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 20);
  camera.position.z = 4;

  const stars = deterministicStars(STAR_COUNT, STAR_SEED);
  const positions = new Float32Array(stars.length * 3);
  const colors = new Float32Array(stars.length * 3);
  const base = new THREE.Color('#F5EEE0');
  stars.forEach((s, i) => {
    positions[i * 3] = s.x;
    positions[i * 3 + 1] = s.y;
    positions[i * 3 + 2] = s.z;
    colors[i * 3] = base.r * s.brightness;
    colors[i * 3 + 1] = base.g * s.brightness;
    colors[i * 3 + 2] = base.b * s.brightness;
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 0.055,
    sizeAttenuation: true,
    vertexColors: true,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });

  const points = new THREE.Points(geometry, material);
  scene.add(points);

  const resize = () => {
    const { clientWidth: w, clientHeight: h } = canvas.parentElement;
    renderer.setSize(w, h, false);
    camera.aspect = w / h || 1;
    camera.updateProjectionMatrix();
  };
  resize();
  window.addEventListener('resize', resize, { passive: true });

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
  };
  pointerTarget.addEventListener('pointermove', onPointerMove, { passive: true });

  let running = false;
  let rafId = 0;
  const PARALLAX_AMOUNT = 0.35;
  const render = () => {
    curX += (targetX - curX) * 0.06;
    curY += (targetY - curY) * 0.06;
    camera.position.x = curX * PARALLAX_AMOUNT;
    camera.position.y = -curY * PARALLAX_AMOUNT * 0.6;
    camera.lookAt(0, 4, -4);
    renderer.render(scene, camera);
    if (running) rafId = requestAnimationFrame(render);
  };

  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries[0]?.isIntersecting;
      if (visible && !running) {
        running = true;
        render();
      } else if (!visible && running) {
        running = false;
        cancelAnimationFrame(rafId);
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
      material.opacity = 1 - Math.min(1, c / 0.4);
    },
    destroy() {
      running = false;
      cancelAnimationFrame(rafId);
      observer.disconnect();
      window.removeEventListener('resize', resize);
      canvas.parentElement.removeEventListener('pointermove', onPointerMove);
      pointerTarget.removeEventListener('pointermove', onPointerMove);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    },
  };
}
