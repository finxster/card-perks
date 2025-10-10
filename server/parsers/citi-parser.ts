/**
 * Citi-specific OCR parser
 * Handles Citi ThankYou Rewards and cash back offers
 */

import { BaseCardParser, ExtractedPerk, CardTypeConfig } from './base-parser';

export class CitiParser extends BaseCardParser {
  constructor() {
    const config: CardTypeConfig = {
      name: 'Citi',
      identifiers: ['citi', 'citibank', 'thank you', 'thankyou', 'prestige', 'premier', 'double cash'],
      merchantPatterns: {
        merchants: {
          'Amazon': ['amazon', 'amazon.com'],
          'Target': ['target'],
          'Walmart': ['walmart'],
          'Gas Stations': ['gas', 'exxon', 'shell', 'bp', 'chevron'],
          'Grocery Stores': ['grocery', 'supermarket', 'kroger', 'safeway'],
          'Restaurants': ['restaurants', 'dining'],
          'Travel': ['travel', 'airlines', 'hotels'],
        },
        ocrCorrections: {
          'thankyou': 'thank you',
          'citi': 'citi',
        },
        navigationElements: [
          'citi', 'thank you', 'thankyou', 'points', 'offers', 'rewards',
          'double cash', 'cash back'
        ],
        offerKeywords: [
          'points', 'thank', 'you', 'earn', 'spend', 'cash', 'back', 
          'double', 'bonus', 'categories'
        ]
      },
      layoutPatterns: {
        merchantLinePatterns: [
          /^[A-Z][a-zA-Z\s&.'-]{3,50}$/,
        ],
        offerLinePatterns: [
          /\d+\s*points/i,
          /\d+%\s*back/i,
          /\d+%\s*cash\s*back/i,
          /\d+x\s*points/i
        ],
        multiMerchantIndicators: [],
        skipPatterns: [
          /^citi$/i,
          /^thank\s*you$/i,
          /^offers$/i
        ]
      }
    };
    super(config);
  }

  parseLines(lines: string[]): ExtractedPerk[] {
    const perks: ExtractedPerk[] = [];
    let currentMerchant = '';
    let currentOffer = '';
    let currentExpiration = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Skip navigation elements
      if (this.isNavigationElement(line) || this.isCitiSkipPattern(line)) {
        continue;
      }

      // Check if this looks like a merchant or category
      if (this.looksLikeCitiMerchant(line)) {
        // Save previous perk
        if (currentMerchant && currentOffer) {
          perks.push({
            merchant: currentMerchant,
            description: currentOffer,
            value: this.extractOfferValue(currentOffer),
            expiration: currentExpiration || undefined,
            confidence: 0.9
          });
        }

        currentMerchant = line;
        currentOffer = '';
        currentExpiration = '';
      } else if (this.looksLikeCitiOffer(line)) {
        if (currentOffer) {
          currentOffer += ' ' + line;
        } else {
          currentOffer = line;
        }
      } else if (this.isExpirationLine(line)) {
        currentExpiration = this.extractExpiration(line);
      }
    }

    // Save the last perk
    if (currentMerchant && currentOffer) {
      perks.push({
        merchant: currentMerchant,
        description: currentOffer,
        value: this.extractOfferValue(currentOffer),
        expiration: currentExpiration || undefined,
        confidence: 0.9
      });
    }

    return perks;
  }

  private isCitiSkipPattern(line: string): boolean {
    return this.config.layoutPatterns.skipPatterns.some(pattern => pattern.test(line));
  }

  private looksLikeCitiMerchant(line: string): boolean {
    const trimmed = line.trim();

    if (trimmed.length < 3 || this.containsOfferKeywords(trimmed)) {
      return false;
    }

    // Check against known Citi merchant patterns
    const merchantPatterns = this.config.layoutPatterns.merchantLinePatterns;
    return merchantPatterns.some(pattern => pattern.test(trimmed));
  }

  private looksLikeCitiOffer(line: string): boolean {
    const offerPatterns = this.config.layoutPatterns.offerLinePatterns;
    return offerPatterns.some(pattern => pattern.test(line));
  }
}