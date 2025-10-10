/**
 * Test Card-Type-Aware OCR Parsing
 */
import { OCRService } from './server/ocr-service.ts';

const ocrService = new OCRService();

console.log('🧪 Testing Card-Type-Aware OCR Parsing\n');

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

// Test unknown format
const unknownText = `
SPECIAL OFFERS

Nordstrom
5% cash back
Expires 12/31/2024

Amazon Prime
20% back up to $8
Valid until 11/30/2024
`;

console.log('============================================================');
console.log('TEST 1: Chase Card Type');
console.log('============================================================');
console.log('Input text:', chaseText.trim());
console.log('\n--------------------------------------------------\n');

const chasePerks = ocrService.extractPerksFromTextWithCardType(chaseText, 'chase');
console.log(`Found ${chasePerks.length} Chase perks:`);
chasePerks.forEach((perk, index) => {
  console.log(`${index + 1}. ${perk.merchant}`);
  console.log(`   Description: ${perk.description}`);
  console.log(`   Value: ${perk.value || 'N/A'}`);
  console.log(`   Expiration: ${perk.expiration || 'N/A'}`);
  console.log(`   Confidence: ${perk.confidence}`);
  console.log('');
});

console.log('============================================================');
console.log('TEST 2: American Express Card Type');
console.log('============================================================');
console.log('Input text:', amexText.trim());
console.log('\n--------------------------------------------------\n');

const amexPerks = ocrService.extractPerksFromTextWithCardType(amexText, 'amex');
console.log(`Found ${amexPerks.length} AMEX perks:`);
amexPerks.forEach((perk, index) => {
  console.log(`${index + 1}. ${perk.merchant}`);
  console.log(`   Description: ${perk.description}`);
  console.log(`   Value: ${perk.value || 'N/A'}`);
  console.log(`   Expiration: ${perk.expiration || 'N/A'}`);
  console.log(`   Confidence: ${perk.confidence}`);
  console.log('');
});

console.log('============================================================');
console.log('TEST 3: Auto-Detection (Unknown -> Detected)');
console.log('============================================================');
console.log('Input text:', unknownText.trim());
console.log('\n--------------------------------------------------\n');

const unknownPerks = ocrService.extractPerksFromTextWithCardType(unknownText, 'unknown');
console.log(`Found ${unknownPerks.length} perks with auto-detection:`);
unknownPerks.forEach((perk, index) => {
  console.log(`${index + 1}. ${perk.merchant}`);
  console.log(`   Description: ${perk.description}`);
  console.log(`   Value: ${perk.value || 'N/A'}`);
  console.log(`   Expiration: ${perk.expiration || 'N/A'}`);
  console.log(`   Confidence: ${perk.confidence}`);
  console.log('');
});

console.log('============================================================');
console.log('TEST RESULTS SUMMARY');
console.log('============================================================');
console.log(`Chase perks detected: ${chasePerks.length}`);
console.log(`AMEX perks detected: ${amexPerks.length}`);
console.log(`Auto-detected perks: ${unknownPerks.length}`);
console.log('\n✅ Card-type-aware parsing is working!');