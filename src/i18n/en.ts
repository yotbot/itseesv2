export const en = {
  lang: 'en' as const,
  meta: {
    title: 'itsees | Full-Service Web Development',
    description: 'itsees - Full-service web development company',
  },
  hero: {
    scroll: 'Scroll',
  },
  about: {
    titleLine1: 'Full-service',
    titleLine2: 'web development',
    subtitle: 'From concept to launch and beyond. We handle everything so you can focus on what matters most: your business.',
    services: [
      {
        title: 'Custom Development',
        description: 'Tailored solutions built from the ground up to match your unique business needs.',
      },
      {
        title: 'Modern Tech Stack',
        description: 'Built with cutting-edge technologies for performance, scalability, and maintainability.',
      },
      {
        title: 'Managed Hosting',
        description: 'Reliable, fast, and secure hosting infrastructure so you never worry about downtime.',
      },
      {
        title: 'Ongoing Partnership',
        description: 'Long-term support and evolution of your digital presence as your business grows.',
      },
    ],
  },
  process: {
    title: 'The process',
    stages: [
      {
        title: 'Concept',
        description: 'We explore your vision together',
        details:
          'Every great project starts with understanding. We dive deep into your goals, audience, and aspirations to craft a clear roadmap for success.',
      },
      {
        title: 'Design',
        description: 'Ideas take shape, excitement builds',
        details:
          'Wireframes become mockups, mockups become prototypes. We iterate with you until every pixel feels right and the experience flows naturally.',
      },
      {
        title: 'Build',
        description: 'Technical craft meets creative vision',
        details:
          'Our engineers bring designs to life with clean, performant code. We use modern frameworks and best practices to ensure your site is fast, accessible, and maintainable.',
      },
      {
        title: 'Host',
        description: 'Launch with confidence and speed',
        details:
          'We deploy to battle-tested infrastructure with global CDN, automatic scaling, and rock-solid security. Your site loads fast from anywhere in the world.',
      },
      {
        title: 'Maintain',
        description: 'Ongoing support, reliable partnership',
        details:
          'Launch is just the beginning. We monitor, optimize, and evolve your digital presence as your business grows. You have a dedicated team in your corner.',
      },
    ],
  },
  footer: {
    headingLine1: 'Ready to build',
    headingLine2: 'something?',
    subtext: "Let's turn your vision into reality. Reach out and let's start the conversation.",
    cta: 'Get in touch',
    copyright: 'All rights reserved.',
  },
};

export type Translations = typeof en;
