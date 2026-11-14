import type { ExpenseCategory } from './types';

interface ReceiptItemInput {
  name?: string;
  description?: string;
  title?: string;
}

interface CategoryRule {
  category: ExpenseCategory;
  // Exact or boundary-delimited phrase patterns
  patterns: RegExp[];
  // Single-word keywords
  keywords: string[];
}

const CATEGORY_RULES: CategoryRule[] = [
  // 1. Food & Dining (restaurants, food delivery, drinks, meals)
  {
    category: 'food_dining',
    patterns: [
      /\b(zomato|swiggy|starbucks|mcdonald'?s|kfc|subway|domino'?s|pizza\s*hut|burger\s*king|taco\s*bell|dunkin)\b/i,
      /\b(fine\s*dining|fast\s*food|food\s*court|ice\s*cream|coffee\s*shop)\b/i,
      /\b(hotel\s+[a-z0-9]+\s+(restaurant|cafe|bar|dining|bistro))\b/i,
      /\b(swigg|zomat)\b/i,
    ],
    keywords: [
      'zomato',
      'swiggy',
      'restaurant',
      'cafe',
      'bar',
      'pub',
      'brewery',
      'dinner',
      'lunch',
      'breakfast',
      'brunch',
      'supper',
      'pizza',
      'burger',
      'biryani',
      'dosa',
      'shawarma',
      'ramen',
      'sushi',
      'pasta',
      'taco',
      'beer',
      'drinks',
      'coffee',
      'bakery',
      'chai',
      'tea',
      'meal',
      'snack',
      'snacks',
      'wine',
      'cocktail',
      'liquor',
      'alcohol',
      'bistro',
      'canteen',
      'buffet',
      'dessert',
      'dhaba',
      'porotta',
      'parotta',
      'budweiser',
      'food',
      'dine',
      'dining',
      'eat',
    ],
  },

  // 2. Travel & Transport (ride-hailing, transit, fuel)
  {
    category: 'transport',
    patterns: [
      /\b(uber|ola|rapido|lyft|grab|bolt)\b/i,
      /\b(flight\s*ticket|train\s*ticket|bus\s*ticket|metro\s*ticket|bus\s*fare|bus\s*pass)\b/i,
      /\b(bus(\s+to\s+[a-z]+)?)\b/i,
      /\b(air\s*fare|airline|air\s*india|indigo|spicejet|vistara|emirates)\b/i,
      /\b(railway|irctc|metro\s*card|transit\s*pass)\b/i,
      /\b(auto\s*rickshaw|cab\s*fare|taxi\s*fare|toll\s*booth|fastag)\b/i,
      /\b(petrol\s*bunk|gas\s*station|fuel\s*pump|parking\s*fee|parking\s*lot)\b/i,
    ],
    keywords: [
      'uber',
      'ola',
      'rapido',
      'lyft',
      'cab',
      'taxi',
      'flight',
      'train',
      'railway',
      'irctc',
      'petrol',
      'fuel',
      'diesel',
      'toll',
      'fastag',
      'parking',
      'auto',
      'metro',
      'airfare',
      'transit',
      'commute',
      'bus',
    ],
  },

  // 3. Accommodation & Stays (lodging, rentals, hotels with stay context)
  {
    category: 'accommodation',
    patterns: [
      /\b(airbnb|resort|villa|hostel|guesthouse|guest\s*house|homestay|motel|lodge)\b/i,
      /\b(room\s*booking|hotel\s*booking|night\s*stay|room\s*rent|staycation)\b/i,
      /\b(check-?in|check-?out|hotel\s*stay|lodging|cottage|chalet|suite)\b/i,
    ],
    keywords: [
      'airbnb',
      'resort',
      'villa',
      'hostel',
      'guesthouse',
      'homestay',
      'motel',
      'lodging',
      'staycation',
      'cottage',
      'chalet',
      'lodge',
      'hotel',
    ],
  },

  // 4. Groceries & Supplies (supermarkets, quick commerce, groceries)
  {
    category: 'groceries',
    patterns: [
      /\b(blinkit|instamart|zepto|bigbasket|bb\s*now|dunzo)\b/i,
      /\b(supermarket|hypermarket|grocery\s*store|convenience\s*store|provisions)\b/i,
      /\b(dmart|walmart|costco|trader\s*joe|nature'?s\s*basket|spencer'?s)\b/i,
      /\b(veggie\s*mart|fruit\s*mart|quick\s*mart)\b/i,
    ],
    keywords: [
      'blinkit',
      'instamart',
      'zepto',
      'bigbasket',
      'grocery',
      'groceries',
      'supermarket',
      'hypermarket',
      'provisions',
      'vegetables',
      'veggies',
      'fruits',
      'ration',
      'milk',
      'eggs',
      'mart',
      'market',
    ],
  },

  // 5. Entertainment & Leisure (events, movies, outings)
  {
    category: 'entertainment',
    patterns: [
      /\b(movie\s*ticket|cinema\s*ticket|theatre\s*ticket|concert\s*ticket)\b/i,
      /\b(pvr|inox|cinepolis|imax)\b/i,
      /\b(amusement\s*park|theme\s*park|water\s*park|bowling\s*alley)\b/i,
      /\b(netflix|spotify|prime\s*video|disney\+|hotstar|playstation|xbox|steam)\b/i,
      /\b(cricket\s*match|football\s*match|ipl\s*match|magic\s*show|comedy\s*show|live\s*show|board\s*game)\b/i,
    ],
    keywords: [
      'movie',
      'cinema',
      'concert',
      'museum',
      'bowling',
      'surfing',
      'theatre',
      'theater',
      'arcade',
      'stadium',
      'netflix',
      'spotify',
      'clubbing',
      'amusement',
      'match',
      'game',
      'event',
      'show',
    ],
  },

  // 6. Utilities & Bills (distinct recurring expenses)
  {
    category: 'utilities',
    patterns: [
      /\b(electric(ity)?\s*(bill|recharge)?|eb\s*bill|power\s*bill)\b/i,
      /\b(water\s*(bill|can|tanker)?|gas\s*(bill|cylinder)?|lpg\s*cylinder)\b/i,
      /\b(wi-?fi(\s*bill)?|internet(\s*bill)?|broadband)\b/i,
      /\b(house\s*rent|flat\s*rent|apartment\s*rent)\b/i,
      /\b(maintenance\s*(fee|charge|bill)?|society\s*maintenance|society\s*bill)\b/i,
      /\b(maid\s*salary|cook\s*salary|cleaning\s*charge)\b/i,
      /\b((mobile|phone|dth|prepaid|postpaid)\s*recharge)\b/i,
      /\b(jio|airtel|vodafone|bsnl)\b/i,
      /\b(aws|cloud\s*hosting|hosting|server|saas|software|domain)\b/i,
      /\b(utility\s*bills?)\b/i,
    ],
    keywords: [
      'electricity',
      'broadband',
      'wifi',
      'cylinder',
      'maintenance',
      'maid',
      'rent',
      'utility',
      'utilities',
      'hosting',
      'server',
      'water',
      'internet',
    ],
  },
];

/**
 * Normalizes input text into clean lowercase words and phrases.
 */
function normalizeText(text: string): string {
  return text.toLowerCase().replace(/['"`]/g, '').trim();
}

/**
 * Scans title, description, and line-item receipts to assign an authoritative category.
 * Fully deterministic, zero external API latency, 100% backward-compatible.
 */
export function categorizeExpense(
  title?: string | null,
  description?: string | null,
  receiptItems?: ReceiptItemInput[] | null
): ExpenseCategory {
  const chunks: string[] = [];
  if (title) chunks.push(title);
  if (description) chunks.push(description);

  if (Array.isArray(receiptItems) && receiptItems.length > 0) {
    for (const item of receiptItems) {
      if (item.name) chunks.push(item.name);
      if (item.title) chunks.push(item.title);
      if (item.description) chunks.push(item.description);
    }
  }

  const combined = chunks.join(' ');
  if (!combined.trim()) {
    return 'general';
  }

  const normalized = normalizeText(combined);

  // Special Hotel handling:
  // If "hotel" is mentioned without room/stay keywords, but has food/drink keywords, it's food_dining.
  // If "hotel" has room/stay/booking/night, it's accommodation.
  // If "hotel" is alone without food keywords, classify as accommodation.
  const hasHotelWord = /\bhotel\b/i.test(normalized);
  const hasStayIndicator = /\b(stay|room|booking|night|check-?in|check-?out|lodge|resort|vacation)\b/i.test(normalized);
  const hasFoodIndicator = /\b(dinner|lunch|breakfast|brunch|food|dining|restaurant|cafe|beer|budweiser|drinks|buffet|meal|biryani|porotta|parotta|coffee|tea|chai|bar|pub|swiggy|zomato|fast\s*food|wine|cocktail|liquor|alcohol|snack|snacks|pizza|burger|dosa|shawarma|ramen|sushi|pasta|taco|bakery|canteen|bistro|dessert|dhaba)\b/i.test(normalized);

  if (hasHotelWord) {
    if (hasFoodIndicator && !hasStayIndicator) {
      return 'food_dining';
    }
    return 'accommodation';
  }

  // Check each category rule in priority sequence
  for (const rule of CATEGORY_RULES) {
    // 1. Check regex phrase patterns
    for (const pattern of rule.patterns) {
      if (pattern.test(normalized)) {
        return rule.category;
      }
    }

    // 2. Check keyword boundaries
    for (const kw of rule.keywords) {
      const regex = new RegExp(`\\b${kw}\\b`, 'i');
      if (regex.test(normalized)) {
        return rule.category;
      }
    }
  }

  // Fallback for unclassified expenses
  return 'general';
}
