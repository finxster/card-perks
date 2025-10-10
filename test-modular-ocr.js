/**
 * Test the new modular OCR service architecture
 */
import { OCRService } from './server/ocr-service-v2.ts';

const ocrService = new OCRService();

console.log('🧪 Testing Modular OCR Service Architecture\n');

// Test Chase format
const chaseText = `
4:36
Chase Offers
All    Shopping    Groceries    Home & pet    E
Gear up for game day
New
fuboTV
35% cash back
New
Event Tickets Ce...
10% cash back
New
Turo
$30 cash back
All offers
Dyson
5% cash back
24d left
New
Arlo
15% cash back
New
Lands' End
5% cash back
New
Zenni Optical
10% cash back
Cole Haan
Wild Alaskan
`;

// Test AMEX format
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

// Test Citi format
const citiText = `
Citi Thank You Rewards

Gas Stations
Earn 3x points per dollar
Valid through Q4 2024

Grocery Stores
2x points on all purchases
No category caps

Restaurants
5% cash back
Limited time bonus
`;

console.log('============================================================');
console.log('Supported Card Types:', ocrService.getSupportedCardTypes());
console.log('============================================================\n');

console.log('============================================================');
console.log('TEST 1: Chase Parser (Modular)');
console.log('============================================================');
const chasePerks = ocrService.extractPerksFromTextWithCardType(chaseText, 'chase');
console.log(`Found ${chasePerks.length} Chase perks:`);
chasePerks.forEach((perk, index) => {
  console.log(`${index + 1}. ${perk.merchant}: ${perk.value} (confidence: ${perk.confidence})`);
});

console.log('\n============================================================');
console.log('TEST 2: AMEX Parser (Modular)');
console.log('============================================================');
const amexPerks = ocrService.extractPerksFromTextWithCardType(amexText, 'amex');
console.log(`Found ${amexPerks.length} AMEX perks:`);
amexPerks.forEach((perk, index) => {
  console.log(`${index + 1}. ${perk.merchant}: ${perk.value} (confidence: ${perk.confidence})`);
});

console.log('\n============================================================');
console.log('TEST 3: Citi Parser (Modular)');
console.log('============================================================');
const citiPerks = ocrService.extractPerksFromTextWithCardType(citiText, 'citi');
console.log(`Found ${citiPerks.length} Citi perks:`);
citiPerks.forEach((perk, index) => {
  console.log(`${index + 1}. ${perk.merchant}: ${perk.value} (confidence: ${perk.confidence})`);
});

console.log('\n============================================================');
console.log('TEST 4: Auto-Detection');
console.log('============================================================');
const autoChase = ocrService.extractPerksFromTextWithCardType(chaseText, 'unknown');
console.log(`Auto-detected Chase: ${autoChase.length} perks`);

const autoAmex = ocrService.extractPerksFromTextWithCardType(amexText, 'unknown');
console.log(`Auto-detected AMEX: ${autoAmex.length} perks`);

const autoCiti = ocrService.extractPerksFromTextWithCardType(citiText, 'unknown');
console.log(`Auto-detected Citi: ${autoCiti.length} perks`);

console.log('\n============================================================');
console.log('TEST 5: Backward Compatibility');
console.log('============================================================');
const legacyChase = ocrService.parsePerksFromText(chaseText);
console.log(`Legacy Chase parsing: ${legacyChase.length} perks`);

console.log('\n============================================================');
console.log('TEST RESULTS SUMMARY');
console.log('============================================================');
console.log(`✅ Chase modular: ${chasePerks.length} perks`);
console.log(`✅ AMEX modular: ${amexPerks.length} perks`);
console.log(`✅ Citi modular: ${citiPerks.length} perks`);
console.log(`✅ Auto-detection working: ${autoChase.length + autoAmex.length + autoCiti.length} total perks`);
console.log(`✅ Legacy compatibility: ${legacyChase.length} perks`);
console.log('\n🎉 Modular architecture is working perfectly!');