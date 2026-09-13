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

export const AVATAR_SEEDS = [
  'Nolan', 'Tarantino', 'Scorsese', 'Kubrick', 'Spielberg', 'Fincher', 'Hitchcock', 'Coppola', 'Villeneuve', 'Bong',
  'Aman', 'Amish', 'Aziz', 'Vish', 'Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'Oliver',
  'Sophia', 'James', 'Isabella', 'Lucas', 'Mia', 'Henry', 'Charlotte', 'Alexander', 'Amelia', 'Ethan',
  'Harper', 'Daniel', 'Evelyn', 'Jacob', 'Abigail', 'Logan', 'Emily', 'Jackson', 'Ella', 'Sebastian',
  'Elizabeth', 'Jack', 'Camila', 'Owen', 'Luna', 'Theodore', 'Sofia', 'Samuel', 'Avery', 'Joseph',
  'Mila', 'David', 'Aria', 'Wyatt', 'Scarlett', 'Matthew', 'Penelope', 'Luke', 'Layla', 'Asher',
  'Chloe', 'Carter', 'Victoria', 'Julian', 'Madison', 'Grayson', 'Eleanor', 'Leo', 'Grace', 'Jayden',
  'Nora', 'Gabriel', 'Riley', 'Isaac', 'Zoey', 'Lincoln', 'Hannah', 'Anthony', 'Hazel', 'Hudson',
  'Lily', 'Dylan', 'Ellie', 'Ezra', 'Violet', 'Thomas', 'Lillian', 'Charles', 'Zoe', 'Christopher',
  'Stella', 'Jaxon', 'Aurora', 'Maverick', 'Natalie', 'Josiah', 'Emilia', 'Isaiah', 'Everly', 'Andrew'
];


export const DEFAULT_FRAMES = [
  { sectionId: 1, sectionName: "Guess the Frame", category: "frames", type: "image", content: "GUESSTHEFRAME/Backrooms (2026).webp", answer: "BACKROOMS", year: "2026" },
  { sectionId: 1, sectionName: "Guess the Frame", category: "frames", type: "image", content: "GUESSTHEFRAME/Bandar (2026).webp", answer: "BANDAR", year: "2026" },
  { sectionId: 1, sectionName: "Guess the Frame", category: "frames", type: "image", content: "GUESSTHEFRAME/Bhavesh Joshi Superhero (2018).webp", answer: "BHAVESH JOSHI SUPERHERO", year: "2018" },
  { sectionId: 1, sectionName: "Guess the Frame", category: "frames", type: "image", content: "GUESSTHEFRAME/Booksmart (2019).webp", answer: "BOOKSMART", year: "2019" },
  { sectionId: 1, sectionName: "Guess the Frame", category: "frames", type: "image", content: "GUESSTHEFRAME/Days of Thunder (1990).webp", answer: "DAYS OF THUNDER", year: "1990" },
  { sectionId: 1, sectionName: "Guess the Frame", category: "frames", type: "image", content: "GUESSTHEFRAME/DC (2026).webp", answer: "DC", year: "2026" },
  { sectionId: 1, sectionName: "Guess the Frame", category: "frames", type: "image", content: "GUESSTHEFRAME/Dhoodte reh jaaoge (2009).webp", answer: "DHOONDTE REH JAAOGE", year: "2009" },
  { sectionId: 1, sectionName: "Guess the Frame", category: "frames", type: "image", content: "GUESSTHEFRAME/Dil Se.. (1998).webp", answer: "DIL SE", year: "1998" },
  { sectionId: 1, sectionName: "Guess the Frame", category: "frames", type: "image", content: "GUESSTHEFRAME/Hostel Daze (2019).webp", answer: "HOSTEL DAZE", year: "2019" },
  { sectionId: 1, sectionName: "Guess the Frame", category: "frames", type: "image", content: "GUESSTHEFRAME/Manchester by the Sea (2016).webp", answer: "MANCHESTER BY THE SEA", year: "2016" },
  { sectionId: 1, sectionName: "Guess the Frame", category: "frames", type: "image", content: "GUESSTHEFRAME/Margarita with a Straw (2014).webp", answer: "MARGARITA WITH A STRAW", year: "2014" },
  { sectionId: 1, sectionName: "Guess the Frame", category: "frames", type: "image", content: "GUESSTHEFRAME/Maruti Mera Dosst (2009).webp", answer: "MARUTI MERA DOSST", year: "2009" },
  { sectionId: 1, sectionName: "Guess the Frame", category: "frames", type: "image", content: "GUESSTHEFRAME/Memento (2000).webp", answer: "MEMENTO", year: "2000" },
  { sectionId: 1, sectionName: "Guess the Frame", category: "frames", type: "image", content: "GUESSTHEFRAME/Midnight in Paris (2011).webp", answer: "MIDNIGHT IN PARIS", year: "2011" },
  { sectionId: 1, sectionName: "Guess the Frame", category: "frames", type: "image", content: "GUESSTHEFRAME/Nobody Knows (2004).webp", answer: "NOBODY KNOWS", year: "2004" },
  { sectionId: 1, sectionName: "Guess the Frame", category: "frames", type: "image", content: "GUESSTHEFRAME/Oye Lucky! Lucky Oye! (2008).webp", answer: "OYE LUCKY LUCKY OYE", year: "2008" },
  { sectionId: 1, sectionName: "Guess the Frame", category: "frames", type: "image", content: "GUESSTHEFRAME/Queen (2013).webp", answer: "QUEEN", year: "2013" },
  { sectionId: 1, sectionName: "Guess the Frame", category: "frames", type: "image", content: "GUESSTHEFRAME/Taarzan The Wonder Car (2004).webp", answer: "TAARZAN THE WONDER CAR", year: "2004" },
  { sectionId: 1, sectionName: "Guess the Frame", category: "frames", type: "image", content: "GUESSTHEFRAME/The Handmaiden (2016).webp", answer: "THE HANDMAIDEN", year: "2016" },
  { sectionId: 1, sectionName: "Guess the Frame", category: "frames", type: "image", content: "GUESSTHEFRAME/Zodiac (2007).webp", answer: "ZODIAC", year: "2007" }
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
