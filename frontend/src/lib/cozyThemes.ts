export type CozySceneMood = {
  effect: 'rain' | 'snow' | 'lamplight' | 'mist' | 'sunlight' | 'twilight';
  label: string;
  position: string;
};

const sceneMoods: Record<string, CozySceneMood> = {
  rain: { effect: 'rain', label: 'Rain on glass', position: '68% 26%' },
  library: { effect: 'lamplight', label: 'Soft lamplight', position: '72% 60%' },
  snow: { effect: 'snow', label: 'Drifting snow', position: '60% 24%' },
  tea: { effect: 'lamplight', label: 'Lantern glow', position: '55% 64%' },
  bakery: { effect: 'sunlight', label: 'Warm morning light', position: '28% 22%' },
  linen: { effect: 'sunlight', label: 'Soft daylight', position: '26% 22%' },
  forest: { effect: 'mist', label: 'Low forest mist', position: '50% 73%' },
  lake: { effect: 'twilight', label: 'Blue hour', position: '69% 24%' },
  canyon: { effect: 'sunlight', label: 'Last sunlight', position: '76% 24%' },
};

export function getCozySceneMood(art: string): CozySceneMood | undefined {
  return sceneMoods[art];
}

type CozyGroup = 'Reading rooms' | 'Rain & snow' | 'Quiet mornings' | 'Outdoors' | 'Still colors';

interface CozyTheme {
  id: string;
  name: string;
  group: CozyGroup;
  art: string;
  glow: string;
  base: string;
}

const themes: [string, string, CozyGroup, string, string, string][] = [
  ['walnut-window', 'Walnut Window', 'Rain & snow', 'rain', '#a8794e', '#1b1915'],
  ['moss-library', 'Moss Library', 'Reading rooms', 'library', '#77917e', '#161d17'],
  ['snow-cabin', 'Snow Cabin', 'Rain & snow', 'snow', '#9d8070', '#27211e'],
  ['tea-at-dusk', 'Tea at Dusk', 'Reading rooms', 'tea', '#a99261', '#211d16'],
  ['early-bakery', 'Early Bakery', 'Quiet mornings', 'bakery', '#bf8a66', '#291b15'],
  ['linen-desk', 'Linen Desk', 'Quiet mornings', 'linen', '#baaa82', '#28261e'],
  ['fern-path', 'Fern Path', 'Outdoors', 'forest', '#839b6a', '#141e19'],
  ['violet-lake', 'Violet Lake', 'Outdoors', 'lake', '#8d82ba', '#201b2b'],
  ['rose-canyon', 'Rose Canyon', 'Outdoors', 'canyon', '#b97f72', '#2a1d24'],
  ['after-hours', 'Library After Hours', 'Reading rooms', 'library', '#9a7658', '#201813'],
  ['silver-rain', 'Silver Rain', 'Rain & snow', 'rain', '#8493ac', '#141e29'],
  ['blue-hour-snow', 'Blue Hour Snow', 'Rain & snow', 'snow', '#88a6c4', '#19232d'],
  ['garden-in-july', 'Garden in July', 'Reading rooms', 'tea', '#7d9976', '#17251b'],
  ['cinnamon-corner', 'Cinnamon Corner', 'Quiet mornings', 'bakery', '#ce956d', '#2b1f19'],
  ['first-light', 'First Light', 'Quiet mornings', 'linen', '#d3ae70', '#282218'],
  ['pine-mist', 'Pine Mist', 'Outdoors', 'forest', '#89aaa3', '#172424'],
  ['lake-after-rain', 'Lake After Rain', 'Outdoors', 'lake', '#7d9eae', '#18232b'],
  ['last-light', 'Last Light', 'Outdoors', 'canyon', '#cb8e54', '#281c14'],
  ['paper-and-ink', 'Paper & Ink', 'Still colors', '', '#baab8f', '#292820'],
  ['warm-graphite', 'Warm Graphite', 'Still colors', '', '#8b8580', '#242222'],
  ['roasted-cocoa', 'Roasted Cocoa', 'Still colors', '', '#ac795d', '#281b19'],
  ['soft-sage', 'Soft Sage', 'Still colors', '', '#8fa88f', '#1d2a22'],
  ['late-night-indigo', 'Late Night Indigo', 'Still colors', '', '#6b84b9', '#192033'],
  ['dusted-plum', 'Dusted Plum', 'Still colors', '', '#a283a2', '#302332'],
  ['quiet-terracotta', 'Quiet Terracotta', 'Still colors', '', '#bf8870', '#332019'],
  ['ochre-paper', 'Ochre Paper', 'Still colors', '', '#c4a365', '#30271a'],
  ['lavender-dusk', 'Lavender Dusk', 'Still colors', '', '#a495ca', '#27213b'],
  ['coastal-grey', 'Coastal Grey', 'Still colors', '', '#8ba4b0', '#232c34'],
  ['porcelain-blue', 'Porcelain Blue', 'Still colors', '', '#7e9fc4', '#1c293b'],
  ['cedar-and-smoke', 'Cedar & Smoke', 'Still colors', '', '#a78d68', '#28231a'],
  ['warmed-rose', 'Warmed Rose', 'Still colors', '', '#c38c98', '#35252f'],
  ['ink-and-jade', 'Ink & Jade', 'Still colors', '', '#74aa99', '#182a2c'],
];

export const COZY_THEMES: CozyTheme[] = themes.map(([id, name, group, art, glow, base]) => ({
  id, name, group, art, glow, base,
}));

export function cozyGradient(glow: string, base: string) {
  return `radial-gradient(ellipse at 75% 4%, ${glow}70, transparent 64%), radial-gradient(ellipse at 0% 90%, ${glow}30, transparent 65%), linear-gradient(130deg, ${base}, #171514)`;
}
