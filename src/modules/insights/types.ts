export type ExpenseCategory =
  | 'food_dining'
  | 'transport'
  | 'accommodation'
  | 'groceries'
  | 'entertainment'
  | 'utilities'
  | 'general';

export interface CategoryMeta {
  category: ExpenseCategory;
  label: string;
  icon: string;
  color: string;
  bgColor: string;
  borderColor: string;
  description: string;
}

export const CATEGORY_DEFINITIONS: Record<ExpenseCategory, CategoryMeta> = {
  food_dining: {
    category: 'food_dining',
    label: 'Food & Dining',
    icon: 'Utensils',
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-500',
    borderColor: 'border-amber-200 dark:border-amber-800',
    description: 'Restaurants, cafes, bars, deliveries & meals',
  },
  transport: {
    category: 'transport',
    label: 'Travel & Transport',
    icon: 'Car',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-500',
    borderColor: 'border-blue-200 dark:border-blue-800',
    description: 'Rides, flights, trains, fuel, tolls & parking',
  },
  accommodation: {
    category: 'accommodation',
    label: 'Stays & Lodging',
    icon: 'Building2',
    color: 'text-indigo-600 dark:text-indigo-400',
    bgColor: 'bg-indigo-500',
    borderColor: 'border-indigo-200 dark:border-indigo-800',
    description: 'Hotels, resorts, Airbnb & vacation rentals',
  },
  groceries: {
    category: 'groceries',
    label: 'Groceries & Supplies',
    icon: 'ShoppingCart',
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-500',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
    description: 'Supermarkets, delivery marts & daily essentials',
  },
  entertainment: {
    category: 'entertainment',
    label: 'Entertainment & Leisure',
    icon: 'Film',
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-500',
    borderColor: 'border-purple-200 dark:border-purple-800',
    description: 'Movies, concerts, activities, games & events',
  },
  utilities: {
    category: 'utilities',
    label: 'Bills & Utilities',
    icon: 'Zap',
    color: 'text-rose-600 dark:text-rose-400',
    bgColor: 'bg-rose-500',
    borderColor: 'border-rose-200 dark:border-rose-800',
    description: 'Rent, electricity, Wi-Fi, water, gas & maintenance',
  },
  general: {
    category: 'general',
    label: 'General & Misc',
    icon: 'Tag',
    color: 'text-zinc-600 dark:text-zinc-400',
    bgColor: 'bg-zinc-500',
    borderColor: 'border-zinc-200 dark:border-zinc-800',
    description: 'Other expenses and unclassified items',
  },
};

export interface CategoryBreakdown {
  category: ExpenseCategory;
  label: string;
  totalAmount: number; // in minor units
  percentage: number;  // 0 - 100
  expenseCount: number;
  color: string;
  bgColor: string;
  icon: string;
}

export interface TimelineDataPoint {
  date: string; // YYYY-MM-DD
  totalAmount: number; // in minor units
  expenseCount: number;
}

export interface MemberMatrixItem {
  memberId: string;
  displayName: string;
  userId: string | null;
  isPlaceholder: boolean;
  totalPaid: number;      // minor units
  totalOwed: number;      // minor units (consumption)
  netBalance: number;     // totalPaid - totalOwed + settledPaid - settledReceived
  paidPercentage: number; // 0 - 100
  owedPercentage: number; // 0 - 100
  isPayerHero: boolean;   // member who paid the most upfront
}

export interface GroupInsightsHighlights {
  largestExpense: {
    id: string;
    title: string;
    amount: number;
    date: string;
    paidBy: string;
  } | null;
  peakDay: {
    date: string;
    amount: number;
    count: number;
  } | null;
  topPayer: {
    memberId: string;
    displayName: string;
    amount: number;
    percentage: number;
  } | null;
  topCategory: {
    category: ExpenseCategory;
    label: string;
    amount: number;
    percentage: number;
  } | null;
  settledAmount: number;
  settledRatio: number; // 0 - 100 percentage of total spend covered by settlements
}

export interface GroupInsightsResult {
  groupId: string;
  currency: string;
  totalSpend: number; // in minor units
  expenseCount: number;
  averageExpenseSize: number; // in minor units
  userSpend: {
    totalPaid: number;
    totalOwed: number;
    netBalance: number;
    paidPercentage: number;
    owedPercentage: number;
  };
  categoryBreakdown: CategoryBreakdown[];
  spendingTimeline: TimelineDataPoint[];
  memberMatrix: MemberMatrixItem[];
  highlights: GroupInsightsHighlights;
}

export interface CurrencyTotal {
  currency: string;
  totalOutofPocketOwed: number; // consumption across all groups in this currency
  totalPaidUpfront: number;     // upfront funding across all groups in this currency
  totalReimbursed: number;      // settlements received
  totalSettledPaid: number;     // settlements sent
  netBalance: number;
}

export interface TopPartnerItem {
  userId: string | null;
  memberId: string;
  displayName: string;
  groupCount: number;
  mutualExpenseCount: number;
  totalVolume: number; // minor units of mutual bills
  netBalance: number;  // bilateral balance with current user
  currency: string;
}

export interface MonthlyTrendItem {
  month: string; // YYYY-MM
  label: string; // e.g. "Oct 2026"
  byCurrency: Record<string, number>; // currency -> minor units consumed
}

export interface OverallInsightsResult {
  userId: string;
  groupCount: number;
  totalExpenseCount: number;
  currencies: string[];
  totalsByCurrency: Record<string, CurrencyTotal>;
  categoriesByCurrency: Record<string, CategoryBreakdown[]>;
  monthlyTrends: MonthlyTrendItem[];
  topPartners: TopPartnerItem[];
  aiSpendingBrief: string;
}
