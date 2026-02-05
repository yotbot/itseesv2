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
  dark: "#1a1a1a",
  green: "#5a9a3e",
  orange: "#e08840",
  greenLight: "#7ac55a",
  orangeLight: "#f5a862",
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
};

// Elliptical orbit state (for "concept" phase depth effect)
const ellipseOrbit: EllipseOrbitState = {
  active: false, // Will be removed - use blend instead
  centerX: 0,
  centerY: 0,
  radiusX: 150,
  radiusY: 60,
  depthScale: 0.4,
  angle: 0,
};

// Blend factor: 0 = use global orbit, 1 = use ellipse orbit
// Animated via scrub, no callbacks needed
let ellipseBlend = 0;

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
  if (ellipseBlend > 0) {
    const dot1 = dots.get("dot1");
    const dot2 = dots.get("dot2");

    if (dot1 && dot2) {
      const angle1Rad = (ellipseOrbit.angle * Math.PI) / 180;
      const angle2Rad = angle1Rad + Math.PI;

      const x1 =
        ellipseOrbit.centerX + Math.cos(angle1Rad) * ellipseOrbit.radiusX;
      const y1 =
        ellipseOrbit.centerY + Math.sin(angle1Rad) * ellipseOrbit.radiusY;
      const x2 =
        ellipseOrbit.centerX + Math.cos(angle2Rad) * ellipseOrbit.radiusX;
      const y2 =
        ellipseOrbit.centerY + Math.sin(angle2Rad) * ellipseOrbit.radiusY;

      // Depth factor for 3D effect
      const depth1 = 1 + Math.sin(angle1Rad) * ellipseOrbit.depthScale * ellipseBlend;
      const depth2 = 1 + Math.sin(angle2Rad) * ellipseOrbit.depthScale * ellipseBlend;

      ellipsePositions.set("dot1", { x: x1, y: y1, depthFactor: depth1 });
      ellipsePositions.set("dot2", { x: x2, y: y2, depthFactor: depth2 });

      // Z-index when in ellipse mode
      if (ellipseBlend > 0.5) {
        dot1.element.style.zIndex = Math.sin(angle1Rad) > 0 ? "2" : "1";
        dot2.element.style.zIndex = Math.sin(angle2Rad) > 0 ? "2" : "1";
      }
    }
  }

  dots.forEach((dot) => {
    let x: number;
    let y: number;
    let depthMultiplier = 1;

    if (ellipseBlend > 0 && ellipsePositions.has(dot.id)) {
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
      x = globalPos.x + (ellipsePos.x - globalPos.x) * ellipseBlend;
      y = globalPos.y + (ellipsePos.y - globalPos.y) * ellipseBlend;
      depthMultiplier = 1 + (ellipsePos.depthFactor - 1) * ellipseBlend;
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

  // Global orbit position (around viewport center)
  const angle = ((globalState.orbitAngle + dot.orbitAngle) * Math.PI) / 180;
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

  const dot1 = createDot("dot1", {
    element: dot1Element,
    baseXPercent: -0.02,
    baseYPercent: -0.05,
    orbitAngle: 0, // Will be at angle 0 in orbit
  });

  const dot2 = createDot("dot2", {
    element: dot2Element,
    baseXPercent: 0.1,
    baseYPercent: -0.05,
    orbitAngle: 180, // Opposite side in orbit
  });

  // Initial render
  render();

  // ==============================================
  // SCROLL ANIMATIONS
  // ==============================================

  // Hero section: dots shift right then back
  const heroTl = gsap.timeline({
    scrollTrigger: {
      trigger: "#hero",
      start: "top top",
      end: "25% top",
      scrub: 1,
    },
  });

  // Move both dots right (animate their offsetX)
  heroTl.to([dot1, dot2], {
    offsetX: 30,
    duration: 0.1,
    onUpdate: render,
  });

  // Move back
  heroTl.to([dot1, dot2], {
    offsetX: 0,
    duration: 0.1,
    onUpdate: render,
  });

  // ==============================================
  // PHASE 2: One continuous animation from hero exit to footer
  // Dots grow, orbit, shrink, all in one fluid motion
  // ==============================================

  const heroContent = document.querySelector(".hero-content") as HTMLElement;
  const footer = document.getElementById("contact");

  // Logo exit animation (separate, just for the logo element)
  if (heroContent) {
    gsap.to(heroContent, {
      y: "-100vh",
      scale: 3.5,
      scrollTrigger: {
        trigger: "#hero",
        start: "50% top",
        end: "bottom top",
        scrub: 1,
      },
    });
  }

  // One master timeline: 50% hero → footer
  // This creates one continuous, fluid motion
  const masterTl = gsap.timeline({
    scrollTrigger: {
      trigger: "#hero",
      start: "50% top",
      endTrigger: footer || "#process",
      end: "bottom bottom",
      scrub: 1,
    },
  });

  // Organic, overlapping transitions - everything blends gradually
  // No hard phases, just continuous transformation

  // === Colors (quick transition at start) ===
  masterTl.to(dot1, { color: colors.green, duration: 0.06, onUpdate: render }, 0);
  masterTl.to(dot2, { color: colors.orange, duration: 0.06, onUpdate: render }, 0);

  // === Scale: gradual arc - grows then shrinks with long overlap ===
  masterTl.to(dot1, { scale: 40, duration: 0.10, ease: "power2.out", onUpdate: render }, 0);
  masterTl.to(dot2, { scale: 60, duration: 0.10, ease: "power2.out", onUpdate: render }, 0);
  // Start shrinking while still large, long gradual decrease
  masterTl.to(dot1, { scale: 3, duration: 0.15, ease: "power1.inOut", onUpdate: render }, 0.08);
  masterTl.to(dot2, { scale: 3, duration: 0.15, ease: "power1.inOut", onUpdate: render }, 0.08);

  // === Orbit radius: expand then gradually contract ===
  masterTl.to(globalState, { orbitRadius: 700, duration: 0.10, ease: "power2.out", onUpdate: render }, 0);
  masterTl.to(globalState, { orbitRadius: 0, duration: 0.18, ease: "power1.inOut", onUpdate: render }, 0.08);

  // === Global orbit angle: continuous, extends into ellipse phase ===
  masterTl.to(globalState, { orbitAngle: 900, duration: 0.28, ease: "none", onUpdate: render }, 0);

  // === Ellipse blend: starts early, very gradual transition ===
  masterTl.to(
    { value: 0 },
    {
      value: 1,
      duration: 0.18, // Long, gradual blend
      ease: "power1.inOut",
      onUpdate: function () {
        ellipseBlend = this.targets()[0].value;
        render();
      },
    },
    0.06, // Start early - both orbits active together for a while
  );

  // === Ellipse orbit: starts very early, always in motion ===
  masterTl.to(
    ellipseOrbit,
    {
      angle: 5400,
      duration: 0.94, // Almost the entire timeline
      ease: "none",
      onUpdate: render,
    },
    0.06, // Starts with blend - both orbits spinning together
  );

  // === Breathing size changes - organic pulsing ===
  masterTl.to(ellipseOrbit, { radiusX: 200, radiusY: 100, duration: 0.2, onUpdate: render }, 0.25);
  masterTl.to(ellipseOrbit, { radiusX: 120, radiusY: 60, duration: 0.2, onUpdate: render }, 0.45);
  masterTl.to(ellipseOrbit, { radiusX: 180, radiusY: 80, duration: 0.2, onUpdate: render }, 0.65);
  masterTl.to(ellipseOrbit, { radiusX: 150, radiusY: 60, duration: 0.15, onUpdate: render }, 0.85);

  // ==============================================
  // RESIZE HANDLER
  // ==============================================

  resizeHandler = () => {
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
  ellipseBlend,
};
