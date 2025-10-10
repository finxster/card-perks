/**
 * Generic OCR parser for unknown card types or general credit card statements
 * Provides fallback parsing when no specific parser is available
 */

import { BaseCardParser, ExtractedPerk, CardTypeConfig } from './base-parser';

export class GenericParser extends BaseCardParser {
  constructor() {
    const config: CardTypeConfig = {
      name: 'Generic',
      identifiers: [], // Generic parser doesn't have specific identifiers
      merchantPatterns: {
        merchants: {
          // Common merchants that might appear in any card statement
          'Amazon': ['amazon', 'amazon.com'],
          'Target': ['target'],
          'Walmart': ['walmart'],
          'Starbucks': ['starbucks'],
          'Uber': ['uber'],
          'Netflix': ['netflix'],
          'Spotify': ['spotify'],
        },
        ocrCorrections: {
          '0': 'o',
          '1': 'i',
          '5': 's',
        },
        navigationElements: [
          'offers', 'rewards', 'cashback', 'points', 'miles'
        ],
        offerKeywords: [
          'cash', 'back', 'points', 'miles', 'earn', 'spend', 'get', 'offer',
          'expires', 'bonus', 'rewards'
        ]
      },
      layoutPatterns: {
        merchantLinePatterns: [
          /^[A-Z][a-zA-Z\s&.'-]{3,50}$/,
          /^[a-zA-Z][a-zA-Z\s&.'-]{2,30}$/
        ],
        offerLinePatterns: [
          /\d+%/i,
          /\$\d+/i,
          /\d+\s*points/i,
          /\d+\s*miles/i,
          /\d+x/i
        ],
        multiMerchantIndicators: [],
        skipPatterns: [
          /^\d{1,2}:\d{2}/,  // Time stamps
          /^offers$/i,
          /^rewards$/i
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

      // Skip empty lines and navigation elements
      if (!line || this.isNavigationElement(line)) {
        continue;
      }

      // Try to identify merchant names
      if (this.looksLikeMerchant(line)) {
        // Save previous perk if we have one
        if (currentMerchant && currentOffer) {
          perks.push(this.createPerk(currentMerchant, currentOffer, currentExpiration));
        }

        // Start new merchant
        currentMerchant = line;
        currentOffer = '';
        currentExpiration = '';
      } else if (this.looksLikeOffer(line)) {
        // This looks like an offer description
        if (currentOffer) {
          currentOffer += ' ' + line;
        } else {
          currentOffer = line;
        }
      } else if (this.isExpirationLine(line)) {
        currentExpiration = this.extractExpiration(line);
      }
    }

    // Don't forget the last perk
    if (currentMerchant && currentOffer) {
      perks.push(this.createPerk(currentMerchant, currentOffer, currentExpiration));
    }

    return this.filterAndEnhancePerks(perks);
  }

  private looksLikeMerchant(line: string): boolean {
    const trimmed = line.trim();

    // Basic checks
    if (trimmed.length < 3 || trimmed.length > 50) {
      return false;
    }

    // Skip if it contains too many offer keywords
    if (this.containsOfferKeywords(trimmed)) {
      return false;
    }

    // Check against known merchants
    const lowerLine = trimmed.toLowerCase();
    for (const merchantPatterns of Object.values(this.config.merchantPatterns.merchants)) {
      if (merchantPatterns.some(pattern => lowerLine.includes(pattern))) {
        return true;
      }
    }

    // Generic merchant patterns
    const merchantPatterns = this.config.layoutPatterns.merchantLinePatterns;
    return merchantPatterns.some(pattern => pattern.test(trimmed));
  }

  private looksLikeOffer(line: string): boolean {
    const offerPatterns = this.config.layoutPatterns.offerLinePatterns;
    return offerPatterns.some(pattern => pattern.test(line)) ||
           this.containsOfferKeywords(line);
  }

  private createPerk(merchant: string, offer: string, expiration: string): ExtractedPerk {
    return {
      merchant: this.cleanMerchantName(merchant),
      description: offer,
      value: this.extractOfferValue(offer),
      expiration: expiration || undefined,
      confidence: this.calculateConfidence(merchant, offer)
    };
  }

  private calculateConfidence(merchant: string, offer: string): number {
    let confidence = 0.8; // Base confidence for generic parsing

    // Boost confidence for known merchants
    const lowerMerchant = merchant.toLowerCase();
    for (const merchantPatterns of Object.values(this.config.merchantPatterns.merchants)) {
      if (merchantPatterns.some(pattern => lowerMerchant.includes(pattern))) {
        confidence += 0.1;
        break;
      }
    }

    // Boost confidence for clear offer patterns
    if (this.config.layoutPatterns.offerLinePatterns.some(pattern => pattern.test(offer))) {
      confidence += 0.1;
    }

    return Math.min(confidence, 1.0);
  }

  private filterAndEnhancePerks(perks: ExtractedPerk[]): ExtractedPerk[] {
    // Remove duplicates and low-confidence perks
    const filtered = perks.filter((perk, index, array) => {
      // Remove low confidence
      if (perk.confidence < 0.7) return false;

      // Remove duplicates (same merchant)
      const duplicate = array.findIndex(p => 
        p.merchant.toLowerCase() === perk.merchant.toLowerCase()
      );
      return duplicate === index;
    });

    return filtered;
  }
}