const caseModules = import.meta.glob('./cases/*.js', { eager: true });

const loadedCases = Object.values(caseModules)
  .map((module) => Object.values(module).find((value) => value && value.name && value.image && Array.isArray(value.skins)))
  .filter(Boolean);

export const CASES = Object.fromEntries(loadedCases.map((caseData) => [caseData.name, caseData]));
