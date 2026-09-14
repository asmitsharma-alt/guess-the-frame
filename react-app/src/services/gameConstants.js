export const AVATAR_MAP = {
  aman: {
    color: '#FF6B9D',
    bg: '#FF6B9D',
    img: 'avvtar/aman.svg'
  },
  amish: {
    color: '#3B82F6',
    bg: '#3B82F6',
    img: 'avvtar/amish.svg'
  },
  aziz: {
    color: '#84CC16',
    bg: '#84CC16',
    img: 'avvtar/aziz.svg'
  },
  vish: {
    color: '#FACC15',
    bg: '#FACC15',
    img: 'avvtar/vish.svg'
  }
};

export const getAvatarSrc = (avatar, defaultFallback = 'aman') => {
  if (!avatar) return `/avvtar/${defaultFallback}.svg`;
  const trimmed = String(avatar).trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('/') || trimmed.startsWith('data:')) {
    return trimmed;
  }
  const avKey = trimmed.toLowerCase().replace(/[^a-z0-9]/g, '');
  const validAvatars = ['aman', 'amish', 'aziz', 'vish'];
  const safeAv = validAvatars.includes(avKey) ? avKey : defaultFallback;
  return `/avvtar/${safeAv}.svg`;
};

export const BOLD_AVATAR_COLORS = [
  'facc15', // Electric Yellow
  'ff6b9d', // Hot Neon Pink
  '38bdf8', // Vivid Sky Blue
  '84cc16', // Lime Green
  'fb923c', // Tangerine Orange
  'a855f7', // Vivid Purple
  'ef4444', // Crimson Red
  '06b6d4', // Cyber Cyan
  '22c55e', // Emerald Punch
  'ec4899'  // Bold Fuchsia
];

export const AVATAR_API_STYLES = [
  { id: 'lorelei', name: 'Lorelei', icon: '🎨' },
  { id: 'adventurer', name: 'Adventurer', icon: '⚔️' },
  { id: 'bottts', name: 'Bottts', icon: '🤖' },
  { id: 'pixel', name: 'Pixel Art', icon: '🕹️' },
  { id: 'notionists', name: 'Notionists', icon: '✏️' },
  { id: 'avataaars', name: 'Avatars', icon: '✨' }
];

export const buildAvatarDescriptor = (seed, style = 'lorelei', color = '38bdf8') => {
  let url = '';
  let label = style;
  let format = 'SVG';

  switch (style) {
    case 'lorelei':
      url = `https://api.dicebear.com/9.x/lorelei/svg?seed=${encodeURIComponent(seed)}&backgroundColor=${color}`;
      label = 'DiceBear Lorelei';
      break;
    case 'adventurer':
      url = `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(seed)}&backgroundColor=${color}`;
      label = 'DiceBear Adventurer';
      break;
    case 'bottts':
      url = `https://api.dicebear.com/9.x/bottts/svg?seed=${encodeURIComponent(seed)}&backgroundColor=${color}`;
      label = 'DiceBear Bottts';
      break;
    case 'pixel':
      url = `https://api.dicebear.com/9.x/pixel-art/svg?seed=${encodeURIComponent(seed)}&backgroundColor=${color}`;
      label = 'DiceBear Pixel';
      break;
    case 'notionists':
      url = `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(seed)}&backgroundColor=${color}`;
      label = 'DiceBear Notionists';
      break;
    case 'avataaars':
      url = `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(seed)}&backgroundColor=${color}`;
      label = 'DiceBear Avatars';
      break;
    default:
      url = `https://api.dicebear.com/9.x/lorelei/svg?seed=${encodeURIComponent(seed)}&backgroundColor=${color}`;
      label = 'DiceBear Lorelei';
  }

  return { seed, url, label, format, color, style };
};

export const AVATAR_SEEDS = [
  'Nolan', 'Tarantino', 'Scorsese', 'Kubrick', 'Spielberg', 'Fincher', 'Hitchcock', 'Coppola', 'Villeneuve', 'Bong',
  'Miyazaki', 'Kurosawa', 'Fellini', 'Godard', 'Truffaut', 'Lynch', 'Cronenberg', 'WesAnderson', 'PTA', 'Chivo',
  'WongKarWai', 'BongJoonHo', 'ParkChanWook', 'DelToro', 'Cuaron', 'Inarritu', 'Almodovar', 'Tarkovsky', 'Bergman', 'Leone',
  'Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'Oliver', 'Sophia', 'James', 'Isabella', 'Lucas',
  'Mia', 'Henry', 'Charlotte', 'Alexander', 'Amelia', 'Ethan', 'Harper', 'Daniel', 'Evelyn', 'Jacob',
  'Abigail', 'Logan', 'Emily', 'Jackson', 'Ella', 'Sebastian', 'Elizabeth', 'Jack', 'Camila', 'Owen',
  'Luna', 'Theodore', 'Sofia', 'Samuel', 'Avery', 'Joseph', 'Mila', 'David', 'Aria', 'Wyatt',
  'Scarlett', 'Matthew', 'Penelope', 'Luke', 'Layla', 'Asher', 'Chloe', 'Carter', 'Victoria', 'Julian',
  'Madison', 'Grayson', 'Eleanor', 'Leo', 'Grace', 'Jayden', 'Nora', 'Gabriel', 'Riley', 'Isaac',
  'Zoey', 'Lincoln', 'Hannah', 'Anthony', 'Hazel', 'Hudson', 'Lily', 'Dylan', 'Ellie', 'Ezra',
  'Violet', 'Thomas', 'Lillian', 'Charles', 'Zoe', 'Christopher', 'Stella', 'Jaxon', 'Aurora', 'Maverick',
  'Natalie', 'Josiah', 'Emilia', 'Isaiah', 'Everly', 'Andrew', 'Leah', 'Elias', 'Aubrey', 'Joshua',
  'Willow', 'Nathan', 'Addison', 'Caleb', 'Lucy', 'Ryan', 'Eliana', 'Adrian', 'Ivy', 'Miles',
  'Everett', 'Isla', 'Eli', 'Kinsley', 'Christian', 'Delilah', 'Aaron', 'Cora', 'Hunter', 'Genesis',
  'Cameron', 'Elena', 'Colton', 'Maya', 'Luca', 'Naomi', 'Landon', 'Aaliyah', 'Jonathan', 'Elena',
  'Axel', 'Sarah', 'Easton', 'Claire', 'Jordan', 'Adeline', 'Jeremiah', 'Audrey', 'Robert', 'Autumn',
  'Angel', 'Piper', 'Greyson', 'Ruby', 'Dominic', 'Alice', 'Austin', 'Madelyn', 'Ian', 'Peyton',
  'Adam', 'Savannah', 'Nicholas', 'Serenity', 'Carson', 'Sadie', 'Jaxson', 'Brielle', 'Weston', 'Clara',
  'Brooks', 'Hadley', 'Declan', 'Melanie', 'Waylon', 'Mackenzie', 'Weston', 'Reagan', 'Silas', 'Kennedy'
];


export const DEFAULT_FRAMES = [
  { sectionId: 1, sectionName: "Guess the Frame", category: "frames", type: "image", content: "GUESSTHEFRAME/12 angry men (1957).png", answer: "12 ANGRY MEN", year: "1957" },
  { sectionId: 1, sectionName: "Guess the Frame", category: "frames", type: "image", content: "GUESSTHEFRAME/8 am metro(2023).png", answer: "8 AM METRO", year: "2023" },
  { sectionId: 1, sectionName: "Guess the Frame", category: "frames", type: "image", content: "GUESSTHEFRAME/animal (2023).png", answer: "ANIMAL", year: "2023" },
  { sectionId: 1, sectionName: "Guess the Frame", category: "frames", type: "image", content: "GUESSTHEFRAME/blackmail(2018).jpeg", answer: "BLACKMAIL", year: "2018" },
  { sectionId: 1, sectionName: "Guess the Frame", category: "frames", type: "image", content: "GUESSTHEFRAME/blue velvet(1986).jpeg", answer: "BLUE VELVET", year: "1986" },
  { sectionId: 1, sectionName: "Guess the Frame", category: "frames", type: "image", content: "GUESSTHEFRAME/chennai express (2013).png", answer: "CHENNAI EXPRESS", year: "2013" },
  { sectionId: 1, sectionName: "Guess the Frame", category: "frames", type: "image", content: "GUESSTHEFRAME/dangal (2016).png", answer: "DANGAL", year: "2016" },
  { sectionId: 1, sectionName: "Guess the Frame", category: "frames", type: "image", content: "GUESSTHEFRAME/eko (2025).png", answer: "EKO", year: "2025" },
  { sectionId: 1, sectionName: "Guess the Frame", category: "frames", type: "image", content: "GUESSTHEFRAME/evangelion3.0youcan(not)redo.jpeg", answer: "EVANGELION 3.0 YOU CAN NOT REDO", year: "2012" },
  { sectionId: 1, sectionName: "Guess the Frame", category: "frames", type: "image", content: "GUESSTHEFRAME/fall (2022).png", answer: "FALL", year: "2022" },
  { sectionId: 1, sectionName: "Guess the Frame", category: "frames", type: "image", content: "GUESSTHEFRAME/monarch legacy of monsters.png", answer: "MONARCH LEGACY OF MONSTERS", year: "2023" },
  { sectionId: 1, sectionName: "Guess the Frame", category: "frames", type: "image", content: "GUESSTHEFRAME/padmaavat (2018).png", answer: "PADMAAVAT", year: "2018" },
  { sectionId: 1, sectionName: "Guess the Frame", category: "frames", type: "image", content: "GUESSTHEFRAME/raazi (2018).png", answer: "RAAZI", year: "2018" },
  { sectionId: 1, sectionName: "Guess the Frame", category: "frames", type: "image", content: "GUESSTHEFRAME/rango(2011).jpeg", answer: "RANGO", year: "2011" },
  { sectionId: 1, sectionName: "Guess the Frame", category: "frames", type: "image", content: "GUESSTHEFRAME/sore.png", answer: "SORE", year: "2024" },
  { sectionId: 1, sectionName: "Guess the Frame", category: "frames", type: "image", content: "GUESSTHEFRAME/succesion.jpeg", answer: "SUCCESSION", year: "2018" },
  { sectionId: 1, sectionName: "Guess the Frame", category: "frames", type: "image", content: "GUESSTHEFRAME/super sharanya (2022).png", answer: "SUPER SHARANYA", year: "2022" },
  { sectionId: 1, sectionName: "Guess the Frame", category: "frames", type: "image", content: "GUESSTHEFRAME/superhero movie (2008).png", answer: "SUPERHERO MOVIE", year: "2008" },
  { sectionId: 1, sectionName: "Guess the Frame", category: "frames", type: "image", content: "GUESSTHEFRAME/the suicide squad (2021).png", answer: "THE SUICIDE SQUAD", year: "2021" },
  { sectionId: 1, sectionName: "Guess the Frame", category: "frames", type: "image", content: "GUESSTHEFRAME/with love (2026).png", answer: "WITH LOVE", year: "2026" }
];

export const DEFAULT_EYES = [
  { sectionId: 2, sectionName: "Guess the Eyes", category: "eyes", type: "image", content: "GUESSTHEEYES/Adria Arjona copy.webp", revealContent: "GUESSTHEEYES/Adria Arjona.webp", answer: "ADRIA ARJONA", year: "Actor" },
  { sectionId: 2, sectionName: "Guess the Eyes", category: "eyes", type: "image", content: "GUESSTHEEYES/Anthony Mackie copy.webp", revealContent: "GUESSTHEEYES/Anthony Mackie.webp", answer: "ANTHONY MACKIE", year: "Actor" },
  { sectionId: 2, sectionName: "Guess the Eyes", category: "eyes", type: "image", content: "GUESSTHEEYES/Antony Starr copy.webp", revealContent: "GUESSTHEEYES/Antony Starr.webp", answer: "ANTONY STARR", year: "Actor" },
  { sectionId: 2, sectionName: "Guess the Eyes", category: "eyes", type: "image", content: "GUESSTHEEYES/Emily Blunt copy.webp", revealContent: "GUESSTHEEYES/Emily Blunt.webp", answer: "EMILY BLUNT", year: "Actor" },
  { sectionId: 2, sectionName: "Guess the Eyes", category: "eyes", type: "image", content: "GUESSTHEEYES/Emma Stone copy.webp", revealContent: "GUESSTHEEYES/Emma Stone.webp", answer: "EMMA STONE", year: "Actor" },
  { sectionId: 2, sectionName: "Guess the Eyes", category: "eyes", type: "image", content: "GUESSTHEEYES/Kate Hudson copy.webp", revealContent: "GUESSTHEEYES/Kate Hudson.webp", answer: "KATE HUDSON", year: "Actor" },
  { sectionId: 2, sectionName: "Guess the Eyes", category: "eyes", type: "image", content: "GUESSTHEEYES/Olivia Cooke copy.webp", revealContent: "GUESSTHEEYES/Olivia Cooke.webp", answer: "OLIVIA COOKE", year: "Actor" },
  { sectionId: 2, sectionName: "Guess the Eyes", category: "eyes", type: "image", content: "GUESSTHEEYES/Rachel Brosnahan copy.webp", revealContent: "GUESSTHEEYES/Rachel Brosnahan.webp", answer: "RACHEL BROSNAHAN", year: "Actor" },
  { sectionId: 2, sectionName: "Guess the Eyes", category: "eyes", type: "image", content: "GUESSTHEEYES/Shraddha Kapoor copy.webp", revealContent: "GUESSTHEEYES/Shraddha Kapoor.webp", answer: "SHRADDHA KAPOOR", year: "Actor" },
  { sectionId: 2, sectionName: "Guess the Eyes", category: "eyes", type: "image", content: "GUESSTHEEYES/Zoe Saldana copy.webp", revealContent: "GUESSTHEEYES/Zoe Saldana.webp", answer: "ZOE SALDANA", year: "Actor" }
];

export const DEFAULT_DIALOGUES = [
  { sectionId: 3, sectionName: "Guess the Dialogue", category: "dialogue", type: "dialogue", content: "Aaya hoon, kuch toh loot kar jaunga... Khandani chor hoon main, khandani!", answer: "ANDAAZ APNA APNA", year: "1994" },
  { sectionId: 3, sectionName: "Guess the Dialogue", category: "dialogue", type: "dialogue", content: "Khoon kharabe wale khandan se aata hoon... roz subah uthkar 2-4 khoon na karoon toh mera naashta hazam nahi hota!", answer: "HUNGAMA", year: "2003" },
  { sectionId: 3, sectionName: "Guess the Dialogue", category: "dialogue", type: "dialogue", content: "Yeh koi tareeka hai bheek maangne ka?!", answer: "GOLMAAL", year: "2006" },
  { sectionId: 3, sectionName: "Guess the Dialogue", category: "dialogue", type: "dialogue", content: "Meri ek taang nakli hai, main hockey ka bohot bada khiladi tha...", answer: "WELCOME", year: "2007" },
  { sectionId: 3, sectionName: "Guess the Dialogue", category: "dialogue", type: "dialogue", content: "Arey ₹5 mein chicken biryani de raha hai re woh!", answer: "RUN", year: "2004" },
  { sectionId: 3, sectionName: "Guess the Dialogue", category: "dialogue", type: "dialogue", content: "Hi, guys. We're going on a national bikini tour, and we're looking for two oil boys who can grease us up before each competition.", answer: "DUMB AND DUMBER", year: "1994" },
  { sectionId: 3, sectionName: "Guess the Dialogue", category: "dialogue", type: "dialogue", content: "It’s not a purse, it’s a satchel. Gods and Indiana Jones wears one.", answer: "THE HANGOVER", year: "2009" },
  { sectionId: 3, sectionName: "Guess the Dialogue", category: "dialogue", type: "dialogue", content: "I'm not Bad. I'm just Drawn That Way.", answer: "WHO FRAMED ROGER RABBIT", year: "1988" },
  { sectionId: 3, sectionName: "Guess the Dialogue", category: "dialogue", type: "dialogue", content: "I don't want to survive. I want to live.", answer: "WALL-E", year: "2008" },
  { sectionId: 3, sectionName: "Guess the Dialogue", category: "dialogue", type: "dialogue", content: "I wasted so much time worrying what could go wrong, but what did go wrong, was never the things I worried about.", answer: "THE WORST PERSON IN THE WORLD", year: "2021" }
];

export const CATALOG_BY_CATEGORY = {
  frames: DEFAULT_FRAMES,
  eyes: DEFAULT_EYES,
  dialogue: DEFAULT_DIALOGUES
};

export const ALL_CATALOG_ITEMS = [
  ...DEFAULT_FRAMES,
  ...DEFAULT_EYES,
  ...DEFAULT_DIALOGUES
];

export const DEFAULT_TIE_BREAKERS = [
  { type: 'image', content: 'tie breaker/Anatomy of a Fall (2023).webp', answer: 'ANATOMY OF A FALL', year: '2023' },
  { type: 'image', content: 'tie breaker/Eyes Wide Shut (1999).webp', answer: 'EYES WIDE SHUT', year: '1999' },
  { type: 'image', content: 'tie breaker/Ghilli (2004).webp', answer: 'GHILLI', year: '2004' },
  { type: 'image', content: 'tie breaker/La Haine(1995).webp', answer: 'LA HAINE', year: '1995' },
  { type: 'image', content: 'tie breaker/Mad Max 2.jpg.webp', answer: 'MAD MAX 2', year: '1981' },
  { type: 'image', content: 'tie breaker/Moonrise Kingdom (2012).webp', answer: 'MOONRISE KINGDOM', year: '2012' },
  { type: 'image', content: 'tie breaker/The Batman (2022).webp', answer: 'THE BATMAN', year: '2022' },
  { type: 'image', content: 'tie breaker/The Holdovers(2023).webp', answer: 'THE HOLDOVERS', year: '2023' },
  { type: 'image', content: 'tie breaker/The Life of Chuck(2024).webp', answer: 'THE LIFE OF CHUCK', year: '2024' },
  { type: 'image', content: 'tie breaker/The Lighthouse (2019).webp', answer: 'THE LIGHTHOUSE', year: '2019' },
  { type: 'image', content: 'tie breaker/The Wolf of Wall Street (2013).webp', answer: 'THE WOLF OF WALL STREET', year: '2013' },
  { type: 'image', content: 'tie breaker/They Call Him OG (2025).webp', answer: 'THEY CALL HIM OG', year: '2025' },
  { type: 'image', content: 'tie breaker/Top Gun Maverick (2022).webp', answer: 'TOP GUN MAVERICK', year: '2022' },
  { type: 'image', content: 'tie breaker/Under the Silver Lake (2018).webp', answer: 'UNDER THE SILVER LAKE', year: '2018' }
];

export const INITIAL_PLAYERS = [
  { name: 'AMAN', score: 0, avatar: 'cat', avatarImg: 'avvtar/aman.svg' },
  { name: 'AMISH', score: 0, avatar: 'ghost', avatarImg: 'avvtar/amish.svg' },
  { name: 'VISH', score: 0, avatar: 'dog', avatarImg: 'avvtar/vish.svg' },
  { name: 'AZIZ', score: 0, avatar: 'circle', avatarImg: 'avvtar/aziz.svg' }
];

export const PHASES = {
  IDLE: 'IDLE',
  ROUND_ACTIVE: 'ROUND_ACTIVE',
  JUDGE_PHASE: 'JUDGE_PHASE',
  ANSWER_REVEAL: 'ANSWER_REVEAL',
  SCORING_PHASE: 'SCORING_PHASE',
  ROUND_TRANSITION: 'ROUND_TRANSITION',
  WINNER_SCREEN: 'WINNER_SCREEN'
};
