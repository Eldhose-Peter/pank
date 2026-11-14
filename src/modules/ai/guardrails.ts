/**
 * Guardrails and validation for AI group chat queries.
 * Prevents off-topic misuse (coding, scripts, general knowledge, roleplay, creative writing)
 * and enforces query length limits.
 */

export const MAX_CHAT_QUERY_LENGTH = 300;

export const OFF_TOPIC_REFUSAL_MESSAGE =
  "I can only help with questions about your group's expenses, balances, and settlements.";

/**
 * Regex patterns identifying obvious programming, coding, creative writing,
 * roleplay, or general trivia queries that should be rejected with zero API token cost.
 */
const OFF_TOPIC_PATTERNS: RegExp[] = [
  // 1. Coding / programming requests
  /\b(write|create|generate|give\s+me|provide|debug|fix|show\s+me)\s+(a\s+|an\s+|some\s+)?(python|javascript|typescript|js|ts|java|c\+\+|cpp|c#|rust|golang|go|ruby|php|bash|shell|powershell|sql|html|css|swift|kotlin|scala|perl|r)\s+(code|script|function|program|snippet|algorithm|app|class|method|query)\b/i,
  /\b(write|create|generate|provide)\s+(a\s+|an\s+|some\s+)?(code|script|program|function|algorithm|class|regex)\b/i,
  /\bhow\s+to\s+(code|program|implement|write\s+a\s+script|write\s+a\s+function|write\s+code)\b/i,
  /\b(python|javascript|typescript|java|cpp|c\+\+|rust|golang|bash)\s+(script|code|program|function|snippet)\b/i,
  /\b(coding\s+challenge|leetcode|hackerrank|codeforces)\b/i,
  /\b(fibonacci|quicksort|bubble\s+sort|binary\s+search|dijkstra|linked\s+list|binary\s+tree|depth\s+first\s+search|breadth\s+first\s+search)\b/i,

  // 2. Code syntax / keywords in prompt
  /\bdef\s+[a-zA-Z_]\w*\s*\(/i,
  /\bfunction(\s+[a-zA-Z_]\w*)?\s*\(/i,
  /\bconsole\.(log|warn|error)\s*\(/i,
  /\bprint\s*\([\'\"].*[\'\"]\)/i,
  /\bimport\s+([a-zA-Z_]\w*|\{.*\}|.*\s+from\s+[\'\"].*[\'\"])/i,
  /\bpublic\s+static\s+void\s+main\b/i,
  /<\s*script\b[^>]*>/i,

  // 3. Creative writing / entertainment / stories / poems / songs / jokes
  /\b(write|compose|generate|tell(\s+me)?)\s+(a\s+|an\s+|the\s+|some\s+)?([\w-]+\s+)?(poems?|story|stories|essays?|songs?|lyrics|novels?|haikus?|limericks?|fiction|screenplay|script\s+for)\b/i,
  /\btell\s+me\s+a\s+joke\b/i,

  // 4. Roleplay / persona adoption / jailbreak attempts
  /\b(act\s+as|pretend\s+(to\s+be|you\s+are)|roleplay|imagine\s+you\s+are|you\s+are\s+now)\b/i,
  /\b(ignore|disregard|forget|bypass)\s+(all\s+)?(previous|prior|above|existing|your|system|safety)?\s*(instructions|prompts|rules|guidelines|guardrails|constraints|limits)\b/i,
  /\b(system\s+prompt|jailbreak|dan\s+mode|unrestricted\s+mode)\b/i,

  // 5. Obvious general knowledge / trivia queries unrelated to group expenses
  /\b(capital\s+of|weather\s+in|recipe\s+for)\b/i,
  /\b(who\s+is\s+the\s+(president|prime\s+minister)\s+of|president\s+of\s+(the\s+)?(united\s+states|us|usa|india|france|america|russia|china))\b/i,
  /\bwhat\s+is\s+the\s+meaning\s+of\s+life\b/i,
];

/**
 * Checks if a user query is off-topic (e.g. programming, creative writing, roleplay, trivia).
 */
export function isOffTopicQuery(query: string): boolean {
  if (!query) return false;
  const raw = query.trim();
  const normalized = raw.replace(/\s+/g, ' ');
  return OFF_TOPIC_PATTERNS.some((pattern) => pattern.test(normalized) || pattern.test(raw));
}

export interface ChatQueryValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates a chat query for length and off-topic guardrails.
 */
export function validateChatQuery(query: unknown): ChatQueryValidationResult {
  if (typeof query !== 'string' || query.trim().length === 0) {
    return { valid: false, error: 'Query is required' };
  }
  const trimmed = query.trim();
  if (trimmed.length > MAX_CHAT_QUERY_LENGTH) {
    return {
      valid: false,
      error: `Query exceeds maximum length of ${MAX_CHAT_QUERY_LENGTH} characters`,
    };
  }
  if (isOffTopicQuery(trimmed)) {
    return {
      valid: false,
      error: OFF_TOPIC_REFUSAL_MESSAGE,
    };
  }
  return { valid: true };
}
