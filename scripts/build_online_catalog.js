const fs = require('fs');
const path = require('path');

const palette = ['#ff7eb6', '#57c3e0', '#a06bd6', '#f0a828', '#3fbf8f', '#ff5252', '#4dabf7', '#ffd43b', '#69db7c', '#e599f7'];
function getHashColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
}

async function build() {
  console.log('Building Online Avatar Catalog with 0 local dependencies...');
  const avatars = [];
  const seenIds = new Set();

  function addAvatar(item) {
    let slug = item.id.toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/^_+|_+$/g, '');
    if (!slug) slug = 'avatar';
    let counter = 1;
    let finalId = slug;
    while (seenIds.has(finalId)) {
      finalId = `${slug}_${++counter}`;
    }
    seenIds.add(finalId);
    avatars.push({
      id: finalId,
      name: item.name,
      cat: item.cat,
      sub: item.sub || item.cat,
      src: item.src,
      anim: Boolean(item.anim),
      color: item.color || getHashColor(item.name)
    });
  }

  // 1. Founders (Top Priority)
  const founders = [
    { id: 'aman', name: 'Aman', cat: 'founders', sub: 'Founders & Team', src: 'avvtar/aman.svg', color: '#FF6B9D' },
    { id: 'amish', name: 'Amish', cat: 'founders', sub: 'Founders & Team', src: 'avvtar/amish.svg', color: '#3B82F6' },
    { id: 'aziz', name: 'Aziz', cat: 'founders', sub: 'Founders & Team', src: 'avvtar/aziz.svg', color: '#84CC16' },
    { id: 'vish', name: 'Vish', cat: 'founders', sub: 'Founders & Team', src: 'avvtar/vish.svg', color: '#FACC15' },
    { id: 'nolan', name: 'Nolan', cat: 'founders', sub: 'Founders & Team', src: 'avvtar/nolan.svg', color: '#A855F7' }
  ];
  founders.forEach(f => addAvatar(f));

  // 2. DiceBear API v9.x Dynamic Avatars
  const dicebearStyles = [
    { style: 'adventurer', label: 'Adventurer' },
    { style: 'lorelei', label: 'Lorelei' },
    { style: 'bottts', label: 'Bottts' },
    { style: 'pixel-art', label: 'Pixel Art' },
    { style: 'notionists', label: 'Notionists' },
    { style: 'avataaars', label: 'Avataaars' }
  ];
  const dicebearSeeds = [
    'Shadow', 'Blaze', 'Cosmo', 'Nova', 'Echo', 'Spark', 'Frost', 'Viper', 'Titan', 'Ghost',
    'Pixel', 'Atlas', 'Raven', 'Cipher', 'Flux', 'Phoenix', 'Quantum', 'Nebula', 'Zenith', 'Orion',
    'Aero', 'Drift', 'Neon', 'Vortex', 'Pulse', 'Sonic', 'Zero', 'Apex', 'Cyber', 'Striker'
  ];
  const bgColors = ['ffd5dc', 'd1e8ff', 'd8f5d0', 'fef3c7', 'f3e8ff', 'ffedd5'];

  dicebearStyles.forEach((ds, sIdx) => {
    dicebearSeeds.forEach((seed, seedIdx) => {
      const color = bgColors[(sIdx + seedIdx) % bgColors.length];
      addAvatar({
        id: `db_${ds.style}_${seed.toLowerCase()}`,
        name: `${seed} (${ds.label})`,
        cat: 'dicebear',
        sub: `DiceBear ${ds.label}`,
        src: `https://api.dicebear.com/9.x/${ds.style}/svg?seed=${encodeURIComponent(seed)}&backgroundColor=${color}`,
        color: `#${color}`
      });
    });
  });

  // 3. Pokémon Showdown Animated GIFs
  const pokemons = [
    'Pikachu', 'Charizard', 'Blastoise', 'Venusaur', 'Gengar', 'Mewtwo', 'Mew', 'Lucario', 'Gyarados',
    'Eevee', 'Vaporeon', 'Jolteon', 'Flareon', 'Espeon', 'Umbreon', 'Rayquaza', 'Garchomp', 'Greninja',
    'Snorlax', 'Dragonite', 'Lugia', 'Ho-Oh', 'Dialga', 'Palkia', 'Giratina', 'Arceus', 'Gardevoir',
    'Tyranitar', 'Salamence', 'Scizor', 'Alakazam', 'Arcanine', 'Machamp', 'Lapras', 'Ditto', 'Zapdos',
    'Moltres', 'Articuno', 'Celebi', 'Kyogre', 'Groudon', 'Jirachi', 'Deoxys', 'Darkrai', 'Zoroark',
    'Bulbasaur', 'Charmander', 'Squirtle', 'Torchic', 'Mudkip', 'Treecko', 'Froakie', 'Rowlet', 'Mimikyu',
    'Sceptile', 'Blaziken', 'Swampert', 'Metagross', 'Latios', 'Latias', 'Flygon', 'Milotic', 'Absol',
    'Empoleon', 'Infernape', 'Torterra', 'Luxray', 'Roserade', 'Staraptor', 'Togekiss', 'Gallade',
    'Electivire', 'Magmortar', 'Gliscor', 'Mamoswine', 'Porygon-Z', 'Dusknoir', 'Froslass', 'Rotom',
    'Chandelure', 'Haxorus', 'Hydreigon', 'Volcarona', 'Reshiram', 'Zekrom', 'Kyurem', 'Keldeo',
    'Genesect', 'Aegislash', 'Sylveon', 'Goodra', 'Noivern', 'Xerneas', 'Yveltal', 'Zygarde', 'Diancie',
    'Decidueye', 'Incineroar', 'Primarina', 'Vikavolt', 'Lycanroc', 'Toxapex', 'Salazzle', 'Kommo-o',
    'Corviknight', 'Toxtricity', 'Dragapult', 'Zacian', 'Zamazenta', 'Urshifu', 'Ceruledge', 'Armarouge'
  ];
  pokemons.forEach(p => {
    const slug = p.toLowerCase().replace(/[^a-z0-9]/g, '');
    addAvatar({
      id: `poke_${slug}`,
      name: p,
      cat: 'pokemon',
      sub: 'Pokémon Animated',
      src: `https://play.pokemonshowdown.com/sprites/ani/${slug}.gif`,
      anim: true,
      color: '#ffd43b'
    });
  });

  // 4. Minecraft 3D Avatars (via mc-heads.net)
  const mcUsers = [
    'Steve', 'Alex', 'Notch', 'Jeb_', 'Dream', 'GeorgeNotFound', 'Sapnap', 'DanTDM', 'TommyInnit',
    'CaptainSparklez', 'Technoblade', 'MumboJumbo', 'Grian', 'PewDiePie', 'Stampy', 'Skeppy',
    'Tubbo', 'WilburSoot', 'Ranboo', 'Philza', 'BadBoyHalo', 'Quackity', 'KarlJacobs', 'Antfrost',
    'BdoubleO100', 'GoodTimesWithScar', 'Etho', 'Docm77', 'ImpulseSV', 'Tango', 'Zombie', 'Skeleton',
    'Creeper', 'Enderman', 'Herobrine', 'Dinnerbone', 'Grumm', 'Smajor1995', 'Shubble', 'Smallishbeans',
    'LDShadowLady', 'fizzit', 'Grain', 'Xisuma', 'Keralis', 'rendog', 'iskall85', 'cubfan135',
    'Welsknight', 'Zedaph', 'FalseSymmetry', 'Stressmonster101', 'GeminiTay', 'PearlescentMoon'
  ];
  mcUsers.forEach(u => {
    addAvatar({
      id: `mc_${u.toLowerCase()}`,
      name: u,
      cat: 'gaming',
      sub: 'Minecraft',
      src: `https://mc-heads.net/avatar/${u}/100`,
      color: '#69db7c'
    });
  });

  // 5. Superheroes (Marvel & DC) from jsDelivr Superhero API
  try {
    console.log('Fetching Superhero API...');
    const res = await fetch('https://cdn.jsdelivr.net/gh/akabab/superhero-api@0.3.0/api/all.json');
    if (res.ok) {
      const heroes = await res.json();
      heroes.forEach(h => {
        const isDC = h.biography && h.biography.publisher === 'DC Comics';
        addAvatar({
          id: `hero_${h.id}_${h.slug}`,
          name: h.name,
          cat: 'superheroes',
          sub: isDC ? 'DC Universe' : 'Marvel Universe',
          src: h.images.sm,
          color: isDC ? '#3B82F6' : '#EF4444'
        });
      });
      console.log(`Loaded ${heroes.length} superheroes!`);
    }
  } catch (e) {
    console.warn('Superhero fetch failed, continuing:', e.message);
  }

  // 6. Rick and Morty (Multiple Pages)
  try {
    console.log('Fetching Rick and Morty API...');
    for (let page = 1; page <= 10; page++) {
      const res = await fetch(`https://rickandmortyapi.com/api/character?page=${page}`);
      if (!res.ok) break;
      const data = await res.json();
      data.results.forEach(c => {
        addAvatar({
          id: `rm_${c.id}`,
          name: c.name,
          cat: 'cartoons',
          sub: 'Rick & Morty',
          src: c.image,
          color: '#34D399'
        });
      });
    }
  } catch (e) {
    console.warn('Rick & Morty fetch failed, continuing:', e.message);
  }

  // 6.1 Bob's Burgers API
  try {
    console.log('Fetching Bobs Burgers API...');
    const res = await fetch('https://bobsburgers-api.herokuapp.com/characters?limit=100');
    if (res.ok) {
      const bobs = await res.json();
      bobs.filter(b => b.image).forEach(b => {
        addAvatar({
          id: `bob_${b.id}`,
          name: b.name,
          cat: 'cartoons',
          sub: "Bob's Burgers",
          src: b.image,
          color: '#FBBF24'
        });
      });
    }
  } catch (e) {
    console.warn('Bobs Burgers fetch failed, continuing:', e.message);
  }

  // 6.2 Yu-Gi-Oh API (YGOPRODeck)
  try {
    console.log('Fetching Yu-Gi-Oh API...');
    const res = await fetch('https://db.ygoprodeck.com/api/v7/cardinfo.php?num=100&offset=0');
    if (res.ok) {
      const yugioh = await res.json();
      yugioh.data.forEach(y => {
        const img = y.card_images && y.card_images[0] ? y.card_images[0].image_url_cropped : null;
        if (img) {
          addAvatar({
            id: `ygo_${y.id}`,
            name: y.name,
            cat: 'anime',
            sub: 'Yu-Gi-Oh!',
            src: img,
            color: '#EC4899'
          });
        }
      });
    }
  } catch (e) {
    console.warn('Yu-Gi-Oh fetch failed, continuing:', e.message);
  }

  // 7. League of Legends / Arcane Champions
  try {
    console.log('Fetching League of Legends Data Dragon...');
    const res = await fetch('https://ddragon.leagueoflegends.com/cdn/14.1.1/data/en_US/champion.json');
    if (res.ok) {
      const data = await res.json();
      Object.values(data.data).forEach(c => {
        addAvatar({
          id: `lol_${c.id.toLowerCase()}`,
          name: c.name,
          cat: 'gaming',
          sub: 'Arcane & League',
          src: `https://ddragon.leagueoflegends.com/cdn/14.1.1/img/champion/${c.image.full}`,
          color: '#818CF8'
        });
      });
    }
  } catch (e) {
    console.warn('League fetch failed, continuing:', e.message);
  }

  // 8. Game of Thrones & House of the Dragon
  try {
    console.log('Fetching Thrones API...');
    const res = await fetch('https://thronesapi.com/api/v2/Characters');
    if (res.ok) {
      const thrones = await res.json();
      thrones.forEach(c => {
        addAvatar({
          id: `got_${c.id}`,
          name: c.fullName,
          cat: 'tv',
          sub: 'Game of Thrones',
          src: c.imageUrl,
          color: '#F59E0B'
        });
      });
    }
  } catch (e) {
    console.warn('Thrones fetch failed, continuing:', e.message);
  }

  // 9. Harry Potter (ImageKit CDN)
  try {
    console.log('Fetching Harry Potter API...');
    const res = await fetch('https://hp-api.onrender.com/api/characters');
    if (res.ok) {
      const hp = await res.json();
      hp.filter(c => c.image).forEach(c => {
        addAvatar({
          id: `hp_${c.id}`,
          name: c.name,
          cat: 'movies',
          sub: 'Harry Potter',
          src: c.image,
          color: '#8B5CF6'
        });
      });
    }
  } catch (e) {
    console.warn('Harry Potter fetch failed, continuing:', e.message);
  }

  // 10. Digimon Monsters
  try {
    console.log('Fetching Digimon API...');
    const res = await fetch('https://digimon-api.vercel.app/api/digimon');
    if (res.ok) {
      const digis = await res.json();
      digis.slice(0, 100).forEach((d, i) => {
        addAvatar({
          id: `digi_${i}_${d.name.toLowerCase()}`,
          name: d.name,
          cat: 'anime',
          sub: 'Digimon',
          src: d.img,
          color: '#EC4899'
        });
      });
    }
  } catch (e) {
    console.warn('Digimon fetch failed, continuing:', e.message);
  }

  // 11. Genshin Impact
  const genshinChars = [
    'Albedo', 'Alhaitham', 'Amber', 'Arataki Itto', 'Ayaka', 'Ayato', 'Baizhu', 'Barbara', 'Beidou',
    'Bennett', 'Childe', 'Chiori', 'Collei', 'Cyno', 'Diluc', 'Diona', 'Eula', 'Faruzan', 'Fischl',
    'Furina', 'Ganyu', 'Gorou', 'Hu Tao', 'Jean', 'Kaeya', 'Kaveh', 'Kazuha', 'Keqing', 'Klee',
    'Kokomi', 'Layla', 'Lynette', 'Lyney', 'Mona', 'Nahida', 'Navia', 'Neuvillette', 'Nilou',
    'Ningguang', 'Noelle', 'Raiden', 'Razor', 'Scaramouche', 'Shenhe', 'Sucrose', 'Tartaglia',
    'Tighnari', 'Venti', 'Wriothesley', 'Xiangling', 'Xiao', 'Xingqiu', 'Yae Miko', 'Yelan',
    'Yoimiya', 'Zhongli'
  ];
  genshinChars.forEach(c => {
    const slug = c.toLowerCase().replace(/[^a-z0-9]/g, '-');
    addAvatar({
      id: `genshin_${slug}`,
      name: c,
      cat: 'gaming',
      sub: 'Genshin Impact',
      src: `https://genshin.jmp.blue/characters/${slug}/icon`,
      color: '#60A5FA'
    });
  });

  // 12. Final Space
  const finalSpace = [
    'Gary Goodspeed', 'Mooncake', 'Avocato', 'Little Cato', 'Quinn Ergon', 'KVN', 'Lord Commander',
    'Ash Graven', 'Fox', 'Clarence', 'Bolo', 'HUE', 'Tribore Menendez', 'Biskit', 'Shannon Thunder'
  ];
  finalSpace.forEach(c => {
    const slug = c.toLowerCase().replace(/\s+/g, '_');
    addAvatar({
      id: `fs_${slug}`,
      name: c,
      cat: 'cartoons',
      sub: 'Final Space',
      src: `https://finalspaceapi.com/api/character/avatar/${slug}.png`,
      color: '#A78BFA'
    });
  });

  // 13. Iconic Anime Legends (with DiceBear & CDN endpoints)
  const animeLegends = [
    { name: 'Goku', sub: 'Dragon Ball', style: 'adventurer' },
    { name: 'Vegeta', sub: 'Dragon Ball', style: 'adventurer' },
    { name: 'Gohan', sub: 'Dragon Ball', style: 'adventurer' },
    { name: 'Trunks', sub: 'Dragon Ball', style: 'adventurer' },
    { name: 'Piccolo', sub: 'Dragon Ball', style: 'adventurer' },
    { name: 'Frieza', sub: 'Dragon Ball', style: 'bottts' },
    { name: 'Cell', sub: 'Dragon Ball', style: 'bottts' },
    { name: 'Majin Buu', sub: 'Dragon Ball', style: 'lorelei' },
    { name: 'Luffy', sub: 'One Piece', style: 'adventurer' },
    { name: 'Zoro', sub: 'One Piece', style: 'adventurer' },
    { name: 'Sanji', sub: 'One Piece', style: 'adventurer' },
    { name: 'Nami', sub: 'One Piece', style: 'lorelei' },
    { name: 'Robin', sub: 'One Piece', style: 'lorelei' },
    { name: 'Naruto Uzumaki', sub: 'Naruto', style: 'adventurer' },
    { name: 'Sasuke Uchiha', sub: 'Naruto', style: 'adventurer' },
    { name: 'Kakashi Hatake', sub: 'Naruto', style: 'adventurer' },
    { name: 'Itachi Uchiha', sub: 'Naruto', style: 'adventurer' },
    { name: 'Tanjiro Kamado', sub: 'Demon Slayer', style: 'adventurer' },
    { name: 'Nezuko Kamado', sub: 'Demon Slayer', style: 'lorelei' },
    { name: 'Zenitsu Agatsuma', sub: 'Demon Slayer', style: 'adventurer' },
    { name: 'Inosuke Hashibira', sub: 'Demon Slayer', style: 'adventurer' },
    { name: 'Satoru Gojo', sub: 'Jujutsu Kaisen', style: 'adventurer' },
    { name: 'Yuji Itadori', sub: 'Jujutsu Kaisen', style: 'adventurer' },
    { name: 'Megumi Fushiguro', sub: 'Jujutsu Kaisen', style: 'adventurer' },
    { name: 'Nobara Kugisaki', sub: 'Jujutsu Kaisen', style: 'lorelei' },
    { name: 'Sukuna', sub: 'Jujutsu Kaisen', style: 'adventurer' },
    { name: 'Eren Yeager', sub: 'Attack on Titan', style: 'adventurer' },
    { name: 'Levi Ackerman', sub: 'Attack on Titan', style: 'adventurer' },
    { name: 'Mikasa Ackerman', sub: 'Attack on Titan', style: 'lorelei' },
    { name: 'Denji', sub: 'Chainsaw Man', style: 'adventurer' },
    { name: 'Power', sub: 'Chainsaw Man', style: 'lorelei' },
    { name: 'Makima', sub: 'Chainsaw Man', style: 'lorelei' },
    { name: 'Anya Forger', sub: 'Spy x Family', style: 'lorelei' },
    { name: 'Loid Forger', sub: 'Spy x Family', style: 'adventurer' },
    { name: 'Yor Forger', sub: 'Spy x Family', style: 'lorelei' },
    { name: 'Light Yagami', sub: 'Death Note', style: 'adventurer' },
    { name: 'L Lawliet', sub: 'Death Note', style: 'notionists' },
    { name: 'Ryuk', sub: 'Death Note', style: 'bottts' },
    { name: 'Ichigo Kurosaki', sub: 'Bleach', style: 'adventurer' },
    { name: 'Killua Zoldyck', sub: 'Hunter x Hunter', style: 'adventurer' },
    { name: 'Gon Freecss', sub: 'Hunter x Hunter', style: 'adventurer' },
    { name: 'Hisoka', sub: 'Hunter x Hunter', style: 'adventurer' }
  ];
  animeLegends.forEach(al => {
    addAvatar({
      id: `anime_${al.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
      name: al.name,
      cat: 'anime',
      sub: al.sub,
      src: `https://api.dicebear.com/9.x/${al.style}/svg?seed=${encodeURIComponent(al.name)}&backgroundColor=${getHashColor(al.name).replace('#','')}`,
      color: getHashColor(al.name)
    });
  });

  // 14. TV Series Legends (The Boys, Breaking Bad, The Office, Stranger Things, Peaky Blinders)
  const tvLegends = [
    { name: 'Homelander', sub: 'The Boys', style: 'avataaars' },
    { name: 'Billy Butcher', sub: 'The Boys', style: 'avataaars' },
    { name: 'Hughie Campbell', sub: 'The Boys', style: 'avataaars' },
    { name: 'Starlight', sub: 'The Boys', style: 'lorelei' },
    { name: 'Walter White', sub: 'Breaking Bad', style: 'notionists' },
    { name: 'Jesse Pinkman', sub: 'Breaking Bad', style: 'avataaars' },
    { name: 'Saul Goodman', sub: 'Breaking Bad', style: 'avataaars' },
    { name: 'Gus Fring', sub: 'Breaking Bad', style: 'notionists' },
    { name: 'Michael Scott', sub: 'The Office', style: 'avataaars' },
    { name: 'Dwight Schrute', sub: 'The Office', style: 'avataaars' },
    { name: 'Jim Halpert', sub: 'The Office', style: 'avataaars' },
    { name: 'Pam Beesly', sub: 'The Office', style: 'lorelei' },
    { name: 'Eleven', sub: 'Stranger Things', style: 'lorelei' },
    { name: 'Dustin Henderson', sub: 'Stranger Things', style: 'avataaars' },
    { name: 'Steve Harrington', sub: 'Stranger Things', style: 'adventurer' },
    { name: 'Thomas Shelby', sub: 'Peaky Blinders', style: 'notionists' },
    { name: 'Arthur Shelby', sub: 'Peaky Blinders', style: 'notionists' },
    { name: 'Rick Grimes', sub: 'The Walking Dead', style: 'adventurer' },
    { name: 'Daryl Dixon', sub: 'The Walking Dead', style: 'adventurer' }
  ];
  tvLegends.forEach(tv => {
    addAvatar({
      id: `tv_${tv.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
      name: tv.name,
      cat: 'tv',
      sub: tv.sub,
      src: `https://api.dicebear.com/9.x/${tv.style}/svg?seed=${encodeURIComponent(tv.name)}&backgroundColor=${getHashColor(tv.name).replace('#','')}`,
      color: getHashColor(tv.name)
    });
  });

  // 15. Cartoons & Sci-Fi Legends (Avatar, Ben 10, Teen Titans, Futurama, Simpsons, Adventure Time, SpongeBob)
  const cartoonLegends = [
    { name: 'Aang', sub: 'Avatar: The Last Airbender', style: 'adventurer' },
    { name: 'Zuko', sub: 'Avatar: The Last Airbender', style: 'adventurer' },
    { name: 'Katara', sub: 'Avatar: The Last Airbender', style: 'lorelei' },
    { name: 'Sokka', sub: 'Avatar: The Last Airbender', style: 'adventurer' },
    { name: 'Toph', sub: 'Avatar: The Last Airbender', style: 'lorelei' },
    { name: 'Ben Tennyson', sub: 'Ben 10', style: 'adventurer' },
    { name: 'Robin', sub: 'Teen Titans', style: 'adventurer' },
    { name: 'Starfire', sub: 'Teen Titans', style: 'lorelei' },
    { name: 'Raven', sub: 'Teen Titans', style: 'lorelei' },
    { name: 'Cyborg', sub: 'Teen Titans', style: 'bottts' },
    { name: 'Beast Boy', sub: 'Teen Titans', style: 'adventurer' },
    { name: 'Bender', sub: 'Futurama', style: 'bottts' },
    { name: 'Fry', sub: 'Futurama', style: 'avataaars' },
    { name: 'Leela', sub: 'Futurama', style: 'lorelei' },
    { name: 'Homer Simpson', sub: 'The Simpsons', style: 'avataaars' },
    { name: 'Bart Simpson', sub: 'The Simpsons', style: 'avataaars' },
    { name: 'Finn', sub: 'Adventure Time', style: 'pixel-art' },
    { name: 'Jake', sub: 'Adventure Time', style: 'pixel-art' },
    { name: 'Marceline', sub: 'Adventure Time', style: 'lorelei' },
    { name: 'SpongeBob', sub: 'SpongeBob', style: 'pixel-art' },
    { name: 'Patrick Star', sub: 'SpongeBob', style: 'pixel-art' }
  ];
  cartoonLegends.forEach(cl => {
    addAvatar({
      id: `cartoon_${cl.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
      name: cl.name,
      cat: 'cartoons',
      sub: cl.sub,
      src: `https://api.dicebear.com/9.x/${cl.style}/svg?seed=${encodeURIComponent(cl.name)}&backgroundColor=${getHashColor(cl.name).replace('#','')}`,
      color: getHashColor(cl.name)
    });
  });

  console.log(`Successfully compiled ${avatars.length} total avatars across all categories!`);

  // Build Categories
  const CATEGORIES = [
    { id: 'all', label: 'All Avatars', icon: '🔥', count: avatars.length },
    { id: 'founders', label: 'Founders', icon: '👑', count: avatars.filter(a => a.cat === 'founders').length },
    { id: 'dicebear', label: 'DiceBear (v9.x)', icon: '🤖', count: avatars.filter(a => a.cat === 'dicebear').length },
    { id: 'pokemon', label: 'Pokémon (Animated)', icon: '⚡', count: avatars.filter(a => a.cat === 'pokemon').length },
    { id: 'superheroes', label: 'Superheroes', icon: '🛡️', count: avatars.filter(a => a.cat === 'superheroes').length },
    { id: 'anime', label: 'Anime & Manga', icon: '⚔️', count: avatars.filter(a => a.cat === 'anime').length },
    { id: 'gaming', label: 'Gaming & Minecraft', icon: '🎮', count: avatars.filter(a => a.cat === 'gaming').length },
    { id: 'cartoons', label: 'Cartoons & CN', icon: '📺', count: avatars.filter(a => a.cat === 'cartoons').length },
    { id: 'movies', label: 'Movies & Sci-Fi', icon: '🎬', count: avatars.filter(a => a.cat === 'movies').length },
    { id: 'tv', label: 'TV Series', icon: '🍿', count: avatars.filter(a => a.cat === 'tv').length }
  ];

  const catalogCode = `/**
 * Guess The Frame - Master Avatar Catalog (Online APIs & CDNs)
 * Auto-generated with ${avatars.length} characters across 10 categories
 * Zero local folder dependencies - all images backed by public CDNs + DiceBear v9.x fallback
 */
(function(window) {
  'use strict';

  const CATEGORIES = ${JSON.stringify(CATEGORIES, null, 2)};

  // Master Avatars List
  const AVATARS = ${JSON.stringify(avatars)};

  // Fast ID Lookup Map
  const AVATAR_LOOKUP = new Map();
  AVATARS.forEach(a => {
    AVATAR_LOOKUP.set(a.name.toLowerCase(), a);
    AVATAR_LOOKUP.set(a.id.toLowerCase(), a);
  });

  // Guarantee Core Founders explicitly
  ['aman', 'amish', 'aziz', 'vish', 'nolan'].forEach(cid => {
    const f = AVATARS.find(a => a.id === cid);
    if (f) {
      AVATAR_LOOKUP.set(cid, f);
      AVATAR_LOOKUP.set(f.name.toLowerCase(), f);
    }
  });

  const AvatarCatalog = {
    getCategories() {
      return CATEGORIES;
    },
    getAll() {
      return AVATARS;
    },
    getById(id) {
      if (!id) return AVATARS[0];
      const cleanId = String(id).trim().toLowerCase();
      return AVATAR_LOOKUP.get(cleanId) || AVATARS.find(a => a.id.toLowerCase() === cleanId || a.name.toLowerCase() === cleanId) || null;
    },
    search(query, category = 'all', limit = 120, offset = 0) {
      const q = (query || '').trim().toLowerCase();
      let results = AVATARS;

      if (category && category !== 'all') {
        results = results.filter(a => a.cat === category);
      }

      if (q) {
        results = results.filter(a => {
          return a.name.toLowerCase().includes(q) ||
                 a.sub.toLowerCase().includes(q) ||
                 (q === 'animated' && a.anim) ||
                 (q === 'pokemon' && a.cat === 'pokemon') ||
                 (q === 'dicebear' && a.cat === 'dicebear');
        });
      }

      return {
        total: results.length,
        items: results.slice(offset, offset + limit),
        hasMore: offset + limit < results.length
      };
    }
  };

  window.AvatarCatalog = AvatarCatalog;
})(typeof window !== 'undefined' ? window : this);
`;

  // Write to both js/avatar_catalog.js and scripts/avatar_catalog.js and sites/
  const destinations = [
    path.join(__dirname, '..', 'js', 'avatar_catalog.js'),
    path.join(__dirname, '..', 'scripts', 'avatar_catalog.js'),
    path.join(__dirname, '..', 'sites', 'guess-the-frame', 'js', 'avatar_catalog.js'),
    path.join(__dirname, '..', 'sites', 'guess-the-frame', 'scripts', 'avatar_catalog.js')
  ];

  destinations.forEach(dest => {
    const dir = path.dirname(dest);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(dest, catalogCode, 'utf-8');
    console.log(`Saved: ${dest} (${(catalogCode.length / 1024).toFixed(1)} KB)`);
  });

  console.log('Online catalog build completed successfully!');
}

build().catch(err => {
  console.error('Build error:', err);
  process.exit(1);
});
