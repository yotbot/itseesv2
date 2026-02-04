import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// Store cleanup references
let resizeHandler: (() => void) | null = null;

export function cleanupDotsAnimation() {
  if (resizeHandler) {
    window.removeEventListener("resize", resizeHandler);
    resizeHandler = null;
  }
  ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
}

export function initDotsAnimation() {
  const dot1 = document.getElementById("dot1") as unknown as SVGSVGElement;
  const dot2 = document.getElementById("dot2") as unknown as SVGSVGElement;
  const logo = document.getElementById("logo-svg");

  if (!dot1 || !dot2) {
    console.warn(
      "[dots-animation] Dot elements not found. Animation disabled.",
    );
    return;
  }

  if (!logo) {
    console.warn("[dots-animation] Logo not found. Dots will be centered.");
  }

  // ==============================================
  // DOT POSITIONING CONFIG
  // ==============================================
  // Positions are relative to the logo's center
  // Values are percentages of the logo's width/height
  //
  // The logo viewBox is "0 0 400 100" with text at y="70"
  // Adjust these to place dots in the "e" letters

  const config = {
    dotSize: 24,

    // Position as percentage of logo width (from logo center)
    // Negative = left of center, Positive = right of center
    dot1XPercent: -0.02, // First "e" - adjust left/right
    dot2XPercent: 0.1, // Second "e" - adjust left/right

    // Position as percentage of logo height (from logo center)
    // Negative = above center, Positive = below center
    dot1YPercent: -0.05, // First "e" - adjust up/down
    dot2YPercent: -0.05, // Second "e" - adjust up/down
  };

  // ==============================================

  // Colors (hex for GSAP animation compatibility)
  // OKLCH equivalents: dark=oklch(0.15 0 0), green=oklch(0.65 0.2 145), orange=oklch(0.72 0.18 55)
  const colors = {
    dark: "#1a1a1a",
    green: "#5a9a3e",   // vivid army green - WCAG AA contrast with dark text
    orange: "#e08840",  // vibrant orange - WCAG AA contrast with dark text
  };

  // Animation state
  const state = {
    offsetX: 0,           // X offset for wiggle animation
    scale: 1,             // Dot scale multiplier
    orbitAngle: 0,        // Orbit rotation in degrees
    orbitRadius: 0,       // Distance from center when orbiting
    dot1Color: colors.dark,
    dot2Color: colors.dark,
  };

  // Get dot circle elements for color changes
  const dot1Circle = dot1.querySelector("circle");
  const dot2Circle = dot2.querySelector("circle");

  function render() {
    const viewportCenterX = window.innerWidth / 2;
    const viewportCenterY = window.innerHeight / 2;

    // Always get logo position (even if it's moving)
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

    // Calculate logo-relative positions (where dots would be on the logo)
    const logoX1 = logoX + logoWidth * config.dot1XPercent + state.offsetX;
    const logoY1 = logoY + logoHeight * config.dot1YPercent;
    const logoX2 = logoX + logoWidth * config.dot2XPercent + state.offsetX;
    const logoY2 = logoY + logoHeight * config.dot2YPercent;

    // Calculate orbit positions (around viewport center)
    const angle1 = (state.orbitAngle * Math.PI) / 180;
    const angle2 = angle1 + Math.PI;
    const orbitX1 = viewportCenterX + Math.cos(angle1) * state.orbitRadius;
    const orbitY1 = viewportCenterY + Math.sin(angle1) * state.orbitRadius;
    const orbitX2 = viewportCenterX + Math.cos(angle2) * state.orbitRadius;
    const orbitY2 = viewportCenterY + Math.sin(angle2) * state.orbitRadius;

    // Blend between logo position and orbit position based on orbitRadius
    // When orbitRadius is 0, use logo positions; as it increases, transition to orbit
    const maxOrbitForBlend = 100; // Full orbit mode at this radius
    const blendFactor = Math.min(state.orbitRadius / maxOrbitForBlend, 1);

    const x1 = logoX1 + (orbitX1 - logoX1) * blendFactor;
    const y1 = logoY1 + (orbitY1 - logoY1) * blendFactor;
    const x2 = logoX2 + (orbitX2 - logoX2) * blendFactor;
    const y2 = logoY2 + (orbitY2 - logoY2) * blendFactor;

    const size = config.dotSize * state.scale;

    // Apply transforms
    dot1.style.transform = `translate(${x1 - size / 2}px, ${y1 - size / 2}px)`;
    dot1.setAttribute("width", `${size}`);
    dot1.setAttribute("height", `${size}`);

    dot2.style.transform = `translate(${x2 - size / 2}px, ${y2 - size / 2}px)`;
    dot2.setAttribute("width", `${size}`);
    dot2.setAttribute("height", `${size}`);

    // Apply colors (different for each dot)
    if (dot1Circle) dot1Circle.setAttribute("fill", state.dot1Color);
    if (dot2Circle) dot2Circle.setAttribute("fill", state.dot2Color);
  }

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
      end: "25% top",        // Animation completes at 25% of hero scroll
      scrub: 1,
    },
  });

  // Move right
  heroTl.to(state, {
    offsetX: 30,
    duration: 0.1, // 15% of scroll to reach right
    onUpdate: render,
  });

  // Move back
  heroTl.to(state, {
    offsetX: 0,
    duration: 0.1, // 10% of scroll to return (faster)
    onUpdate: render,
  });

  // ==============================================
  // PHASE 2: Logo exits, dots grow and orbit (50-100%)
  // ==============================================

  const heroContent = document.querySelector(".hero-content") as HTMLElement;

  const phase2Tl = gsap.timeline({
    scrollTrigger: {
      trigger: "#hero",
      start: "50% top",
      end: "bottom top",
      scrub: 1,
    },
  });

  // Move logo up and out + scale it up
  if (heroContent) {
    phase2Tl.to(
      heroContent,
      {
        y: "-100vh",
        scale: 2.5,         // Scale up as it exits
        duration: 1,
      },
      0
    );
  }

  // Dots: grow huge to become backdrop, change to different colors, orbit
  phase2Tl.to(
    state,
    {
      scale: 40,            // Massive - backdrop size
      orbitRadius: 300,     // Wider orbit for backdrop effect
      orbitAngle: 360,
      dot1Color: colors.green,
      dot2Color: colors.orange,
      duration: 1,
      onUpdate: render,
    },
    0
  );

  // Handle resize
  resizeHandler = () => {
    render();
    ScrollTrigger.refresh();
  };
  window.addEventListener("resize", resizeHandler);
}
