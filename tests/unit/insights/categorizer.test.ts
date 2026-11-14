import { describe, it, expect } from 'vitest';
import { categorizeExpense } from '@/modules/insights/categorizer';

describe('Insights Categorizer Engine', () => {
  describe('Food & Dining Category', () => {
    it('categorizes dining keywords and platforms accurately', () => {
      expect(categorizeExpense('Dinner at Mainland China')).toBe('food_dining');
      expect(categorizeExpense('Swiggy gourmet dinner')).toBe('food_dining');
      expect(categorizeExpense('Zomato order for the team')).toBe('food_dining');
      expect(categorizeExpense('Starbucks iced latte')).toBe('food_dining');
      expect(categorizeExpense('McDonalds burgers and fries')).toBe('food_dining');
      expect(categorizeExpense('Pub night with beer and drinks')).toBe('food_dining');
      expect(categorizeExpense('Chai and snacks at tapri')).toBe('food_dining');
    });

    it('classifies Hotel Seagull as dining when receipt items contain food & beverages', () => {
      const result = categorizeExpense('Hotel Seagull bill', null, [
        { name: 'Budweiser 650ml' },
        { name: 'Kerala Porotta' },
        { name: 'Chicken Curry' },
      ]);
      expect(result).toBe('food_dining');
    });
  });

  describe('Travel & Transportation Category', () => {
    it('categorizes transit, ride-hailing, fuel, and tickets accurately', () => {
      expect(categorizeExpense('Uber to Bangalore Airport')).toBe('transport');
      expect(categorizeExpense('Ola ride home')).toBe('transport');
      expect(categorizeExpense('Rapido bike taxi')).toBe('transport');
      expect(categorizeExpense('Petrol at Shell bunk')).toBe('transport');
      expect(categorizeExpense('Diesel refill')).toBe('transport');
      expect(categorizeExpense('NH48 toll booth Fastag deduction')).toBe('transport');
      expect(categorizeExpense('Indigo flight tickets to Goa')).toBe('transport');
      expect(categorizeExpense('IRCTC train reservation')).toBe('transport');
      expect(categorizeExpense('Metro pass recharge')).toBe('transport');
    });
  });

  describe('Accommodation & Stays Category', () => {
    it('categorizes lodging, rentals, and hotels accurately', () => {
      expect(categorizeExpense('Airbnb 3BHK Villa in Anjuna')).toBe('accommodation');
      expect(categorizeExpense('Taj Hotel room booking')).toBe('accommodation');
      expect(categorizeExpense('Resort night stay')).toBe('accommodation');
      expect(categorizeExpense('Hostel bed in Zostel')).toBe('accommodation');
      expect(categorizeExpense('Weekend staycation cottage')).toBe('accommodation');
      expect(categorizeExpense('Guesthouse check-in fee')).toBe('accommodation');
    });
  });

  describe('Groceries & Supplies Category', () => {
    it('categorizes quick commerce and supermarket shopping', () => {
      expect(categorizeExpense('Blinkit quick delivery')).toBe('groceries');
      expect(categorizeExpense('Zepto 10 min groceries')).toBe('groceries');
      expect(categorizeExpense('Instamart vegetables and fruits')).toBe('groceries');
      expect(categorizeExpense('DMart monthly supermarket provisions')).toBe('groceries');
      expect(categorizeExpense('BigBasket daily milk and eggs')).toBe('groceries');
    });
  });

  describe('Entertainment & Leisure Category', () => {
    it('categorizes events, movies, and recreational activities', () => {
      expect(categorizeExpense('PVR Cinema Oppenheimer IMAX')).toBe('entertainment');
      expect(categorizeExpense('Concert pass for Coldplay')).toBe('entertainment');
      expect(categorizeExpense('Bowling night at SMAAASH')).toBe('entertainment');
      expect(categorizeExpense('Museum entrance pass')).toBe('entertainment');
      expect(categorizeExpense('Netflix 4K Monthly Subscription')).toBe('entertainment');
      expect(categorizeExpense('Spotify Premium Family')).toBe('entertainment');
    });
  });

  describe('Utilities & Bills Category', () => {
    it('categorizes domestic bills, rent, and household services', () => {
      expect(categorizeExpense('Electricity bill for October')).toBe('utilities');
      expect(categorizeExpense('Apartment monthly flat rent')).toBe('utilities');
      expect(categorizeExpense('Airtel Fiber broadband Wi-Fi bill')).toBe('utilities');
      expect(categorizeExpense('Society maintenance charges')).toBe('utilities');
      expect(categorizeExpense('Bharat Gas LPG cylinder')).toBe('utilities');
      expect(categorizeExpense('Maid salary for flat 204')).toBe('utilities');
    });
  });

  describe('General & Fallback Category', () => {
    it('falls back gracefully to general for ambiguous or empty input', () => {
      expect(categorizeExpense('Random miscellaneous items')).toBe('general');
      expect(categorizeExpense('Settlement correction')).toBe('general');
      expect(categorizeExpense('')).toBe('general');
      expect(categorizeExpense(null, null, null)).toBe('general');
      expect(categorizeExpense(undefined, undefined, undefined)).toBe('general');
      expect(categorizeExpense('   ')).toBe('general');
    });
  });
});
