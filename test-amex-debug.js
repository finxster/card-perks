/**
 * Debug AMEX parsing specifically
 */
import { OCRService } from './server/ocr-service.ts';

const ocrService = new OCRService();

const amexText = `
American Express
Membership Rewards

Amazon
Earn 5x points on purchases
Terms apply

Best Buy
Spend $250 or more, get 2,500 points
Enrollment required
Expires 12/31/2024

Target
3x points on all purchases
Earn points faster

Starbucks
Get 10x points when you spend $25+
Limited time offer
`;

console.log('🔍 Debug AMEX Parsing\n');
console.log('Input text:', amexText.trim());
console.log('\n--------------------------------------------------\n');

const amexPerks = ocrService.extractPerksFromTextWithCardType(amexText, 'amex');
console.log(`\nFinal result: Found ${amexPerks.length} AMEX perks:`);
amexPerks.forEach((perk, index) => {
  console.log(`${index + 1}. ${perk.merchant} - ${perk.description}`);
});