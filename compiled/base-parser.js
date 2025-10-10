/**
 * Base interfaces and types for card-type-specific OCR parsing
 */
/**
 * Abstract base class for card-specific parsers
 */
export class BaseCardParser {
    constructor(config) {
        this.config = config;
    }
    /**
     * Check if this parser can handle the given text
     */
    canParse(text) {
        const lowerText = text.toLowerCase();
        return this.config.identifiers.some(identifier => lowerText.includes(identifier.toLowerCase()));
    }
    /**
     * Get parser name
     */
    getName() {
        return this.config.name;
    }
    /**
     * Common utility methods
     */
    isNavigationElement(line) {
        const lowerLine = line.toLowerCase();
        return this.config.merchantPatterns.navigationElements.some(element => lowerLine.includes(element.toLowerCase()));
    }
    containsOfferKeywords(line) {
        const lowerLine = line.toLowerCase();
        return this.config.merchantPatterns.offerKeywords.some(keyword => lowerLine.includes(keyword.toLowerCase()));
    }
    extractOfferValue(text) {
        const pointsMatch = text.match(/(\d+[x]?\s*points?)/i);
        const percentMatch = text.match(/(\d+%)/);
        const dollarMatch = text.match(/(\$\d+)/);
        const milesMatch = text.match(/(\d+\s*miles?)/i);
        return pointsMatch?.[1] || percentMatch?.[1] || dollarMatch?.[1] || milesMatch?.[1] || 'N/A';
    }
    isExpirationLine(line) {
        return /expires|valid|until|through/i.test(line) && /\d{1,2}\/\d{1,2}\/\d{2,4}|\d{1,2}\/\d{2,4}/i.test(line);
    }
    extractExpiration(line) {
        const match = line.match(/(\d{1,2}\/\d{1,2}\/\d{2,4}|\d{1,2}\/\d{2,4})/);
        return match ? match[1] : '';
    }
    cleanMerchantName(name) {
        return name.trim()
            .replace(/[^\w\s'&.-]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }
}
