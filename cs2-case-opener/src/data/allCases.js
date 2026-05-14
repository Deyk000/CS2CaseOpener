import { chromaCase } from './cases/chroma.js';
import { dreamsCase } from './cases/dreams.js';
import { falchionCase } from './cases/falchion.js';
import { kilowattCase } from './cases/kilowatt.js';
import { operationRiptideCase } from './cases/operation_riptide.js';
import { prismaCase } from './cases/prisma.js';
import { recoilCase } from './cases/recoil.js';
import { revolutionCase } from './cases/revolution.js';

const loadedCases = [
  chromaCase,
  dreamsCase,
  falchionCase,
  kilowattCase,
  operationRiptideCase,
  prismaCase,
  recoilCase,
  revolutionCase,
];

export const CASES = Object.fromEntries(loadedCases.map((caseData) => [caseData.name, caseData]));
