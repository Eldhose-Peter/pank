'use client';

import { useState } from 'react';
import { useScrollReveal } from './useScrollReveal';
import { ChevronDown, HelpCircle, Sparkles } from 'lucide-react';

interface FaqItem {
  q: string;
  a: string;
}

const faqs: FaqItem[] = [
  {
    q: 'Do all my friends need to create an account or install an app?',
    a: 'Not at all! You can add your friends right away with just their names (e.g. "Charlie", "Sneha") and start splitting bills immediately. When they want to see their balances, you can share a 1-tap invite link, and it works seamlessly in any mobile browser with zero app installation.',
  },
  {
    q: 'How does the AI handle restaurant taxes, GST, and discounts?',
    a: 'When you take a photo of a bill, Gemini AI extracts sub-totals, taxes, and service charges. If someone only ordered drinks, Pank proportionally applies tax to their drinks share while allocating food taxes to the rest of the group. Everything is mathematically fair.',
  },
  {
    q: 'What is "Greedy Debt Simplification" in plain English?',
    a: 'Imagine Rahul owes Arjun ₹500, and Arjun owes Priya ₹500. Instead of making two separate bank transfers, Pank cuts out the middle step: Rahul pays Priya ₹500 directly, and Arjun is fully settled. In large groups with 10+ expenses, this turns a tangled mess into just 2 or 3 clean payments.',
  },
  {
    q: 'Why does "Penny-Perfect Precision" matter?',
    a: 'Most apps divide ₹1,000 by 3 into ₹333.33, losing a paisa or causing awkward accounting mismatches where debts never truly balance to zero. Pank uses Hare-Niemeyer integer arithmetic to ensure every single paisa or cent is accounted for, guaranteeing that total debts always balance to exactly ₹0.00.',
  },
  {
    q: 'Can multiple people pay for different parts of one bill?',
    a: 'Yes! Pank has first-class multi-payer support. If one friend paid the hotel deposit and another paid the remaining checkout balance, you can record both payers on the same expense without creating duplicate entries.',
  },
  {
    q: 'Can I use Pank in different currencies?',
    a: 'Yes. Every group can select its own currency (INR ₹, USD $, EUR €, GBP £, CAD $, AUD $). Cross-group spending insights automatically isolate currencies so debts in different currencies are never mixed.',
  },
];

export function FaqSection() {
  const { ref, isVisible } = useScrollReveal({ threshold: 0.1 });
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section ref={ref} className="py-20 sm:py-32 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
      {/* Header */}
      <div 
        className={`text-center transition-all duration-700 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
        <div className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/60 px-3.5 py-1 text-xs font-bold text-indigo-700 dark:text-indigo-300">
          <HelpCircle className="h-3.5 w-3.5" />
          <span>Frequently Asked Questions</span>
        </div>
        <h2 className="mt-4 text-3xl sm:text-5xl font-extrabold tracking-tight text-zinc-900 dark:text-white leading-tight">
          Got Questions? We Have Answers.
        </h2>
        <p className="mt-4 text-base text-zinc-600 dark:text-zinc-400 max-w-xl mx-auto">
          Everything you need to know about splitting expenses, AI bill parsing, and group settlements.
        </p>
      </div>

      {/* Accordion */}
      <div className="mt-12 space-y-3.5">
        {faqs.map((faq, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div
              key={idx}
              className={`rounded-2xl border border-zinc-200/90 dark:border-zinc-800/90 bg-white/80 dark:bg-zinc-900/80 overflow-hidden shadow-xs backdrop-blur-sm transition-all duration-500 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
              style={{
                transitionDelay: `${120 + idx * 60}ms`,
              }}
            >
              <button
                type="button"
                onClick={() => setOpenIndex(isOpen ? null : idx)}
                className="w-full flex items-center justify-between p-5 text-left text-sm sm:text-base font-bold text-zinc-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
              >
                <span>{faq.q}</span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-zinc-400 transition-transform duration-300 ${
                    isOpen ? 'rotate-180 text-indigo-600' : ''
                  }`}
                />
              </button>

              <div
                className={`overflow-hidden transition-all duration-300 ease-out ${
                  isOpen ? 'max-h-96 opacity-100 pb-5 px-5' : 'max-h-0 opacity-0 px-5'
                }`}
              >
                <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed pt-1 border-t border-zinc-100 dark:border-zinc-800/60">
                  {faq.a}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
