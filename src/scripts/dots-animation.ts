import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

interface DotState {
  centerX: number;
  centerY: number;
  orbitRadius: number;
  orbitAngle: number;
  scale: number;
  color: string;
  stretchX: number;
  stretchY: number;
  satelliteOpacity: number;
  satelliteOrbitAngle: number;
  mergeProgress: number;
  emergeOpacity: number;
  emergeOrbitAngle: number;
}

export function initDotsAnimation() {
  const dot1 = document.getElementById('dot1') as HTMLElement;
  const dot2 = document.getElementById('dot2') as HTMLElement;
  const dotsContainer = document.getElementById('dots-container') as HTMLElement;
  const satellitesContainer = document.getElementById('satellites-container') as HTMLElement;
  const emergedContainer = document.getElementById('emerged-container') as HTMLElement;

  if (!dot1 || !dot2 || !dotsContainer) return;

  // Viewport dimensions
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // Initial state - dots positioned as eyes in the logo
  const state: DotState = {
    centerX: vw / 2,
    centerY: vh / 2,
    orbitRadius: 60, // Distance between dots (half)
    orbitAngle: 0,
    scale: 1,
    color: '#171717',
    stretchX: 1,
    stretchY: 1,
    satelliteOpacity: 0,
    satelliteOrbitAngle: 0,
    mergeProgress: 0,
    emergeOpacity: 0,
    emergeOrbitAngle: 0,
  };

  // Velocity tracking for squash/stretch
  let lastScrollY = window.scrollY;
  let scrollVelocity = 0;

  // Create satellite dots (8 total - 4 per main dot)
  function createSatellites() {
    if (!satellitesContainer) return;
    satellitesContainer.innerHTML = '';
    for (let i = 0; i < 8; i++) {
      const satellite = document.createElement('div');
      satellite.className = 'satellite-dot';
      satellite.style.cssText = `
        position: absolute;
        width: 12px;
        height: 12px;
        background: ${state.color};
        border-radius: 50%;
        opacity: 0;
        pointer-events: none;
        will-change: transform, opacity;
      `;
      satellitesContainer.appendChild(satellite);
    }
  }

  // Create emerged dots (2 small dots that emerge from merged dot)
  function createEmergedDots() {
    if (!emergedContainer) return;
    emergedContainer.innerHTML = '';
    for (let i = 0; i < 2; i++) {
      const emerged = document.createElement('div');
      emerged.className = 'emerged-dot';
      emerged.style.cssText = `
        position: absolute;
        width: 20px;
        height: 20px;
        background: ${state.color};
        border-radius: 50%;
        opacity: 0;
        pointer-events: none;
        will-change: transform, opacity;
      `;
      emergedContainer.appendChild(emerged);
    }
  }

  createSatellites();
  createEmergedDots();

  // Render function - updates DOM based on state
  function render() {
    const angle1 = state.orbitAngle * (Math.PI / 180);
    const angle2 = angle1 + Math.PI;

    // Calculate dot positions based on merge progress
    const effectiveRadius = state.orbitRadius * (1 - state.mergeProgress);

    const x1 = state.centerX + Math.cos(angle1) * effectiveRadius;
    const y1 = state.centerY + Math.sin(angle1) * effectiveRadius;
    const x2 = state.centerX + Math.cos(angle2) * effectiveRadius;
    const y2 = state.centerY + Math.sin(angle2) * effectiveRadius;

    // Apply transforms with velocity-based stretch
    const baseSize = 20; // Base dot size in pixels
    const scaledSize = baseSize * state.scale;

    // Dot 1
    dot1.style.transform = `
      translate(${x1 - scaledSize / 2}px, ${y1 - scaledSize / 2}px)
      scale(${state.scale * state.stretchX}, ${state.scale * state.stretchY})
    `;
    dot1.style.width = `${baseSize}px`;
    dot1.style.height = `${baseSize}px`;
    dot1.style.background = state.color;
    dot1.style.opacity = '1';

    // Dot 2 (fades out during merge)
    dot2.style.transform = `
      translate(${x2 - scaledSize / 2}px, ${y2 - scaledSize / 2}px)
      scale(${state.scale * state.stretchX}, ${state.scale * state.stretchY})
    `;
    dot2.style.width = `${baseSize}px`;
    dot2.style.height = `${baseSize}px`;
    dot2.style.background = state.color;
    dot2.style.opacity = `${1 - state.mergeProgress}`;

    // Update satellites
    const satellites = satellitesContainer?.querySelectorAll('.satellite-dot');
    if (satellites) {
      satellites.forEach((sat, i) => {
        const parentIndex = i < 4 ? 0 : 1;
        const parentX = parentIndex === 0 ? x1 : x2;
        const parentY = parentIndex === 0 ? y1 : y2;
        const satAngle = (state.satelliteOrbitAngle + (i % 4) * 90) * (Math.PI / 180);
        const satRadius = 40 * state.scale;
        const satX = parentX + Math.cos(satAngle) * satRadius;
        const satY = parentY + Math.sin(satAngle) * satRadius;

        (sat as HTMLElement).style.transform = `translate(${satX - 6}px, ${satY - 6}px)`;
        (sat as HTMLElement).style.opacity = `${state.satelliteOpacity * (1 - state.mergeProgress)}`;
        (sat as HTMLElement).style.background = state.color;
      });
    }

    // Update emerged dots
    const emerged = emergedContainer?.querySelectorAll('.emerged-dot');
    if (emerged) {
      emerged.forEach((em, i) => {
        const emAngle = (state.emergeOrbitAngle + i * 180) * (Math.PI / 180);
        const emRadius = 80;
        const emX = state.centerX + Math.cos(emAngle) * emRadius;
        const emY = state.centerY + Math.sin(emAngle) * emRadius;

        (em as HTMLElement).style.transform = `translate(${emX - 10}px, ${emY - 10}px)`;
        (em as HTMLElement).style.opacity = `${state.emergeOpacity}`;
        (em as HTMLElement).style.background = state.color;
      });
    }
  }

  // Velocity-based squash/stretch animation
  function updateVelocity() {
    const currentScrollY = window.scrollY;
    scrollVelocity = (currentScrollY - lastScrollY) * 0.1;
    lastScrollY = currentScrollY;

    // Apply squash/stretch based on velocity
    const maxStretch = 0.15;
    const velocityFactor = Math.min(Math.abs(scrollVelocity) / 50, 1);

    if (scrollVelocity > 0) {
      // Scrolling down - stretch vertically
      gsap.to(state, {
        stretchY: 1 + maxStretch * velocityFactor,
        stretchX: 1 - maxStretch * velocityFactor * 0.5,
        duration: 0.1,
        ease: 'power2.out',
        onUpdate: render,
      });
    } else if (scrollVelocity < 0) {
      // Scrolling up - stretch horizontally
      gsap.to(state, {
        stretchX: 1 + maxStretch * velocityFactor,
        stretchY: 1 - maxStretch * velocityFactor * 0.5,
        duration: 0.1,
        ease: 'power2.out',
        onUpdate: render,
      });
    } else {
      // Return to normal
      gsap.to(state, {
        stretchX: 1,
        stretchY: 1,
        duration: 0.3,
        ease: 'elastic.out(1, 0.5)',
        onUpdate: render,
      });
    }

    requestAnimationFrame(updateVelocity);
  }

  // Start velocity tracking
  updateVelocity();

  // Main scroll timeline
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: 'body',
      start: 'top top',
      end: 'bottom bottom',
      scrub: 1.5,
    },
  });

  // Get section positions (as percentages of total scroll)
  // Hero: 0-20%, About: 20-35%, Process: 35-90%

  // HERO SECTION (0-20%)
  // Initial playful micro-animation (dots shift right then back)
  tl.to(state, {
    orbitAngle: 10,
    duration: 0.05,
    onUpdate: render,
  }, 0);

  tl.to(state, {
    orbitAngle: 0,
    duration: 0.05,
    onUpdate: render,
  }, 0.05);

  // Hero to About transition - dots grow huge and move to background
  tl.to(state, {
    scale: 40,
    centerX: vw * 0.15,
    centerY: vh * 1.2,
    orbitRadius: vw * 0.8,
    orbitAngle: 45,
    color: '#3b82f6',
    duration: 0.15,
    ease: 'power2.inOut',
    onUpdate: render,
  }, 0.1);

  // ABOUT SECTION (20-35%)
  // Dots stay massive in background
  tl.to(state, {
    centerX: vw * 0.2,
    centerY: vh * 0.8,
    duration: 0.15,
    onUpdate: render,
  }, 0.2);

  // CONCEPT SECTION (35-45%)
  // Dots shrink to medium, fast orbit rotation
  tl.to(state, {
    scale: 2.5,
    centerX: vw * 0.7,
    centerY: vh * 0.5,
    orbitRadius: 80,
    orbitAngle: 720 + 45,
    color: '#3b82f6',
    duration: 0.1,
    ease: 'power2.out',
    onUpdate: render,
  }, 0.35);

  // DESIGN SECTION (45-55%)
  // Satellites appear
  tl.to(state, {
    scale: 2.5,
    centerX: vw * 0.3,
    centerY: vh * 0.5,
    orbitRadius: 100,
    satelliteOpacity: 1,
    duration: 0.1,
    onUpdate: render,
  }, 0.45);

  // Satellite rotation animation
  tl.to(state, {
    satelliteOrbitAngle: 360,
    duration: 0.1,
    onUpdate: render,
  }, 0.45);

  // BUILD SECTION (55-65%)
  // Satellites fade out, dots grow larger
  tl.to(state, {
    scale: 4,
    centerX: vw * 0.65,
    centerY: vh * 0.5,
    orbitRadius: 60,
    satelliteOpacity: 0,
    satelliteOrbitAngle: 720,
    duration: 0.1,
    ease: 'power2.inOut',
    onUpdate: render,
  }, 0.55);

  // HOST SECTION (65-75%)
  // Two dots merge into one
  tl.to(state, {
    scale: 5,
    centerX: vw * 0.35,
    centerY: vh * 0.5,
    mergeProgress: 1,
    orbitRadius: 0,
    duration: 0.1,
    ease: 'power2.inOut',
    onUpdate: render,
  }, 0.65);

  // MAINTAIN SECTION (75-85%)
  // Small dots emerge from merged dot
  tl.to(state, {
    scale: 5,
    centerX: vw * 0.65,
    centerY: vh * 0.5,
    emergeOpacity: 1,
    color: '#60a5fa',
    duration: 0.1,
    ease: 'power2.out',
    onUpdate: render,
  }, 0.75);

  // Emerged dots gentle orbit
  tl.to(state, {
    emergeOrbitAngle: 180,
    duration: 0.15,
    onUpdate: render,
  }, 0.75);

  // Final section (85-100%)
  // Dots fade out slightly as we reach the end
  tl.to(state, {
    scale: 3,
    centerX: vw * 0.5,
    centerY: vh * 0.5,
    emergeOrbitAngle: 360,
    duration: 0.15,
    ease: 'power2.inOut',
    onUpdate: render,
  }, 0.85);

  // Initial render
  render();

  // Handle resize
  let resizeTimeout: ReturnType<typeof setTimeout>;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      const newVw = window.innerWidth;
      const newVh = window.innerHeight;

      // Update state proportionally
      state.centerX = (state.centerX / vw) * newVw;
      state.centerY = (state.centerY / vh) * newVh;

      render();
      ScrollTrigger.refresh();
    }, 100);
  });
}
