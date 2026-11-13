import { GoogleGenAI, Type } from '@google/genai';
import type { ExtractedExpenseDraft, ExtractedParticipant } from './types';
import type { SplitType } from '@/modules/accounting/types';

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
    const envModel = process.env.GEMINI_MODEL;
    // Map sunset models to gemini-flash-latest
    if (!envModel || envModel === 'gemini-2.5-flash' || envModel === 'gemini-2.5-flash-lite') {
      this.modelName = 'gemini-flash-latest';
    } else {
      this.modelName = envModel;
    }

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
   * Parses an uploaded receipt / bill image using Gemini 2.5 Flash Vision.
   * Extracts merchant name, total amount, taxes, date, line items, and maps
   * any user-provided split notes to contextual group members.
   */
  async extractExpenseFromReceipt(
    imageBytes: Buffer,
    mimeType: string,
    members: GroupMemberContext[],
    defaultCurrency: string = 'INR',
    extraInstructions: string = ''
  ): Promise<ExtractedExpenseDraft> {
    if (!this.client) {
      return {
        title: 'Uploaded Receipt',
        description: extraInstructions || 'Receipt parsed in offline mode',
        amount: 1000,
        currency: defaultCurrency,
        splitType: 'equal',
        expenseDate: new Date().toISOString().split('T')[0],
        payers: [{ rawName: 'me', amount: 1000 }],
        participants: members.map((m) => ({ rawName: m.displayName })),
        clarificationNeeded: [],
        confidence: 0.8,
        receiptItems: [],
      };
    }

    const memberListText = members
      .map((m) => `- ${m.displayName}${m.isCurrentUser ? ' (Current User / "me" / "I")' : ''}`)
      .join('\n');

    const systemInstruction = `You are an expert OCR receipt and bill parser for an expense-sharing application.
Your job is to read the attached receipt/bill image and extract the expense details into structured JSON.

Contextual group members:
${memberListText}

Rules:
1. Identify the merchant or restaurant name as the "title" (e.g. "Starbucks", "Domino's Pizza", "Target", "Shell"). If unreadable, use a sensible title based on items (e.g. "Dinner", "Groceries").
2. Extract the FINAL Grand Total amount including all taxes, discounts, and tips. Use standard major currency units (e.g. 1500 for ₹1,500.00).
3. Detect the currency (e.g. INR for ₹ or Rs, USD for $, EUR for €). Default to "${defaultCurrency}" if ambiguous.
4. Extract the date from the bill in YYYY-MM-DD format if visible, otherwise today's date.
5. If user provided split instructions (${extraInstructions ? `"${extraInstructions}"` : 'none'}), apply them:
   - If user specifies proportions, fractions, or ratios (e.g. "ate one third", "70-30 split"), convert to splitType="shares" or "percentage" with appropriate splitValue for each member.
   - If user says split equally or gives no instructions, set splitType="equal" and include all contextual group members.
   - Payer defaults to "me" unless user stated otherwise.
6. Extract individual line items if clearly printed (name and price).
7. Always output valid JSON conforming strictly to the requested schema.`;

    const receiptSchema = {
      type: Type.OBJECT,
      properties: {
        title: {
          type: Type.STRING,
          description: 'Merchant or venue name from receipt (e.g. Domino\'s Pizza, Starbucks)',
        },
        description: {
          type: Type.STRING,
          description: 'Summary of items or notes from receipt',
        },
        amount: {
          type: Type.NUMBER,
          description: 'Grand total bill amount in major currency units',
        },
        currency: {
          type: Type.STRING,
          description: '3-letter currency code (e.g. INR, USD, EUR)',
        },
        splitType: {
          type: Type.STRING,
          enum: ['equal', 'exact', 'percentage', 'shares'],
          description: 'Method used to divide the expense',
        },
        expenseDate: {
          type: Type.STRING,
          description: 'Date printed on receipt in YYYY-MM-DD format, or today',
        },
        payers: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              rawName: { type: Type.STRING, description: 'Payer name (e.g. "me")' },
              amount: { type: Type.NUMBER, description: 'Amount paid by this person' },
            },
            required: ['rawName'],
          },
        },
        participants: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              rawName: { type: Type.STRING, description: 'Participant member name' },
              splitValue: { type: Type.NUMBER, description: 'Value for exact/percentage/shares or 1 for equal' },
            },
            required: ['rawName'],
          },
        },
        receiptItems: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, description: 'Item name' },
              amount: { type: Type.NUMBER, description: 'Item price in major currency units' },
            },
            required: ['name', 'amount'],
          },
          description: 'Line items detected on receipt',
        },
        clarificationNeeded: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
        confidence: {
          type: Type.NUMBER,
          description: 'Extraction confidence score between 0.0 and 1.0',
        },
      },
      required: ['title', 'amount', 'currency', 'splitType', 'payers', 'participants'],
    };

    try {
      const base64Image = imageBytes.toString('base64');
      const parts: any[] = [
        {
          inlineData: {
            mimeType: mimeType || 'image/jpeg',
            data: base64Image,
          },
        },
        {
          text: extraInstructions
            ? `Please extract the expense details from this receipt. User notes: "${extraInstructions}".`
            : `Please extract the expense details from this receipt and split equally among contextual members.`,
        },
      ];

      const response = await this.client.models.generateContent({
        model: this.modelName,
        contents: [
          {
            role: 'user',
            parts,
          },
        ],
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: receiptSchema,
          temperature: 0.1,
        },
      });

      const responseText = response.text?.trim() || '{}';
      const parsed = JSON.parse(responseText);

      return {
        title: parsed.title || 'Receipt Expense',
        description: parsed.description || null,
        amount: Number(parsed.amount) || 0,
        currency: (parsed.currency || defaultCurrency).toUpperCase(),
        splitType: parsed.splitType || 'equal',
        expenseDate: parsed.expenseDate || new Date().toISOString().split('T')[0],
        payers: Array.isArray(parsed.payers) ? parsed.payers : [{ rawName: 'me' }],
        participants: Array.isArray(parsed.participants) ? parsed.participants : members.map((m) => ({ rawName: m.displayName })),
        clarificationNeeded: parsed.clarificationNeeded || [],
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.9,
        receiptItems: Array.isArray(parsed.receiptItems) ? parsed.receiptItems : [],
      };
    } catch (error) {
      console.error('Gemini receipt extraction failed:', error);
      throw new Error('Failed to analyze the bill image. Please ensure the image is clear or enter the details manually.');
    }
  }

  /**
   * Refines an existing expense draft (especially an itemized bill) with natural language split instructions.
   */
  async refineExpenseDraft(
    draft: {
      title: string;
      amount: number; // in cents/paise (minor units)
      currency: string;
      receiptItems?: { name: string; amount: number }[];
      payers?: { displayName: string; amountPaid: number }[];
      splits?: { displayName: string; owedAmount: number }[];
    },
    instructions: string,
    members: GroupMemberContext[]
  ): Promise<ExtractedExpenseDraft> {
    const defaultCurrency = draft.currency || 'INR';
    const totalMajor = draft.amount / 100;

    if (!this.client) {
      return this.heuristicRefineFallback(draft, instructions, members);
    }

    const memberListText = members
      .map((m) => `- ${m.displayName}${m.isCurrentUser ? ' (Current User / "me" / "I")' : ''}`)
      .join('\n');

    const itemsListText =
      draft.receiptItems && draft.receiptItems.length > 0
        ? draft.receiptItems
            .map((item, idx) => `${idx + 1}. ${item.name}: ${draft.currency} ${item.amount.toFixed(2)}`)
            .join('\n')
        : 'No individual items listed.';

    const systemInstruction = `You are an expert expense-splitting assistant.
A user previously scanned or entered a bill with total ${totalMajor.toFixed(2)} ${draft.currency} and merchant "${draft.title}".
The user has now reviewed the itemized items and is providing additional natural language instructions to adjust how the bill is split or who pays.

Contextual Group Members:
${memberListText}

Itemized Bill Items:
${itemsListText}

Total Bill Amount: ${totalMajor.toFixed(2)} ${draft.currency}

Rules:
1. Retain the total amount (${totalMajor.toFixed(2)}), title ("${draft.title}"), and currency ("${draft.currency}") unless user explicitly asks to edit them.
2. If user assigns specific items to specific members (e.g. "Alice had the pizza, Bob had pasta, split drinks equally between all 3 of us"):
   - Sum up the costs of the assigned items for each person.
   - For shared items (or remaining balance), divide their cost equally among the shared participants.
   - Set splitType="exact", and set splitValue for each participant in major currency units.
   - Ensure the sum of all participant splitValues equals exactly the grand total (${totalMajor.toFixed(2)}).
3. If user specifies fractional or percentage shares (e.g. "Alice ate one third", "Bob 60%, Charlie 40%", "2:1 ratio"):
   - Set splitType="shares" or splitType="percentage" with appropriate numeric splitValue for each member.
4. If user specifies who should participate (e.g. "split equally between Alice and Bob", "exclude Charlie"):
   - Set splitType="equal" with only the specified members in participants.
5. If user specifies who paid (e.g. "Bob paid", "Alice paid 500, I paid the rest"):
   - Set payers array accordingly with rawName and amount. Default to "me" if not stated.
6. If user names someone not in the group members list:
   - Include them in participants with their rawName and add a question in clarificationNeeded.
7. Always preserve the original receiptItems in the output JSON.
8. Always output valid JSON conforming to the schema.`;

    const refineSchema = {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        description: { type: Type.STRING },
        amount: { type: Type.NUMBER },
        currency: { type: Type.STRING },
        splitType: {
          type: Type.STRING,
          enum: ['equal', 'exact', 'percentage', 'shares'],
        },
        expenseDate: { type: Type.STRING },
        payers: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              rawName: { type: Type.STRING },
              amount: { type: Type.NUMBER },
            },
            required: ['rawName'],
          },
        },
        participants: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              rawName: { type: Type.STRING },
              splitValue: { type: Type.NUMBER },
            },
            required: ['rawName'],
          },
        },
        receiptItems: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              amount: { type: Type.NUMBER },
            },
            required: ['name', 'amount'],
          },
        },
        clarificationNeeded: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
        confidence: { type: Type.NUMBER },
      },
      required: ['title', 'amount', 'currency', 'splitType', 'payers', 'participants'],
    };

    try {
      const response = await this.client.models.generateContent({
        model: this.modelName,
        contents: `User Instructions: "${instructions}"`,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: refineSchema,
          temperature: 0.1,
        },
      });

      const responseText = response.text?.trim() || '{}';
      const parsed = JSON.parse(responseText);

      return {
        title: parsed.title || draft.title,
        description: parsed.description || instructions,
        amount: Number(parsed.amount) || totalMajor,
        currency: (parsed.currency || defaultCurrency).toUpperCase(),
        splitType: parsed.splitType || 'equal',
        expenseDate: parsed.expenseDate || new Date().toISOString().split('T')[0],
        payers: Array.isArray(parsed.payers) && parsed.payers.length > 0 ? parsed.payers : [{ rawName: 'me' }],
        participants:
          Array.isArray(parsed.participants) && parsed.participants.length > 0
            ? parsed.participants
            : members.map((m) => ({ rawName: m.displayName })),
        clarificationNeeded: parsed.clarificationNeeded || [],
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.9,
        receiptItems:
          Array.isArray(parsed.receiptItems) && parsed.receiptItems.length > 0
            ? parsed.receiptItems
            : draft.receiptItems || [],
      };
    } catch (error) {
      console.warn('Gemini refineExpenseDraft failed, falling back to heuristic parser:', error);
      return this.heuristicRefineFallback(draft, instructions, members);
    }
  }

  /**
   * Deterministic heuristic fallback for refining draft splits offline.
   */
  heuristicRefineFallback(
    draft: {
      title: string;
      amount: number;
      currency: string;
      receiptItems?: { name: string; amount: number }[];
    },
    instructions: string,
    members: GroupMemberContext[]
  ): ExtractedExpenseDraft {
    const text = instructions.toLowerCase();
    const totalMajor = draft.amount / 100;
    const defaultCurrency = draft.currency;

    const matchedMembers = members.filter((m) =>
      text.includes(m.displayName.toLowerCase())
    );

    const fractionMatch = text.match(/(one[ -]third|1\/3|one[ -]fourth|1\/4|quarter|half|1\/2)/i);
    const ratioMatch = text.match(/(\d+)\s*[:/]\s*(\d+)/);

    let splitType: SplitType = 'equal';
    let participants: ExtractedParticipant[] = [];

    if (ratioMatch) {
      splitType = 'shares';
      const r1 = parseInt(ratioMatch[1], 10);
      const r2 = parseInt(ratioMatch[2], 10);
      if (matchedMembers.length >= 2) {
        participants = [
          { rawName: matchedMembers[0].displayName, splitValue: r1 },
          { rawName: matchedMembers[1].displayName, splitValue: r2 },
        ];
      } else {
        participants = [
          { rawName: 'me', splitValue: r1 },
          { rawName: matchedMembers[0]?.displayName || 'them', splitValue: r2 },
        ];
      }
    } else if (fractionMatch && matchedMembers.length > 0) {
      splitType = 'shares';
      const frac = fractionMatch[1].toLowerCase();
      const namedMember = matchedMembers[0];
      const otherMembers = members.filter((m) => m.id !== namedMember.id);

      if (frac.includes('third') || frac === '1/3') {
        const othersCount = Math.max(1, otherMembers.length);
        participants = [
          { rawName: namedMember.displayName, splitValue: 1 },
          ...otherMembers.map((m) => ({ rawName: m.displayName, splitValue: 2 })),
        ];
      } else if (frac.includes('half') || frac === '1/2') {
        participants = [
          { rawName: namedMember.displayName, splitValue: 1 },
          ...otherMembers.map((m) => ({ rawName: m.displayName, splitValue: 1 })),
        ];
      }
    } else if (matchedMembers.length > 0) {
      splitType = 'equal';
      participants = matchedMembers.map((m) => ({ rawName: m.displayName }));
      if (text.includes('me') || text.includes(' i ') || text.includes('i paid') || text.includes('with me')) {
        const me = members.find((m) => m.isCurrentUser);
        if (me && !participants.some((p) => p.rawName === me.displayName)) {
          participants.push({ rawName: 'me' });
        }
      }
    } else {
      splitType = 'equal';
      participants = members.map((m) => ({ rawName: m.displayName }));
    }

    return {
      title: draft.title,
      description: instructions,
      amount: totalMajor,
      currency: defaultCurrency,
      splitType,
      expenseDate: new Date().toISOString().split('T')[0],
      payers: [{ rawName: 'me' }],
      participants,
      clarificationNeeded: [],
      confidence: 0.8,
      receiptItems: draft.receiptItems || [],
    };
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
