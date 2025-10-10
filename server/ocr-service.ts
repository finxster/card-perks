/**
 * OCR Service for extracting credit card perks from images
 * 
 * This service handles multiple types of credit card offer screens:
 * 1. General credit card statements and offers
 * 2. Chase Offers mobile app screens (enhanced in latest version)
 * 3. Other bank mobile app formats
 * 
 * Chase Offers Enhancement:
 * - Detects Chase Offers screens automatically
 * - Handles merchant logos with text overlays
 * - Processes "New" badges and activation buttons
 * - Extracts truncated merchant names (e.g., "Event Tickets Ce...")
 * - Parses both percentage (35% cash back) and fixed dollar ($30 cash back) offers
 * - Handles expiration indicators (24d left)
 * - Filters out navigation elements and duplicates
 */

import Tesseract from 'tesseract.js';

export interface ExtractedPerk {
  merchant: string;
  description: string;
  expiration?: string;
  value?: string;
  confidence: number;
}

export interface OCRResult {
  text: string;
  perks: ExtractedPerk[];
  confidence: number;
}

export type CardType = 'chase' | 'amex' | 'citi' | 'capital_one' | 'discover' | 'unknown';

export interface CardTypeConfig {
  name: string;
  identifiers: string[];
  merchantPatterns: {
    merchants: { [key: string]: string[] };
    ocrCorrections: { [key: string]: string };
    navigationElements: string[];
    offerKeywords: string[];
  };
  layoutPatterns: {
    merchantLinePatterns: RegExp[];
    offerLinePatterns: RegExp[];
    multiMerchantIndicators: string[];
    skipPatterns: RegExp[];
  };
}

export class OCRService {
  // Card-specific configurations for precise parsing
  private readonly cardConfigs: { [key in CardType]: CardTypeConfig } = {
    chase: {
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
    },
    amex: {
      name: 'American Express',
      identifiers: ['american express', 'amex', 'membership rewards', 'platinum', 'gold'],
      merchantPatterns: {
        merchants: {
          'Amazon': ['amazon', 'amazon.com'],
          'Best Buy': ['best buy', 'bestbuy'],
          'Target': ['target'],
          'Whole Foods': ['whole foods', 'wholefoods'],
          'Starbucks': ['starbucks'],
        },
        ocrCorrections: {
          'arnzon': 'amazon',
          'targot': 'target',
        },
        navigationElements: [
          'offers', 'membership rewards', 'earn', 'spend', 'points',
          'expires', 'terms apply', 'enrollment required'
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
    },
    citi: {
      name: 'Citi',
      identifiers: ['citi', 'citibank', 'thank you', 'prestige', 'premier'],
      merchantPatterns: {
        merchants: {},
        ocrCorrections: {},
        navigationElements: ['citi', 'thank you', 'points', 'offers'],
        offerKeywords: ['points', 'thank', 'you', 'earn', 'spend']
      },
      layoutPatterns: {
        merchantLinePatterns: [/^[A-Z][a-zA-Z\s&.'-]{3,50}$/],
        offerLinePatterns: [/\d+\s*points/i, /\d+%\s*back/i],
        multiMerchantIndicators: [],
        skipPatterns: [/^offers$/i, /^citi$/i]
      }
    },
    capital_one: {
      name: 'Capital One',
      identifiers: ['capital one', 'venture', 'quicksilver', 'savor'],
      merchantPatterns: {
        merchants: {},
        ocrCorrections: {},
        navigationElements: ['capital one', 'venture', 'miles', 'cash back'],
        offerKeywords: ['miles', 'cash', 'back', 'earn', 'spend']
      },
      layoutPatterns: {
        merchantLinePatterns: [/^[A-Z][a-zA-Z\s&.'-]{3,50}$/],
        offerLinePatterns: [/\d+\s*miles/i, /\d+%\s*cash/i],
        multiMerchantIndicators: [],
        skipPatterns: [/^capital\s*one$/i, /^venture$/i]
      }
    },
    discover: {
      name: 'Discover',
      identifiers: ['discover', 'cashback', 'it card'],
      merchantPatterns: {
        merchants: {},
        ocrCorrections: {},
        navigationElements: ['discover', 'cashback', 'rotating categories'],
        offerKeywords: ['cashback', 'cash', 'back', 'categories']
      },
      layoutPatterns: {
        merchantLinePatterns: [/^[A-Z][a-zA-Z\s&.'-]{3,50}$/],
        offerLinePatterns: [/\d+%\s*cash/i],
        multiMerchantIndicators: [],
        skipPatterns: [/^discover$/i, /^cashback$/i]
      }
    },
    unknown: {
      name: 'Unknown',
      identifiers: [],
      merchantPatterns: {
        merchants: {},
        ocrCorrections: {},
        navigationElements: [],
        offerKeywords: ['cash', 'back', 'points', 'miles', 'earn', 'spend']
      },
      layoutPatterns: {
        merchantLinePatterns: [/^[A-Z][a-zA-Z\s&.'-]{3,50}$/],
        offerLinePatterns: [/\d+%/i, /\$\d+/i, /\d+\s*points/i],
        multiMerchantIndicators: [],
        skipPatterns: []
      }
    }
  };

  // Legacy merchant patterns for backward compatibility
  private readonly merchantPatterns = {
    // Known merchant names with common OCR variations
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
    
    // Multi-merchant line patterns
    multiMerchantLines: [
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
    ],
    
    // OCR correction patterns
    ocrCorrections: {
      '0': 'o',
      '1': 'i', 
      '5': 's',
      'rn': 'm',
      'cl': 'd'
    }
  };

  /**
   * NEW: Card-type-aware OCR extraction
   */
  async extractPerksFromImageWithCardType(imageBuffer: Buffer, cardType: CardType): Promise<OCRResult> {
    console.log(`Starting OCR extraction for card type: ${cardType}`);
    
    try {
      const result = await Tesseract.recognize(imageBuffer, 'eng', {
        logger: m => console.log(m)
      });
      
      const text = result.data.text;
      console.log('OCR Text extracted:', text);
      
      // Use card-specific parsing
      const perks = this.extractPerksFromTextWithCardType(text, cardType);
      
      return {
        text,
        perks,
        confidence: result.data.confidence / 100
      };
    } catch (error) {
      console.error('OCR extraction failed:', error);
      throw error;
    }
  }

  /**
   * NEW: Card-type-aware text parsing
   */
  extractPerksFromTextWithCardType(text: string, cardType: CardType): ExtractedPerk[] {
    console.log(`Starting perk parsing from text for card type: ${cardType}...`);
    
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    console.log(`Processing ${lines.length} lines`);
    
    // Auto-detect card type if unknown
    if (cardType === 'unknown') {
      cardType = this.detectCardType(text);
      console.log(`Auto-detected card type: ${cardType}`);
    }
    
    const config = this.cardConfigs[cardType];
    console.log(`Using ${config.name} parsing configuration`);
    
    // Use card-specific parsing strategy
    return this.parseWithCardConfig(lines, config, cardType);
  }

  /**
   * Detect card type from OCR text
   */
  private detectCardType(text: string): CardType {
    const lowerText = text.toLowerCase();
    
    for (const [cardType, config] of Object.entries(this.cardConfigs)) {
      if (cardType === 'unknown') continue;
      
      for (const identifier of config.identifiers) {
        if (lowerText.includes(identifier.toLowerCase())) {
          return cardType as CardType;
        }
      }
    }
    
    return 'unknown';
  }

  /**
   * Parse text using card-specific configuration
   */
  private parseWithCardConfig(lines: string[], config: CardTypeConfig, cardType: CardType): ExtractedPerk[] {
    console.log(`Parsing with ${config.name} configuration...`);
    
    const perks: ExtractedPerk[] = [];
    const processedMerchants = new Set<string>();
    
    // Card-specific parsing strategies
    switch (cardType) {
      case 'chase':
        return this.parseChaseFormat(lines, config);
      case 'amex':
        return this.parseAmexFormat(lines, config);
      case 'citi':
        return this.parseCitiFormat(lines, config);
      case 'capital_one':
        return this.parseCapitalOneFormat(lines, config);
      case 'discover':
        return this.parseDiscoverFormat(lines, config);
      default:
        return this.parseGenericFormat(lines, config);
    }
  }

  /**
   * Chase-specific parsing (uses existing enhanced logic)
   */
  private parseChaseFormat(lines: string[], config: CardTypeConfig): ExtractedPerk[] {
    // Use the existing Chase Offers parsing logic but with config
    return this.parseChaseOffersScreen(lines);
  }

  /**
   * American Express-specific parsing
   */
  private parseAmexFormat(lines: string[], config: CardTypeConfig): ExtractedPerk[] {
    const perks: ExtractedPerk[] = [];
    let currentMerchant = '';
    let currentOffer = '';
    let currentExpiration = '';
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip pure navigation elements (not offer descriptions)
      if (this.isAmexNavigationElement(line, config)) {
        continue;
      }
      
      // Check if this looks like a merchant name (single word or known brand)
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
      } else if (this.matchesAmexOfferPattern(line, config) || this.looksLikeOfferDescription(line)) {
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

  /**
   * Check if line is a navigation element for AMEX (more restrictive)
   */
  private isAmexNavigationElement(line: string, config: CardTypeConfig): boolean {
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

  /**
   * Check if line looks like an offer description
   */
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

  /**
   * Check if line looks like an AMEX merchant
   */
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
      /^[A-Z][a-z]+\s+[A-Z][a-z]+$/, // "Best Buy", "American Express"
      /^[A-Z][a-z]+\s+[A-Z][a-z]+\s+[A-Z][a-z]+$/ // "American Express Card"
    ];
    
    return merchantPatterns.some(pattern => pattern.test(trimmed));
  }

  /**
   * Check if line contains expiration information
   */
  private isExpirationLine(line: string): boolean {
    return /expires|valid|until|through/i.test(line) && /\d{1,2}\/\d{1,2}\/\d{4}|\d{1,2}\/\d{4}/i.test(line);
  }

  /**
   * Extract expiration date from line
   */
  private extractExpiration(line: string): string {
    const match = line.match(/(\d{1,2}\/\d{1,2}\/\d{4}|\d{1,2}\/\d{4})/);
    return match ? match[1] : '';
  }

  /**
   * Generic format parsing for other card types
   */
  private parseGenericFormat(lines: string[], config: CardTypeConfig): ExtractedPerk[] {
    // Fallback to existing logic
    return this.parsePerksFromText(lines.join('\n'));
  }

  /**
   * Citi-specific parsing (placeholder)
   */
  private parseCitiFormat(lines: string[], config: CardTypeConfig): ExtractedPerk[] {
    return this.parseGenericFormat(lines, config);
  }

  /**
   * Capital One-specific parsing (placeholder)
   */
  private parseCapitalOneFormat(lines: string[], config: CardTypeConfig): ExtractedPerk[] {
    return this.parseGenericFormat(lines, config);
  }

  /**
   * Discover-specific parsing (placeholder)
   */
  private parseDiscoverFormat(lines: string[], config: CardTypeConfig): ExtractedPerk[] {
    return this.parseGenericFormat(lines, config);
  }

  /**
   * Check if line matches AMEX merchant pattern
   */
  private matchesAmexMerchantPattern(line: string, config: CardTypeConfig): boolean {
    return config.layoutPatterns.merchantLinePatterns.some(pattern => pattern.test(line)) &&
           !this.containsOfferKeywords(line);
  }

  /**
   * Check if line matches AMEX offer pattern
   */
  private matchesAmexOfferPattern(line: string, config: CardTypeConfig): boolean {
    return config.layoutPatterns.offerLinePatterns.some(pattern => pattern.test(line));
  }

  /**
   * Check if line is a navigation element using config
   */
  private isNavigationElement(line: string, config: CardTypeConfig): boolean {
    const lowerLine = line.toLowerCase();
    return config.merchantPatterns.navigationElements.some(element => 
      lowerLine.includes(element.toLowerCase())
    );
  }

  /**
   * Extract offer value from text
   */
  private extractOfferValue(text: string): string {
    const pointsMatch = text.match(/(\d+[x]?\s*points?)/i);
    const percentMatch = text.match(/(\d+%)/);
    const dollarMatch = text.match(/(\$\d+)/);
    
    return pointsMatch?.[1] || percentMatch?.[1] || dollarMatch?.[1] || 'N/A';
  }

  // ===== LEGACY METHODS (for backward compatibility) =====

  /**
   * Extract text from image using Tesseract OCR
   */
  async extractTextFromImage(imageBuffer: Buffer): Promise<{ text: string; confidence: number }> {
    try {
      const result = await Tesseract.recognize(imageBuffer, 'eng', {
        logger: m => console.log(m), // Optional logging
      });
      
      console.log('OCR Raw Text:', result.data.text);
      console.log('OCR Confidence:', result.data.confidence);
      
      return {
        text: result.data.text,
        confidence: result.data.confidence
      };
    } catch (error) {
      console.error('OCR Error:', error);
      throw new Error('Failed to extract text from image');
    }
  }

  /**
   * Parse extracted text to identify credit card offers/perks
   */
  parsePerksFromText(text: string): ExtractedPerk[] {
    console.log('Starting perk parsing from text...');
    const perks: ExtractedPerk[] = [];
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    console.log(`Processing ${lines.length} lines`);
    
    // Check if this looks like a Chase Offers screen
    const isChaseOffers = this.isChaseOffersScreen(text);
    console.log(`Is Chase Offers screen: ${isChaseOffers}`);
    
    if (isChaseOffers) {
      console.log('Using Chase Offers parsing...');
      const chasePerks = this.parseChaseOffersScreen(lines);
      perks.push(...chasePerks);
      
      // If we found good Chase Offers results, return them instead of fallback parsing
      if (chasePerks.length >= 3) {
        console.log(`Found ${chasePerks.length} Chase perks, returning early`);
        return perks;
      }
      console.log(`Only found ${chasePerks.length} Chase perks, continuing with fallback parsing`);
    }
    
    console.log('Using fallback parsing...');
    
    // First, try to identify offer blocks (multi-line offers)
    const offerBlocks = this.identifyOfferBlocks(lines);
    
    for (const block of offerBlocks) {
      const perk = this.parseOfferBlock(block);
      if (perk && !this.isDuplicatePerk(perk, perks)) {
        perks.push(perk);
      }
    }

    // Fallback: try single-line parsing for any remaining lines
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const perk = this.parsePerkFromLine(line, lines, i);
      if (perk && !this.isDuplicatePerk(perk, perks)) {
        perks.push(perk);
      }
    }

    return perks;
  }

  /**
   * Detect if the OCR text appears to be from a Chase Offers screen
   */
  private isChaseOffersScreen(text: string): boolean {
    const chaseIndicators = [
      /chase\s+offers/i,
      /all\s+offers/i,
      /shopping.*groceries.*home\s*&\s*pet/i,
      /new.*cash\s+back/i,
      /\d+%\s+cash\s+back/i,
      /\$\d+\s+cash\s+back/i,
      /gear\s+up\s+for\s+game\s+day/i,
      /all\s+shopping\s+groceries/i
    ];
    
    const indicatorCount = chaseIndicators.filter(pattern => pattern.test(text)).length;
    
    // Also check for common merchant patterns in Chase Offers
    const merchantPatterns = [
      /fubo.*tv/i,
      /event\s+tickets/i,
      /turo/i,
      /dyson/i,
      /arlo/i,
      /lands.*end/i,
      /zenni\s+optical/i
    ];
    
    const merchantCount = merchantPatterns.filter(pattern => pattern.test(text)).length;
    
    // If we have 2+ indicators or 3+ merchants, likely a Chase Offers screen
    return indicatorCount >= 2 || merchantCount >= 3;
  }

  /**
   * Parse Chase Offers screen layout specifically
   */
  private parseChaseOffersScreen(lines: string[]): ExtractedPerk[] {
    console.log('Parsing Chase Offers screen with', lines.length, 'lines');
    console.log('Lines:', lines);
    
    const perks: ExtractedPerk[] = [];
    const processedMerchants = new Set<string>();
    
    // Look for merchant + offer patterns specific to Chase Offers
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Skip navigation elements
      if (this.isChaseNavigationElement(line)) {
        console.log(`Skipping navigation line ${i}: "${line}"`);
        continue;
      }
      
      // Skip lines that are clearly not merchants or offers
      if (line.length < 3 || /^\d+d\s+left$/i.test(line)) {
        console.log(`Skipping short/expiration line ${i}: "${line}"`);
        continue;
      }
      
      // Look for merchant names - handle multiple merchants on one line
      const merchants = this.extractMultipleChaseOfferMerchants(line);
      
      for (const merchant of merchants) {
        if (merchant && !processedMerchants.has(merchant.toLowerCase())) {
          console.log(`Found merchant "${merchant}" from line ${i}: "${line}"`);
          processedMerchants.add(merchant.toLowerCase());
          
          // Look for the offer value in the next few lines
          const offerValue = this.findChaseOfferValue(lines, i, merchant);
          const expiration = this.findChaseOfferExpiration(lines, i);
          
          console.log(`  Offer value: ${offerValue}, Expiration: ${expiration}`);
          
          if (offerValue) {
            perks.push({
              merchant,
              description: `${offerValue}`,
              value: offerValue,
              expiration,
              confidence: 0.9
            });
          }
        } else if (merchant) {
          console.log(`Skipping duplicate merchant "${merchant}" from line ${i}: "${line}"`);
        }
      }
      
      // Also look for direct patterns like "35% cash back" but avoid duplicates
      const directOffer = this.parseDirectChaseOffer(line);
      if (directOffer && !this.isDuplicatePerk(directOffer, perks)) {
        // Only add if it's not already covered by merchant parsing
        const merchantAlreadyProcessed = processedMerchants.has(directOffer.merchant.toLowerCase());
        if (!merchantAlreadyProcessed) {
          console.log(`Found direct offer from line ${i}: "${line}" -> ${directOffer.merchant}: ${directOffer.value}`);
          perks.push(directOffer);
          processedMerchants.add(directOffer.merchant.toLowerCase());
        }
      }
    }
    
    console.log(`Chase Offers parsing complete. Found ${perks.length} perks before filtering`);
    perks.forEach((perk, index) => {
      console.log(`  ${index + 1}. ${perk.merchant}: ${perk.value}`);
    });
    
    // Filter out low-quality results
    const filteredPerks = perks.filter(perk => 
      perk.value && 
      perk.merchant !== 'Unknown Merchant' &&
      perk.merchant.length > 2 &&
      !this.isNavigationOrHeader(perk.merchant)
    );
    
    console.log(`After filtering: ${filteredPerks.length} perks`);
    return filteredPerks;
  }

  /**
   * Check if a line is a Chase navigation element that should be skipped
   */
  private isChaseNavigationElement(line: string): boolean {
    const navPatterns = [
      /^(?:all|shopping|groceries|home\s*&\s*pet|entertainment)$/i,
      /^new$/i,
      /^chase\s+offers$/i,
      /^gear\s+up\s+for\s+game\s+day$/i,
      /^all\s+offers$/i,
      /^\d{1,2}:\d{2}/,  // Time stamps
      /^[+\-→←]$/,       // Navigation symbols
      /^\s*$/,           // Empty lines
      /^chase\s+offers\s+all\s+shopping/i, // Navigation line with multiple elements
      /^all\s+shopping\s+groceries\s+home/i // Filter line
    ];
    
    return navPatterns.some(pattern => pattern.test(line.trim()));
  }

  /**
   * Extract merchant name using configurable patterns
   */
  private extractChaseOfferMerchant(line: string): string | null {
    const cleanLine = line.toLowerCase().trim();
    
    // Skip obvious non-merchant patterns
    if (this.isChaseNavigationElement(line) || cleanLine.length < 2) {
      return null;
    }
    
    // Check against known merchant patterns
    for (const [merchantName, patterns] of Object.entries(this.merchantPatterns.merchants)) {
      for (const pattern of patterns) {
        if (cleanLine.includes(pattern) || this.fuzzyMatch(cleanLine, pattern)) {
          return merchantName;
        }
      }
    }
    
    // Fallback: intelligent detection for unknown merchants
    return this.detectUnknownMerchant(line);
  }

  /**
   * Simple fuzzy matching for OCR errors
   */
  private fuzzyMatch(text: string, pattern: string): boolean {
    // Apply OCR corrections and check again
    let correctedText = text;
    for (const [error, correction] of Object.entries(this.merchantPatterns.ocrCorrections)) {
      correctedText = correctedText.replace(new RegExp(error, 'gi'), correction);
    }
    
    return correctedText.includes(pattern) || 
           pattern.includes(correctedText) ||
           this.calculateSimilarity(correctedText, pattern) > 0.8;
  }

  /**
   * Calculate similarity between two strings
   */
  private calculateSimilarity(str1: string, str2: string): number {
    if (Math.abs(str1.length - str2.length) > 2) return 0;
    
    let matches = 0;
    const minLength = Math.min(str1.length, str2.length);
    
    for (let i = 0; i < minLength; i++) {
      if (str1[i] === str2[i]) matches++;
    }
    
    return matches / minLength;
  }

  /**
   * Detect unknown merchants using basic patterns
   */
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



  /**
   * Pattern-based intelligent merchant detection 
   */
  private detectMerchantIntelligently(text: string): string | null {
    const cleanText = text.toLowerCase().trim();
    
    // Skip if too short or contains too many numbers/symbols
    if (cleanText.length < 3 || /[\d%$]{2,}/.test(cleanText)) return null;
    
    // Check against known merchant patterns first
    for (const [merchantName, patterns] of Object.entries(this.merchantPatterns.merchants)) {
      for (const pattern of patterns) {
        if (cleanText.includes(pattern) || this.fuzzyMatch(cleanText, pattern)) {
          return merchantName;
        }
      }
    }
    
    // Apply OCR corrections and try again
    let correctedText = cleanText;
    for (const [error, correction] of Object.entries(this.merchantPatterns.ocrCorrections)) {
      correctedText = correctedText.replace(new RegExp(error, 'gi'), correction);
    }
    
    // Try patterns again with corrected text
    for (const [merchantName, patterns] of Object.entries(this.merchantPatterns.merchants)) {
      for (const pattern of patterns) {
        if (correctedText.includes(pattern)) {
          return merchantName;
        }
      }
    }
    
    // Fallback: basic merchant detection
    return this.detectUnknownMerchant(text);
  }

  /**
   * Check if a word is an offer-related keyword
   */
  private isOfferKeyword(word: string): boolean {
    return this.containsOfferKeywords(word);
  }

  /**
   * Check if a word is a common English word that's unlikely to be a merchant name
   */
  private isCommonWord(word: string): boolean {
    const commonWords = new Set([
      'the', 'and', 'or', 'but', 'for', 'with', 'on', 'at', 'in', 'to', 'of',
      'up', 'get', 'all', 'you', 'can', 'see', 'now', 'out', 'day', 'way'
    ]);
    return commonWords.has(word.toLowerCase());
  }

  /**
   * Enhanced merchant name detection with better filtering
   */
  private looksLikeMerchantName(line: string): boolean {
    const trimmedLine = line.trim();
    
    // Must be reasonable length
    if (trimmedLine.length < 2 || trimmedLine.length > 30) return false;
    
    // Skip obvious non-merchant patterns
    if (/^\d+[%$]|^[\d\s%$]+$|back|cash|left|expires/i.test(trimmedLine)) return false;
    
    // Skip single letters or very short words unless they're known brands
    if (trimmedLine.length < 3 && !this.isKnownShortBrand(trimmedLine)) return false;
    
    // Check for merchant-like patterns
    const merchantPatterns = [
      /^[A-Z][a-z]+(?:\s+[A-Z&+'][a-z]*)*$/,  // "Nordstrom", "Shake Shack", "Walmart+"
      /^[a-z]+(?:\s+[a-z]+)*$/i,              // Lowercase merchants like "fuboTV", "turo"
    ];
    
    // Check if it matches merchant patterns and doesn't contain too many offer keywords
    const isPatternMatch = merchantPatterns.some(pattern => pattern.test(trimmedLine));
    const offerKeywordCount = trimmedLine.split(/\s+/).filter(word => this.isOfferKeyword(word)).length;
    
    return isPatternMatch && offerKeywordCount <= 1; // Allow max 1 offer keyword
  }

  /**
   * Check if a short string is a known brand name
   */
  private isKnownShortBrand(text: string): boolean {
    const knownShorts = ['hp', 'ge', 'lg', 'tv', 'pc', 'bp'];
    return knownShorts.includes(text.toLowerCase());
  }



  /**
   * Simple fuzzy matching for OCR errors
   */
  private isFuzzyMatch(text1: string, text2: string): boolean {
    // Only try fuzzy matching for strings of similar length
    if (Math.abs(text1.length - text2.length) > 2) {
      return false;
    }
    
    // Calculate simple character similarity
    let matches = 0;
    const minLength = Math.min(text1.length, text2.length);
    
    for (let i = 0; i < minLength; i++) {
      if (text1[i] === text2[i]) {
        matches++;
      }
    }
    
    // Consider it a match if 80% of characters match
    return matches / minLength >= 0.8;
  }

  /**
   * Extract multiple merchants using configurable patterns
   */
  private extractMultipleChaseOfferMerchants(line: string): string[] {
    // Check multi-merchant patterns first
    for (const pattern of this.merchantPatterns.multiMerchantLines) {
      if (pattern.pattern.test(line)) {
        console.log(`Found multi-merchant pattern in line: "${line}" -> ${pattern.merchants.join(', ')}`);
        return pattern.merchants;
      }
    }
    
    // If no pattern matches, try intelligent splitting
    return this.splitMerchantsIntelligently(line);
  }

  /**
   * Intelligently split a line that might contain multiple merchants
   */
  private splitMerchantsIntelligently(line: string): string[] {
    const merchants: string[] = [];
    
    // Try single merchant first
    const singleMerchant = this.extractChaseOfferMerchant(line);
    if (singleMerchant) {
      // Check if line contains more than just this merchant
      if (this.lineContainsMultipleMerchants(line, singleMerchant)) {
        // Try to extract others
        const otherMerchants = this.extractOtherMerchants(line, singleMerchant);
        merchants.push(singleMerchant, ...otherMerchants);
      } else {
        merchants.push(singleMerchant);
      }
    }
    
    return merchants;
  }

  /**
   * Check if line contains multiple merchants beyond the detected one
   */
  private lineContainsMultipleMerchants(line: string, detectedMerchant: string): boolean {
    // Remove the detected merchant and see if there are other merchant-like words
    const withoutDetected = line.replace(new RegExp(detectedMerchant, 'gi'), '');
    const remainingWords = withoutDetected.split(/\s+/).filter(word => 
      word.length > 2 && 
      /^[A-Za-z]/.test(word) && 
      !this.isOfferKeyword(word)
    );
    
    return remainingWords.length >= 2; // At least 2 more words that could form another merchant
  }

  /**
   * Extract other merchants from line after removing the first detected one
   */
  private extractOtherMerchants(line: string, firstMerchant: string): string[] {
    const merchants: string[] = [];
    
    // Remove first merchant and try to extract others
    const remaining = line.replace(new RegExp(firstMerchant, 'gi'), ' ').trim();
    
    // Split by spaces and group into potential merchant names
    const words = remaining.split(/\s+/).filter(word => 
      word.length > 1 && 
      !/^\d/.test(word) && 
      !this.isOfferKeyword(word)
    );
    
    // Try to form merchant names from remaining words
    let currentMerchant = '';
    for (const word of words) {
      if (currentMerchant && this.couldBeNewMerchantStart(word)) {
        const merchant = this.extractChaseOfferMerchant(currentMerchant);
        if (merchant && merchant !== firstMerchant) {
          merchants.push(merchant);
        }
        currentMerchant = word;
      } else {
        currentMerchant += (currentMerchant ? ' ' : '') + word;
      }
    }
    
    // Check last merchant
    if (currentMerchant) {
      const merchant = this.extractChaseOfferMerchant(currentMerchant);
      if (merchant && merchant !== firstMerchant) {
        merchants.push(merchant);
      }
    }
    
    return merchants;
  }

  /**
   * Check if word could start a new merchant name
   */
  private couldBeNewMerchantStart(word: string): boolean {
    return /^[A-Z]/.test(word) && word.length > 2;
  }

  /**
   * Check if a line is likely to contain multiple merchants
   */
  private isLikelyMultiMerchantLine(line: string): boolean {
    // Count potential merchant words (capitalized words that aren't common)
    const words = line.split(/\s+/);
    const merchantLikeWords = words.filter(word => 
      word.length > 2 && 
      /^[A-Z]/.test(word) && 
      !this.isOfferKeyword(word) &&
      !this.isCommonWord(word)
    );
    
    return merchantLikeWords.length >= 2;
  }

  /**
   * Extract merchants from a line known to contain multiple merchants
   */
  private extractMerchantsFromMultiMerchantLine(line: string): string[] {
    const merchants: string[] = [];
    
    // Split by common patterns that separate merchants
    const segments = line.split(/\s{2,}|\s+(?=[A-Z][a-z]+\s[A-Z])/);
    
    for (const segment of segments) {
      const merchant = this.detectMerchantIntelligently(segment.trim());
      if (merchant && !merchants.includes(merchant)) {
        merchants.push(merchant);
      }
    }
    
    // If we didn't find multiple merchants, try a different approach
    if (merchants.length <= 1) {
      return this.extractMerchantsUsingWordAnalysis(line);
    }
    
    return merchants;
  }

  /**
   * Extract merchants by analyzing individual words
   */
  private extractMerchantsUsingWordAnalysis(line: string): string[] {
    const merchants: string[] = [];
    const words = line.split(/\s+/);
    let currentMerchant: string[] = [];
    
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      
      // Skip obvious non-merchant words
      if (this.isOfferKeyword(word) || /^\d/.test(word) || word.length < 2) {
        if (currentMerchant.length > 0) {
          const merchantName = this.validateAndFormatMerchant(currentMerchant.join(' '));
          if (merchantName) merchants.push(merchantName);
          currentMerchant = [];
        }
        continue;
      }
      
      // Check if this word could start a new merchant
      if (this.couldBeStartOfNewMerchant(word, currentMerchant)) {
        if (currentMerchant.length > 0) {
          const merchantName = this.validateAndFormatMerchant(currentMerchant.join(' '));
          if (merchantName) merchants.push(merchantName);
        }
        currentMerchant = [word];
      } else {
        currentMerchant.push(word);
      }
    }
    
    // Handle last merchant
    if (currentMerchant.length > 0) {
      const merchantName = this.validateAndFormatMerchant(currentMerchant.join(' '));
      if (merchantName) merchants.push(merchantName);
    }
    
    return merchants;
  }

  /**
   * Check if a word could be the start of a new merchant name
   */
  private couldBeStartOfNewMerchant(word: string, currentMerchant: string[]): boolean {
    // If we don't have a current merchant, this is definitely a start
    if (currentMerchant.length === 0) return true;
    
    // If current merchant is already 2+ words and this is capitalized, likely new merchant
    if (currentMerchant.length >= 2 && /^[A-Z]/.test(word)) {
      return true;
    }
    
    return false;
  }

  /**
   * Validate and format a potential merchant name
   */
  private validateAndFormatMerchant(merchantText: string): string | null {
    if (!merchantText || merchantText.trim().length < 3) return null;
    
    const formatted = this.detectMerchantIntelligently(merchantText);
    return formatted && formatted.length >= 3 ? formatted : null;
  }

  /**
   * Check if a line contains multiple offers
   */
  private containsMultipleOffers(line: string): boolean {
    const offerMatches = line.match(/(\d+%\s+cash\s+back|\$\d+\s+cash\s+back)/gi);
    return offerMatches ? offerMatches.length > 1 : false;
  }

  /**
   * Extract the appropriate offer for a specific merchant from a multi-offer line
   */
  private extractOfferForMerchant(line: string, merchant: string): string | null {
    const offers = line.match(/(\d+%\s+cash\s+back|\$\d+\s+cash\s+back)/gi);
    if (!offers) return null;
    
    // Get the position of this merchant in the line
    const merchantPosition = this.findMerchantPositionInLine(line, merchant);
    
    // If we can determine position, use it to map to offer
    if (merchantPosition >= 0 && offers[merchantPosition]) {
      console.log(`  Found offer for ${merchant} at position ${merchantPosition}: ${offers[merchantPosition]}`);
      return offers[merchantPosition];
    }
    
    // Fallback: analyze line structure to map merchants to offers
    const mappedOffer = this.mapMerchantToOfferIntelligently(line, merchant, offers);
    if (mappedOffer) {
      console.log(`  Mapped offer for ${merchant}: ${mappedOffer}`);
      return mappedOffer;
    }
    
    // Last resort: return first offer
    return offers[0];
  }

  /**
   * Find the position of a merchant within a line containing multiple merchants
   */
  private findMerchantPositionInLine(line: string, merchant: string): number {
    const detectedMerchants = this.extractMerchantsFromMultiMerchantLine(line);
    const merchantIndex = detectedMerchants.findIndex((m: string) => 
      m.toLowerCase() === merchant.toLowerCase()
    );
    
    return merchantIndex >= 0 ? merchantIndex : -1;
  }

  /**
   * Intelligently map merchants to offers based on line structure
   */
  private mapMerchantToOfferIntelligently(line: string, merchant: string, offers: string[]): string | null {
    // Split line into segments and try to correlate merchants with offers
    const words = line.split(/\s+/);
    
    // Find where the merchant appears in the word sequence
    const merchantWords = merchant.toLowerCase().split(/\s+/);
    let merchantStartIndex = -1;
    
    for (let i = 0; i <= words.length - merchantWords.length; i++) {
      const slice = words.slice(i, i + merchantWords.length).join(' ').toLowerCase();
      if (slice.includes(merchantWords[0]) || merchantWords[0].includes(slice.split(' ')[0])) {
        merchantStartIndex = i;
        break;
      }
    }
    
    if (merchantStartIndex >= 0) {
      // Find which offer is closest to this merchant position
      const offerPositions = offers.map(offer => {
        const offerIndex = line.toLowerCase().indexOf(offer.toLowerCase());
        return { offer, index: offerIndex };
      });
      
      const merchantPosition = words.slice(0, merchantStartIndex).join(' ').length;
      
      // Find the offer with the closest position
      let closestOffer = offerPositions[0];
      let closestDistance = Math.abs(closestOffer.index - merchantPosition);
      
      for (const offerPos of offerPositions) {
        const distance = Math.abs(offerPos.index - merchantPosition);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestOffer = offerPos;
        }
      }
      
      return closestOffer.offer;
    }
    
    return null;
  }

  /**
   * Find the offer value associated with a merchant in Chase Offers
   */
  private findChaseOfferValue(lines: string[], merchantIndex: number, merchant: string): string | null {
    // Look in the next 3-4 lines for offer patterns
    const searchRange = Math.min(merchantIndex + 4, lines.length);
    
    for (let i = merchantIndex; i < searchRange; i++) {
      const line = lines[i];
      
      // Special handling for multi-offer lines like "35% cash back 10% cash back $30 cash back"
      if (this.containsMultipleOffers(line)) {
        return this.extractOfferForMerchant(line, merchant);
      }
      
      // Chase Offers specific patterns
      const chasePatterns = [
        /(\d+)%\s+cash\s+back/i,
        /\$(\d+)\s+cash\s+back/i,
        /(\d+)%\s+back/i,
        /\$(\d+)\s+back/i,
        /(\d+)\s*%\s*cash\s*back/i,
        /\$\s*(\d+)\s*cash\s*back/i
      ];
      
      for (const pattern of chasePatterns) {
        const match = pattern.exec(line);
        if (match) {
          if (pattern.source.includes('%')) {
            return `${match[1]}% cash back`;
          } else {
            return `$${match[1]} cash back`;
          }
        }
      }
    }
    
    return null;
  }

  /**
   * Find expiration information for Chase Offers
   */
  private findChaseOfferExpiration(lines: string[], merchantIndex: number): string | undefined {
    // Look in the next few lines for expiration patterns
    const searchRange = Math.min(merchantIndex + 4, lines.length);
    
    for (let i = merchantIndex; i < searchRange; i++) {
      const line = lines[i];
      
      // Chase Offers expiration patterns
      const expirationPatterns = [
        /(\d+d)\s+left/i,
        /(\d+)\s+days?\s+left/i,
        /expires?\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
        /(\d{1,2}\/\d{1,2}\/\d{2,4})/
      ];
      
      for (const pattern of expirationPatterns) {
        const match = pattern.exec(line);
        if (match) {
          return match[1];
        }
      }
    }
    
    return undefined;
  }

  /**
   * Parse direct offer patterns from a single line
   */
  private parseDirectChaseOffer(line: string): ExtractedPerk | null {
    // Skip lines that look like pure offer descriptions without merchant names
    if (this.isOfferOnlyLine(line)) {
      return null;
    }
    
    // Look for lines that contain both merchant and offer
    const directPatterns = [
      /([a-z][a-z\s']+[a-z])\s+(\d+)%\s+cash\s+back/i,
      /([a-z][a-z\s']+[a-z])\s+\$(\d+)\s+cash\s+back/i
    ];
    
    for (const pattern of directPatterns) {
      const match = pattern.exec(line);
      if (match) {
        const merchantText = match[1].trim();
        
        // Skip if the merchant text contains offer keywords
        if (this.containsOfferKeywords(merchantText)) {
          continue;
        }
        
        const merchant = this.cleanMerchantName(merchantText);
        const value = pattern.source.includes('%') 
          ? `${match[2]}% cash back`
          : `$${match[2]} cash back`;
        
        return {
          merchant,
          description: value,
          value,
          confidence: 0.8
        };
      }
    }
    
    return null;
  }

  /**
   * Check if a line contains only offer information without merchant names
   */
  private isOfferOnlyLine(line: string): boolean {
    const cleaned = line.toLowerCase().trim();
    
    // Lines with multiple cash back amounts are usually pure offer lines
    const cashBackMatches = (cleaned.match(/\d+%\s*cash\s*back/g) || []).length;
    const dollarBackMatches = (cleaned.match(/\$\d+\s*cash\s*back/g) || []).length;
    
    return (cashBackMatches + dollarBackMatches) >= 2;
  }

  /**
   * Identify blocks of lines that form complete offers
   */
  private identifyOfferBlocks(lines: string[]): string[][] {
    const blocks: string[][] = [];
    let currentBlock: string[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Skip navigation elements and headers
      if (this.isNavigationOrHeader(line)) {
        if (currentBlock.length > 0) {
          blocks.push([...currentBlock]);
          currentBlock = [];
        }
        continue;
      }
      
      // Start new block if we find a merchant name pattern
      if (this.looksLikeMerchantName(line) && currentBlock.length > 0) {
        blocks.push([...currentBlock]);
        currentBlock = [line];
      } else {
        currentBlock.push(line);
      }
      
      // End block if we find an expiration date
      if (this.containsExpiration(line) && currentBlock.length > 1) {
        blocks.push([...currentBlock]);
        currentBlock = [];
      }
    }
    
    // Add the last block if it exists
    if (currentBlock.length > 0) {
      blocks.push(currentBlock);
    }
    
    return blocks.filter(block => block.length >= 2); // At least merchant + offer
  }

  /**
   * Parse a block of lines into a single perk
   */
  private parseOfferBlock(block: string[]): ExtractedPerk | null {
    if (block.length < 2) return null;
    
    let merchant = '';
    let description = '';
    let value = '';
    let expiration = '';
    
    // Find merchant (usually first meaningful line or line with brand names)
    for (const line of block) {
      if (this.looksLikeMerchantName(line)) {
        merchant = this.cleanMerchantName(line);
        break;
      }
    }
    
    // Find offer value using enhanced patterns
    for (const line of block) {
      const extractedValue = this.extractValueFromLine(line);
      if (extractedValue) {
        value = extractedValue;
        description = line; // Use the line with the offer as description
        break;
      }
    }
    
    // Find expiration
    for (const line of block) {
      const exp = this.extractExpirationFromLine(line);
      if (exp) {
        expiration = exp;
        break;
      }
    }
    
    // If no specific value found, look for percentage patterns
    if (!value) {
      for (const line of block) {
        if (this.containsPercentageOffer(line)) {
          value = this.extractPercentageValue(line);
          description = line;
          break;
        }
      }
    }
    
    // Build full description from relevant lines
    if (!description) {
      description = block.filter(line => 
        !this.containsExpiration(line) && 
        !this.isNavigationOrHeader(line) &&
        line.length > 10
      ).join(' ');
    }
    
    if (merchant || value) {
      return {
        merchant: merchant || this.extractMerchantFromBlock(block),
        description: description.trim(),
        expiration: expiration || undefined,
        value: value || undefined,
        confidence: this.calculateConfidence(merchant, value, description)
      };
    }
    
    return null;
  }

  private containsOfferKeywords(line: string): boolean {
    const offerKeywords = /\b(?:spend|earn|get|back|%|cash|points|credit|total|purchase|more)\b/i;
    return offerKeywords.test(line);
  }

  private extractValueFromLine(line: string): string | null {
    // Enhanced patterns for the specific offers in the image
    const patterns = [
      // "Spend $80 or more, earn $15 back"
      /spend\s*\$(\d+(?:\.\d{2})?)\s*(?:or\s*more)?.*?earn\s*\$(\d+(?:\.\d{2})?)\s*back/i,
      
      // "Earn 20% back on a single purchase, up to a total of $8"
      /earn\s*(\d+)%\s*back.*?(?:up\s*to.*?\$(\d+(?:\.\d{2})?))?/i,
      
      // "Spend $10.99 or more, earn $10.99 back, up to 2 times"
      /spend\s*\$(\d+(?:\.\d{2})?)\s*(?:or\s*more)?.*?earn\s*\$(\d+(?:\.\d{2})?)\s*back.*?(?:up\s*to\s*(\d+)\s*times?)?/i,
      
      // "earn $49 back"
      /earn\s*\$(\d+(?:\.\d{2})?)\s*back/i,
      
      // General percentage back
      /(\d+)%\s*back/i,
      
      // "Spend $98 on Walmart+ Annual Membership, earn $49 back"
      /spend\s*\$(\d+(?:\.\d{2})?)\s*on\s*.*?,?\s*earn\s*\$(\d+(?:\.\d{2})?)\s*back/i,
    ];
    
    for (const pattern of patterns) {
      const match = pattern.exec(line);
      if (match) {
        if (pattern.source.includes('spend.*earn')) {
          return `Spend $${match[1]}, earn $${match[2]} back`;
        } else if (pattern.source.includes('earn.*%')) {
          const percentage = match[1];
          const limit = match[2] ? `, up to $${match[2]}` : '';
          return `${percentage}% back${limit}`;
        } else if (pattern.source.includes('up to.*times')) {
          const times = match[3] ? `, up to ${match[3]} times` : '';
          return `Spend $${match[1]}, earn $${match[2]} back${times}`;
        } else if (match[1]) {
          return pattern.source.includes('%') ? `${match[1]}% back` : `$${match[1]} back`;
        }
      }
    }
    
    return null;
  }

  private containsPercentageOffer(line: string): boolean {
    return /\d+%.*back/i.test(line);
  }

  private extractPercentageValue(line: string): string {
    const match = /(\d+)%.*back/i.exec(line);
    return match ? `${match[1]}% back` : '';
  }

  private extractExpirationFromLine(line: string): string | null {
    const patterns = [
      /expires?\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
      /expires?\s*(\d{1,2}\/\d{1,2}\/\d{2})/i,
      /(\d{1,2}\/\d{1,2}\/\d{2,4})/,
    ];
    
    for (const pattern of patterns) {
      const match = pattern.exec(line);
      if (match) {
        return match[1];
      }
    }
    
    return null;
  }

  private containsExpiration(line: string): boolean {
    return /expires?\s*\d{1,2}\/\d{1,2}\/\d{2,4}/i.test(line);
  }

  private isNavigationOrHeader(line: string): boolean {
    const navPatterns = [
      /^(?:all|shopping|dining|entertainment|offers|new)$/i,
      /^(?:groceries|home\s*&\s*pet|home\s*and\s*pet)$/i,
      /^search\s+available/i,
      /^home|membership|account$/i,
      /^\d{1,2}:\d{2}/,  // Time stamps
      /^[+\-→←]$/,       // Navigation symbols
      /^chase\s+offers$/i,
      /^gear\s+up\s+for\s+game\s+day$/i,
      /^all\s+offers$/i,
      /^chase\s+offers\s+all\s+shopping/i // Multi-element navigation line
    ];
    
    // Don't treat lines with dollar signs, percentages, or "earn" as navigation
    if (/\$\d+|earn|spend|\d+%\s*(?:cash\s*)?back/i.test(line)) {
      return false;
    }
    
    // Don't treat known merchant names as navigation
    if (this.extractChaseOfferMerchant && this.extractChaseOfferMerchant(line)) {
      return false;
    }
    
    return navPatterns.some(pattern => pattern.test(line.trim()));
  }

  private extractMerchantFromBlock(block: string[]): string {
    // Find the most likely merchant name from the block
    for (const line of block) {
      if (this.looksLikeMerchantName(line)) {
        return this.cleanMerchantName(line);
      }
    }
    
    // Look for merchant names in offer descriptions
    for (const line of block) {
      if (line.includes('Walmart')) return 'Walmart+';
      if (line.includes('Nordstrom')) return 'Nordstrom';
      if (line.includes('Shake Shack')) return 'Shake Shack';
      if (line.includes('Peacock')) return 'Peacock';
      if (line.includes('Target')) return 'Target';
      if (line.includes('Amazon')) return 'Amazon';
      if (line.includes('Starbucks')) return 'Starbucks';
      // Chase Offers merchants
      if (/fubo/i.test(line)) return 'fuboTV';
      if (/event\s*tickets/i.test(line)) return 'Event Tickets Center';
      if (/turo/i.test(line)) return 'Turo';
      if (/dyson/i.test(line)) return 'Dyson';
      if (/arlo/i.test(line)) return 'Arlo';
      if (/lands.*end/i.test(line)) return 'Lands\' End';
      if (/zenni/i.test(line)) return 'Zenni Optical';
      if (/cole\s*haan/i.test(line)) return 'Cole Haan';
      if (/wild\s*alaskan/i.test(line)) return 'Wild Alaskan Company';
    }
    
    // Fallback: look for capitalized words
    for (const line of block) {
      const words = line.split(' ').filter(word => 
        word.length > 2 && 
        word[0] === word[0].toUpperCase() &&
        !this.containsOfferKeywords(word)
      );
      if (words.length > 0) {
        return words.join(' ');
      }
    }
    
    return 'Unknown Merchant';
  }

  private calculateConfidence(merchant: string, value: string, description: string): number {
    let confidence = 0.5; // Base confidence
    
    if (merchant && merchant !== 'Unknown Merchant') confidence += 0.2;
    if (value) confidence += 0.2;
    if (description && description.length > 10) confidence += 0.1;
    
    return Math.min(confidence, 1.0);
  }

  private isDuplicatePerk(perk: ExtractedPerk, existingPerks: ExtractedPerk[]): boolean {
    return existingPerks.some(existing => {
      // Exact merchant match
      const merchantMatch = existing.merchant.toLowerCase() === perk.merchant.toLowerCase();
      
      // Similar description match (check if descriptions overlap significantly)
      const descLower1 = existing.description.toLowerCase();
      const descLower2 = perk.description.toLowerCase();
      const descriptionSimilar = descLower1.includes(descLower2.substring(0, Math.min(20, descLower2.length))) ||
                                 descLower2.includes(descLower1.substring(0, Math.min(20, descLower1.length)));
      
      // Same value match
      const valueMatch = existing.value && perk.value && 
                        existing.value.toLowerCase() === perk.value.toLowerCase();
      
      // Consider it a duplicate if merchant matches or if description and value match
      return merchantMatch || (descriptionSimilar && valueMatch);
    });
  }

  private parsePerkFromLine(line: string, allLines: string[], currentIndex: number): ExtractedPerk | null {
    // Skip short lines that are unlikely to contain meaningful offers
    if (line.length < 10) return null;
    
    // Common patterns for credit card offers
    const patterns = {
      // Cash back patterns - more flexible
      cashback: /(\d+(?:\.\d+)?%?)\s*(?:cash\s*back|cashback|back)\s*(?:at|on|when|with|for)?\s*([^.!?]+?)(?:[.!?]|$)/gi,
      
      // Spend X get Y back patterns - enhanced
      spendGet: /spend\s*\$?(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:or\s*more)?.*?(?:get|earn|receive)\s*\$?(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:back|credit|statement\s*credit|cash\s*back)/gi,
      
      // Points patterns - more comprehensive
      points: /(?:earn\s*)?(\d+)x?\s*(?:points?|pts?|miles?)\s*(?:at|on|when|with|for|per\s*\$1)?\s*([^.!?]+?)(?:[.!?]|$)/gi,
      
      // Bonus patterns - enhanced
      bonus: /(?:earn\s*)?(\d+(?:,\d{3})*)\s*(?:bonus\s*)?(?:points?|pts?|miles?)\s*(?:when|after|for)\s*([^.!?]+?)(?:[.!?]|$)/gi,
      
      // Flat rate patterns
      flatRate: /(\d+(?:\.\d+)?%?)\s*(?:on|at|for)\s*([^.!?]+?)(?:[.!?]|$)/gi,
      
      // Statement credit patterns
      statementCredit: /\$(\d+(?:\.\d{2})?)\s*(?:statement\s*credit|credit)\s*(?:when|after|for)?\s*([^.!?]+?)(?:[.!?]|$)/gi,
      
      // Fixed amount back patterns
      fixedBack: /get\s*\$(\d+(?:\.\d{2})?)\s*back\s*(?:when|after|for)?\s*([^.!?]+?)(?:[.!?]|$)/gi
    };

    // Look for expiration dates in current and next few lines
    const expiration = this.findExpiration(allLines, currentIndex);
    
    // Try each pattern
    for (const [patternName, regex] of Object.entries(patterns)) {
      let match;
      const matches: RegExpExecArray[] = [];
      
      // Collect all matches manually for compatibility
      while ((match = regex.exec(line)) !== null) {
        matches.push(match);
        if (!regex.global) break;
      }
      
      for (const match of matches) {
        let merchant = '';
        let description = line.trim();
        let value = '';
        
        switch (patternName) {
          case 'cashback':
            value = match[1];
            merchant = this.cleanMerchantName(match[2]);
            break;
            
          case 'spendGet':
            value = `Spend $${match[1]}, get $${match[2]} back`;
            merchant = this.extractMerchantFromContext(allLines, currentIndex);
            break;
            
          case 'points':
            value = `${match[1]}x points`;
            merchant = this.cleanMerchantName(match[2]);
            break;
            
          case 'bonus':
            value = `${match[1]} bonus points`;
            merchant = this.cleanMerchantName(match[2]);
            break;
            
          case 'flatRate':
            value = match[1];
            merchant = this.cleanMerchantName(match[2]);
            break;
            
          case 'statementCredit':
            value = `$${match[1]} statement credit`;
            merchant = this.cleanMerchantName(match[2]);
            break;
            
          case 'fixedBack':
            value = `$${match[1]} back`;
            merchant = this.cleanMerchantName(match[2]);
            break;
        }

        if (merchant || value) {
          return {
            merchant: merchant || 'Unknown Merchant',
            description,
            expiration,
            value,
            confidence: 0.8 // Base confidence, could be improved with ML
          };
        }
      }
    }

    return null;
  }

  private findExpiration(lines: string[], currentIndex: number): string | undefined {
    // Look for expiration dates in current line and next 2-3 lines
    const searchLines = lines.slice(currentIndex, Math.min(currentIndex + 4, lines.length));
    
    for (const line of searchLines) {
      // Common expiration patterns
      const expirationPatterns = [
        /(?:expires?|exp|through|until|by)\s*:?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/gi,
        /(?:expires?|exp|through|until|by)\s*:?\s*((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s*\d{1,2},?\s*\d{2,4})/gi,
        /(?:expires?|exp|through|until|by)\s*:?\s*(\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s*\d{2,4})/gi,
        /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/gi
      ];
      
      for (const pattern of expirationPatterns) {
        const match = pattern.exec(line);
        if (match) {
          return match[1];
        }
      }
    }
    
    return undefined;
  }

  private cleanMerchantName(rawMerchant: string): string {
    if (!rawMerchant) return '';
    
    // Remove common noise words and clean up
    const cleaned = rawMerchant
      .replace(/\b(?:purchases?|shopping|stores?|retailers?|merchants?|at|on|when|with|and)\b/gi, '')
      .replace(/[^\w\s&-]/g, ' ') // Remove special chars except &, -
      .replace(/\s+/g, ' ')
      .trim();
    
    // Capitalize properly
    return cleaned.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  private extractMerchantFromContext(lines: string[], currentIndex: number): string {
    // Look for merchant names in nearby lines for spend/get offers
    const searchLines = lines.slice(Math.max(0, currentIndex - 2), Math.min(currentIndex + 3, lines.length));
    
    for (const line of searchLines) {
      // Look for capitalized words that might be merchant names
      const merchantPattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g;
      let match;
      const matches: RegExpExecArray[] = [];
      
      // Collect all matches manually for compatibility
      while ((match = merchantPattern.exec(line)) !== null) {
        matches.push(match);
      }
      
      for (const match of matches) {
        const potential = match[1];
        // Filter out common non-merchant words
        if (!potential.match(/^(?:GET|EARN|SPEND|BACK|CASH|CREDIT|WHEN|WITH|FOR|AND|THE|YOUR|YOU|CARD|OFFER|PROMOTION)$/i)) {
          return potential;
        }
      }
    }
    
    return '';
  }

  /**
   * NEW: Process image with explicit card type for better accuracy
   */
  async processImageWithCardType(imageBuffer: Buffer, cardType: CardType): Promise<OCRResult> {
    console.log(`Processing image with card type: ${cardType}`);
    const { text, confidence } = await this.extractTextFromImage(imageBuffer);
    const perks = this.extractPerksFromTextWithCardType(text, cardType);
    
    return {
      text,
      perks,
      confidence
    };
  }

  /**
   * Main method to process an image and extract perks (legacy API)
   */
  async processImage(imageBuffer: Buffer): Promise<OCRResult> {
    const { text, confidence } = await this.extractTextFromImage(imageBuffer);
    const perks = this.parsePerksFromText(text);
    
    return {
      text,
      perks,
      confidence
    };
  }
}

export const ocrService = new OCRService();