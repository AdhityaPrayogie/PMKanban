import { MasterUnit } from '@/types';

export interface SimilarUnitMatch {
  unit: MasterUnit;
  matchType: 'exact' | 'similar';
  message: string;
}

export function checkUnitSimilarity(
  input: string,
  masterUnits: MasterUnit[]
): SimilarUnitMatch | null {
  const clean = input.trim().toUpperCase().replace(/^#/, '');
  if (!clean || clean.length < 2) return null;

  const cleanLower = clean.toLowerCase();

  // 1. Check exact match
  const exact = masterUnits.find(
    (u) =>
      u.code.toUpperCase() === clean ||
      u.name.trim().toLowerCase() === cleanLower
  );
  if (exact) {
    return {
      unit: exact,
      matchType: 'exact',
      message: `Unit "#${exact.code}" (${exact.name}) sudah ada di database.`,
    };
  }

  // 2. Check substring / containment match
  const substringMatch = masterUnits.find((u) => {
    const uCode = u.code.toLowerCase();
    const uName = u.name.toLowerCase();
    return (
      uCode.includes(cleanLower) ||
      cleanLower.includes(uCode) ||
      uName.includes(cleanLower) ||
      cleanLower.includes(uName)
    );
  });

  if (substringMatch) {
    return {
      unit: substringMatch,
      matchType: 'similar',
      message: `Ditemukan unit yang mirip: "#${substringMatch.code}" (${substringMatch.name}).`,
    };
  }

  // 3. Simple distance check for typos
  for (const u of masterUnits) {
    const uCode = u.code.toLowerCase();
    if (Math.abs(uCode.length - cleanLower.length) <= 2) {
      let diff = 0;
      for (let i = 0; i < Math.min(uCode.length, cleanLower.length); i++) {
        if (uCode[i] !== cleanLower[i]) diff++;
      }
      diff += Math.abs(uCode.length - cleanLower.length);
      if (diff <= 2) {
        return {
          unit: u,
          matchType: 'similar',
          message: `Mungkin maksud Anda unit: "#${u.code}" (${u.name})?`,
        };
      }
    }
  }

  return null;
}
