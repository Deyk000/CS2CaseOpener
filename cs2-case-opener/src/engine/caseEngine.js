import { getCaseById } from '../data/cases.js';
import { generateOpenResult } from './rng.js';
import { caseOpen } from '../api/client.js';

export async function openCase(caseId, userId) {
  const caseData = getCaseById(caseId);

  if (!caseData) {
    throw new Error(`Unknown case: ${caseId}`);
  }

  const result = generateOpenResult(caseData);

  if (userId) {
    await caseOpen(caseData.id, result.seed);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('case:opened', { detail: { caseId: caseData.id, result } }));
  }

  return result;
}
