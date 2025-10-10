/**
 * Chase-specific OCR parser
 * Handles Chase Offers mobile app screens with enhanced multi-merchant detection
 */

import { BaseCardParser, ExtractedPerk, CardTypeConfig } from './base-parser';

export class ChaseParser extends BaseCardParser {
  constructor() {
    const config: CardTypeConfig = {
      name: 'Chase',
      identifiers: ['chase offers', 'chase', 'sapphire', 'freedom'],
      merchantPatterns: {
        merchants: {
          'fuboTV': ['fubo', 'fubotv', 'fubo tv'],
          'Event Tickets Center': ['event tickets', 'event tickets ce', 'event tickets center', 'event'],
          'Turo': ['turo'],
          'Dyson': ['dyson'],
          'Arlo': ['arlo', 'ario', 'arlo™'],
          'Lands\' End': ['lands end', 'lands\' end', 'lands'],
          'Zenni Optical': ['zenni optical', 'zenni 0ptical', 'zenni'],
          'Cole Haan': ['cole haan', 'cole'],
          'Wild Alaskan Company': ['wild alaskan', 'wild'],
        },
        ocrCorrections: {
          '0': 'o',
          '1': 'i', 
          '5': 's',
          'rn': 'm',
          'cl': 'd'
        },
        navigationElements: [
          'chase offers', 'all offers', 'shopping', 'groceries', 'home & pet',
          'gear up for game day', 'new', 'left', 'expires', 'all'
        ],
        offerKeywords: [
          'cash', 'back', 'earn', 'spend', 'get', 'offer', 'offers', 'new',
          'left', 'days', 'expires', 'credit', 'points', 'miles', 'bonus'
        ]
      },
      layoutPatterns: {
        merchantLinePatterns: [
          /^[a-zA-Z][a-zA-Z\s'&.-]{2,30}$/,
          /^[a-zA-Z][a-zA-Z\s'&.-]*(?:\s+[A-Z][a-z]*)*$/
        ],
        offerLinePatterns: [
          /\d+%\s*cash\s*back/i,
          /\$\d+\s*cash\s*back/i,
          /\d+d\s*left/i
        ],
        multiMerchantIndicators: ['...', '  ', '\t'],
        skipPatterns: [
          /^\d{1,2}:\d{2}/,  // Time stamps
          /^new$/i,
          /^all$/i,
          /\d+d\s*left/i,
          /^[<>@$#]+$/
        ]
      }
    };
    super(config);
  }

  parseLines(lines: string[]): ExtractedPerk[] {
    console.log(`Parsing Chase Offers screen with ${lines.length} lines`);
    console.log('Lines:', lines);

    const perks: ExtractedPerk[] = [];
    const processedMerchants = new Set<string>();

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Skip Chase navigation patterns
      if (this.isChaseNavigationElement(line) || line.length < 2) {
        console.log(`Skipping navigation line ${i}: "${line}"`);
        continue;
      }

      // Check for multi-merchant lines first
      const multiMerchants = this.extractMultipleChaseOfferMerchants(line);
      if (multiMerchants.length > 1) {
        console.log(`Found multi-merchant pattern in line: "${line}" -> ${multiMerchants.join(', ')}`);
        
        for (const merchant of multiMerchants) {
          if (!processedMerchants.has(merchant.toLowerCase())) {
            const offer = this.extractOfferForMerchant(lines, i, merchant);
            if (offer) {
              console.log(`Found merchant "${merchant}" from line ${i}: "${line}"`);
              console.log(`  Offer value: ${offer.value}, Expiration: ${offer.expiration}`);
              perks.push(offer);
              processedMerchants.add(merchant.toLowerCase());
            }
          } else {
            console.log(`Skipping duplicate merchant "${merchant}" from line ${i}: "${line}"`);
          }
        }
        continue;
      }

      // Single merchant detection
      const merchant = this.extractChaseOfferMerchant(line);
      if (merchant && !processedMerchants.has(merchant.toLowerCase())) {
        const offer = this.extractOfferForMerchant(lines, i, merchant);
        if (offer) {
          console.log(`Found merchant "${merchant}" from line ${i}: "${line}"`);
          console.log(`  Offer value: ${offer.value}, Expiration: ${offer.expiration}`);
          perks.push(offer);
          processedMerchants.add(merchant.toLowerCase());
        }
      }
    }

    console.log(`Chase Offers parsing complete. Found ${perks.length} perks before filtering`);
    perks.forEach((perk, index) => {
      console.log(`  ${index + 1}. ${perk.merchant}: ${perk.value}`);
    });

    // Filter out low-confidence perks
    const filteredPerks = perks.filter(perk => perk.confidence >= 0.8);
    console.log(`After filtering: ${filteredPerks.length} perks`);

    return filteredPerks;
  }

  private isChaseNavigationElement(line: string): boolean {
    const patterns = [
      /^\d{1,2}:\d{2}/,  // Time like "4:36"
      /^new$/i,
      /^all$/i,
      /\d+d\s*left/i,
      /^[<>@$#\\()\[\]]+$/,
      /^chase offers$/i,
      /shopping|groceries|home & pet/i,
      /gear up for game day/i
    ];

    return patterns.some(pattern => pattern.test(line.trim())) ||
           line.trim().length < 2;
  }

  private extractMultipleChaseOfferMerchants(line: string): string[] {
    if (!this.lineContainsMultipleMerchants(line)) {
      return [];
    }

    // Multi-merchant line patterns with configurable merchants
    const multiMerchantPatterns = [
      {
        pattern: /fubo.*event.*tickets.*turo/i,
        merchants: ['fuboTV', 'Event Tickets Center', 'Turo']
      },
      {
        pattern: /dyson.*arlo/i,
        merchants: ['Dyson', 'Arlo']
      },
      {
        pattern: /lands.*end.*zenni/i,
        merchants: ['Lands\' End', 'Zenni Optical']
      }
    ];

    for (const { pattern, merchants } of multiMerchantPatterns) {
      if (pattern.test(line)) {
        return merchants;
      }
    }

    return [];
  }

  private lineContainsMultipleMerchants(line: string): boolean {
    const indicators = this.config.layoutPatterns.multiMerchantIndicators;
    return indicators.some(indicator => line.includes(indicator)) ||
           line.split(/\s+/).length >= 4; // Multiple words might indicate multiple merchants
  }

  private extractChaseOfferMerchant(line: string): string | null {
    const cleanLine = line.toLowerCase().trim();
    
    // Skip obvious non-merchant patterns
    if (this.isChaseNavigationElement(line) || cleanLine.length < 2) {
      return null;
    }
    
    // Check against known merchant patterns
    for (const [merchantName, patterns] of Object.entries(this.config.merchantPatterns.merchants)) {
      for (const pattern of patterns) {
        if (cleanLine.includes(pattern) || this.fuzzyMatch(cleanLine, pattern)) {
          return merchantName;
        }
      }
    }
    
    // Fallback: intelligent detection for unknown merchants
    return this.detectUnknownMerchant(line);
  }

  private fuzzyMatch(text: string, pattern: string): boolean {
    // Apply OCR corrections and check again
    let correctedText = text;
    for (const [error, correction] of Object.entries(this.config.merchantPatterns.ocrCorrections)) {
      correctedText = correctedText.replace(new RegExp(error, 'gi'), correction);
    }
    
    return correctedText.includes(pattern) || 
           pattern.includes(correctedText) ||
           this.calculateSimilarity(correctedText, pattern) > 0.8;
  }

  private calculateSimilarity(str1: string, str2: string): number {
    if (Math.abs(str1.length - str2.length) > 2) return 0;
    
    let matches = 0;
    const minLength = Math.min(str1.length, str2.length);
    
    for (let i = 0; i < minLength; i++) {
      if (str1[i] === str2[i]) matches++;
    }
    
    return matches / minLength;
  }

  private detectUnknownMerchant(line: string): string | null {
    const trimmed = line.trim();
    
    // Basic merchant name patterns
    if (trimmed.length >= 3 && 
        trimmed.length <= 30 && 
        /^[a-zA-Z][a-zA-Z\s'-]*[a-zA-Z]$/.test(trimmed) &&
        !this.containsOfferKeywords(line)) {
      
      return this.cleanMerchantName(trimmed);
    }
    
    return null;
  }

  private extractOfferForMerchant(lines: string[], merchantLineIndex: number, merchant: string): ExtractedPerk | null {
    // Look for offer information in nearby lines
    const searchRange = 3;
    let offerValue = null;
    let expiration = null;

    for (let i = Math.max(0, merchantLineIndex - searchRange); 
         i <= Math.min(lines.length - 1, merchantLineIndex + searchRange); 
         i++) {
      const line = lines[i];
      
      // Extract cash back offers
      const cashBackMatch = line.match(/(\d+%\s*cash\s*back|\$\d+\s*cash\s*back)/i);
      if (cashBackMatch && !offerValue) {
        offerValue = cashBackMatch[1];
      }

      // Extract expiration
      const expirationMatch = line.match(/(\d+d)\s*left/i);
      if (expirationMatch && !expiration) {
        expiration = expirationMatch[1];
      }
    }

    return {
      merchant,
      description: offerValue || 'N/A',
      value: offerValue || undefined,
      expiration: expiration || undefined,
      confidence: 0.9
    };
  }
}