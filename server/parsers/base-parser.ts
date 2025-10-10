/**
 * Base interfaces and types for card-type-specific OCR parsing
 */

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

export type CardType = 'chase' | 'amex' | 'citi' | 'capital_one' | 'discover' | 'wells_fargo' | 'bank_of_america' | 'unknown';

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

/**
 * Abstract base class for card-specific parsers
 */
export abstract class BaseCardParser {
  protected config: CardTypeConfig;

  constructor(config: CardTypeConfig) {
    this.config = config;
  }

  /**
   * Parse lines of OCR text into extracted perks
   */
  abstract parseLines(lines: string[]): ExtractedPerk[];

  /**
   * Check if this parser can handle the given text
   */
  canParse(text: string): boolean {
    const lowerText = text.toLowerCase();
    return this.config.identifiers.some(identifier => 
      lowerText.includes(identifier.toLowerCase())
    );
  }

  /**
   * Get parser name
   */
  getName(): string {
    return this.config.name;
  }

  /**
   * Common utility methods
   */
  protected isNavigationElement(line: string): boolean {
    const lowerLine = line.toLowerCase();
    return this.config.merchantPatterns.navigationElements.some(element => 
      lowerLine.includes(element.toLowerCase())
    );
  }

  protected containsOfferKeywords(line: string): boolean {
    const lowerLine = line.toLowerCase();
    return this.config.merchantPatterns.offerKeywords.some(keyword => 
      lowerLine.includes(keyword.toLowerCase())
    );
  }

  protected extractOfferValue(text: string): string {
    const pointsMatch = text.match(/(\d+[x]?\s*points?)/i);
    const percentMatch = text.match(/(\d+%)/);
    const dollarMatch = text.match(/(\$\d+)/);
    const milesMatch = text.match(/(\d+\s*miles?)/i);
    
    return pointsMatch?.[1] || percentMatch?.[1] || dollarMatch?.[1] || milesMatch?.[1] || 'N/A';
  }

  protected isExpirationLine(line: string): boolean {
    return /expires|valid|until|through/i.test(line) && /\d{1,2}\/\d{1,2}\/\d{4}|\d{1,2}\/\d{4}/i.test(line);
  }

  protected extractExpiration(line: string): string {
    const match = line.match(/(\d{1,2}\/\d{1,2}\/\d{4}|\d{1,2}\/\d{4})/);
    return match ? match[1] : '';
  }

  protected cleanMerchantName(name: string): string {
    return name.trim()
      .replace(/[^\w\s'&.-]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
}