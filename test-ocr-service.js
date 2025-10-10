/**
 * Test the OCR service directly to see if it's using our enhanced AmexParser
 */
import { OCRService } from './server/ocr-service-v2.ts';

// The exact OCR text from the logs
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

console.log('=== Testing OCR Service with Enhanced AmexParser ===');
console.log('This should replicate the exact server behavior\n');

// Create OCR service instance (same as server)
const ocrService = new OCRService();

// Test the exact method call that the server makes
console.log('Input OCR text:');
console.log(ocrTextFromLogs);
console.log('\n' + '='.repeat(50));

// This replicates the exact server call
const result = ocrService.extractPerksFromTextWithCardType(ocrTextFromLogs, 'amex');

console.log(`\n📊 RESULTS: Found ${result.length} perks`);
console.log('='.repeat(30));

result.forEach((perk, i) => {
  console.log(`\n${i + 1}. 🏪 ${perk.merchant}`);
  console.log(`   📝 Description: ${perk.description}`);
  console.log(`   💰 Value: ${perk.value}`);
  console.log(`   📅 Expiration: ${perk.expiration || 'None'}`);
  console.log(`   🎯 Confidence: ${perk.confidence}`);
});

// Check if this matches our expectations
const expectedMerchants = ['Nordstrom & Nordstrom Rack', 'Shake Shack', 'Peacock', 'Walmart+ Annual Membership'];
const foundMerchants = result.map(p => p.merchant);

console.log('\n🔍 VALIDATION');
console.log('='.repeat(30));
console.log('Expected merchants:', expectedMerchants);
console.log('Found merchants:', foundMerchants);

const allFound = expectedMerchants.every(expected => 
  foundMerchants.some(found => found.includes(expected.split(' ')[0]))
);

console.log(`\n${allFound ? '✅' : '❌'} All expected merchants found: ${allFound}`);
console.log(`📈 Success rate: ${result.length}/4 = ${(result.length/4*100).toFixed(1)}%`);

if (result.length === 4 && allFound) {
  console.log('\n🎉 SUCCESS: OCR Service is using the enhanced AmexParser correctly!');
} else {
  console.log('\n❌ ISSUE: OCR Service is not working as expected.');
  console.log('This means the server behavior differs from the standalone test.');
}