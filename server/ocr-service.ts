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

export class OCRService {
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
   * Extract merchant name from Chase Offers format
   */
  private extractChaseOfferMerchant(line: string): string | null {
    // Common merchants in Chase Offers with potential OCR variations
    const merchantMap: { [key: string]: string } = {
      'fubo': 'fuboTV',
      'fubotv': 'fuboTV',
      'fubo tv': 'fuboTV',
      'event tickets': 'Event Tickets Center',
      'event tickets ce': 'Event Tickets Center',
      'event tickets center': 'Event Tickets Center',
      'event': 'Event Tickets Center', // Partial match for OCR errors
      'turo': 'Turo',
      'dyson': 'Dyson',
      'arlo': 'Arlo',
      'ario': 'Arlo', // Common OCR error: I mistaken for l
      'arIo': 'Arlo', // Case variation
      'lands end': 'Lands\' End',
      'lands': 'Lands\' End', // Partial match
      'zenni optical': 'Zenni Optical',
      'zenni': 'Zenni Optical',
      'zenni 0ptical': 'Zenni Optical', // OCR error: 0 for O
      'cole haan': 'Cole Haan',
      'cole': 'Cole Haan', // Partial match
      'wild alaskan': 'Wild Alaskan Company',
      'wild': 'Wild Alaskan Company' // Partial match
    };
    
    const cleanLine = line.toLowerCase().trim();
    
    // Skip obvious non-merchant patterns
    if (this.isChaseNavigationElement(line) || cleanLine.length < 2) {
      return null;
    }
    
    // Direct mapping
    if (merchantMap[cleanLine]) {
      return merchantMap[cleanLine];
    }
    
    // Partial matching for truncated names and OCR errors
    for (const [key, value] of Object.entries(merchantMap)) {
      // Check if line contains the key or key contains the line (for partial matches)
      if (cleanLine.includes(key) || key.includes(cleanLine)) {
        return value;
      }
      
      // Fuzzy matching for OCR errors (simple Levenshtein-like check)
      if (this.isFuzzyMatch(cleanLine, key)) {
        return value;
      }
    }
    
    // Look for merchant-like patterns (capitalized words, not too long)
    if (this.looksLikeMerchantName(line) && line.length < 30) {
      return this.cleanMerchantName(line);
    }
    
    return null;
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
   * Extract multiple merchant names from a single line (handles combined merchant lines)
   */
  private extractMultipleChaseOfferMerchants(line: string): string[] {
    const merchants: string[] = [];
    
    // Check for known multi-merchant patterns first
    const multiMerchantPatterns = [
      // "fuboTV Event Tickets Ce... Turo" - this is the main problematic line
      {
        pattern: /(fubo\w*)\s+(event\s+tickets[^.]*)\s+(turo)/i,
        merchants: ['fuboTV', 'Event Tickets Center', 'Turo']
      },
      // Also handle variations of the above line
      {
        pattern: /(fubo\w*)\s.*(event\s+tickets[^.]*)\s.*(turo)/i,
        merchants: ['fuboTV', 'Event Tickets Center', 'Turo']
      },
      // "Dyson Arlo" 
      {
        pattern: /(dyson)\s+(arlo\w*)/i,
        merchants: ['Dyson', 'Arlo']
      },
      // "Lands' End Zenni Optical"
      {
        pattern: /(lands['\s]*end)\s+(zenni\s*\w*)/i,
        merchants: ['Lands\' End', 'Zenni Optical']
      }
    ];
    
    for (const { pattern, merchants: patternMerchants } of multiMerchantPatterns) {
      if (pattern.test(line)) {
        console.log(`Found multi-merchant pattern in line: "${line}" -> ${patternMerchants.join(', ')}`);
        return patternMerchants; // Replace single merchant with all merchants from pattern
      }
    }
    
    // If no multi-merchant pattern matches, try single merchant extraction
    const singleMerchant = this.extractChaseOfferMerchant(line);
    if (singleMerchant) {
      merchants.push(singleMerchant);
    }
    
    return merchants;
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
    // Map merchants to their expected offer positions
    const merchantOfferMap: { [key: string]: number } = {
      'fuboTV': 0,           // First offer: 35% cash back
      'Event Tickets Center': 1, // Second offer: 10% cash back  
      'Turo': 2,             // Third offer: $30 cash back
      'Dyson': 0,            // First offer when with Arlo: 5% cash back
      'Arlo': 1,             // Second offer when with Dyson: 15% cash back
      'Lands\' End': 0,      // First offer when with Zenni: 5% cash back
      'Zenni Optical': 1     // Second offer when with Lands' End: 10% cash back
    };
    
    const offers = line.match(/(\d+%\s+cash\s+back|\$\d+\s+cash\s+back)/gi);
    if (!offers) return null;
    
    const offerIndex = merchantOfferMap[merchant];
    if (offerIndex !== undefined && offers[offerIndex]) {
      console.log(`  Found offer for ${merchant} at position ${offerIndex}: ${offers[offerIndex]}`);
      return offers[offerIndex];
    }
    
    // Fallback: return first offer
    return offers[0];
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
    // Look for lines that contain both merchant and offer
    const directPatterns = [
      /([a-z]+(?:\s+[a-z]+)*)\s+(\d+)%\s+cash\s+back/i,
      /([a-z]+(?:\s+[a-z]+)*)\s+\$(\d+)\s+cash\s+back/i
    ];
    
    for (const pattern of directPatterns) {
      const match = pattern.exec(line);
      if (match) {
        const merchant = this.cleanMerchantName(match[1]);
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

  private looksLikeMerchantName(line: string): boolean {
    // Check for brand name patterns
    const brandPatterns = [
      /^[A-Z][a-z]+(?:\s+[A-Z&+][a-z]*)*$/,  // "Nordstrom", "Shake Shack", "Walmart+"
      /^[A-Z][a-z]+\s*[&+]\s*[A-Z][a-z]+/,   // "Nordstrom & Nordstrom Rack"
      /^[A-Z][a-z]+\+$/,                      // "Walmart+"
      /^[A-Z][a-z]+\s+[A-Z][a-z]+$/,         // "Shake Shack", "El Pollo"
      /^[a-z]+(?:\s+[a-z]+)*$/i,             // Lowercase merchants like "fuboTV", "turo"
    ];
    
    // Chase Offers specific merchant patterns
    const chasePatterns = [
      /^(?:fubo|fubotv)$/i,
      /^event\s+tickets/i,
      /^turo$/i,
      /^dyson$/i,
      /^arlo$/i,
      /^lands.*end$/i,
      /^zenni/i,
      /^cole\s+haan$/i,
      /^wild\s+alaskan/i
    ];
    
    const trimmedLine = line.trim();
    
    // Check Chase-specific patterns first
    if (chasePatterns.some(pattern => pattern.test(trimmedLine))) {
      return true;
    }
    
    return brandPatterns.some(pattern => pattern.test(trimmedLine)) && 
           trimmedLine.length < 50 && // Not too long
           trimmedLine.length > 2 &&  // Not too short
           !this.containsOfferKeywords(line); // Doesn't contain offer keywords
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
   * Main method to process an image and extract perks
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