import type { NameResolutionResult, UnresolvedName, ExtractedPayer, ExtractedParticipant } from './types';
import type { MinorUnits } from '@/modules/accounting/types';

export interface GroupMemberCandidate {
  id: string;
  displayName: string;
  userId: string | null;
  isCurrentUser: boolean;
}

/**
 * Calculates normalized Levenshtein distance similarity between two strings (0.0 to 1.0).
 */
export function stringSimilarity(s1: string, s2: string): number {
  const a = s1.trim().toLowerCase();
  const b = s2.trim().toLowerCase();

  if (a === b) return 1.0;
  if (a.length === 0 || b.length === 0) return 0.0;

  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  const distance = matrix[b.length][a.length];
  const maxLen = Math.max(a.length, b.length);
  return Math.max(0, 1 - distance / maxLen);
}

export class MemberResolver {
  /**
   * Resolves raw names extracted from natural language to actual group member IDs.
   */
  static resolveMembers(
    extractedPayers: ExtractedPayer[],
    extractedParticipants: ExtractedParticipant[],
    members: GroupMemberCandidate[],
    currentMemberId: string,
    minorUnitMultiplier: number = 100 // major units to minor units (e.g. ₹ to paise = * 100)
  ): NameResolutionResult {
    const resolvedPayers: { groupMemberId: string; amountPaid: MinorUnits }[] = [];
    const resolvedParticipants: { groupMemberId: string; splitValue?: number }[] = [];
    const unresolvedNames: UnresolvedName[] = [];
    const ambiguousMatches: { rawName: string; candidates: { groupMemberId: string; displayName: string }[] }[] = [];

    const resolveSingleName = (rawName: string): GroupMemberCandidate | null => {
      const cleanName = rawName.trim().toLowerCase();

      // 1. Current user alias
      if (['me', 'i', 'myself', 'my', 'mine', 'self'].includes(cleanName)) {
        const current = members.find((m) => m.id === currentMemberId || m.isCurrentUser);
        if (current) return current;
      }

      // 2. Exact match (case-insensitive)
      const exactMatch = members.find((m) => m.displayName.trim().toLowerCase() === cleanName);
      if (exactMatch) return exactMatch;

      // 3. First name match (e.g. "Rahul" matches "Rahul Sharma")
      const firstNameMatches = members.filter((m) => {
        const parts = m.displayName.trim().toLowerCase().split(/\s+/);
        return parts[0] === cleanName;
      });

      if (firstNameMatches.length === 1) {
        return firstNameMatches[0];
      } else if (firstNameMatches.length > 1) {
        ambiguousMatches.push({
          rawName,
          candidates: firstNameMatches.map((m) => ({ groupMemberId: m.id, displayName: m.displayName })),
        });
        return null;
      }

      // 4. Fuzzy match with threshold >= 0.75 (against full name or first name tokens)
      const scored = members.map((m) => {
        const fullScore = stringSimilarity(cleanName, m.displayName);
        const nameTokens = m.displayName.trim().split(/\s+/);
        const tokenScores = nameTokens.map((t) => stringSimilarity(cleanName, t));
        const maxScore = Math.max(fullScore, ...tokenScores);
        return {
          member: m,
          score: maxScore,
        };
      }).filter((s) => s.score >= 0.75);

      scored.sort((a, b) => b.score - a.score);

      if (scored.length === 1) {
        return scored[0].member;
      } else if (scored.length > 1 && scored[0].score - scored[1].score > 0.15) {
        // Clear winner
        return scored[0].member;
      } else if (scored.length > 1) {
        ambiguousMatches.push({
          rawName,
          candidates: scored.map((s) => ({ groupMemberId: s.member.id, displayName: s.member.displayName })),
        });
        return null;
      }

      // 5. Unresolved
      const suggestions = members
        .map((m) => {
          const fullScore = stringSimilarity(cleanName, m.displayName);
          const nameTokens = m.displayName.trim().split(/\s+/);
          const tokenScores = nameTokens.map((t) => stringSimilarity(cleanName, t));
          return {
            groupMemberId: m.id,
            displayName: m.displayName,
            similarity: Math.max(fullScore, ...tokenScores),
          };
        })
        .filter((s) => s.similarity > 0.4)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 3);

      unresolvedNames.push({
        rawName,
        suggestedMatches: suggestions,
      });

      return null;
    };

    // Resolve Payers
    for (const p of extractedPayers) {
      const match = resolveSingleName(p.rawName);
      if (match) {
        const amountMinor = p.amount ? Math.round(p.amount * minorUnitMultiplier) : 0;
        resolvedPayers.push({
          groupMemberId: match.id,
          amountPaid: amountMinor,
        });
      }
    }

    // Resolve Participants
    const seenParticipants = new Set<string>();
    for (const part of extractedParticipants) {
      const match = resolveSingleName(part.rawName);
      if (match && !seenParticipants.has(match.id)) {
        seenParticipants.add(match.id);
        resolvedParticipants.push({
          groupMemberId: match.id,
          splitValue: part.splitValue,
        });
      }
    }

    return {
      resolvedPayers,
      resolvedParticipants,
      unresolvedNames,
      ambiguousMatches,
    };
  }
}
