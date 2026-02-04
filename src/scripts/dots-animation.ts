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

  function positionDots() {
    let centerX: number;
    let centerY: number;
    let logoWidth: number;
    let logoHeight: number;

    if (logo) {
      const logoRect = logo.getBoundingClientRect();
      centerX = logoRect.left + logoRect.width / 2;
      centerY = logoRect.top + logoRect.height / 2;
      logoWidth = logoRect.width;
      logoHeight = logoRect.height;
    } else {
      // Fallback to viewport center
      centerX = window.innerWidth / 2;
      centerY = window.innerHeight / 2;
      logoWidth = 400;
      logoHeight = 100;
    }

    // Calculate positions relative to logo
    const x1 = centerX + logoWidth * config.dot1XPercent;
    const y1 = centerY + logoHeight * config.dot1YPercent;
    const x2 = centerX + logoWidth * config.dot2XPercent;
    const y2 = centerY + logoHeight * config.dot2YPercent;

    const size = config.dotSize;

    // Position dot 1
    dot1.style.transform = `translate(${x1 - size / 2}px, ${y1 - size / 2}px)`;
    dot1.setAttribute("width", `${size}`);
    dot1.setAttribute("height", `${size}`);

    // Position dot 2
    dot2.style.transform = `translate(${x2 - size / 2}px, ${y2 - size / 2}px)`;
    dot2.setAttribute("width", `${size}`);
    dot2.setAttribute("height", `${size}`);
  }

  // Initial positioning
  positionDots();

  // Handle resize
  resizeHandler = () => {
    positionDots();
  };
  window.addEventListener("resize", resizeHandler);
}
