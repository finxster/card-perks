/**
 * American Express-specific OCR parser
 * Handles AMEX Membership Rewards offers with points-based rewards
 */

import { BaseCardParser, ExtractedPerk, CardTypeConfig } from './base-parser';

export class AmexParser extends BaseCardParser {
  constructor() {
    const config: CardTypeConfig = {
      name: 'American Express',
      identifiers: ['american express', 'amex', 'membership rewards', 'platinum', 'gold'],
      merchantPatterns: {
        merchants: {
          'Amazon': ['amazon', 'amazon.com'],
          'Best Buy': ['best buy', 'bestbuy'],
          'Target': ['target'],
          'Whole Foods': ['whole foods', 'wholefoods'],
          'Starbucks': ['starbucks'],
          'Home Depot': ['home depot', 'homedepot'],
          'Uber': ['uber'],
          'Delta': ['delta'],
          'Hilton': ['hilton'],
          'Marriott': ['marriott'],
        },
        ocrCorrections: {
          'arnzon': 'amazon',
          'targot': 'target',
          'starhucks': 'starbucks',
        },
        navigationElements: [
          'american express', 'membership rewards', 'offers', 'terms apply', 
          'enrollment required', 'limited time offer'
        ],
        offerKeywords: [
          'points', 'earn', 'spend', 'get', 'offer', 'expires', 'enrollment',
          'membership', 'rewards', 'terms', 'apply'
        ]
      },
      layoutPatterns: {
        merchantLinePatterns: [
          /^[A-Z][a-zA-Z\s&.'-]{3,50}$/,
        ],
        offerLinePatterns: [
          /\d+x\s*points/i,
          /\d+\s*points/i,
          /\$\d+\s*back/i,
          /\d+%\s*back/i
        ],
        multiMerchantIndicators: [],
        skipPatterns: [
          /^offers$/i,
          /^earn$/i,
          /^spend$/i,
          /terms\s*apply/i,
          /enrollment\s*required/i
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
      
      // Skip pure navigation elements (not offer descriptions)
      if (this.isAmexNavigationElement(line)) {
        continue;
      }
      
      // Check if this looks like a merchant name
      if (this.looksLikeAmexMerchant(line)) {
        // Save previous perk if we have one
        if (currentMerchant && currentOffer) {
          perks.push({
            merchant: currentMerchant,
            description: currentOffer,
            value: this.extractOfferValue(currentOffer),
            expiration: currentExpiration || undefined,
            confidence: 0.9
          });
        }
        // Start new merchant
        currentMerchant = line;
        currentOffer = '';
        currentExpiration = '';
      } else if (this.matchesAmexOfferPattern(line) || this.looksLikeOfferDescription(line)) {
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

  private isAmexNavigationElement(line: string): boolean {
    const lowerLine = line.toLowerCase().trim();
    
    // Only these are truly navigation elements for AMEX
    const pureNavigationElements = [
      'american express', 'membership rewards', 'offers', 'terms apply', 
      'enrollment required', 'limited time offer'
    ];
    
    return pureNavigationElements.some(element => 
      lowerLine.includes(element.toLowerCase())
    );
  }

  private looksLikeAmexMerchant(line: string): boolean {
    // AMEX merchants are typically single words or well-known brands
    const trimmed = line.trim();
    
    // Skip if too short or contains obvious offer keywords
    if (trimmed.length < 3 || this.containsOfferKeywords(trimmed)) {
      return false;
    }
    
    // Check if it's a single capitalized word or known brand pattern
    const merchantPatterns = [
      /^[A-Z][a-z]+$/,           // "Amazon", "Target"
      /^[A-Z][a-z]+\s+[A-Z][a-z]+$/, // "Best Buy", "Home Depot"
      /^[A-Z][a-z]+\s+[A-Z][a-z]+\s+[A-Z][a-z]+$/ // "American Express Card"
    ];
    
    return merchantPatterns.some(pattern => pattern.test(trimmed));
  }

  private matchesAmexOfferPattern(line: string): boolean {
    return this.config.layoutPatterns.offerLinePatterns.some(pattern => pattern.test(line));
  }

  private looksLikeOfferDescription(line: string): boolean {
    // Look for patterns that indicate offer descriptions
    const offerPatterns = [
      /earn\s+\d+/i,           // "Earn 5x points"
      /spend\s+\$\d+/i,        // "Spend $250"
      /get\s+\d+/i,            // "Get 10x points"
      /\d+x\s+points/i,        // "5x points"
      /\d+\s+points/i,         // "2,500 points"
      /\$\d+/i,                // "$250"
      /\d+%/i                  // "20%"
    ];
    
    return offerPatterns.some(pattern => pattern.test(line));
  }
}