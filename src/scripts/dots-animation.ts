import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// ==============================================
// TYPES
// ==============================================

interface DotState {
  id: string;
  element: SVGSVGElement;
  circleElement: SVGCircleElement | null;

  // Base position (logo-relative percentages)
  baseXPercent: number;
  baseYPercent: number;

  // Animation offsets
  offsetX: number;
  offsetY: number;

  // Size and shape
  baseSize: number;
  scale: number;
  scaleX: number; // 1 = normal, >1 = stretched horizontally
  scaleY: number; // 1 = normal, >1 = stretched vertically

  // Orbit (around viewport center or parent)
  orbitAngle: number;
  orbitRadius: number;

  // Appearance
  color: string;
  opacity: number;

  // Hierarchy (for satellites)
  parentId: string | null;
  satelliteOrbitRadius: number; // orbit distance from parent
  satelliteOrbitSpeed: number; // degrees per render (for continuous orbit)
}

// Elliptical orbit state (for depth effect)
interface EllipseOrbitState {
  active: boolean;
  centerX: number; // viewport-relative
  centerY: number;
  radiusX: number; // horizontal radius (wider)
  radiusY: number; // vertical radius (shorter for perspective)
  depthScale: number; // how much to scale down when "behind" (0-1, 0.5 = 50% smaller at back)
  angle: number; // current rotation angle in degrees
}

// ==============================================
// COLORS
// ==============================================

export const colors = {
  dark: "#212121",
  green: "#a862fe",
  orange: "#f86e2f",
  greenLight: "#c49afe",
  orangeLight: "#fa9870",
};

// ==============================================
// STATE MANAGEMENT
// ==============================================

const dots: Map<string, DotState> = new Map();
let resizeHandler: (() => void) | null = null;
let container: HTMLElement | null = null;
let logo: HTMLElement | null = null;

// Shared animation state (for properties that affect all dots together)
const globalState = {
  orbitAngle: 0,
  orbitRadius: 0,
  ellipseBlend: 0, // 0 = global orbit, 1 = ellipse orbit — GSAP tweens this directly
};

// Elliptical orbit state (for "concept" phase depth effect)
// Starts at radius 0 - will expand outward as it takes over from global orbit
const ellipseOrbit: EllipseOrbitState = {
  active: false,
  centerX: 0,
  centerY: 0,
  radiusX: 0, // Starts at 0, expands during transition
  radiusY: 0, // Starts at 0, expands during transition
  depthScale: 0.4,
  angle: 0,
};

// ==============================================
// DOT CREATION & MANAGEMENT
// ==============================================

function createDotElement(id: string): SVGSVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("id", id);
  svg.setAttribute("class", "absolute");
  svg.setAttribute("width", "20");
  svg.setAttribute("height", "20");
  svg.setAttribute("viewBox", "0 0 20 20");

  const circle = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "circle",
  );
  circle.setAttribute("cx", "10");
  circle.setAttribute("cy", "10");
  circle.setAttribute("r", "10");
  circle.setAttribute("fill", colors.dark);

  svg.appendChild(circle);
  return svg;
}

function createDot(
  id: string,
  options: Partial<DotState> & { element?: SVGSVGElement } = {},
): DotState {
  let element = options.element;

  // Create new element if not provided
  if (!element) {
    element = createDotElement(id);
    container?.appendChild(element);
  }

  const dot: DotState = {
    id,
    element,
    circleElement: element.querySelector("circle"),
    baseXPercent: options.baseXPercent ?? 0,
    baseYPercent: options.baseYPercent ?? 0,
    offsetX: options.offsetX ?? 0,
    offsetY: options.offsetY ?? 0,
    baseSize: options.baseSize ?? 24,
    scale: options.scale ?? 1,
    scaleX: options.scaleX ?? 1,
    scaleY: options.scaleY ?? 1,
    orbitAngle: options.orbitAngle ?? 0,
    orbitRadius: options.orbitRadius ?? 0,
    color: options.color ?? colors.dark,
    opacity: options.opacity ?? 1,
    parentId: options.parentId ?? null,
    satelliteOrbitRadius: options.satelliteOrbitRadius ?? 0,
    satelliteOrbitSpeed: options.satelliteOrbitSpeed ?? 0,
  };

  dots.set(id, dot);
  return dot;
}

function removeDot(id: string): void {
  const dot = dots.get(id);
  if (dot) {
    dot.element.remove();
    dots.delete(id);
  }
}

function getDot(id: string): DotState | undefined {
  return dots.get(id);
}

// ==============================================
// RENDER
// ==============================================

function render() {
  const viewportCenterX = window.innerWidth / 2;
  const viewportCenterY = window.innerHeight / 2;

  // Get logo position
  let logoX = viewportCenterX;
  let logoY = viewportCenterY;
  let logoWidth = 400;
  let logoHeight = 100;

  if (logo) {
    const logoRect = logo.getBoundingClientRect();
    logoX = logoRect.left + logoRect.width / 2;
    logoY = logoRect.top + logoRect.height / 2;
    logoWidth = logoRect.width;
    logoHeight = logoRect.height;
  }

  // Update ellipse orbit center to viewport center
  ellipseOrbit.centerX = viewportCenterX;
  ellipseOrbit.centerY = viewportCenterY;

  // For ellipse orbit: calculate positions and depth for each dot
  const ellipsePositions: Map<
    string,
    { x: number; y: number; depthFactor: number }
  > = new Map();

  // Calculate ellipse positions when blend > 0
  if (globalState.ellipseBlend > 0) {
    const dot1 = dots.get("dot1");
    const dot2 = dots.get("dot2");

    if (dot1 && dot2) {
      const angle1Rad = (ellipseOrbit.angle * Math.PI) / 180;

      // Phase drift: dots aren't locked at exactly 180° apart
      // This creates organic "chasing" behavior - sometimes closer, sometimes farther
      // Oscillates ±25° around the 180° base offset, changing slowly
      const phaseDrift =
        (Math.sin((ellipseOrbit.angle * 0.05 * Math.PI) / 180) * 25 * Math.PI) /
        180;
      const angle2Rad = angle1Rad + Math.PI + phaseDrift;

      // Dot2 also has slightly different orbit size for variety
      const radiusVariation =
        1 + Math.sin((ellipseOrbit.angle * 0.03 * Math.PI) / 180) * 0.15;

      const x1 =
        ellipseOrbit.centerX + Math.cos(angle1Rad) * ellipseOrbit.radiusX;
      const y1 =
        ellipseOrbit.centerY + Math.sin(angle1Rad) * ellipseOrbit.radiusY;
      const x2 =
        ellipseOrbit.centerX +
        Math.cos(angle2Rad) * ellipseOrbit.radiusX * radiusVariation;
      const y2 =
        ellipseOrbit.centerY +
        Math.sin(angle2Rad) * ellipseOrbit.radiusY * radiusVariation;

      // Depth factor for 3D effect
      const depth1 =
        1 + Math.sin(angle1Rad) * ellipseOrbit.depthScale * globalState.ellipseBlend;
      const depth2 =
        1 + Math.sin(angle2Rad) * ellipseOrbit.depthScale * globalState.ellipseBlend;

      ellipsePositions.set("dot1", { x: x1, y: y1, depthFactor: depth1 });
      ellipsePositions.set("dot2", { x: x2, y: y2, depthFactor: depth2 });

      // Z-index when in ellipse mode
      if (globalState.ellipseBlend > 0.5) {
        dot1.element.style.zIndex = Math.sin(angle1Rad) > 0 ? "2" : "1";
        dot2.element.style.zIndex = Math.sin(angle2Rad) > 0 ? "2" : "1";
      }
    }
  }

  dots.forEach((dot) => {
    let x: number;
    let y: number;
    let depthMultiplier = 1;

    if (globalState.ellipseBlend > 0 && ellipsePositions.has(dot.id)) {
      // Blend between global orbit and ellipse orbit
      const globalPos = getRenderedPosition(
        dot,
        logoX,
        logoY,
        logoWidth,
        logoHeight,
        viewportCenterX,
        viewportCenterY,
      );
      const ellipsePos = ellipsePositions.get(dot.id)!;

      // Smooth blend
      x = globalPos.x + (ellipsePos.x - globalPos.x) * globalState.ellipseBlend;
      y = globalPos.y + (ellipsePos.y - globalPos.y) * globalState.ellipseBlend;
      depthMultiplier = 1 + (ellipsePos.depthFactor - 1) * globalState.ellipseBlend;
    } else if (dot.parentId) {
      // Satellite: orbit around parent dot
      const parent = dots.get(dot.parentId);
      if (parent) {
        const parentPos = getRenderedPosition(
          parent,
          logoX,
          logoY,
          logoWidth,
          logoHeight,
          viewportCenterX,
          viewportCenterY,
        );
        const angle = (dot.orbitAngle * Math.PI) / 180;
        x = parentPos.x + Math.cos(angle) * dot.satelliteOrbitRadius;
        y = parentPos.y + Math.sin(angle) * dot.satelliteOrbitRadius;

        // Continuous orbit animation
        if (dot.satelliteOrbitSpeed !== 0) {
          dot.orbitAngle += dot.satelliteOrbitSpeed;
        }
      } else {
        x = viewportCenterX;
        y = viewportCenterY;
      }
    } else {
      // Main dot: blend between logo position and orbit position
      const pos = getRenderedPosition(
        dot,
        logoX,
        logoY,
        logoWidth,
        logoHeight,
        viewportCenterX,
        viewportCenterY,
      );
      x = pos.x;
      y = pos.y;
    }

    // Calculate final size with independent X/Y scaling + depth
    const baseSize = dot.baseSize * dot.scale * depthMultiplier;
    const width = baseSize * dot.scaleX;
    const height = baseSize * dot.scaleY;

    // Apply transform (center the dot at position)
    dot.element.style.transform = `translate(${x - width / 2}px, ${y - height / 2}px)`;
    dot.element.setAttribute("width", `${width}`);
    dot.element.setAttribute("height", `${height}`);
    dot.element.style.opacity = `${dot.opacity}`;

    // Apply color
    if (dot.circleElement) {
      dot.circleElement.setAttribute("fill", dot.color);
    }
  });
}

function getRenderedPosition(
  dot: DotState,
  logoX: number,
  logoY: number,
  logoWidth: number,
  logoHeight: number,
  viewportCenterX: number,
  viewportCenterY: number,
): { x: number; y: number } {
  // Logo-relative position
  const logoRelX = logoX + logoWidth * dot.baseXPercent + dot.offsetX;
  const logoRelY = logoY + logoHeight * dot.baseYPercent + dot.offsetY;

  // Phase drift for global orbit - dots aren't perfectly opposite
  // dot1 (orbitAngle=180) gets a subtle drift based on current angle
  const driftAmount =
    dot.orbitAngle > 0
      ? Math.sin((globalState.orbitAngle * 0.08 * Math.PI) / 180) * 20
      : 0;

  // Global orbit position (around viewport center)
  const angle =
    ((globalState.orbitAngle + dot.orbitAngle + driftAmount) * Math.PI) / 180;
  const orbitX = viewportCenterX + Math.cos(angle) * globalState.orbitRadius;
  const orbitY = viewportCenterY + Math.sin(angle) * globalState.orbitRadius;

  // Blend based on orbit radius
  const maxOrbitForBlend = 100;
  const blendFactor = Math.min(globalState.orbitRadius / maxOrbitForBlend, 1);

  return {
    x: logoRelX + (orbitX - logoRelX) * blendFactor,
    y: logoRelY + (orbitY - logoRelY) * blendFactor,
  };
}

// ==============================================
// ANIMATION HELPERS
// ==============================================

/**
 * Split a dot into two dots with a natural stretching/bouncing motion.
 * Uses native GSAP easing for physics-like behavior.
 *
 * Returns the new dot and a timeline you can add to your scroll animation.
 */
export function splitDot(
  sourceId: string,
  newId: string,
  options: {
    direction?: "horizontal" | "vertical";
    separationDistance?: number;
    stretchAmount?: number;
    // Elastic easing config (GSAP native)
    elasticAmplitude?: number; // 1 = normal, >1 = more overshoot
    elasticPeriod?: number; // 0.3 = tight spring, 1 = loose wobble
  } = {},
): { newDot: DotState; timeline: gsap.core.Timeline } | null {
  const source = dots.get(sourceId);
  if (!source) return null;

  const {
    direction = "horizontal",
    separationDistance = 50,
    stretchAmount = 2,
    elasticAmplitude = 1,
    elasticPeriod = 0.4,
  } = options;

  // Create new dot at same position (copies current state)
  const newDot = createDot(newId, {
    baseXPercent: source.baseXPercent,
    baseYPercent: source.baseYPercent,
    offsetX: source.offsetX,
    offsetY: source.offsetY,
    baseSize: source.baseSize,
    scale: source.scale,
    scaleX: 1,
    scaleY: 1,
    color: source.color,
    opacity: 0,
  });

  const isHorizontal = direction === "horizontal";
  const timeline = gsap.timeline();

  // Store original offsets for relative movement
  const origOffsetX = source.offsetX;
  const origOffsetY = source.offsetY;

  // Phase 1: Stretch (ease in for anticipation)
  timeline.to(source, {
    scaleX: isHorizontal ? stretchAmount : 1,
    scaleY: isHorizontal ? 1 : stretchAmount,
    duration: 0.3,
    ease: "power2.in",
    onUpdate: render,
  });

  // Phase 2: Split - reveal new dot, separate with elastic bounce
  // The elastic ease handles the "snap back to circle" naturally
  timeline.add(() => {
    newDot.scaleX = source.scaleX;
    newDot.scaleY = source.scaleY;
    newDot.opacity = 1;
    render();
  });

  // Both dots: shrink back to circle + move apart (GSAP handles physics via elastic ease)
  timeline.to(
    source,
    {
      offsetX: origOffsetX + (isHorizontal ? -separationDistance / 2 : 0),
      offsetY: origOffsetY + (isHorizontal ? 0 : -separationDistance / 2),
      scaleX: 1,
      scaleY: 1,
      duration: 0.5,
      ease: `elastic.out(${elasticAmplitude}, ${elasticPeriod})`,
      onUpdate: render,
    },
    ">-0.05", // Slight overlap for smooth transition
  );

  timeline.to(
    newDot,
    {
      offsetX: origOffsetX + (isHorizontal ? separationDistance / 2 : 0),
      offsetY: origOffsetY + (isHorizontal ? 0 : separationDistance / 2),
      scaleX: 1,
      scaleY: 1,
      duration: 0.5,
      ease: `elastic.out(${elasticAmplitude}, ${elasticPeriod})`,
      onUpdate: render,
    },
    "<", // Same time as previous
  );

  return { newDot, timeline };
}

/**
 * Create a satellite dot that orbits around a parent dot.
 *
 * For scroll-linked orbit, set orbitSpeed to 0 and animate orbitAngle with GSAP.
 * For continuous orbit, set orbitSpeed > 0 (degrees per frame).
 *
 * Alternative: Use GSAP MotionPathPlugin for path-based orbits:
 * gsap.to(satellite.element, { motionPath: { path: "circle", ... } })
 */
export function createSatellite(
  parentId: string,
  satelliteId: string,
  options: {
    orbitRadius?: number;
    orbitSpeed?: number; // 0 = scroll-controlled, >0 = continuous (degrees/frame)
    size?: number;
    color?: string;
    startAngle?: number;
  } = {},
): DotState | null {
  const parent = dots.get(parentId);
  if (!parent) return null;

  const {
    orbitRadius = 30,
    orbitSpeed = 0, // Default to scroll-controlled
    size = parent.baseSize * 0.3,
    color = parent.color,
    startAngle = 0,
  } = options;

  return createDot(satelliteId, {
    parentId,
    baseSize: size,
    color,
    orbitAngle: startAngle,
    satelliteOrbitRadius: orbitRadius,
    satelliteOrbitSpeed: orbitSpeed,
  });
}

/**
 * Merge two dots back into one (reverse of split).
 * Uses GSAP elastic ease for natural collision feel.
 */
export function mergeDots(
  dot1Id: string,
  dot2Id: string,
  options: {
    resultId?: string; // Which dot survives (default: dot1Id)
    mergePoint?: "dot1" | "dot2" | "middle";
  } = {},
): gsap.core.Timeline | null {
  const d1 = dots.get(dot1Id);
  const d2 = dots.get(dot2Id);
  if (!d1 || !d2) return null;

  const { resultId = dot1Id, mergePoint = "middle" } = options;

  const timeline = gsap.timeline();

  // Calculate merge position
  let targetX: number;
  let targetY: number;

  if (mergePoint === "dot1") {
    targetX = d1.offsetX;
    targetY = d1.offsetY;
  } else if (mergePoint === "dot2") {
    targetX = d2.offsetX;
    targetY = d2.offsetY;
  } else {
    targetX = (d1.offsetX + d2.offsetX) / 2;
    targetY = (d1.offsetY + d2.offsetY) / 2;
  }

  // Move both toward merge point
  timeline.to([d1, d2], {
    offsetX: targetX,
    offsetY: targetY,
    duration: 0.4,
    ease: "power2.in",
    onUpdate: render,
  });

  // Stretch on impact
  const survivor = resultId === dot1Id ? d1 : d2;
  const removed = resultId === dot1Id ? d2 : d1;

  timeline.add(() => {
    removed.opacity = 0;
    render();
  });

  timeline.to(survivor, {
    scaleX: 1.5,
    scaleY: 0.7,
    duration: 0.1,
    ease: "power2.out",
    onUpdate: render,
  });

  // Bounce back to circle
  timeline.to(survivor, {
    scaleX: 1,
    scaleY: 1,
    duration: 0.4,
    ease: "elastic.out(1, 0.3)",
    onUpdate: render,
  });

  // Remove the merged dot
  timeline.add(() => {
    removeDot(resultId === dot1Id ? dot2Id : dot1Id);
  });

  return timeline;
}

// ==============================================
// CLEANUP
// ==============================================

export function cleanupDotsAnimation() {
  if (resizeHandler) {
    window.removeEventListener("resize", resizeHandler);
    resizeHandler = null;
  }
  ScrollTrigger.getAll().forEach((trigger) => trigger.kill());

  // Remove dynamically created dots (keep original dot1, dot2)
  dots.forEach((dot, id) => {
    if (id !== "dot1" && id !== "dot2") {
      dot.element.remove();
    }
  });
  dots.clear();
}

// ==============================================
// INITIALIZATION
// ==============================================

export function initDotsAnimation() {
  container = document.getElementById("dots-container");
  logo = document.getElementById("logo-svg");

  const dot1Element = document.getElementById(
    "dot1",
  ) as unknown as SVGSVGElement;
  const dot2Element = document.getElementById(
    "dot2",
  ) as unknown as SVGSVGElement;

  if (!dot1Element || !dot2Element) {
    console.warn(
      "[dots-animation] Dot elements not found. Animation disabled.",
    );
    return;
  }

  if (!logo) {
    console.warn("[dots-animation] Logo not found. Dots will be centered.");
  }

  // ==============================================
  // CREATE MAIN DOTS
  // ==============================================

  const isMobile = window.innerWidth < 768;

  // Derive baseSize purely from viewport width — no DOM measurement needed.
  // Logo is w-[80vw] max-w-4xl (max-w-4xl = 896px at 16px base).
  // ~2.7% of logo width matches the "e" eye holes across all screen sizes.
  // This is always accurate from frame 0 and never causes mid-animation jumps.
  const getBaseSize = () => Math.min(window.innerWidth * 0.80, 896) * 0.027;

  // Match initial dot color to the logo text so dots blend seamlessly at rest.
  const themeTextColor = getComputedStyle(document.documentElement)
    .getPropertyValue("--color-text").trim();
  if (themeTextColor) colors.dark = themeTextColor;

  const dot1 = createDot("dot1", {
    element: dot1Element,
    baseXPercent: -0.02,
    baseYPercent: -0.05,
    baseSize: getBaseSize(),
    orbitAngle: 180,
  });

  const dot2 = createDot("dot2", {
    element: dot2Element,
    baseXPercent: 0.1,
    baseYPercent: -0.05,
    baseSize: getBaseSize(),
    orbitAngle: 0,
  });

  // Initial render
  render();

  // ==============================================
  // SCROLL ANIMATIONS
  // ==============================================

  // ==============================================
  // SINGLE CONTINUOUS TIMELINE: Hero through Footer
  // Wiggle flows into orbit flows into ellipse - no stops
  // ==============================================

  const heroContent = document.querySelector(".hero-content") as HTMLElement;
  const footer = document.getElementById("contact");

  // One master timeline: top of hero → footer
  // Everything is continuous - wiggle, explosion, orbit, ellipse all flow together
  const masterTl = gsap.timeline({
    scrollTrigger: {
      trigger: "#hero",
      start: "top top",
      endTrigger: footer || "#process",
      end: "bottom bottom",
      scrub: 0.5,
      fastScrollEnd: 3000,
    },
    onUpdate: render, // Single render call per frame instead of per-animation
  });

  // Timeline ratios (hero is ~120vh, about ~100vh, process ~750vh, footer ~50vh = ~1020vh total)
  // Hero portion: 0 - 0.12 (120/1020)
  // Wiggle: 0 - 0.03 (first 25% of hero)
  // EXPLOSION at 0.03: logo scales up + dots scale up + orbit begins - all together!

  // Responsive values
  const vw = window.innerWidth;
  const peakOrbitRadius = isMobile ? vw * 0.7 : 700;
  const peakScale1 = isMobile ? 28 : 40;
  const peakScale2 = isMobile ? 40 : 60;
  const restScale1 = isMobile ? 8 : 6;
  const restScale2 = isMobile ? 10 : 8;
  const elRadiusX = isMobile ? Math.min(110, vw * 0.30) : 270;
  const elRadiusY = isMobile ? 65 : 155;
  const elRadiusXMax = isMobile ? Math.min(130, vw * 0.34) : 310;
  const elRadiusYMax = isMobile ? 80 : 175;
  const processScale1 = 16; // mobile dot1
  const processScale2 = 20; // mobile dot2
  const processScale2Desktop = 18; // desktop dot2 (dot1 stays small at restScale1)

  // === Wiggle phase (0 - 3% of timeline) ===
  masterTl.to([dot1, dot2], { offsetX: isMobile ? 15 : 30, duration: 0.015 }, 0);
  masterTl.to([dot1, dot2], { offsetX: 0, duration: 0.015 }, 0.015);

  // === EXPLOSION: Everything happens together at 0.03 ===
  // Colors start changing
  masterTl.to(dot1, { color: colors.green, duration: 0.05 }, 0.03);
  masterTl.to(dot2, { color: colors.orange, duration: 0.05 }, 0.03);

  // Logo scales up and exits - synchronized with dots
  if (heroContent) {
    masterTl.to(
      heroContent,
      { scale: isMobile ? 2 : 3.5, y: "-100vh", duration: 0.08, ease: "power2.out" },
      0.03,
    );
  }

  // Dots scale up
  masterTl.to(dot1, { scale: peakScale1, duration: 0.06, ease: "power2.out" }, 0.03);
  masterTl.to(dot2, { scale: peakScale2, duration: 0.06, ease: "power2.out" }, 0.03);

  // Orbit radius and angle start TOGETHER - spiral outward while rotating
  masterTl.to(
    globalState,
    { orbitRadius: peakOrbitRadius, duration: 0.06, ease: "power2.out" },
    0.03,
  );

  // Global orbit rotation: continues through expansion AND contraction (spiral in + out)
  masterTl.to(
    globalState,
    { orbitAngle: 540, duration: 0.17, ease: "none" },
    0.03,
  );

  // === Scale down - starts when scale-up ends (0.09) to avoid overlap ===
  masterTl.to(dot1, { scale: restScale1, duration: 0.08, ease: "power1.inOut" }, 0.09);
  masterTl.to(dot2, { scale: restScale2, duration: 0.08, ease: "power1.inOut" }, 0.09);

  // Radius contracts AFTER dots are small - safer transition
  masterTl.to(
    globalState,
    { orbitRadius: 0, duration: 0.12, ease: "power2.in" },
    0.1,
  );

  // === TRANSITION: Global orbit spirals IN, ellipse orbit spirals OUT ===
  // Ellipse blend: GSAP tweens globalState.ellipseBlend directly — reliable scrub reversal
  masterTl.to(globalState, { ellipseBlend: 1, duration: 0.1, ease: "power1.inOut" }, 0.08);

  // Ellipse orbit rotation: one continuous animation, constant speed
  masterTl.fromTo(
    ellipseOrbit,
    { angle: 540 },
    {
      angle: 4545,
      duration: 0.8,
      ease: "none",
    },
    0.08,
  );

  // Ellipse radius EXPANDS
  masterTl.to(
    ellipseOrbit,
    { radiusX: elRadiusX, radiusY: elRadiusY, duration: 0.06, ease: "power2.out" },
    0.08,
  );

  // === Process section scale - dots diverge in size ===
  if (isMobile) {
    masterTl.to(dot1, { scale: processScale1, duration: 0.06, ease: "power1.inOut" }, 0.20);
    masterTl.to(dot2, { scale: processScale2, duration: 0.06, ease: "power1.inOut" }, 0.20);
  } else {
    // Desktop: dot2 grows large while dot1 stays at rest — dramatic size ratio
    masterTl.to(dot2, { scale: processScale2Desktop, duration: 0.06, ease: "power1.inOut" }, 0.20);
  }

  // === Breathing size changes - organic pulsing ===
  masterTl.to(
    ellipseOrbit,
    { radiusX: elRadiusXMax, radiusY: elRadiusYMax, duration: 0.14 },
    0.24,
  );
  masterTl.to(
    ellipseOrbit,
    { radiusX: elRadiusX * 0.9, radiusY: elRadiusY * 0.85, duration: 0.14 },
    0.4,
  );
  masterTl.to(
    ellipseOrbit,
    { radiusX: elRadiusX * 1.1, radiusY: elRadiusY, duration: 0.14 },
    0.56,
  );
  masterTl.to(
    ellipseOrbit,
    { radiusX: elRadiusX, radiusY: elRadiusY * 0.92, duration: 0.14 },
    0.72,
  );

  // ==============================================
  // RESIZE HANDLER
  // ==============================================

  resizeHandler = () => {
    const newBaseSize = getBaseSize();
    const d1 = dots.get("dot1");
    const d2 = dots.get("dot2");
    if (d1) d1.baseSize = newBaseSize;
    if (d2) d2.baseSize = newBaseSize;
    render();
    ScrollTrigger.refresh();
  };
  window.addEventListener("resize", resizeHandler);
}

// Export for external use
export {
  dots,
  getDot,
  createDot,
  removeDot,
  render,
  globalState,
  ellipseOrbit,
};
