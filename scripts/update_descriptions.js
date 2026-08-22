const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(process.cwd(), '.env.local');
let envUrl = '';
let envKey = '';

if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, 'utf8');
  envUrl = envFile.match(/NEXT_PUBLIC_SUPABASE_URL="?(.*?)"?(?:\n|$)/)?.[1] || '';
  envKey = envFile.match(/SUPABASE_SERVICE_ROLE_KEY="?(.*?)"?(?:\n|$)/)?.[1] || '';
}

const supabase = createClient(envUrl, envKey);

const clubDescriptions = {
  'Artist league': 'Discover your talent, express yourself, and create unforgettable moments with Artist League.',
  'Fusion': 'The ultimate hub for contemporary and classical dance enthusiasts.',
  'Techspark': 'Empowering tech enthusiasts to build, innovate, and deploy cutting-edge software solutions that shape the future.',
  'Innovation': 'Think out of the box and bring your startup ideas to life.',
  'Mediastic Hub': 'A creative media community that inspires students to discover, create, express, and connect through visual storytelling.',
  'Rotaract': 'Build leadership, serve communities, have fun, and connect through meaningful networking opportunities.',
  'Podcast (PODX)': 'Create, explore, and share ideas through podcasts, media, storytelling, and creative communication.',
  'NSS (National Service Scheme)': 'Serve society, develop leadership, and create positive change through meaningful community activities.',
  'Vaarithi Muthamizh Mandram': 'Inspiring students to embrace Tamil, preserve our rich heritage, celebrate traditional arts and culture, and carry our values forward for future generations.',
  'Infinitus': 'Explore mathematics through engaging events, competitions, workshops, innovation, logic, and creative problem-solving.',
  'YRC (Youth Red Cross)': 'Promote youth service, health awareness, social responsibility, and community welfare through student-led initiatives.',
  'Women Empowerment Cell (WEC)': 'WEC Club empowers students through awareness, confidence, leadership, equality, and meaningful social engagement.',
  'STEAM': 'Explore, innovate, and create through science, technology, engineering, arts, and mathematics.',
  'Telugu': 'Where Telugu blooms in diverse voices, weaving poetry, culture, heritage, and hearts into one beautiful tapestry. భిన్నత్వంలో ఏకత్వం (Binnathvam lo Ekathvam)-Unity in Diversity',
  'Nippon': 'Experiencing Japanese language, culture, creativity, and friendship through engaging campus events.',
  'Yuva': 'Empowering youth through leadership, social initiatives, creativity, and meaningful community engagement.',
  'Helios': 'Photography, Videography, and Video Editing of club events.',
  'WiSTEM': 'Empower, connect, and elevate women in STEM through mentorship, technical workshops, and community building.',
  'UBA (Unnat Bharat Abhiyan)': 'Empowering rural communities through social service, awareness, education, and sustainable development initiatives.'
};

const centreDescriptions = {
  'Center for Data Science': 'The Center for Data Science focuses on extracting actionable insights from complex datasets using advanced statistical methods and machine learning algorithms.',
  'Centre for Smart Manufacturing': 'The Centre for Smart Manufacturing integrates Industry 4.0 technologies, such as robotics and digital twins, to optimize production processes and enhance operational efficiency.',
  'Centre for AI (Artificial Intelligence)': 'The Centre for AI is dedicated to advancing research in neural networks, natural language processing, and cognitive computing to create intelligent systems that mimic human decision-making.',
  'Centre for IoT (Internet of Things)': 'The Centre for IoT connects the physical and digital worlds by developing interconnected sensor networks and smart devices that communicate seamlessly.',
  'Center for Apple': 'The Center for Apple serves as an innovation hub for mastering the iOS ecosystem, Swift programming, and macOS application development.',
  'Centre for ARVR (Augmented Reality / Virtual Reality)': 'The Centre for AR/VR explores the frontiers of augmented and virtual reality to create immersive digital experiences for gaming, education, and professional training.',
  'Centre for Cybersecurity': 'The Centre for Cybersecurity is focused on defending digital infrastructure against evolving cyber threats through cutting-edge research in cryptography, network defense, and ethical hacking.',
  'Centre for RADAR (Healthcare with AI)': 'The Centre for RADAR leverages artificial intelligence to revolutionize medical diagnostics, patient care, and the analysis of complex health records for improved clinical outcomes.',
  'Centre for Semiconductor Design': 'The Centre for Semiconductor Design focuses on the architecture, fabrication, and testing of advanced microchips and integrated circuits powering modern electronics.',
  'Centre for ZF (Advanced Analytics related to transportation & logistics)': 'The Centre for ZF applies advanced analytics and predictive modeling to optimize complex transportation networks and global supply chain logistics.',
  'Centre For Image Processing': 'The Centre for Image Processing specializes in developing advanced algorithms and computational techniques to analyze, enhance, and interpret complex visual data.',
  'Center for EV & Energy': 'The Center for EV & Energy drives sustainable innovation by researching advanced battery technologies, electric powertrains, and renewable energy integration.',
  'Center for Cloud': 'The Center for Cloud Computing provides comprehensive research and training in distributed computing, virtualization, and scalable cloud architectures.',
  'Center for Space': 'The Center for Space focuses on aerospace engineering, satellite communication, and space exploration technologies to push the boundaries of human discovery.',
  'Grover Center (Quantum Computing)': 'The Grover Center (Quantum Computing) advances education and research in quantum algorithms, quantum hardware, and quantum software for solving complex computational problems.'
};

async function run() {
  console.log('Updating Club Descriptions...');
  for (const [name, description] of Object.entries(clubDescriptions)) {
    const { error } = await supabase.from('clubs').update({ description }).eq('name', name);
    if (error) console.error(`Error updating ${name}:`, error.message);
  }

  console.log('\nUpdating Centre Descriptions...');
  for (const [name, description] of Object.entries(centreDescriptions)) {
    const { error } = await supabase.from('centres').update({ description }).eq('name', name);
    if (error) console.error(`Error updating ${name}:`, error.message);
  }
  
  console.log('\nDone updating! Now checking status...');
  
  const { data: allClubs } = await supabase.from('clubs').select('name, description').order('name');
  const { data: allCentres } = await supabase.from('centres').select('name, description').order('name');

  const pendingClubs = allClubs.filter(c => !c.description).map(c => c.name);
  const providedClubs = allClubs.filter(c => c.description).map(c => c.name);

  const pendingCentres = allCentres.filter(c => !c.description).map(c => c.name);
  const providedCentres = allCentres.filter(c => c.description).map(c => c.name);
  
  fs.writeFileSync('status.json', JSON.stringify({
      pendingClubs, providedClubs, pendingCentres, providedCentres
  }, null, 2));
  
  console.log('Status written to status.json');
}

run();
