import { CASES } from './skins.js';

export const caseList = Object.entries(CASES).map(([name, data]) => ({
  name,
  image: data.image,
  skinCount: data.skins.length,
}));
