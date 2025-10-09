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
    const perks: ExtractedPerk[] = [];
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    // First, try to identify offer blocks (multi-line offers)
    const offerBlocks = this.identifyOfferBlocks(lines);
    
    for (const block of offerBlocks) {
      const perk = this.parseOfferBlock(block);
      if (perk) {
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
      /^[A-Z][a-z]+\s+[A-Z][a-z]+$/          // "Shake Shack", "El Pollo"
    ];
    
    return brandPatterns.some(pattern => pattern.test(line.trim())) && 
           line.length < 50 && // Not too long
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
      /^search\s+available/i,
      /^home|membership|account$/i,
      /^\d{1,2}:\d{2}/,  // Time stamps
      /^[+\-]$/          // Navigation symbols
    ];
    
    // Don't treat lines with dollar signs or "earn" as navigation
    if (/\$\d+|earn|spend/i.test(line)) {
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
    return existingPerks.some(existing => 
      existing.merchant.toLowerCase() === perk.merchant.toLowerCase() &&
      existing.description.toLowerCase().includes(perk.description.toLowerCase().substring(0, 20))
    );
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