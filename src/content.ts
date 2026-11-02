/**
 * All of Kaiyi's words and facts live here. Edit this file to change the site's text.
 *
 * Sources: reference/Kaiyi_Wang_Resume.pdf (source of truth for facts) and
 * reference/kaiyis-room-v1.html (voice, plus content not on the résumé).
 * Search for `TODO(kaiyi)` to find everything that still needs a human decision.
 *
 * Her phone number is on the résumé PDF but must never appear in this file.
 */

// ---------------------------------------------------------------- types

export type SectionId =
  | 'about'
  | 'projects'
  | 'research'
  | 'experience'
  | 'work'
  | 'creative'
  | 'art'
  | 'cats'
  | 'interests'
  | 'contact'

export interface Link {
  label: string
  href: string
}

export interface Stat {
  value: string
  label: string
}

/** One entry in a section: a project window, research card, pinned flyer, job, etc. */
export interface Card {
  /** Figures from this card's own text, shown large. Never add one that isn't already stated below it. */
  highlights?: Stat[]
  title: string
  role?: string
  dates?: string
  /** Short highlighted pill, e.g. "In progress". */
  status?: string
  body?: string
  bullets?: string[]
  tags?: string[]
  links?: Link[]
}

export interface Section {
  id: SectionId
  title: string
  /** Which object in the café opens this section. Shown in the Explore menu and as the drawer kicker. */
  object: string
  /** For tight spots like the drawer's footer, when the title is long. */
  short?: string
  intro?: string
}

export interface GalleryImage {
  src: string
  alt: string
  title?: string
  caption?: string
}

export interface DialogueReply {
  label: string
  /** Next dialogue node. */
  to?: string
  /** Open this section instead of continuing the conversation. */
  open?: SectionId
  /** Follow this link instead of continuing the conversation. */
  href?: string
}

export interface DialogueNode {
  id: string
  text: string
  replies: DialogueReply[]
}

// ---------------------------------------------------------------- links

export const links = {
  linkedin: 'https://linkedin.com/in/kaiyiwang1',
  instagram: 'https://www.instagram.com/kaiyeetdoodles/',
  github: 'https://github.com/kaiyiandwang-afk',
  rhaCatalog: 'https://ub-rha.github.io/rha-inventory-/',
  fedChallenge: 'https://www.kaggle.com/code/kaiyeetus/ub-fed-challenge',
  laborDashboard: 'https://www.kaggle.com/code/kaiyeetus/kaiyi-w-us-labor-market-covid-recovery',
  aiPoster: 'https://drive.google.com/file/d/1xG9ufUa8Hmnhh3g7XGvTdfsoDwJT8hgj/view?usp=share_link',
  gymGirls: 'https://ubgymgirlss.netlify.app',
  socra: 'https://socra-edu.com',
} as const

// ---------------------------------------------------------------- site-wide

// TODO(kaiyi): confirm which email to show. v1 uses this Gmail; the résumé uses kaiyiwan@buffalo.edu.
export const email = 'kaiyiandwang@gmail.com'

export const resume = {
  href: '/Kaiyi_Wang_Resume.pdf',
  filename: 'Kaiyi_Wang_Resume.pdf',
  label: 'Résumé',
}

export const site = {
  name: 'Kaiyi Wang',
  badge: { title: "Kaiyi's Café", subtitle: "Economics · UB '28" },
  location: 'New York City · Buffalo, NY',
  /** From the résumé's professional summary. Used for meta/OG tags. */
  summary:
    'Economics undergraduate junior with hands-on experience in econometric modeling, Python-based financial analysis, student leadership, and budget management, including a $57,000 budget portfolio.',
}

/** Explore menu order. Every section is listed with the object that opens it, as in v1. */
export const sections: Section[] = [
  {
    id: 'about',
    title: 'About me',
    object: 'Kaiyi',
    intro:
      "I'm a New Yorker studying economics at the University at Buffalo, with minors in computer science and math. I like problems where data, money and people meet, and I like building the tools to work on them.",
  },
  {
    id: 'projects',
    title: 'Projects',
    object: 'The laptop',
    intro: "Things I've built or help build. Most started as a problem someone around me actually had.",
  },
  {
    id: 'research',
    title: 'Research',
    object: 'The bookshelf',
    // v1 said "a semester of arguing"; the résumé has the Fed Challenge running Winter 2025 – Present.
    intro: 'Empirical work in labor and housing economics, plus plenty of arguing about interest rates.',
  },
  {
    id: 'experience',
    title: 'Experience & leadership',
    short: 'Experience',
    object: 'The corkboard',
    intro: "Roles where I'm responsible for other people's money, time or plans.",
  },
  {
    id: 'work',
    title: 'Work',
    object: 'The espresso machine',
    intro:
      "I've worked part-time alongside school since high school. Service jobs taught me speed, patience and how to read a room.",
  },
  {
    id: 'creative',
    title: 'Design & film',
    object: 'The camera',
    intro: 'The other half of my brain. I care about how things look and feel, not only whether they work.',
  },
  {
    id: 'art',
    title: 'Art',
    object: 'The frames by the window',
    // TODO(kaiyi): add a line introducing your art. Neither source has one.
  },
  {
    id: 'cats',
    title: 'Cat gallery',
    object: 'The cat',
    // TODO(kaiyi): add your cat's name and a line about them. Neither source mentions the cat.
  },
  {
    id: 'interests',
    title: "Things I'm into",
    object: 'The hotpot',
    intro: 'Ask me about any of these. Especially the snakes.',
  },
  {
    id: 'contact',
    title: 'Say hi',
    object: 'The telephone',
    intro:
      'Open to internships in consulting, economics research and finance, and always happy to grab a coffee chat.',
  },
]

// ---------------------------------------------------------------- about (Kaiyi)

export const about = {
  stats: [
    { value: '3.8', label: 'GPA' },
    { value: "May '28", label: 'Graduation' },
    { value: "Fall '24 – Spring '25", label: "Dean's List" },
  ] satisfies Stat[],
  education: {
    title: 'SUNY University at Buffalo',
    role: 'B.S. Economics · Minors in Computer Science & Mathematics',
    dates: 'May 2028',
    body: "Dean's List, Fall 2024 – Spring 2025. GPA: 3.8.",
  } satisfies Card,
  // TODO(kaiyi): v1 also listed industrial organization, international finance and linear algebra.
  // They aren't on the résumé, so they're left out. Add them here if you've taken them.
  coursework: [
    'Econometrics I & II',
    'Financial Economics',
    'Labor Economics',
    'Intro to Python',
    'Intro to Java',
    'Calculus 1, 2 & 3',
  ],
  working: {
    title: 'Working since high school',
    body: "I've held part-time jobs alongside school the whole way through. The espresso machine has the details.",
  } satisfies Card,
}

/** Conversation beside Kaiyi. Every line comes from the about content above. */
export const dialogue: DialogueNode[] = [
  {
    id: 'hello',
    text: "Hi! I'm Kaiyi. I'm a New Yorker studying economics at the University at Buffalo, with minors in computer science and math.",
    replies: [
      { label: 'What do you like working on?', to: 'drive' },
      { label: 'Where are you in school?', to: 'school' },
      { label: 'Do you work too?', to: 'jobs' },
    ],
  },
  {
    id: 'drive',
    text: 'I like problems where data, money and people meet, and I like building the tools to work on them.',
    replies: [
      { label: 'What have you built?', open: 'projects' },
      { label: 'What have you studied?', to: 'courses' },
    ],
  },
  {
    id: 'school',
    text: "B.S. in Economics at UB, graduating May 2028. 3.8 GPA, and Dean's List from Fall 2024 to Spring 2025.",
    replies: [
      { label: 'Which classes?', to: 'courses' },
      { label: 'Can I see your résumé?', href: resume.href },
    ],
  },
  {
    id: 'courses',
    text: 'Econometrics I & II, Financial Economics, Labor Economics, Intro to Python, Intro to Java, and Calculus 1, 2 & 3.',
    replies: [
      { label: 'Show me the research', open: 'research' },
      { label: 'Back to the start', to: 'hello' },
    ],
  },
  {
    id: 'jobs',
    text: "I've held part-time jobs alongside school the whole way through. The espresso machine has the details.",
    replies: [
      { label: 'Tell me about them', open: 'work' },
      { label: 'Back to the start', to: 'hello' },
    ],
  },
]

/**
 * v1's speech-bubble LINES, cycled on idle clicks.
 * "my room" → "my café" and "The monitor" → "The laptop" to match the new scene.
 */
export const lines = [
  "Hi! I'm Kaiyi. Click anything in my café.",
  'The laptop has my projects.',
  'Bookshelf = research. So many regressions.',
  "Corkboard's got my leadership stuff.",
  "Click the clock or the timer and we'll focus together.",
  "Yes, there's a snake on the bookshelf. Say hi.",
  "Put the record on if it's too quiet.",
]

/** v1's one-liners when the world changes around her. */
export const reactions = {
  timerStartFocus: 'Okay, heads down. 25 minutes.',
  timerStartBreak: 'Break time. Stretch with me.',
  timerPaused: 'Paused. Take your time.',
  timerToBreak: 'Nice work! Five minute break.',
  timerToFocus: 'Back to it.',
  musicOn: '♪ lo-fi on',
  nowNight: "Late night. Lamp's on.",
  nowDay: 'Golden hour again.',
  wholeCafe: "That's the whole café. Stay as long as you like.",
}

// ---------------------------------------------------------------- projects (laptop)

export const projects: Card[] = [
  {
    title: 'RHA Storage Catalog',
    role: 'Full-stack web app',
    // TODO(kaiyi): the résumé says "Will be deployed Fall 2026". Update this once it's rolled out.
    status: 'Deploying Fall 2026',
    body: "A shared catalog where UB's 14 residence hall councils log items they own and find things they can borrow from each other, cutting redundant purchases and supporting RHA's sustainability efforts.",
    bullets: [
      'Create, edit and remove items, with photo upload',
      'Category filters and quick contact/copy actions',
      'Single-page front end on a Firebase Firestore backend',
    ],
    tags: ['JavaScript', 'Firebase Firestore', 'GitHub Pages'],
    links: [{ label: 'Open the catalog', href: links.rhaCatalog }],
  },
  {
    title: 'U.S. Labor Market Dashboard',
    role: 'Independent project',
    dates: 'Winter 2025',
    body: "Pulls labor-market series from the St. Louis Fed's FRED API and turns them into a state-level dashboard, visualizing COVID shock and recovery patterns for all 50 states and DC.",
    bullets: [
      'Cleaned unemployment and LFPR data',
      'Ran lead/lag analysis comparing S&P 500 returns to NY labor market changes',
    ],
    tags: ['Python', 'pandas', 'Plotly', 'Matplotlib', 'FRED API'],
    links: [{ label: 'Kaggle notebook', href: links.laborDashboard }],
  },
  {
    title: 'UB Gym Girls',
    role: 'Independent project',
    dates: 'June 2026 – Present',
    status: 'In progress',
    body: 'A two-page web app matching students into workout groups, with a matching form and a drag-select availability calendar, backed by a live Google Sheets database via Apps Script.',
    tags: ['Google Sheets', 'Apps Script'],
    links: [{ label: 'Live demo', href: links.gymGirls }],
  },
  {
    title: 'Socra',
    role: 'Team member',
    // TODO(kaiyi): add dates. Socra isn't on the résumé and v1 has none.
    body: "An AI tutor built around a professor's own course material, currently deployed at UB. I work on the product team and on outreach to professors.",
    tags: ['EdTech', 'AI'],
    links: [{ label: 'socra-edu.com', href: links.socra }],
  },
  {
    title: 'Hanna Commercial Real Estate Project',
    role: 'Member, UB Realty Network Club',
    // TODO(kaiyi): the résumé says Feb 2024, which is earlier than anything else at UB
    // (Dean's List starts Fall 2024). Confirm this isn't meant to be Feb 2025.
    dates: 'Feb 2024 – Current',
    bullets: [
      'Conducted commercial real estate investment analysis by evaluating property conditions, market trends, location factors, and financial metrics to assess investment potential',
      'Presented research findings and investment insights to Regional Directors of Hanna Real Estate',
    ],
    tags: ['Commercial real estate', 'Investment analysis'],
  },
]

/** "Résumé" window on the laptop. */
export const skills = {
  technical: ['Microsoft Excel', 'Python (pandas, Plotly, Matplotlib, FRED API)', 'Stata', 'Java', 'HubSpot', 'Hotjar'],
  researchAndAnalysis: ['Econometrics', 'OLS regression', 'IPUMS microdata', 'FRED data'],
}

// ---------------------------------------------------------------- research (bookshelf)

export const research: Card[] = [
  {
    title: 'AI & The Education Gap',
    highlights: [
      { value: '628K', label: 'CPS observations' },
      { value: '−10.3%', label: 'wage penalty, sub-BA workers' },
    ],
    role: 'Undergraduate Researcher, UB Department of Economics',
    dates: 'Fall 2024 – Spring 2025',
    body: 'How does AI exposure affect education wage premiums? I built a triple-interaction regression model on about 628K Current Population Survey observations in Stata, using the Felten Exposure Index.',
    bullets: [
      'Found sub-BA workers face amplified wage penalties (−10.3%, p<0.001)',
      "Presented at UB's Undergraduate Research Showcase, supervised by Prof. McLaughlin, Director of Undergraduate Studies",
    ],
    tags: ['Stata', 'CPS microdata', '~628K obs', 'Felten Exposure Index'],
    links: [{ label: 'See the poster', href: links.aiPoster }],
  },
  {
    title: 'College Fed Challenge',
    highlights: [{ value: '10+', label: 'macro series in the pipeline' }],
    role: 'Data Analyst, UB Fed Challenge Team',
    dates: 'Winter 2025 – Present',
    body: 'Monetary policy competition. I lead quantitative analysis for the policy transmission section, covering financial markets and household stress channels.',
    bullets: [
      'Built a Python/pandas FRED API pipeline to pull and visualize 10+ macro series, including Treasury yields, credit spreads, mortgage rates, and Fed balance sheet data',
      "Built yield curve spread analysis on monthly panels to assess policy restrictiveness; findings informed the team's rate recommendation",
    ],
    tags: ['Monetary policy', 'Python', 'pandas', 'FRED API'],
    links: [{ label: 'Kaggle notebook', href: links.fedChallenge }],
  },
  {
    title: 'Buffalo property assessments',
    role: 'Independent research',
    status: 'In progress',
    body: 'My first independent project, now focused on how property assessment practices relate to poverty and housing outcomes in Buffalo.',
    tags: ['Housing', 'Local public finance'],
  },
]

// ---------------------------------------------------------------- experience & leadership (corkboard flyers)

export const experience: Card[] = [
  {
    title: 'Vice President of Finance',
    highlights: [
      { value: '$57,000', label: 'annual budget' },
      { value: '14', label: 'residential hall councils' },
    ],
    role: 'UB Residence Hall Association, Buffalo, NY',
    dates: 'May 2025 – Present',
    bullets: [
      'Manage a $57,000 annual budget; present allocations to Senate for approval and deliver monthly financial reports',
      'Oversee annual budgets for all 14 residential hall councils across RHA and approve council funding requests',
      "Building a web-based inventory-tracking system so councils can log and borrow shared event supplies, reducing redundant purchasing and supporting RHA's sustainability efforts",
      'Ensure compliance with UB Foundation, FSA, and DIFR policies and enforce budget protocols',
    ],
    links: [{ label: 'Live website', href: links.rhaCatalog }],
  },
  {
    title: 'Data Analyst',
    role: 'UB Fed Challenge Team, Buffalo, NY',
    dates: 'Winter 2025 – Present',
    bullets: [
      'Lead quantitative analysis for the policy transmission section, covering financial markets and household stress channels',
      'Built a Python/pandas FRED API pipeline to pull and visualize 10+ macro series',
      "Built yield curve spread analysis on monthly panels; findings informed the team's rate recommendation",
    ],
    links: [{ label: 'Kaggle notebook', href: links.fedChallenge }],
  },
  {
    title: 'Legal Intern',
    role: 'International Institute of Buffalo, NY',
    dates: 'Fall 2025',
    bullets: [
      'Assisted the Lead Attorney on a naturalization case; conducted country conditions research and organized client evidence',
      'Developed a visual overview of Afghan refugee pathways for use in client advocacy materials',
    ],
  },
  {
    title: 'Discover Law Scholar',
    role: 'UB Discover Law Summer Program, Buffalo, NY',
    dates: 'May 2025 – June 2025',
    status: '1 of 20 nationwide',
    bullets: ['Selected as 1 of 20 scholars nationwide; completed coursework in Contracts, IP Law, Legal Writing, and LSAT prep'],
  },
  {
    title: 'Executive Board',
    role: 'Undergraduate Economics Club, UB',
    // TODO(kaiyi): add your e-board title and dates. Flyers are meant to show dates; v1 has none.
  },
  {
    title: 'Co-founder',
    role: 'COA',
    // TODO(kaiyi): add dates and what COA stands for. v1 has neither.
    body: "Early-stage startup where I'm part of the founding team.",
  },
]

// ---------------------------------------------------------------- work (espresso machine)

export const work: Card[] = [
  {
    title: 'Front Desk Associate & Barista',
    role: 'Part-time',
    // TODO(kaiyi): add the employer and dates. v1 has neither.
  },
  {
    title: 'Gatcha KTOWN',
    role: 'Collectible card shop',
    // TODO(kaiyi): add your title and dates, and say if this job is still current.
    body: 'Working the floor at a trading card shop, where pricing, inventory and community all overlap.',
  },
]

// ---------------------------------------------------------------- design & film (camera)

export const creative: Card[] = [
  {
    title: 'UB Gym Girls',
    role: 'Brand & web design',
    body: 'A fitness community brand. I designed the logo and the website.',
    links: [{ label: 'Live demo', href: links.gymGirls }],
  },
  {
    title: 'Filmmaking',
    role: 'Creative projects',
    body: 'Scene analysis, shooting and editing. I like figuring out why a shot works.',
  },
  {
    title: 'This café',
    role: 'Portfolio',
    body: 'A 3D café inspired by cozy focus apps, built with three.js. Every object opens part of my work.',
  },
]

// ---------------------------------------------------------------- art (framed art by the window)

export const art = {
  instagram: { label: '@kaiyeetdoodles on Instagram', href: links.instagram } satisfies Link,
  // TODO(kaiyi): replace these placeholders. Drop images into public/art and update src, title and alt.
  images: [
    { src: '/art/art-01.svg', alt: 'Placeholder for artwork 1', title: 'Placeholder 1' },
    { src: '/art/art-02.svg', alt: 'Placeholder for artwork 2', title: 'Placeholder 2' },
    { src: '/art/art-03.svg', alt: 'Placeholder for artwork 3', title: 'Placeholder 3' },
    { src: '/art/art-04.svg', alt: 'Placeholder for artwork 4', title: 'Placeholder 4' },
    { src: '/art/art-05.svg', alt: 'Placeholder for artwork 5', title: 'Placeholder 5' },
    { src: '/art/art-06.svg', alt: 'Placeholder for artwork 6', title: 'Placeholder 6' },
  ] satisfies GalleryImage[],
}

// ---------------------------------------------------------------- cats (cat)

export const cats = {
  // TODO(kaiyi): replace these placeholders. Drop photos into public/cats and update src, caption and alt.
  images: [
    { src: '/cats/cat-01.svg', alt: 'Placeholder for cat photo 1', caption: 'Placeholder 1' },
    { src: '/cats/cat-02.svg', alt: 'Placeholder for cat photo 2', caption: 'Placeholder 2' },
    { src: '/cats/cat-03.svg', alt: 'Placeholder for cat photo 3', caption: 'Placeholder 3' },
    { src: '/cats/cat-04.svg', alt: 'Placeholder for cat photo 4', caption: 'Placeholder 4' },
    { src: '/cats/cat-05.svg', alt: 'Placeholder for cat photo 5', caption: 'Placeholder 5' },
    { src: '/cats/cat-06.svg', alt: 'Placeholder for cat photo 6', caption: 'Placeholder 6' },
  ] satisfies GalleryImage[],
}

// ---------------------------------------------------------------- things I'm into (hotpot + terrarium)

export const interests = [
  'Financial economics',
  'Personal finance',
  'AI',
  'Art & design',
  'Filmmaking',
  'Reading',
  'Snakes 🐍',
]

// ---------------------------------------------------------------- say hi (telephone)

export const contact = {
  email,
  location: site.location,
  links: [
    { label: 'LinkedIn', href: links.linkedin },
    { label: 'GitHub', href: links.github },
    { label: 'Instagram', href: links.instagram },
  ] satisfies Link[],
}
