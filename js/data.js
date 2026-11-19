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
};

export const QUESTS = [
  {
    id: 'q1', name: 'Husks at the Fence', giver: 'edda', req: null,
    text: 'Adventurer! Good timing. The Hollow mist rolled over Millbrook Farms last night and the farmhands... changed. Hollow Husks are shambling along the fences to the east. Put six of them to rest before they reach the village.',
    progressText: 'The husks are still out there. East, past the windmill.',
    doneText: 'Six fewer husks. You fight like a Dawnward, even if you don\'t dress like one. Take these gauntlets, and go and see Pip — the beacon is flickering.',
    objectives: [{ type: 'kill', enemy: 'husk', count: 6, label: 'Hollow Husks put to rest' }],
    reward: { xp: 150, gold: 40, item: { slot: 'hands', rarity: 1, ilvl: 3, name: 'Dawnward Gauntlets' } },
    hint: [27, 4],
  },
  {
    id: 'q2', name: 'Pip\'s Missing Oil', giver: 'pip', req: 'q1',
    text: 'Oh! Oh good, a hero. The beacon needs Shardlamp Oil or the mist creeps right in. I hid my spare flasks in the Old Graveyard to the north... it seemed clever at the time. Now the bones are up and walking. Could you fetch four flasks?',
    progressText: 'Four flasks, in the graveyard to the north. Mind the skeletons!',
    doneText: 'You found them! The beacon will burn bright tonight. Here — healing draughts, my own recipe. Mostly safe.',
    objectives: [{ type: 'collect', item: 'oil', count: 4, label: 'Shardlamp Oil found' }],
    reward: { xp: 300, gold: 60, potions: 3 },
    hint: [2, -33],
  },
  {
    id: 'q3', name: 'Whispers in the Woods', giver: 'edda', req: 'q2',
    text: 'Someone is stealing Shards from the wayside shrines. Tracks lead west into Thornwood, to a bandit camp run by a brute called Grubb. Break the camp and bring Grubb down. He hits hard — when the ground glows red under him, get out of the way.',
    progressText: 'Grubb\'s camp is west, in Thornwood. Watch for his ground slam.',
    doneText: 'Grubb was selling Shards to someone in a grey mask... That is worse news than bandits. Take this blade. You have earned it.',
    objectives: [{ type: 'kill', enemy: 'bandit', count: 4, label: 'Thornwood Bandits defeated' }, { type: 'kill', enemy: 'grubb', count: 1, label: 'Grubb defeated' }],
    reward: { xp: 650, gold: 110, item: { slot: 'mainhand', rarity: 2, ilvl: 6, name: 'Thornwood Reaver' } },
    hint: [-31, 8],
  },
  {
    id: 'q4', name: 'The Corrupted Shrine', giver: 'edda', req: 'q3',
    text: 'Old Mother Bramble sent word: the Thornkin shrine south of here has gone dark. Something Hollow has taken root there — a Wraith, fed on stolen Shards. Destroy it, and the shrine can be cleansed. Dodge the red circles it calls down.',
    progressText: 'The shrine is south, along the forest path. Dodge the red circles.',
    doneText: 'The shrine burns clean again. But Bramble had a vision when it broke: a crown with no light, and a voice saying "Maldren rises". Rest now, Warden. Greenhollow owes you.',
    objectives: [{ type: 'kill', enemy: 'wraith', count: 1, label: 'Shrine Wraith destroyed' }],
    reward: { xp: 1100, gold: 220, item: { slot: 'offhand', rarity: 3, ilvl: 8, name: 'Lantern-Warden\'s Aegis' } },
    hint: [-8, 34],
  },
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
