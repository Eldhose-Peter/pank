import type { MinorUnits } from './types';

/**
 * Distributes a discrete remainder among sorted items deterministically.
 * Uses the Largest Remainder Method (Hare-Niemeyer method).
 */
export function distributeRemainder<T extends { id: string }>(
  items: T[],
  fractions: number[],
  baseAmounts: MinorUnits[],
  totalAmount: MinorUnits
): MinorUnits[] {
  const sumBase = baseAmounts.reduce((acc, curr) => acc + curr, 0);
  let remainder = totalAmount - sumBase;

  if (remainder === 0) {
    return [...baseAmounts];
  }

  // Calculate each item's fractional residue
  const residues = items.map((item, index) => ({
    index,
    id: item.id,
    fraction: fractions[index] - baseAmounts[index],
  }));

  // Sort descending by fractional residue, break ties lexicographically by item id
  residues.sort((a, b) => {
    if (Math.abs(b.fraction - a.fraction) > 1e-9) {
      return b.fraction - a.fraction;
    }
    return a.id.localeCompare(b.id);
  });

  const result = [...baseAmounts];

  // Distribute positive remainder (+1 to highest residues)
  if (remainder > 0) {
    for (let i = 0; i < remainder && i < residues.length; i++) {
      result[residues[i].index] += 1;
    }
  } else if (remainder < 0) {
    // Distribute negative remainder (-1 to lowest residues)
    const negativeResidues = [...residues].reverse();
    for (let i = 0; i < Math.abs(remainder) && i < negativeResidues.length; i++) {
      result[negativeResidues[i].index] -= 1;
    }
  }

  return result;
}
