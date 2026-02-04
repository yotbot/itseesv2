import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// Store cleanup references
let resizeHandler: (() => void) | null = null;

export function cleanupDotsAnimation() {
  if (resizeHandler) {
    window.removeEventListener('resize', resizeHandler);
    resizeHandler = null;
  }
  ScrollTrigger.getAll().forEach(trigger => trigger.kill());
}

export function initDotsAnimation() {
  const dot1 = document.getElementById('dot1') as unknown as SVGSVGElement;
  const dot2 = document.getElementById('dot2') as unknown as SVGSVGElement;

  if (!dot1 || !dot2) {
    console.warn('[dots-animation] Required elements not found. Animation disabled.');
    return;
  }

  // ==============================================
  // DOT POSITIONING CONFIG - Adjust these values!
  // ==============================================
  // Positions are relative to the center of the viewport
  // Positive X = right, Negative X = left
  // Positive Y = down, Negative Y = up

  const config = {
    // Initial dot size (will scale with viewport)
    dotSize: 20,

    // Position offsets from center (in pixels)
    // Adjust these to align dots with the "e" letters in "itsees"
    dot1OffsetX: -45,  // First "e" - adjust left/right
    dot1OffsetY: -8,   // First "e" - adjust up/down

    dot2OffsetX: 45,   // Second "e" - adjust left/right
    dot2OffsetY: -8,   // Second "e" - adjust up/down
  };

  // ==============================================

  function positionDots() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const centerX = vw / 2;
    const centerY = vh / 2;

    // Calculate positions
    const x1 = centerX + config.dot1OffsetX;
    const y1 = centerY + config.dot1OffsetY;
    const x2 = centerX + config.dot2OffsetX;
    const y2 = centerY + config.dot2OffsetY;

    const size = config.dotSize;

    // Position dot 1
    dot1.style.transform = `translate(${x1 - size / 2}px, ${y1 - size / 2}px)`;
    dot1.setAttribute('width', `${size}`);
    dot1.setAttribute('height', `${size}`);

    // Position dot 2
    dot2.style.transform = `translate(${x2 - size / 2}px, ${y2 - size / 2}px)`;
    dot2.setAttribute('width', `${size}`);
    dot2.setAttribute('height', `${size}`);
  }

  // Initial positioning
  positionDots();

  // Handle resize
  resizeHandler = () => {
    positionDots();
  };
  window.addEventListener('resize', resizeHandler);
}
