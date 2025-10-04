// Predefined skills data for dropdown menus
export interface SkillCategory {
  id: string;
  name: string;
  skills: string[];
}

export const SKILL_CATEGORIES: SkillCategory[] = [
  {
    id: 'programming-languages',
    name: 'Programming Languages',
    skills: [
      'JavaScript', 'TypeScript', 'Python', 'Java', 'C#', 'C++', 'Go', 'Rust',
      'Swift', 'Kotlin', 'PHP', 'Ruby', 'Scala', 'R', 'MATLAB', 'Dart',
      'C', 'Objective-C', 'Perl', 'Haskell', 'Clojure', 'Elixir', 'F#'
    ]
  },
  {
    id: 'web-development',
    name: 'Web Development',
    skills: [
      'HTML', 'CSS', 'React', 'Vue.js', 'Angular', 'Svelte', 'Next.js',
      'Nuxt.js', 'Gatsby', 'Node.js', 'Express.js', 'Django', 'Flask',
      'FastAPI', 'Spring Boot', 'Laravel', 'Rails', 'ASP.NET', 'jQuery',
      'Bootstrap', 'Tailwind CSS', 'Sass', 'Less', 'Webpack', 'Vite',
      'Parcel', 'Rollup', 'Babel', 'ESLint', 'Prettier'
    ]
  },
  {
    id: 'mobile-development',
    name: 'Mobile Development',
    skills: [
      'React Native', 'Flutter', 'Ionic', 'Xamarin', 'Cordova', 'PhoneGap',
      'Native iOS', 'Native Android', 'SwiftUI', 'Jetpack Compose',
      'Kotlin Multiplatform', 'Unity', 'Unreal Engine'
    ]
  },
  {
    id: 'databases',
    name: 'Databases',
    skills: [
      'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Elasticsearch', 'Cassandra',
      'DynamoDB', 'SQLite', 'Oracle', 'SQL Server', 'MariaDB', 'CouchDB',
      'Neo4j', 'InfluxDB', 'TimescaleDB', 'ClickHouse', 'BigQuery',
      'Snowflake', 'Redshift', 'Firebase', 'Supabase'
    ]
  },
  {
    id: 'cloud-platforms',
    name: 'Cloud Platforms',
    skills: [
      'AWS', 'Azure', 'Google Cloud', 'DigitalOcean', 'Heroku', 'Vercel',
      'Netlify', 'Railway', 'Render', 'Fly.io', 'Linode', 'Vultr',
      'Cloudflare', 'Fastly', 'Akamai', 'AWS Lambda', 'Azure Functions',
      'Google Cloud Functions', 'Vercel Functions', 'Netlify Functions'
    ]
  },
  {
    id: 'devops-tools',
    name: 'DevOps & Tools',
    skills: [
      'Docker', 'Kubernetes', 'Jenkins', 'GitLab CI', 'GitHub Actions',
      'CircleCI', 'Travis CI', 'Azure DevOps', 'Terraform', 'Ansible',
      'Chef', 'Puppet', 'Prometheus', 'Grafana', 'ELK Stack', 'Splunk',
      'New Relic', 'Datadog', 'Sentry', 'LogRocket', 'Git', 'SVN',
      'Mercurial', 'Bitbucket', 'GitHub', 'GitLab'
    ]
  },
  {
    id: 'data-science',
    name: 'Data Science & Analytics',
    skills: [
      'Python', 'R', 'SQL', 'Pandas', 'NumPy', 'Scikit-learn', 'TensorFlow',
      'PyTorch', 'Keras', 'Jupyter', 'Apache Spark', 'Hadoop', 'Hive',
      'Pig', 'Airflow', 'Dagster', 'Prefect', 'MLflow', 'Kubeflow',
      'Tableau', 'Power BI', 'Looker', 'Metabase', 'Grafana', 'Plotly',
      'Matplotlib', 'Seaborn', 'D3.js', 'Observable', 'Streamlit', 'Dash'
    ]
  },
  {
    id: 'ai-ml',
    name: 'AI & Machine Learning',
    skills: [
      'Machine Learning', 'Deep Learning', 'Natural Language Processing',
      'Computer Vision', 'Reinforcement Learning', 'TensorFlow', 'PyTorch',
      'Keras', 'Scikit-learn', 'XGBoost', 'LightGBM', 'CatBoost',
      'Hugging Face', 'OpenAI API', 'Anthropic Claude', 'LangChain',
      'LlamaIndex', 'Pinecone', 'Weaviate', 'Chroma', 'Vector Databases',
      'MLOps', 'Model Serving', 'TensorFlow Serving', 'TorchServe',
      'Seldon', 'KServe', 'BentoML', 'Cortex', 'SageMaker', 'Vertex AI'
    ]
  },
  {
    id: 'cybersecurity',
    name: 'Cybersecurity',
    skills: [
      'Penetration Testing', 'Vulnerability Assessment', 'Security Auditing',
      'OWASP', 'NIST Framework', 'ISO 27001', 'SOC 2', 'GDPR', 'HIPAA',
      'Burp Suite', 'Nmap', 'Wireshark', 'Metasploit', 'Nessus', 'OpenVAS',
      'Kali Linux', 'Parrot OS', 'Security Information and Event Management',
      'SIEM', 'Splunk', 'QRadar', 'ArcSight', 'LogRhythm', 'RSA NetWitness',
      'Firewall Management', 'VPN', 'Zero Trust', 'Identity and Access Management',
      'IAM', 'Active Directory', 'LDAP', 'OAuth', 'SAML', 'JWT'
    ]
  },
  {
    id: 'blockchain',
    name: 'Blockchain & Web3',
    skills: [
      'Solidity', 'Web3.js', 'Ethers.js', 'Hardhat', 'Truffle', 'Ganache',
      'Remix', 'OpenZeppelin', 'IPFS', 'Arweave', 'Polygon', 'Ethereum',
      'Bitcoin', 'Cardano', 'Solana', 'Avalanche', 'Polkadot', 'Cosmos',
      'Chainlink', 'The Graph', 'Alchemy', 'Infura', 'Moralis', 'QuickNode',
      'MetaMask', 'WalletConnect', 'Web3Auth', 'DeFi', 'NFTs', 'DAOs',
      'Smart Contracts', 'DApps', 'Layer 2', 'Optimism', 'Arbitrum'
    ]
  },
  {
    id: 'game-development',
    name: 'Game Development',
    skills: [
      'Unity', 'Unreal Engine', 'Godot', 'Construct 3', 'GameMaker Studio',
      'Cocos2d', 'Phaser', 'Three.js', 'Babylon.js', 'PlayCanvas',
      'Blender', 'Maya', '3ds Max', 'ZBrush', 'Substance Painter',
      'Photoshop', 'GIMP', 'Krita', 'Aseprite', 'Piskel', 'LÖVE',
      'Defold', 'Corona SDK', 'Xamarin', 'MonoGame', 'SDL', 'SFML'
    ]
  },
  {
    id: 'design',
    name: 'Design & UX/UI',
    skills: [
      'Figma', 'Sketch', 'Adobe XD', 'InVision', 'Principle', 'Framer',
      'Webflow', 'Framer Motion', 'Lottie', 'After Effects', 'Premiere Pro',
      'Photoshop', 'Illustrator', 'InDesign', 'Canva', 'Figma', 'Zeplin',
      'Abstract', 'Avocode', 'Marvel', 'Balsamiq', 'Whimsical', 'Miro',
      'User Research', 'Usability Testing', 'A/B Testing', 'Wireframing',
      'Prototyping', 'Design Systems', 'Accessibility', 'WCAG', 'ARIA'
    ]
  },
  {
    id: 'testing',
    name: 'Testing & QA',
    skills: [
      'Unit Testing', 'Integration Testing', 'End-to-End Testing', 'Jest',
      'Mocha', 'Chai', 'Cypress', 'Playwright', 'Selenium', 'Puppeteer',
      'TestCafe', 'WebdriverIO', 'Karma', 'Jasmine', 'Vitest', 'Testing Library',
      'Cucumber', 'Gherkin', 'BDD', 'TDD', 'Selenium Grid', 'BrowserStack',
      'Sauce Labs', 'CrossBrowserTesting', 'LambdaTest', 'Percy', 'Chromatic',
      'Storybook', 'Lighthouse', 'WebPageTest', 'GTmetrix', 'PageSpeed Insights'
    ]
  },
  {
    id: 'project-management',
    name: 'Project Management',
    skills: [
      'Agile', 'Scrum', 'Kanban', 'Waterfall', 'Jira', 'Confluence', 'Trello',
      'Asana', 'Monday.com', 'Notion', 'Linear', 'ClickUp', 'Airtable',
      'Smartsheet', 'Microsoft Project', 'Basecamp', 'Slack', 'Discord',
      'Microsoft Teams', 'Zoom', 'Google Meet', 'Miro', 'Figma', 'Lucidchart',
      'Draw.io', 'Whimsical', 'Figma', 'InVision', 'Zeplin', 'Abstract'
    ]
  },
  {
    id: 'business-skills',
    name: 'Business & Soft Skills',
    skills: [
      'Leadership', 'Team Management', 'Communication', 'Public Speaking',
      'Presentation Skills', 'Negotiation', 'Conflict Resolution', 'Time Management',
      'Strategic Thinking', 'Problem Solving', 'Critical Thinking', 'Creativity',
      'Adaptability', 'Emotional Intelligence', 'Networking', 'Mentoring',
      'Coaching', 'Training', 'Documentation', 'Technical Writing', 'Research',
      'Data Analysis', 'Business Analysis', 'Product Management', 'Marketing',
      'Sales', 'Customer Success', 'Support', 'Consulting', 'Freelancing'
    ]
  }
];

// Flatten all skills for easy searching
export const ALL_SKILLS = SKILL_CATEGORIES.flatMap(category => category.skills);

// Get skills by category
export const getSkillsByCategory = (categoryId: string): string[] => {
  const category = SKILL_CATEGORIES.find(cat => cat.id === categoryId);
  return category ? category.skills : [];
};

// Search skills
export const searchSkills = (query: string, limit: number = 20): string[] => {
  const lowercaseQuery = query.toLowerCase();
  return ALL_SKILLS
    .filter(skill => skill.toLowerCase().includes(lowercaseQuery))
    .slice(0, limit);
};

// Get popular skills (most commonly used)
export const POPULAR_SKILLS = [
  'JavaScript', 'Python', 'React', 'Node.js', 'TypeScript', 'AWS',
  'Docker', 'Kubernetes', 'PostgreSQL', 'MongoDB', 'Git', 'Linux',
  'SQL', 'HTML', 'CSS', 'Java', 'C++', 'C#', 'Go', 'Rust',
  'Vue.js', 'Angular', 'Next.js', 'Express.js', 'Django', 'Flask',
  'Redis', 'Elasticsearch', 'Terraform', 'Jenkins', 'GitHub Actions',
  'Machine Learning', 'Data Science', 'DevOps', 'Cybersecurity'
];

