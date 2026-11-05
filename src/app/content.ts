/**
 * content.ts — the single source of truth for every word and number on the site.
 *
 * Rule: nothing here may be invented. Each claim is traceable to a repository under
 * github.com/gmkhizar19, to a Coursera accomplishment page, or to a measured result
 * recorded by the `researchers-network` analysis scripts. When a fact is not yet
 * verified it is omitted, not estimated.
 */

export interface LinkRef {
  readonly label: string;
  readonly href: string;
}

export interface Metric {
  readonly value: string;
  readonly label: string;
}

export interface Project {
  readonly id: string;
  readonly index: string;
  readonly title: string;
  readonly kicker: string;
  readonly summary: string;
  readonly detail: string;
  readonly metrics: readonly Metric[];
  readonly stack: readonly string[];
  readonly links: readonly LinkRef[];
  readonly featured: boolean;
}

export interface SkillCluster {
  readonly title: string;
  readonly blurb: string;
  readonly skills: readonly string[];
  readonly evidence: string;
}

export const identity = {
  name: 'Ghulam Muhammad Khizar',
  shortName: 'Khizar',
  role: 'Computer Science undergraduate · DevOps & cloud',
  location: 'Lahore, Pakistan',
  positioning: 'I build systems, then build the pipeline that keeps them running.',
  intro:
    'Linux, containers and automated delivery — learned by shipping something real and then having to operate it. I come from data engineering, which is a useful place to learn reliability: a pipeline fails loudly, at 2 a.m., and you find out whether you actually understand it.',
  availability: 'Open to DevOps and cloud engineering internships.',
  github: 'https://github.com/gmkhizar19',
  email: 'ghulammuhammadkhizar@gmail.com',
  /** Set when a verified profile URL is available; the UI hides the link otherwise. */
  linkedin: null as string | null,
  university: 'University of Engineering and Technology, Lahore',
  graduation: 'Class of 2028',
} as const;

/**
 * Three headline numbers, all measured or verifiable: the pipeline scale from the
 * analysis output, and the two credential counts from Coursera's accomplishments page.
 */
export const heroStats: readonly Metric[] = [
  { value: '42,774', label: 'network records' },
  { value: '3', label: 'specialisations' },
  { value: '20', label: 'courses' },
];

/**
 * Results of the fragility study, kept in one audited place so no number is retyped in
 * JSX and drifts from the analysis output.
 */
export const fragility = {
  coreNodes: 14_574,
  lccBefore: 92.6,
  lccAfterTargeted: 76.3,
  lccAfterRandom: 82.4,
  articulationPoints: 670,
  bridges: 660,
} as const;

export const about = {
  paragraphs: [
    'I am a Computer Science student at UET Lahore, and I want to spend my career on the part of software that has to stay up: the containers, the pipelines, the infrastructure underneath. Most of what I know I learned by taking a question seriously until it turned into a system — and then being responsible for running it.',
    'That is how I ended up with the project below. Crawling 26,627 OpenAlex records, cleaning them to 26,188 papers, loading 42,774 authors into a containerised Neo4j instance and running graph algorithms over them is, on paper, a data project. In practice it was an exercise in the things I actually want to do: reproducible builds, a database that has to start clean on someone else’s machine, a seeded pipeline that produces the same answer twice, and an API that has to stay up while the interface above it changes.',
    'I have since formalised that instinct: the KodeKloud DevOps Pro specialisation took me through Linux, Docker, Kubernetes, CI/CD and infrastructure as code hands-on, and the Google Cybersecurity certificate taught me to look at the same systems as an attacker would. This page — built on AWS Amplify, with a serverless leaderboard behind it — is the smallest honest demonstration I could make of the whole chain.',
  ],
  principles: [
    {
      title: 'Reproducible or it did not happen',
      body: 'Every pipeline of mine starts from checked-in data and a fixed seed, and ends with a command someone else can run. A result I cannot reproduce is a rumour.',
    },
    {
      title: 'Own the seams',
      body: 'Crawler, cleaning, database load, analysis, API, interface, deployment. I would rather understand the boundaries between layers than hand one off and hope it holds.',
    },
    {
      title: 'Make failure loud and legible',
      body: 'Health checks, explicit fallbacks and honest error states. A page that degrades to “the leaderboard is offline” is better engineering than one that silently shows nothing.',
    },
  ],
} as const;

export const skillClusters: readonly SkillCluster[] = [
  {
    title: 'Cloud & delivery',
    blurb: 'The part I want to be hired for.',
    skills: [
      'AWS (Amplify, API Gateway, Lambda, DynamoDB)',
      'Docker',
      'Kubernetes',
      'CI/CD',
      'Infrastructure as Code',
      'Linux',
      'Git',
    ],
    evidence:
      'KodeKloud DevOps Pro (Oct 2026): Linux environments with SSH, Bash and Ansible, CI/CD pipelines with Git and Jenkins, Docker and Kubernetes orchestration, AWS provisioning with Terraform and CloudWatch. Applied here: this site on Amplify, KHAKI on Vercel.',
  },
  {
    title: 'Automation & scripting',
    blurb: 'The glue that stops the manual step from coming back.',
    skills: ['Python', 'Bash', 'PowerShell', 'TypeScript', 'SQL', 'pytest', 'Node.js'],
    evidence:
      'Crawlers, cleaners and exporters that rerun idempotently, plus a pytest suite covering the cleaning and API layers of the research project.',
  },
  {
    title: 'Data & graph engineering',
    blurb: 'Where the reliability lesson actually came from.',
    skills: ['Neo4j 5', 'Cypher', 'Graph Data Science', 'NetworkX', 'pandas', 'NumPy', 'SciPy'],
    evidence:
      'A 42,774-node graph loaded and verified in Neo4j running in Docker; GDS for PageRank, betweenness, Louvain, k-core and node similarity.',
  },
  {
    title: 'Services & interfaces',
    blurb: 'Enough product to know what the infrastructure is for.',
    skills: ['FastAPI', 'React 19', 'Vite', 'Canvas 2D', 'REST', 'CORS'],
    evidence:
      'A FastAPI service over the graph, a Cytoscape explorer, and this page: 380 nodes rendered on a canvas at 60 fps with no charting library.',
  },
  {
    title: 'Security',
    blurb: 'Threat modelling, not just feature flags.',
    skills: ['Linux hardening', 'Network security', 'Threat modelling', 'Detection & response'],
    evidence:
      'Google Cybersecurity Professional Certificate (August 2026) plus nine course certificates on Linux, SQL, network defence and Python automation.',
  },
  {
    title: 'Foundations',
    blurb: 'Coursework, and the early builds that taught me to finish things.',
    skills: ['C#', 'C++', 'OOP', 'Data structures', 'Algorithms', 'SQL / SQLite'],
    evidence:
      'From-scratch PageRank over a SQLite-backed crawler, plus desktop tools in Python and C# coursework.',
  },
];

export const projects: readonly Project[] = [
  {
    id: 'researchers-network',
    index: '01',
    title: "Pakistan's Researchers Network",
    kicker: 'Data platform · Neo4j in Docker, FastAPI, React',
    summary:
      'A co-authorship graph of Pakistani computer-science research, built from OpenAlex, analysed with graph data science, and served through an API and explorer.',
    detail:
      'Crawled 26,627 works and cleaned them to 26,188 papers with a documented before/after report. Modelled authors, papers, institutions and topics in a containerised Neo4j instance with the GDS plugin, then answered three questions: which researchers hold the network together, where the collaboration silos are, and how to assign reviewers under a workload cap and conflict-of-interest rule. Every stage reruns from the checked-in dataset with a fixed seed.',
    metrics: [
      { value: '42,774', label: 'authors' },
      { value: '170,700', label: 'edges' },
      { value: '670', label: 'articulation points' },
      { value: '92.6%', label: 'core LCC' },
    ],
    stack: ['Python', 'Neo4j + GDS', 'Docker', 'FastAPI', 'React', 'Cytoscape.js'],
    links: [{ label: 'Repository', href: 'https://github.com/gmkhizar19/researchers-network' }],
    featured: true,
  },
  {
    id: 'khaki',
    index: '02',
    title: 'KHAKI — capstone storefront',
    kicker: 'Full-stack e-commerce · Next.js 14, Prisma, Stripe',
    summary:
      'A production-grade e-commerce build: storefront, cart, checkout, auth, admin dashboard and order pipeline — deployed and live.',
    detail:
      'Twenty routes and seventeen API endpoints over sixteen Prisma models, with NextAuth credentials and OAuth, Stripe checkout plus webhook reconciliation, and a Zustand cart shared between the drawer and checkout. Postgres and Redis run as containers in Docker Compose for local development, while the deployed build runs on Vercel with a managed database. The engineering work that mattered was the boring part: environment separation, schema migrations, webhook verification and a checkout flow that fails visibly instead of silently.',
    metrics: [
      { value: '20', label: 'routes' },
      { value: '17', label: 'API endpoints' },
      { value: '16', label: 'Prisma models' },
    ],
    stack: ['Next.js 14', 'TypeScript', 'Prisma', 'PostgreSQL', 'Docker Compose', 'Stripe', 'Vercel'],
    links: [
      { label: 'Live site', href: 'https://khaki-amber.vercel.app' },
    ],
    featured: true,
  },
  {
    id: 'this-site',
    index: '03',
    title: 'This page, and the stack behind it',
    kicker: 'AWS · Amplify Hosting, API Gateway, Lambda, DynamoDB',
    summary:
      'A static React 19 build on Amplify, with one optional serverless service: a validated, rate-limited leaderboard for the network game above.',
    detail:
      'The bundle is a Vite build deployed through Amplify Hosting from GitHub, so every push to main rebuilds and publishes atomically. The game itself runs entirely in the browser against a 92 KB JSON asset. The leaderboard is an API Gateway HTTP API in front of a single Node.js Lambda handler that validates scores, hashes caller addresses with a salt and throttles to five submissions per hour, backed by a DynamoDB table whose sort key encodes the score. If the backend is unreachable the page says so and keeps playing locally — the failure mode is designed, not accidental.',
    metrics: [
      { value: '4', label: 'AWS services' },
      { value: '~93 KB', label: 'data asset, gzipped 15 KB' },
      { value: '0', label: 'third-party requests' },
    ],
    stack: ['AWS Amplify', 'API Gateway', 'Lambda', 'DynamoDB', 'React', 'TypeScript', 'Vite'],
    links: [],
    featured: true,
  },
  {
    id: 'pagerank',
    index: '04',
    title: 'PageRank, from scratch',
    kicker: 'Information retrieval · Python, SQLite, D3',
    summary:
      'A search spider that crawls a site into SQLite, iterates PageRank over the resulting link graph, and renders the ranked network in the browser.',
    detail:
      'Built to understand ranking as a graph problem rather than an API call: pages and links are stored relationally, ranks are iterated to convergence, and the result is exported to a D3 force-directed view so the importance scores can be seen as well as printed.',
    metrics: [
      { value: '3', label: 'stages: crawl, rank, render' },
      { value: 'SQLite', label: 'relational store' },
    ],
    stack: ['Python', 'SQLite', 'BeautifulSoup', 'D3'],
    links: [{ label: 'Repository', href: 'https://github.com/gmkhizar19/Python/tree/main/page%20rank' }],
    featured: false,
  },
  {
    id: 'dice-gui',
    index: '05',
    title: 'Dice roller',
    kicker: 'Desktop · Python, Tkinter, Pillow',
    summary:
      'A two-dice desktop roller with image faces, built to practise event-driven interfaces and asset handling in Tkinter.',
    detail:
      'Small on purpose: a clean demonstration of widget layout, image loading with Pillow, and callback wiring — the part of GUI programming that tutorials skip.',
    metrics: [{ value: 'Tkinter', label: 'event-driven UI' }],
    stack: ['Python', 'Tkinter', 'Pillow'],
    links: [{ label: 'Repository', href: 'https://github.com/gmkhizar19/dice-gui' }],
    featured: false,
  },
];

/** Early coursework kept visible because the trajectory is part of the story. */
export const earlyWork: readonly LinkRef[] = [
  { label: 'Rent calculator', href: 'https://github.com/gmkhizar19/Rent-Calculator' },
  { label: 'Rock paper scissors', href: 'https://github.com/gmkhizar19/Rock-Paper-Scissor' },
  {
    label: 'Python practice set',
    href: 'https://github.com/gmkhizar19/Python',
  },
];

export interface Credential {
  readonly title: string;
  readonly issuer: string;
  readonly date: string;
  /** Coursera verification URL. Null until supplied — the UI then renders plain text. */
  readonly href: string | null;
  /** Public certificate image, captured from the verification page itself. */
  readonly image: string;
  /** What the certificate actually certifies, in its own words. */
  readonly scope: string;
}

/**
 * Verified against the Coursera accomplishments page on 4 November 2026: 3
 * specialisations and 20 course certificates. Each URL below was opened and read to
 * confirm it resolves to that exact certificate — a badge that links somewhere else is
 * worse than no link at all. The images are the public certificate renders from those
 * same pages, downscaled to 880px so three of them cost ~130 KB together.
 */
export const specializations: readonly Credential[] = [
  {
    title: 'DevOps Pro: Linux, Docker, Kubernetes, CI/CD & IaC',
    issuer: 'KodeKloud',
    date: '23 October 2026',
    href: 'https://www.coursera.org/account/accomplishments/specialization/0CVM6OR4HUP1',
    image: '/certificates/devops-pro.jpg',
    scope:
      'Linux environments with SSH, Linux, Bash and Ansible; building CI/CD pipelines with Git and Jenkins, Pipelines-as-Code; packaging and orchestrating applications with Docker, Docker Compose and Kubernetes; provisioning AWS infrastructure with Terraform and CloudWatch.',
  },
  {
    title: 'Google Cybersecurity Professional Certificate',
    issuer: 'Google',
    date: 'August 2026',
    href: 'https://www.coursera.org/account/accomplishments/specialization/5FPHKCR2B70P',
    image: '/certificates/google-cybersecurity.jpg',
    scope:
      'Nine courses covering foundations, security risk management, network security, Linux and SQL tooling, threats and vulnerabilities, detection and response, and Python automation for security tasks.',
  },
  {
    title: 'Python for Everybody Specialization',
    issuer: 'University of Michigan',
    date: 'July 2026',
    href: 'https://www.coursera.org/account/accomplishments/specialization/MUMTZJVIC9J8',
    image: '/certificates/python-for-everybody.jpg',
    scope:
      'Programming fundamentals, data structures, web data retrieval, databases, and a capstone that retrieves, processes and visualises data with Python.',
  },
];

export interface CourseGroup {
  readonly issuer: string;
  readonly date: string;
  readonly courses: readonly string[];
}

export const courseGroups: readonly CourseGroup[] = [
  {
    issuer: 'KodeKloud',
    date: 'September – October 2026',
    courses: [
      'Infrastructure Automation (IaC)',
      'Kubernetes Orchestration',
      'Mastering Docker & Containers',
      'Source Control & CI/CD',
      'DevOps Foundation (Linux & Systems)',
    ],
  },
  {
    issuer: 'Google',
    date: 'August 2026',
    courses: [
      'Foundations of Cybersecurity',
      'Play It Safe: Manage Security Risks',
      'Connect and Protect: Networks and Network Security',
      'Tools of the Trade: Linux and SQL',
      'Assets, Threats, and Vulnerabilities',
      'Sound the Alarm: Detection and Response',
      'Automate Cybersecurity Tasks with Python',
      'Put It to Work: Prepare for Cybersecurity Jobs',
      'Accelerate Your Job Search with AI',
    ],
  },
  {
    issuer: 'University of Michigan',
    date: 'June – July 2026',
    courses: [
      'Programming for Everybody (Getting Started with Python)',
      'Python Data Structures',
      'Using Python to Access Web Data',
      'Using Databases with Python',
      'Capstone: Retrieving, Processing, and Visualizing Data with Python',
    ],
  },
  {
    issuer: 'DeepLearning.AI',
    date: 'June 2026',
    courses: ['Generative AI for Everyone'],
  },
];

export const buildNotes = {
  headline: 'How this page is built',
  summary:
    'A static React bundle on AWS Amplify Hosting, with one optional serverless service behind it. The interactive network is a real dataset rendered on a canvas — no API call stands between a visitor and the feature.',
  /** Plain statement of what is running in this deployment versus what ships ready to provision. */
  status:
    'Amplify Hosting is live and serving this page. The leaderboard backend is written, tested and packaged as infrastructure-as-code in infra/: provisioning it is one command, and until then the page says so instead of pretending.',
  services: [
    {
      name: 'AWS Amplify Hosting',
      role: 'Build, CDN, HTTPS, atomic deploys',
      status: 'live',
      detail:
        'Connected to the GitHub repository. Every push to main rebuilds and publishes; the previous deployment stays live until the new one passes.',
    },
    {
      name: 'Amazon API Gateway',
      role: 'HTTP API for the leaderboard',
      status: 'ready',
      detail:
        'Two routes, CORS locked to the site origin, throttling enabled at the stage level.',
    },
    {
      name: 'AWS Lambda',
      role: 'Validation, ranking, rate limiting',
      status: 'ready',
      detail:
        'One Node.js handler. Rejects malformed runs, hashes the caller IP with a salt, and enforces five submissions per hour.',
    },
    {
      name: 'Amazon DynamoDB',
      role: 'Leaderboard and throttle counters',
      status: 'ready',
      detail:
        'Single table, on-demand capacity. The sort key encodes the score, so the top ten is one query with no index to maintain.',
    },
  ],
  decisions: [
    {
      title: 'Static first',
      body: 'The game runs entirely in the browser over a 92 KB JSON asset. If Lambda, API Gateway or DynamoDB were down, the portfolio would still work — only the global leaderboard would fall back to a local best.',
    },
    {
      title: 'No accounts, no tracking',
      body: 'There is no sign-in, no analytics script and no third-party request. Fonts are self-hosted, so loading this page contacts exactly one origin.',
    },
    {
      title: 'Zero cost by design',
      body: 'Every service sits inside an always-free or twelve-month allowance: no provisioned capacity, no NAT gateway, no model inference, no custom domain.',
    },
  ],
} as const;

export const navItems = [
  { href: '#about', label: 'About' },
  { href: '#skills', label: 'Skills' },
  { href: '#work', label: 'Work' },
  { href: '#certifications', label: 'Certifications' },
  { href: '#lab', label: 'The Lab' },
  { href: '#build', label: 'Build' },
] as const;
