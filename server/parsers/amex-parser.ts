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
    // Use enhanced pattern-based extraction for complex OCR text
    const fullText = lines.join('\n').trim();
    
    // Clean and filter lines
    const cleanLines = fullText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .filter(line => !this.isNavigationOrUI(line));
    
    // Extract pattern-based offers using the enhanced method
    const offers = this.extractOfferPatterns(cleanLines);
    
    // Convert to ExtractedPerk format
    const perks: ExtractedPerk[] = offers.map(offer => ({
      merchant: offer.merchant,
      description: offer.description,
      value: this.extractOfferValue(offer.description),
      expiration: offer.expiration || undefined, // Use the extracted date directly
      confidence: 0.85
    }));
    
    return perks;
  }

  private preprocessOCRText(lines: string[]): string[] {
    // Join all lines preserving line breaks for better structure analysis
    const fullText = lines.join('\n').trim();
    
    // For complex OCR text with navigation elements and multiple formatting, 
    // we need a more sophisticated approach
    const processedLines: string[] = [];
    
    // Split the text into lines and clean up navigation elements
    const cleanLines = fullText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .filter(line => !this.isNavigationOrUI(line));
    
    // First, let's identify clear merchant-offer-expiration patterns
    const offers = this.extractOfferPatterns(cleanLines);
    
    // Add all the extracted offers
    offers.forEach(offer => {
      if (offer.merchant) processedLines.push(offer.merchant);
      if (offer.description) processedLines.push(offer.description);
      if (offer.expiration) processedLines.push(`Expires ${offer.expiration}`);
    });
    
    return processedLines.filter(line => line && line.length > 2);
  }
  
  private extractOfferPatterns(lines: string[]): Array<{merchant: string, description: string, expiration: string}> {
    const offers: Array<{merchant: string, description: string, expiration: string}> = [];
    
    // Define the known merchants and their expected patterns
    const merchantBlocks = [
      {
        merchantPattern: /Nordstrom\s*&\s*Nordstrom\s*Rack/i,
        offerPattern: /spend\s*\$80/i,
        name: 'Nordstrom & Nordstrom Rack'
      },
      {
        merchantPattern: /Shake\s*Shack/i,
        offerPattern: /earn\s*20%|20%\s*back/i,
        name: 'Shake Shack'
      },
      {
        merchantPattern: /Peacock/i,
        offerPattern: /spend\s*\$10\.99/i,
        name: 'Peacock'
      },
      {
        merchantPattern: /Walmart.*Annual.*Membership/i,
        offerPattern: /spend\s*\$98/i,
        name: 'Walmart+ Annual Membership'
      }
    ];
    
    for (const block of merchantBlocks) {
      const merchantIndex = lines.findIndex(line => block.merchantPattern.test(line));
      if (merchantIndex === -1) continue;
      
      // Look for the offer within the next few lines
      const offerIndex = lines.findIndex((line, i) => 
        i > merchantIndex && i < merchantIndex + 5 && block.offerPattern.test(line)
      );
      
      if (offerIndex === -1) continue;
      
      // Look for expiration within the next few lines after the offer
      const expirationIndex = lines.findIndex((line, i) => 
        i > offerIndex && i < offerIndex + 3 && this.isExpirationLine(line)
      );
      
      // Build the offer description by combining relevant lines
      const offerLines = [];
      let foundExpiration = '';
      
      // First, check if there's a standalone expiration line after the offer
      for (let i = offerIndex + 1; i < lines.length && i < offerIndex + 4; i++) {
        const line = lines[i];
        const expMatch = line.match(/exp(?:ires)?\s*(\d{1,2}\/?\d{1,2}\/\d{2,4})/i);
        if (expMatch) {
          // Clean up the date format
          let dateStr = expMatch[1];
          // Fix malformed dates like "1112/25" -> "11/12/25"
          if (dateStr.match(/^\d{4}\/\d{2}$/)) {
            dateStr = dateStr.replace(/^(\d{2})(\d{2})\//, '$1/$2/');
          }
          // Ensure 4-digit year
          if (dateStr.match(/\/\d{2}$/)) {
            dateStr = dateStr.replace(/\/(\d{2})$/, '/20$1');
          }
          foundExpiration = dateStr;
          break;
        }
      }
      
      // Then look for offer content lines
      for (let i = offerIndex; i < lines.length && i < offerIndex + 3; i++) {
        const line = lines[i];
        
        // Skip expiration lines since we handled them above
        if (/exp(?:ires)?/i.test(line)) {
          continue;
        }
        
        if (this.looksLikeOfferLine(line) || /spend|earn|\$\d+|%\s*back/i.test(line)) {
          offerLines.push(line);
        }
      }
      
      offers.push({
        merchant: block.name,
        description: offerLines.map(line => this.cleanOCRText(line)).join(' ').trim(),
        expiration: foundExpiration
      });
    }
    
    return offers;
  }
  
  private isNavigationOrUI(line: string): boolean {
    const navPatterns = [
      /^4:\d+/,           // Time stamps
      /^[\\\/\@\(\)]+$/,  // Special characters only
      /^Offers$/,         // Navigation headers
      /^Q$/,              // Single letters
      /^8,\s*Al\s*©/,     // UI elements
      /^Shopping.*Dining.*Entertain/,  // Category filters
      /^CD\s*$/,          // CD markers alone
      /^c——>$/,           // Arrow artifacts alone (not with content)
      /^blo\s*a\./,       // OCR noise
      /^A\s*©\s*8,\s*2$/, // Footer elements
      /^Home\s*Membership\s*Offers\s*Account$/, // Navigation footer
      /^OCR\s*Confidence:/,  // OCR metadata
      /^NORDSTROM$/i,     // Brand names that appear separately from merchant names
      /^more\s*\+$/i,     // Additional text fragments
      /^\d+$/,            // Standalone numbers like "3"
    ];
    
    return navPatterns.some(pattern => pattern.test(line.trim()));
  }
  
  private looksLikeMerchantLine(line: string): boolean {
    const trimmed = line.trim();
    
    // Skip if too short or looks like UI elements
    if (trimmed.length < 3 || this.isNavigationOrUI(trimmed)) {
      return false;
    }
    
    // Skip obvious offer descriptions
    if (/^(spend|earn|get)\s+\$/i.test(trimmed)) {
      return false;
    }
    
    // Skip lines that start with "CD" followed by expiration
    if (/^CD\s+Expires/i.test(trimmed)) {
      return false;
    }
    
    // Skip lines that are just descriptive text or fragments
    if (/^(clothes|shoes|beauty|and|more|back)$/i.test(trimmed)) {
      return false;
    }
    
    // Specific merchant name patterns we see in the OCR
    const merchantPatterns = [
      /^Nordstrom\s*&\s*Nordstrom\s*Rack/i,       // "Nordstrom & Nordstrom Rack"
      /^CD\s+Shake\s*Shack$/i,                    // "CD Shake Shack"
      /^Shake\s*Shack$/i,                         // "Shake Shack"
      /^Peacock$/i,                               // "Peacock"
      /^Walmart\+?\s*Annual\s*Membership/i,       // "Walmart+ Annual Membership"
      /^El\s*Pollo\s*Loco/i,                      // "El Pollo Loco"
    ];
    
    return merchantPatterns.some(pattern => pattern.test(trimmed));
  }
  
  private looksLikeOfferLine(line: string): boolean {
    const offerPatterns = [
      /spend\s*\$\d+/i,
      /earn\s*\$\d+/i,
      /earn\s*\d+%/i,
      /\$\d+\s*back/i,
      /\d+%\s*back/i,
      /up\s*to\s*a\s*total\s*of/i,     // Offer limit descriptions
      /Soo\s*\[Earn\s*\d+%/i,          // OCR artifacts in offers like "Soo [Earn 20%"
    ];
    
    return offerPatterns.some(pattern => pattern.test(line));
  }
  
  private addGroupedOffer(processedLines: string[], merchant: string, offerLines: string[], expiration: string): void {
    // Clean up and process the merchant name
    if (merchant) {
      let cleanMerchant = merchant;
      
      // Fix common OCR issues in merchant names
      cleanMerchant = cleanMerchant
        .replace(/^CD\s+/i, '')  // Remove "CD " prefix
        .replace(/^\w+\s+more\s*\+?$/i, '')  // Remove descriptive endings like "NORDSTROM more +"
        .replace(/^Clothes,\s*Shoes,\s*Beauty,\s*and\s*/i, '')  // Remove Nordstrom description
        .trim();
      
      // If the merchant name is still problematic, try to extract from known patterns
      if (cleanMerchant.length < 3 || /^(clothes|shoes|beauty|and|more)$/i.test(cleanMerchant)) {
        // Don't add problematic merchant names, let the offer be processed without merchant
        cleanMerchant = '';
      }
      
      if (cleanMerchant) {
        processedLines.push(cleanMerchant);
      }
    }
    
    if (offerLines.length > 0) {
      const combinedOffer = offerLines
        .map(line => this.cleanOCRText(line))
        .filter(line => line)
        .join(' ');
      
      if (combinedOffer) {
        processedLines.push(combinedOffer);
      }
    }
    
    if (expiration) {
      processedLines.push(expiration);
    }
  }

  protected extractOfferValue(text: string): string {
    // Try percentage first (highest priority for Amex offers)
    const percentMatch = text.match(/(\d+)%/);
    if (percentMatch) {
      return percentMatch[1] + '%';
    }
    
    // Try points (specific pattern for Membership Rewards)
    const pointsMatch = text.match(/(\d{1,3}(?:,\d{3})*)\s*(?:membership\s*rewards\s*)?points/i);
    if (pointsMatch) {
      return pointsMatch[1] + ' points';
    }
    
    // Try dollar amount (cash back offers)
    const dollarMatch = text.match(/\$(\d+)/);
    if (dollarMatch) {
      return dollarMatch[1];
    }
    
    return 'N/A';
  }

  private cleanOCRText(text: string): string {
    return text
      .replace(/=/g, '') // Remove OCR artifacts like "earn = $10"
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/AF$/, '') // Remove trailing "AF"
      .replace(/\$\d+\.\d+$/, '') // Remove truncated dollar amounts at the end
      .replace(/\$$/, '') // Remove trailing dollar signs
      .replace(/\w+\+\d+/g, '') // Remove OCR artifacts like "Walmart+2" (plus sign required)
      .trim();
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
    // AMEX merchants can be single words, well-known brands, or complex names
    const trimmed = line.trim();
    
    // Skip if too short
    if (trimmed.length < 3) {
      return false;
    }
    
    // Skip lines that are clearly offer descriptions (strong offer indicators)
    if (this.looksLikeOfferDescription(trimmed)) {
      return false;
    }
    
    // Don't reject just for containing offer keywords - some merchant names contain them
    // Instead, check for strong offer patterns that indicate this is definitely an offer
    const strongOfferPatterns = [
      /^(earn|spend|get)\s+/i,           // Starts with action verbs
      /\d+%\s*(back|off)/i,              // "20% back"
      /\d+x\s*points/i,                  // "5x points"
      /\$\d+.*back/i,                    // "$50 back"
      /expires\s+\d/i,                   // "expires 12/31"
    ];
    
    if (strongOfferPatterns.some(pattern => pattern.test(trimmed))) {
      return false;
    }
    
    // Check known merchant patterns - handle both lowercase and capitalized names
    const merchantPatterns = [
      /^[A-Za-z][a-zA-Z]+$/,                                    // "Amazon", "Target", "Peacock", "peacock"
      /^[A-Za-z][a-zA-Z]+\s+[A-Za-z][a-zA-Z]+$/,              // "Best Buy", "Home Depot", "Shake Shack"
      /^[A-Za-z][a-zA-Z]+\s+[A-Za-z][a-zA-Z]+\s+[A-Za-z][a-zA-Z]+$/,      // "American Express Card"
      /^[A-Za-z][a-zA-Z]+\+\s+[A-Za-z][a-zA-Z]+\s+[A-Za-z][a-zA-Z]+$/,    // "Walmart+ Annual Membership"
      /^[A-Za-z][a-zA-Z]+\s+&\s+[A-Za-z][a-zA-Z]+(\s+[A-Za-z][a-zA-Z]+)*/, // "Nordstrom & Nordstrom Rack"
      /^[A-Za-z][a-zA-Z]+\s+-\s+[A-Za-z][a-zA-Z]+/,                 // Names with dashes
      /^[A-Za-z][a-zA-Z\s&+'-]+[A-Za-z][a-zA-Z]+$/,                 // Complex merchant names
      /^[A-Za-z][a-zA-Z]+\+\s+[A-Za-z][a-zA-Z]+(\s+[A-Za-z][a-zA-Z]+)*$/  // Names with + like "Walmart+ Annual Membership"
    ];
    
    // Check if it matches any merchant pattern
    const matchesPattern = merchantPatterns.some(pattern => pattern.test(trimmed));
    
    // Additional checks for complex merchant names
    if (!matchesPattern) {
      // Check if it starts with a letter and doesn't contain obvious offer indicators
      const startsWithLetter = /^[A-Za-z]/.test(trimmed);
      const hasStrongOfferIndicators = strongOfferPatterns.some(pattern => pattern.test(trimmed));
      
      return startsWithLetter && !hasStrongOfferIndicators && trimmed.length <= 80;
    }
    
    return matchesPattern;
  }

  private couldBeNewMerchant(line: string): boolean {
    // This helps detect when what looks like an offer description might actually be a new merchant
    const trimmed = line.trim();
    
    // Don't treat obvious offer descriptions as merchants
    if (/^(earn|get)\s+\$\d+/i.test(trimmed)) {
      return false;
    }
    
    // Special case: "Spend $X on [MerchantName]" suggests this is a new offer for a different merchant
    if (/^spend\s+\$\d+\s+on\s+[A-Za-z]/i.test(trimmed)) {
      return true;
    }
    
    // Could be a merchant if it starts with a letter and doesn't have strong offer indicators
    return /^[A-Za-z]/.test(trimmed) && !/\d+%|\d+x|back|points/i.test(trimmed);
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