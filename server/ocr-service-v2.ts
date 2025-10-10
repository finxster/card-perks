/**
 * Main OCR Service - coordinates all card-type-specific parsers
 * 
 * This service manages the modular parser architecture:
 * - Auto-detects card type from OCR text
 * - Routes to appropriate card-specific parser
 * - Falls back to generic parser when needed
 * - Provides both legacy and new APIs for backward compatibility
 */

import Tesseract from 'tesseract.js';
import { BaseCardParser } from './parsers/base-parser';
import { ChaseParser } from './parsers/chase-parser';
import { AmexParser } from './parsers/amex-parser';
import { CitiParser } from './parsers/citi-parser';
import { GenericParser } from './parsers/generic-parser';

// Define types locally to avoid import issues
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

export class OCRService {
  private parsers: Map<CardType, BaseCardParser>;
  private genericParser: GenericParser;

  constructor() {
    // Initialize all card-specific parsers
    this.parsers = new Map();
    this.parsers.set('chase', new ChaseParser());
    this.parsers.set('amex', new AmexParser());
    this.parsers.set('citi', new CitiParser());

    this.genericParser = new GenericParser();
  }

  /**
   * NEW API: Card-type-aware OCR extraction
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
   * NEW API: Card-type-aware text parsing
   */
  extractPerksFromTextWithCardType(text: string, cardType: CardType = 'unknown'): ExtractedPerk[] {
    console.log(`Starting perk parsing from text for card type: ${cardType}...`);
    
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    console.log(`Processing ${lines.length} lines`);
    
    // Auto-detect card type if unknown
    if (cardType === 'unknown') {
      cardType = this.detectCardType(text);
      console.log(`Auto-detected card type: ${cardType}`);
    }
    
    // Get appropriate parser
    const parser = this.getParser(cardType);
    console.log(`Using ${parser.getName()} parsing configuration`);
    
    // Parse with card-specific logic
    return parser.parseLines(lines);
  }

  /**
   * Detect card type from OCR text
   */
  private detectCardType(text: string): CardType {
    const lowerText = text.toLowerCase();
    
    // Check each parser to see if it can handle this text
    const cardTypes = Array.from(this.parsers.keys());
    for (const cardType of cardTypes) {
      const parser = this.parsers.get(cardType);
      if (parser && parser.canParse(lowerText)) {
        return cardType;
      }
    }
    
    return 'unknown';
  }

  /**
   * Get appropriate parser for card type
   */
  private getParser(cardType: CardType): BaseCardParser {
    const parser = this.parsers.get(cardType);
    return parser || this.genericParser;
  }

  /**
   * Add a new card parser
   */
  addParser(cardType: CardType, parser: BaseCardParser): void {
    this.parsers.set(cardType, parser);
  }

  /**
   * Get list of supported card types
   */
  getSupportedCardTypes(): CardType[] {
    return Array.from(this.parsers.keys());
  }

  // ===== LEGACY APIS (for backward compatibility) =====

  /**
   * Legacy API: Extract text from image using Tesseract OCR
   */
  async extractTextFromImage(imageBuffer: Buffer): Promise<{ text: string; confidence: number }> {
    try {
      const result = await Tesseract.recognize(imageBuffer, 'eng', {
        logger: m => console.log(m),
      });
      
      console.log('OCR Raw Text:', result.data.text);
      console.log('OCR Confidence:', result.data.confidence);
      
      return {
        text: result.data.text,
        confidence: result.data.confidence / 100
      };
    } catch (error) {
      console.error('OCR text extraction failed:', error);
      throw error;
    }
  }

  /**
   * Legacy API: Parse perks from text (maintains backward compatibility)
   */
  parsePerksFromText(text: string): ExtractedPerk[] {
    console.log('Starting perk parsing from text...');
    
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    console.log(`Processing ${lines.length} lines`);
    
    // Legacy behavior: try to detect if it's Chase, otherwise use generic
    const isChaseOffersScreen = this.isChaseOffersScreen(text);
    console.log(`Is Chase Offers screen: ${isChaseOffersScreen}`);
    
    if (isChaseOffersScreen) {
      console.log('Using Chase Offers parsing...');
      const chaseParser = this.parsers.get('chase') as ChaseParser;
      return chaseParser.parseLines(lines);
    } else {
      console.log('Using fallback parsing...');
      return this.genericParser.parseLines(lines);
    }
  }

  /**
   * Legacy helper: Check if text is from Chase Offers
   */
  private isChaseOffersScreen(text: string): boolean {
    const chaseParser = this.parsers.get('chase');
    return chaseParser ? chaseParser.canParse(text) : false;
  }

  /**
   * Legacy API: Extract perks from image
   */
  async extractPerksFromImage(imageBuffer: Buffer): Promise<ExtractedPerk[]> {
    const { text, confidence } = await this.extractTextFromImage(imageBuffer);
    const perks = this.parsePerksFromText(text);
    
    return perks;
  }
}

// Types are defined above, no need to re-export