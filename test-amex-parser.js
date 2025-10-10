/**
 * Test AMEX parser with real OCR text from logs
 * Expected to extract 4 perks from the screenshot
 */
import { AmexParser } from './server/parsers/amex-parser.ts';

// Real OCR text from logs
const ocrTextFromLogs = `4:36 \ al FT @)
Offers
Q
8, Al © Shopping (1 Dining & Entertainme
NEW
Nordstrom & Nordstrom Rack -
Clothes, Shoes, Beauty, and
NORDSTROM more +
Spend $80 or more, earn
$15 back
Expires 12/31/25
CD Shake Shack
Soo [Earn 20% back on asingle AL
c——> purchase, up to a total of $8
CD Expires 1112/25
NEW
Peacock
peacock Spend $10.99 or more, earn =
$10.99 back, up to 2 times
(total of $21.98).
Expires 12/26/25
Walmart+ Annual Membership
3 Spend $98 on Walmart+
Walmart+2 Annual Membership, earn $49 AF
back
Expires 01/28/26
NEW
El Pollo Loco
blo a. — +
A © 8, 2
Home Membership Offers Account

OCR Confidence: 80`;

console.log('=== AMEX Parser Test ===');
console.log('Testing extraction of 4 perks from real OCR text');
console.log('\nInput OCR text:');
console.log(ocrTextFromLogs);

const parser = new AmexParser();

// Test preprocessing
console.log('\n=== Preprocessing Debug ===');
class DebugAmexParser extends AmexParser {
  debugPreprocess(lines) {
    const result = this.preprocessOCRText(lines);
    console.log('Preprocessed lines:');
    result.forEach((line, i) => console.log(`  ${i}: "${line}"`));
    return result;
  }
  
  debugShakeShack(lines) {
    const fullText = lines.join('\n').trim();
    const cleanLines = fullText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .filter(line => !this.isNavigationOrUI(line));
    
    console.log('\n=== Debugging Shake Shack extraction ===');
    
    const shakeBlock = {
      merchantPattern: /Shake\s*Shack/i,
      offerPattern: /earn\s*20%|20%\s*back/i,
      name: 'Shake Shack'
    };
    
    const merchantIndex = cleanLines.findIndex(line => shakeBlock.merchantPattern.test(line));
    console.log(`Merchant index: ${merchantIndex}`);
    if (merchantIndex !== -1) {
      console.log(`Merchant line: "${cleanLines[merchantIndex]}"`);
    }
    
    const offerIndex = cleanLines.findIndex((line, i) => 
      i > merchantIndex && i < merchantIndex + 5 && shakeBlock.offerPattern.test(line)
    );
    console.log(`Offer index: ${offerIndex}`);
    if (offerIndex !== -1) {
      console.log(`Offer line: "${cleanLines[offerIndex]}"`);
    }
    
    if (merchantIndex !== -1 && offerIndex !== -1) {
      console.log('✅ Both merchant and offer found - should be extracted!');
    } else {
      console.log('❌ Missing merchant or offer');
    }
  }
}

const debugParser = new DebugAmexParser();
const preprocessedLines = debugParser.debugPreprocess([ocrTextFromLogs.trim()]);

// Debug specific Shake Shack extraction
debugParser.debugShakeShack([ocrTextFromLogs.trim()]);

// Test full parsing
console.log('\n=== Full Parsing Result ===');
const result = parser.parseLines([ocrTextFromLogs.trim()]);

console.log(`Found ${result.length} perks (expected: 4)`);
console.log('\nParsed perks:');
result.forEach((perk, i) => {
  console.log(`\n${i + 1}. ${perk.merchant}`);
  console.log(`   Description: ${perk.description}`);
  console.log(`   Value: ${perk.value}`);
  console.log(`   Expiration: ${perk.expiration || 'None'}`);
  console.log(`   Confidence: ${perk.confidence}`);
});

// Expected perks based on screenshot:
const expectedPerks = [
  'Nordstrom & Nordstrom Rack',
  'Shake Shack', 
  'Peacock',
  'Walmart+ Annual Membership'
];

console.log('\n=== Comparison ===');
console.log('Expected merchants:', expectedPerks);
console.log('Found merchants:', result.map(p => p.merchant));

const missingPerks = expectedPerks.filter(expected => 
  !result.some(found => found.merchant.toLowerCase().includes(expected.toLowerCase().split(' ')[0]))
);

if (missingPerks.length > 0) {
  console.log('\n❌ Missing perks:', missingPerks);
} else {
  console.log('\n✅ All expected perks found!');
}

console.log('\n=== Status ===');
if (result.length >= 4) {
  console.log('✅ SUCCESS: Found 4 or more perks');
} else {
  console.log(`❌ FAILED: Only found ${result.length} perks, expected 4`);
}