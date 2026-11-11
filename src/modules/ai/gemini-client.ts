import { GoogleGenAI, Type } from '@google/genai';
import type { ExtractedExpenseDraft } from './types';

export interface GroupMemberContext {
  id: string;
  displayName: string;
  isCurrentUser: boolean;
}

export class GeminiAIClient {
  private client: GoogleGenAI | null = null;
  private modelName: string;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    this.modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

    if (apiKey && apiKey !== 'placeholder-gemini-api-key' && apiKey !== 'your-gemini-api-key-here') {
      this.client = new GoogleGenAI({ apiKey });
    }
  }

  /**
   * Parses natural-language input into a structured expense extraction draft.
   */
  async extractExpense(
    rawInput: string,
    members: GroupMemberContext[],
    defaultCurrency: string = 'INR',
    conversationHistory: { role: string; content: string }[] = []
  ): Promise<ExtractedExpenseDraft> {
    // If Gemini client is not configured (e.g. local offline/tests), use heuristic parser fallback
    if (!this.client) {
      return this.heuristicFallbackExtract(rawInput, members, defaultCurrency);
    }

    const memberListText = members
      .map((m) => `- ${m.displayName}${m.isCurrentUser ? ' (Current User / "me" / "I")' : ''}`)
      .join('\n');

    const systemInstruction = `You are an expert expense parser for an expense-sharing application.
Extract the user's natural language expense report into a structured JSON schema.

Contextual group members:
${memberListText}

Rules:
1. Always resolve "I", "me", "myself" to the current user.
2. If total amount is stated with symbols like "₹", "Rs", "INR", set currency="INR". For "$", set currency="USD". Default to "${defaultCurrency}".
3. If split is "equally", "all of us", "between us", splitType="equal".
4. If individual amounts are given, splitType="exact". If percentages, splitType="percentage". If shares or ratios, splitType="shares".
5. If the user describes proportions, fractions, or ratios (e.g. "ate one third", "used half", "split based on usage/amount eaten", "70-30 split"), you MUST infer the numeric split:
   - Convert fractions to shares: "one third" for person A and "two thirds" for person B → A gets splitValue=1, B gets splitValue=2 with splitType="shares".
   - Convert percentages: "70-30 split" → splitType="percentage" with splitValues 70 and 30.
   - Convert exact amounts: "Alice owes 100, Bob owes 200" → splitType="exact" with those amounts.
   - NEVER default to "equal" when the user explicitly requests a proportional or unequal split.
6. When inferring proportions, always set the splitValue field for EACH participant. Do not leave splitValue empty.
7. If payers are not explicitly stated other than "I paid", set payer to "me" for the total amount.
8. If participants are mentioned (e.g. "between me, Rahul, Priya"), extract each person. If user says "everyone" or "split with group", include all contextual members.
9. If critical information is missing (such as amount, or who paid), list specific clarification questions in "clarificationNeeded".
10. Always output valid JSON conforming strictly to the requested schema.`;

    const expenseSchema = {
      type: Type.OBJECT,
      properties: {
        title: {
          type: Type.STRING,
          description: 'Concise title of the expense (e.g. Dinner, Flight tickets, Groceries)',
        },
        description: {
          type: Type.STRING,
          description: 'Optional additional notes',
        },
        amount: {
          type: Type.NUMBER,
          description: 'Total amount in standard major currency units (e.g. 2400 for ₹2,400)',
        },
        currency: {
          type: Type.STRING,
          description: '3-letter currency code (e.g. INR, USD)',
        },
        splitType: {
          type: Type.STRING,
          enum: ['equal', 'exact', 'percentage', 'shares'],
          description: 'Method used to divide the expense',
        },
        expenseDate: {
          type: Type.STRING,
          description: 'Date in YYYY-MM-DD format if mentioned, otherwise today',
        },
        payers: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              rawName: {
                type: Type.STRING,
                description: 'Payer name as stated by user (e.g. "me", "Rahul")',
              },
              amount: {
                type: Type.NUMBER,
                description: 'Amount paid by this person',
              },
            },
            required: ['rawName'],
          },
        },
        participants: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              rawName: {
                type: Type.STRING,
                description: 'Participant name as stated by user',
              },
              splitValue: {
                type: Type.NUMBER,
                description: 'Value for exact/percentage/shares split, or 1 for equal',
              },
            },
            required: ['rawName'],
          },
        },
        clarificationNeeded: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'Clarification questions if details are ambiguous or missing',
        },
        confidence: {
          type: Type.NUMBER,
          description: 'Confidence score between 0.0 and 1.0',
        },
      },
      required: ['title', 'amount', 'currency', 'splitType', 'payers', 'participants'],
    };

    try {
      const messages = [
        ...conversationHistory.map((m) => `${m.role}: ${m.content}`),
        `User: ${rawInput}`,
      ].join('\n\n');

      const response = await this.client.models.generateContent({
        model: this.modelName,
        contents: messages,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: expenseSchema,
          temperature: 0.1,
        },
      });

      const responseText = response.text?.trim() || '{}';
      const parsed = JSON.parse(responseText);

      return {
        title: parsed.title || 'Shared Expense',
        description: parsed.description || null,
        amount: Number(parsed.amount) || 0,
        currency: (parsed.currency || defaultCurrency).toUpperCase(),
        splitType: parsed.splitType || 'equal',
        expenseDate: parsed.expenseDate || new Date().toISOString().split('T')[0],
        payers: Array.isArray(parsed.payers) ? parsed.payers : [{ rawName: 'me' }],
        participants: Array.isArray(parsed.participants) ? parsed.participants : [{ rawName: 'me' }],
        clarificationNeeded: parsed.clarificationNeeded || [],
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.9,
      };
    } catch (error) {
      console.warn('Gemini generateContent failed, falling back to heuristic parser:', error);
      return this.heuristicFallbackExtract(rawInput, members, defaultCurrency);
    }
  }

  /**
   * Transcribes an audio blob to text using Gemini's multimodal capabilities.
   * Sends the audio as inline data and asks Gemini to extract the spoken text.
   */
  async transcribeAudio(audioBlob: Blob): Promise<string> {
    if (!this.client) {
      return '(Audio transcription unavailable in offline mode)';
    }

    try {
      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64Audio = Buffer.from(arrayBuffer).toString('base64');

      // Determine MIME type from the blob, falling back to audio/webm
      const mimeType = audioBlob.type || 'audio/webm';

      const response = await this.client.models.generateContent({
        model: this.modelName,
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType,
                  data: base64Audio,
                },
              },
              {
                text: `Transcribe this audio recording exactly as spoken. The speaker is describing an expense they want to split with friends. Output ONLY the transcribed text, nothing else. If you cannot understand the audio, respond with an empty string.`,
              },
            ],
          },
        ],
        config: {
          temperature: 0.0,
        },
      });

      return response.text?.trim() || '';
    } catch (error) {
      console.error('Gemini audio transcription error:', error);
      throw new Error('Failed to transcribe audio. Please try again or type your expense instead.');
    }
  }

  /**
   * Generates conversational answers about group balances and expense history.
   */
  async answerGroupQuery(
    query: string,
    contextSummary: string
  ): Promise<string> {
    if (!this.client) {
      return `Based on the group records:\n${contextSummary}\n\n(AI Query response simulated in offline mode).`;
    }

    try {
      const response = await this.client.models.generateContent({
        model: this.modelName,
        contents: `You are a helpful financial assistant for a Splitwise-like app.
Answer the user's question accurately and concisely based on the following verified group data:

--- GROUP FINANCIAL SUMMARY ---
${contextSummary}
-------------------------------

User Question: ${query}

Rules:
- Be factual and friendly.
- Use currency symbols matching the group data.
- Explain who owes whom clearly.
- If asked about history or balances not present in the data, state it politely.`,
      });

      return response.text?.trim() || 'I could not retrieve an answer for that query.';
    } catch (error) {
      console.error('Gemini query error:', error);
      return `I encountered an issue querying the AI. Current group status:\n${contextSummary}`;
    }
  }

  /**
   * Deterministic heuristic parser used for offline testing or when no API key is set.
   */
  heuristicFallbackExtract(
    rawInput: string,
    members: GroupMemberContext[],
    defaultCurrency: string = 'INR'
  ): ExtractedExpenseDraft {
    const text = rawInput.trim();

    // 1. Detect amount
    // Matches patterns like: ₹2,400, Rs. 2400, Rs 2400, $50, 2400 bucks, 2400 for dinner
    let amount = 0;
    let currency = defaultCurrency;

    const currencyMatch = text.match(/(₹|rs\.?|inr|\$|usd|€|eur)\s*([\d,]+(?:\.\d+)?)/i) ||
                          text.match(/([\d,]+(?:\.\d+)?)\s*(₹|rs\.?|inr|\$|usd|€|eur|bucks|rupees)/i);

    if (currencyMatch) {
      const first = currencyMatch[1].toLowerCase();
      const second = currencyMatch[2].toLowerCase();

      let symbolPart = first;
      let numPart = second;

      if (/^[\d,.]+$/.test(first)) {
        numPart = first;
        symbolPart = second;
      }

      amount = parseFloat(numPart.replace(/,/g, ''));
      if (symbolPart.includes('₹') || symbolPart.includes('rs') || symbolPart.includes('inr') || symbolPart.includes('rupees')) {
        currency = 'INR';
      } else if (symbolPart.includes('$') || symbolPart.includes('usd') || symbolPart.includes('bucks')) {
        currency = 'USD';
      } else if (symbolPart.includes('€') || symbolPart.includes('eur')) {
        currency = 'EUR';
      }
    } else {
      // Look for any isolated number
      const anyNum = text.match(/\b\d+(?:,\d+)*(?:\.\d+)?\b/);
      if (anyNum) {
        amount = parseFloat(anyNum[0].replace(/,/g, ''));
      }
    }

    // 2. Detect title
    let title = 'Shared Expense';
    const forMatch = text.match(/(?:for|on)\s+([a-zA-Z0-9\s]+?)(?:\s+(?:split|between|with|shared)|[.,]|$)/i);
    if (forMatch && forMatch[1].trim()) {
      title = forMatch[1].trim();
      // Capitalize first letter
      title = title.charAt(0).toUpperCase() + title.slice(1);
    } else if (/dinner/i.test(text)) title = 'Dinner';
    else if (/lunch/i.test(text)) title = 'Lunch';
    else if (/groceries/i.test(text)) title = 'Groceries';
    else if (/cab|uber|taxi/i.test(text)) title = 'Cab Ride';

    // 3. Detect split type
    let splitType: ExtractedExpenseDraft['splitType'] = 'equal';
    if (/percentage|percent|%/i.test(text)) {
      splitType = 'percentage';
    } else if (/shares|share each/i.test(text)) {
      splitType = 'shares';
    } else if (/exact|owes\s+\d+/i.test(text)) {
      splitType = 'exact';
    } else if (/\b(one\s+third|two\s+thirds?|one\s+fourth|three\s+fourths?|half|one\s+quarter|three\s+quarters?|proportion|ratio|based\s+on.*(?:amount|usage|eaten|consumed|used)|\d+[\s:/-]+\d+\s*split)/i.test(text)) {
      splitType = 'shares';
    }

    // 4. Detect participants
    const participants: ExtractedExpenseDraft['participants'] = [];
    const participantsSet = new Set<string>();

    // Check "between X, Y, Z and W" or "with X, Y, Z"
    const splitClauseMatch = text.match(/(?:between|with|among)\s+(.+?)(?:[.]|$)/i);
    if (splitClauseMatch) {
      const namesString = splitClauseMatch[1];
      const tokens = namesString
        .split(/,|and|&|\s+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && !['split', 'it', 'equally', 'all', 'the', 'of', 'us'].includes(s.toLowerCase()));

      for (const token of tokens) {
        if (!participantsSet.has(token.toLowerCase())) {
          participantsSet.add(token.toLowerCase());
          participants.push({ rawName: token });
        }
      }
    }

    // If no participants found in split clause, search text for known group member names or "me"
    if (participants.length === 0) {
      for (const m of members) {
        const regex = new RegExp(`\\b${m.displayName}\\b`, 'i');
        if (regex.test(text)) {
          participants.push({ rawName: m.displayName });
          participantsSet.add(m.displayName.toLowerCase());
        }
      }

      if (/\b(me|i|myself)\b/i.test(text) && !participantsSet.has('me')) {
        participants.unshift({ rawName: 'me' });
      }
    }

    // Default to "me" and all other members if "everyone" or "all" was used
    if (/\b(everyone|all of us|all)\b/i.test(text) || participants.length === 0) {
      participants.length = 0;
      for (const m of members) {
        participants.push({ rawName: m.displayName });
      }
    }

    // 5. Detect payers
    const payers: ExtractedExpenseDraft['payers'] = [];
    if (/\b(i paid|i spent|paid by me)\b/i.test(text) || !/(?:paid by|paid)/i.test(text)) {
      payers.push({ rawName: 'me', amount });
    } else {
      // Check if someone else paid: "[Name] paid"
      let foundPayer = false;
      for (const m of members) {
        const pRegex = new RegExp(`\\b${m.displayName}\\s+paid\\b`, 'i');
        if (pRegex.test(text)) {
          payers.push({ rawName: m.displayName, amount });
          foundPayer = true;
          break;
        }
      }
      if (!foundPayer) {
        payers.push({ rawName: 'me', amount });
      }
    }

    const clarificationNeeded: string[] = [];
    if (amount <= 0) {
      clarificationNeeded.push('What was the total amount spent on this expense?');
    }
    if (participants.length === 0) {
      clarificationNeeded.push('Who should this expense be split between?');
    }

    return {
      title,
      amount,
      currency,
      splitType,
      expenseDate: new Date().toISOString().split('T')[0],
      payers,
      participants,
      clarificationNeeded,
      confidence: amount > 0 && participants.length > 0 ? 0.95 : 0.5,
    };
  }
}
