// Shards of Vael — game data (original IP)
export const RARITY = [
  { id: 'common', name: 'Common', color: '#cfcfcf', hex: 0xcfcfcf },
  { id: 'uncommon', name: 'Uncommon', color: '#3fe05a', hex: 0x3fe05a },
  { id: 'rare', name: 'Rare', color: '#4a90ff', hex: 0x4a90ff },
  { id: 'epic', name: 'Epic', color: '#b866ff', hex: 0xb866ff },
  { id: 'legendary', name: 'Legendary', color: '#ff9d2a', hex: 0xff9d2a },
];
export const SLOTS = ['head', 'shoulders', 'chest', 'hands', 'legs', 'feet', 'mainhand', 'offhand', 'ring', 'trinket'];
export const SLOT_NAMES = { head: 'Head', shoulders: 'Shoulders', chest: 'Chest', hands: 'Hands', legs: 'Legs', feet: 'Feet', mainhand: 'Main hand', offhand: 'Off hand', ring: 'Ring', trinket: 'Trinket' };
export const SLOT_ICONS = { head: '🪖', shoulders: '🧥', trinket: '🔮', chest: '👕', hands: '🧤', legs: '👖', feet: '🥾', mainhand: '⚔️', offhand: '🛡️', ring: '💍' };
export const STAT_NAMES = { dmg: 'Damage', armor: 'Armour', might: 'Might', stamina: 'Stamina', crit: 'Crit %', haste: 'Haste %' };

const BASES = {
  head: ['Cap', 'Helm', 'Coif'], shoulders: ['Pauldrons', 'Spaulders', 'Mantle'], trinket: ['Charm', 'Idol', 'Talisman'], chest: ['Tunic', 'Hauberk', 'Jerkin'], hands: ['Gloves', 'Gauntlets', 'Grips'],
  legs: ['Leggings', 'Greaves', 'Trousers'], feet: ['Boots', 'Sabatons', 'Treads'], mainhand: ['Sword', 'Blade', 'Longsword'],
  offhand: ['Buckler', 'Kite Shield', 'Heater Shield'], ring: ['Band', 'Ring', 'Signet'],
};
const PRE = [['Worn', 'Rough', 'Plain', 'Patched'], ['Sturdy', 'Militia', 'Farmhand\'s', 'Riverstone'], ['Dawnward', 'Hollowbane', 'Thornwood', 'Lamplit'], ['Shardforged', 'Moonlit', 'Unbroken', 'Lanternheart']];
const SUF = ['', ' of the Bear', ' of the Ox', ' of the Fox', ' of the Owl', ' of Embers'];
const ARMOR_K = { shoulders: 0.8, trinket: 0, head: 0.9, chest: 1.4, hands: 0.7, legs: 1.1, feet: 0.8, offhand: 1.6, ring: 0, mainhand: 0 };

let uid = 1;
export function newId() { return 'i' + Date.now().toString(36) + (uid++); }

export function makeItem(slot, rarity, ilvl, rnd = Math.random, forcedName) {
  const r = rarity;
  const it = { id: newId(), slot, rarity: r, ilvl, stats: {} };
  if (slot === 'mainhand') it.stats.dmg = Math.round(3 + ilvl * 1.6 * (1 + 0.25 * r));
  else if (ARMOR_K[slot] > 0) it.stats.armor = Math.max(1, Math.round((1.5 + ilvl * 1.3) * ARMOR_K[slot] * (1 + 0.25 * r)));
  const pool = ['might', 'stamina', 'crit', 'haste'];
  const n = (slot === 'ring' || slot === 'trinket') ? Math.max(1, r + 1) : r;
  for (let i = 0; i < n && pool.length; i++) {
    const k = pool.splice(Math.floor(rnd() * pool.length), 1)[0];
    let v = (k === 'crit' || k === 'haste') ? Math.max(1, Math.round(ilvl * 0.45 * (0.8 + rnd() * 0.4) + r * 0.5)) : Math.max(1, Math.round((1 + ilvl * 0.9) * (0.8 + rnd() * 0.4)));
    it.stats[k] = v;
  }
  if (forcedName) it.name = forcedName;
  else {
    const base = BASES[slot][Math.floor(rnd() * BASES[slot].length)];
    const pre = PRE[Math.min(3, r)][Math.floor(rnd() * 4)];
    const suf = r === 1 ? SUF[1 + Math.floor(rnd() * (SUF.length - 1))] : '';
    it.name = `${pre} ${base}${suf}`;
  }
  it.value = Math.round((ilvl * 3 + 4) * (1 + Math.pow(r, 1.6)));
  return it;
}

export function rollRarity(bonus = 0, rnd = Math.random) {
  const x = rnd() * 100 - bonus;
  if (x < 3) return 3; if (x < 15) return 2; if (x < 45) return 1; return 0;
}
export function randomSlot(rnd = Math.random) { return SLOTS[Math.floor(rnd() * SLOTS.length)]; }

export const ENEMIES = {
  husk: { name: 'Hollow Husk', model: 'chars/character-zombie', level: 1, hp: 45, dmg: 6, speed: 2.4, aggro: 7, xp: 22, gold: [2, 5], drop: 0.28, scale: 1.0 },
  skeleton: { name: 'Restless Bones', model: 'grave/character-skeleton', level: 3, hp: 80, dmg: 9, speed: 3.0, aggro: 7.5, xp: 40, gold: [4, 9], drop: 0.32, scale: 1.0 },
  bandit: { name: 'Thornwood Bandit', model: 'chars/character-raider', level: 4, hp: 105, dmg: 10, speed: 3.4, aggro: 8, xp: 55, gold: [6, 12], drop: 0.35, scale: 1.0 },
  grubb: { name: 'Grubb the Pilferer', model: 'chars/character-raider', level: 5, hp: 680, dmg: 15, speed: 3.3, aggro: 9, xp: 320, gold: [40, 60], drop: 1, minRarity: 2, scale: 1.45, elite: true, slam: { every: 7.5, radius: 3.4, dmg: 26, windup: 1.75 }, tint: 0x6a1b1b },
  ghost: { name: 'Shrine Shade', model: 'grave/character-ghost', level: 5, hp: 100, dmg: 12, speed: 3.3, aggro: 8, xp: 60, gold: [6, 12], drop: 0.35, scale: 1.0 },
  ashhusk: { name: 'Ash-Choked Husk', model: 'chars/character-zombie', level: 6, hp: 140, dmg: 13, speed: 2.6, aggro: 8, xp: 70, gold: [8, 14], drop: 0.3, scale: 1.05, tint: 0x2a2622 },
  millbones: { name: 'Mill Crypt Guard', model: 'grave/character-skeleton', level: 6, hp: 170, dmg: 14, speed: 3.0, aggro: 8, xp: 80, gold: [9, 15], drop: 0.32, scale: 1.1, tint: 0x3a2a10 },
  brute: { name: 'Ashen Brute', model: 'dun/character-orc', level: 7, hp: 380, dmg: 19, speed: 2.8, aggro: 8.5, xp: 120, gold: [14, 22], drop: 0.5, scale: 1.3, slam: { every: 9, radius: 2.6, dmg: 24, windup: 1.6 } },
  grinder: { name: 'The Bone Grinder', model: 'grave/character-skeleton', level: 7, hp: 2400, dmg: 19, speed: 2.9, aggro: 9, xp: 420, gold: [60, 90], drop: 1, minRarity: 2, scale: 1.9, boss: true, lootPrefix: 'Grinder\'s', slam: { every: 7.5, radius: 3.2, dmg: 28, windup: 1.8 }, summon: [0.5], summonType: 'millbones', summonText: 'The Bone Grinder rattles, and the crypt guards rise!' },
  ashmatron: { name: 'The Ash Matron', model: 'grave/character-ghost', level: 7, hp: 3000, dmg: 20, speed: 3.0, aggro: 9, xp: 520, gold: [80, 110], drop: 1, minRarity: 3, scale: 2.1, boss: true, lootPrefix: 'Cinder', tint: 0x2a1a12, rain: { every: 7, radius: 2.5, dmg: 26, windup: 1.9 }, summon: [0.6, 0.3], summonType: 'ashhusk', summonText: 'The Ash Matron breathes, and the husks stir in the cinders!' },
  greywarden: { name: 'The Grey Warden', model: 'chars/character-knight', level: 9, hp: 7200, dmg: 28, gear: true, lootPrefix: 'Ashen', speed: 3.4, aggro: 11, xp: 900, gold: [160, 220], drop: 1, minRarity: 3, scale: 1.9, boss: true, tint: 0x1c1c22, slam: { every: 8, radius: 3.6, dmg: 42, windup: 1.8 }, rain: { every: 9, radius: 2.4, dmg: 32, windup: 1.9, below: 0.5 }, summon: [0.66, 0.33], summonType: 'ashhusk', summonText: 'The Grey Warden calls the ash-choked dead!', enrage: 0.25 },
  wraith: { name: 'The Shrine Wraith', model: 'grave/character-ghost', level: 6, hp: 1350, dmg: 17, speed: 3.0, aggro: 10, xp: 650, gold: [90, 120], drop: 1, minRarity: 3, scale: 2.0, boss: true, rain: { every: 7.5, radius: 2.5, dmg: 28, windup: 1.9 }, summon: [0.6, 0.3], tint: 0x5b2a9a },
};

export function xpToNext(level) { return Math.round(80 * Math.pow(level, 1.7) + 20 * level); }
export const LEVEL_CAP = 10;

export const SKILLS = [
  { id: 'bash', name: 'Shield Bash', icon: '🛡️', key: '1', level: 1, cd: 5, cost: 0, range: 2.4, desc: 'Slam your shield into the target: 150% damage and a 1.5s stun. Builds 15 Resolve.' },
  { id: 'cleave', name: 'Cleave', icon: '🌀', key: '2', level: 2, cd: 7, cost: 25, range: 3.2, desc: 'Spin and hit every enemy around you for 120% damage. Costs 25 Resolve.' },
  { id: 'charge', name: 'Charge', icon: '💨', key: '3', level: 3, cd: 10, cost: 0, range: 14, desc: 'Rush to a target up to 14m away, hitting and stunning it for 1s. Builds 20 Resolve.' },
  { id: 'wind', name: 'Second Wind', icon: '💚', key: '4', level: 4, cd: 30, cost: 40, range: 0, desc: 'Heal 35% of your health and take 40% less damage for 5s. Costs 40 Resolve.' },
];

export const NPCS = {
  edda: { name: 'Captain Edda Thorne', title: 'Dawnward Captain', model: 'chars/character-soldier', pos: [3.5, -2.5], rot: -0.6 },
  pip: { name: 'Pip Wickerly', title: 'Lamplighter & Goods', model: 'chars/character-male-c', pos: [-5.2, 3.2], rot: 0.9, scale: 0.8, vendor: true },
  marla: { name: 'Marla Reed', title: 'Farmer', model: 'chars/character-female-b', pos: [16, 1.5], rot: 1.6 },
  caldus: { name: 'Sir Caldus', title: 'Knight of the Dawnward', model: 'chars/character-knight', pos: [-4.6, -4.9], rot: 0.7, gear: true, mul: 0xc8b48a },
};

export const QUESTS = [
  {
    id: 'q1', name: 'Husks at the Fence', giver: 'edda', req: null,
    text: 'You. Sellsword. You have a blade, so you will do. The Hollow came over Millbrook Farms in the night, and the farmhands did not wake as themselves. They walk the fences now, grey and hungry, with lamplight eyes. Put six of them to rest before they reach the village. Do not hesitate. They are not who they were.',
    progressText: 'The husks still walk the eastern fences, past the windmill. End it quickly.',
    doneText: 'Six fewer. Good. You did not flinch, and that is rarer than courage. Take these gauntlets. Then go to Pip: the beacon is guttering, and when it dies, the mist comes in.',
    objectives: [{ type: 'kill', enemy: 'husk', count: 6, label: 'Hollow Husks put to rest' }],
    reward: { xp: 150, gold: 40, item: { slot: 'hands', rarity: 1, ilvl: 3, name: 'Dawnward Gauntlets' } },
    hint: [27, 4],
  },
  {
    id: 'q2', name: 'Pip\'s Missing Oil', giver: 'pip', req: 'q1',
    text: 'The beacon drinks Shardlamp oil, and I am down to the dregs. I hid my spare flasks in the Old Graveyard, because who robs a graveyard? Then the dead got up. They are still up. Four flasks. Please. If the light goes out tonight, none of us see morning.',
    progressText: 'Four flasks, somewhere among the graves to the north. The bones do not sleep.',
    doneText: 'You came back. People don\'t always. The beacon will burn tonight. Take these draughts. They taste of tar and graves, but they will keep your heart beating.',
    objectives: [{ type: 'collect', item: 'oil', count: 4, label: 'Shardlamp Oil recovered' }],
    reward: { xp: 300, gold: 60, potions: 3 },
    hint: [2, -33],
  },
  {
    id: 'q3', name: 'Whispers in the Woods', giver: 'edda', req: 'q2',
    text: 'Someone has been prying Shards from the wayside shrines, and every stolen Shard is a door left open for the Hollow. The tracks lead west into Thornwood, to a camp of cutthroats under a brute called Grubb. Break the camp. Bring Grubb down. When the ground burns red beneath him, move, or be buried.',
    progressText: 'Grubb\'s camp lies west, in Thornwood. Watch for the red ground before his slam.',
    doneText: 'Grubb was selling the Shards to a rider in a grey mask. A buyer who pays in silver for stolen light... that is no bandit. That is the Hollow Court. Take this blade. You will need it before the end.',
    objectives: [{ type: 'kill', enemy: 'bandit', count: 4, label: 'Thornwood Bandits defeated' }, { type: 'kill', enemy: 'grubb', count: 1, label: 'Grubb defeated' }],
    reward: { xp: 650, gold: 110, item: { slot: 'mainhand', rarity: 2, ilvl: 6, name: 'Thornwood Reaver' } },
    hint: [-31, 8],
  },
  {
    id: 'q4', name: 'The Corrupted Shrine', giver: 'edda', req: 'q3',
    text: 'Old Mother Bramble sent a crow with a single word: "Rot." The Thornkin shrine to the south has gone dark. A Wraith has nested there, swollen on stolen Shard light. Destroy it, and the shrine may yet be cleansed. When it calls fire down from the sky, keep moving.',
    progressText: 'The shrine lies south, down the forest path. Never stand still in the red.',
    doneText: 'The shrine burns clean again, but not before Bramble saw something in the dying light: a crown with no light in it, and a cold voice that said "the Unlit King stirs." Rest a moment, Warden. Someone is waiting to speak with you, and he is not patient.',
    objectives: [{ type: 'kill', enemy: 'wraith', count: 1, label: 'Shrine Wraith destroyed' }],
    reward: { xp: 1100, gold: 220, item: { slot: 'offhand', rarity: 3, ilvl: 8, name: 'Lantern-Warden\'s Aegis' } },
    hint: [-8, 34],
  },
  {
    id: 'qc', name: 'Sir Caldus Disagrees', giver: 'caldus', req: 'q4', choice: true,
    text: 'So you are the hired sword who cleansed the Thornkin shrine. You took a Shard from that altar. That Shard belongs to the Dawnward, by law and by blood. The forest clans cannot even guard their own trees. Give it to me, and it will be locked in Greenhollow\'s beacon where it belongs. Or give it back to the tortoise and her crows, and see how long it lasts.',
    progressText: 'Well? The Shard. Decide.',
    doneText: '',
    objectives: [{ type: 'choice', count: 1, label: 'Decide who keeps the Shrine Shard' }],
    choices: {
      dawnward: { label: 'Hand the Shard to Sir Caldus (Dawnward)', doneText: 'A sensible choice. The beacon will burn brighter for it, and the Dawnward will remember who chose order over sentiment. Wear this. It marks you as one of ours, whether the forest likes it or not.', reward: { xp: 700, gold: 150, item: { slot: 'ring', rarity: 3, ilvl: 8, name: 'Signet of the Dawnward' } } },
      thornkin: { label: 'Return the Shard to the shrine (Thornkin)', doneText: 'You would give a Shard back to the trees? ...Very well. Bramble sends you this, by way of a crow that would not stop staring at me. I hope you know what you have done. The Dawnward will remember it.', reward: { xp: 700, gold: 60, potions: 3, item: { slot: 'trinket', rarity: 3, ilvl: 8, name: 'Bramble\'s Heartseed' } } },
    },
    reward: { xp: 700, gold: 0 },
    hint: [-4.6, -4.9],
  },
  {
    id: 'q5', name: 'The Mill of Ashes', giver: 'edda', req: 'qc',
    text: 'One more thing, and it is the worst. The old mill by the windmill has been grinding at night, and the miller has not been seen in a week. Grey ash pours from the cellar. The Grey Warden, Grubb\'s masked buyer, went down there and has not come up. Three things guard that dark: the Bone Grinder, the Ash Matron, and the Warden itself. Go down. End them. You go alone, so take every draught you can carry.',
    progressText: 'The cellar door glows beside the windmill, east of the village. Level 6 or higher, and bring draughts.',
    doneText: 'The Grey Warden is beaten. But the mask crumbled to ash in your hands, and there was no body beneath it. Whoever wore it is still out there. Greenhollow owes you its life, Warden. I fear it will need you again.',
    objectives: [{ type: 'kill', enemy: 'grinder', count: 1, label: 'The Bone Grinder destroyed' }, { type: 'kill', enemy: 'ashmatron', count: 1, label: 'The Ash Matron destroyed' }, { type: 'kill', enemy: 'greywarden', count: 1, label: 'The Grey Warden defeated' }],
    reward: { xp: 1600, gold: 300, item: { slot: 'mainhand', rarity: 3, ilvl: 9, name: 'Ashen Oathblade' } },
    hint: [14.5, -7.5],
  },
];

// Warden talents: one point per level from level 2. Tier 2 needs 2 points in that tree, tier 3 needs 3.
export const TALENT_TREES = [
  { id: 'Bulwark', blurb: 'Pure defence' },
  { id: 'Vanguard', blurb: 'Hit back hard' },
  { id: 'Oathkeeper', blurb: 'Endure (solo build)' },
];
export const TALENTS = [
  { id: 'plate', tree: 'Bulwark', tier: 1, max: 2, name: 'Thick Plate', icon: '🛡️', desc: '+10% armour per point.' },
  { id: 'shieldwall', tree: 'Bulwark', tier: 2, max: 1, name: 'Shield Wall', icon: '🧱', desc: 'Shield Bash stuns for 1s longer and recharges 1s faster.' },
  { id: 'unbreak', tree: 'Bulwark', tier: 3, max: 1, name: 'Unbreakable', icon: '💎', desc: 'Once per fight, a hit that would defeat you leaves you standing and heals 25% of your health.' },
  { id: 'heavy', tree: 'Vanguard', tier: 1, max: 3, name: 'Heavy Blows', icon: '🔨', desc: '+5% damage per point.' },
  { id: 'whirl', tree: 'Vanguard', tier: 2, max: 1, name: 'Whirlwind', icon: '🌪️', desc: 'Cleave reaches 1m further and costs 10 less Resolve.' },
  { id: 'bloodrush', tree: 'Vanguard', tier: 3, max: 1, name: 'Bloodrush', icon: '🩸', desc: 'Charge recharges 4s faster and hits for 200% damage.' },
  { id: 'vigor', tree: 'Oathkeeper', tier: 1, max: 2, name: 'Vigour', icon: '❤️', desc: '+8% maximum health per point.' },
  { id: 'breath', tree: 'Oathkeeper', tier: 2, max: 1, name: 'Deep Breath', icon: '🌬️', desc: 'Second Wind heals 50% instead of 35% and recharges 10s faster.' },
  { id: 'renew', tree: 'Oathkeeper', tier: 3, max: 1, name: 'Renewing Strikes', icon: '✨', desc: 'Your auto-attacks heal you for 20% of the damage they deal.' },
];

export const VENDOR_STOCK = [
  { kind: 'potion', name: 'Minor Healing Draught', price: 20 },
  { kind: 'item', price: 70, item: { slot: 'head', rarity: 1, ilvl: 3, name: 'Militia Helm' } },
  { kind: 'item', price: 90, item: { slot: 'feet', rarity: 1, ilvl: 4, name: 'Millbrook Boots' } },
  { kind: 'item', price: 120, item: { slot: 'legs', rarity: 1, ilvl: 4, name: 'Riverstone Greaves' } },
  { kind: 'item', price: 160, item: { slot: 'mainhand', rarity: 1, ilvl: 5, name: 'Iron Longsword' } },
  { kind: 'item', price: 100, item: { slot: 'shoulders', rarity: 1, ilvl: 4, name: 'Dawnward Pauldrons' } },
  { kind: 'item', price: 260, item: { slot: 'ring', rarity: 2, ilvl: 5, name: 'Lamplighter\'s Band' } },
  { kind: 'item', price: 240, item: { slot: 'trinket', rarity: 2, ilvl: 5, name: 'Pip\'s Lucky Wick' } },
];

// Grim look per enemy: colour multiply (mul), glowing eyes, the colour of hit particles (blood is stylised dark-red droplets, no gore), and boss titles.
const GRIM = {
  husk: { mul: 0x9aa095, eyes: 0xd02010, blood: 0x3a1410 },
  skeleton: { mul: 0xbab2a0, eyes: 0x60c0ff, dust: 0x8a8478 },
  bandit: { mul: 0xa88070, blood: 0x6a0a06 },
  grubb: { mul: 0x9a6a58, blood: 0x6a0a06, title: 'Fence of Stolen Shards' },
  ghost: { eyes: 0x9fe0ff, dust: 0x6aa0c0 },
  ashhusk: { mul: 0x6a6460, eyes: 0xff5a10, dust: 0x5a5450 },
  millbones: { mul: 0x9a8a70, eyes: 0xff7a20, dust: 0x8a7a60 },
  brute: { mul: 0x8a8078, eyes: 0xff3010, blood: 0x4a0806 },
  grinder: { mul: 0xf0e4c8, eyes: 0xff7a20, dust: 0x9a8a70, title: 'Keeper of the Lower Stones' },
  ashmatron: { eyes: 0xff5a10, dust: 0x5a4a40, title: 'She Who Sifts the Ash' },
  greywarden: { mul: 0x5a5a64, eyes: 0xff2a10, dust: 0x4a4a50, title: 'Masked Commander of the Hollow Court' },
  wraith: { eyes: 0xc070ff, dust: 0x8a6ab0, title: 'Hunger of the Broken Shrine' },
};
for (const k in GRIM) Object.assign(ENEMIES[k], GRIM[k]);
