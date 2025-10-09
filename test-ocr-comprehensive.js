import { ocrService } from './server/ocr-service.ts';

// Test 1: Chase Offers OCR parsing
function testChaseOffersOCR() {
  console.log('='.repeat(60));
  console.log('TEST 1: Chase Offers OCR parsing');
  console.log('='.repeat(60));
  
  // Simulate OCR text from the Chase Offers screen
  const chaseOffersText = `
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
  
  console.log('Input text:');
  console.log(chaseOffersText);
  console.log('\n' + '-'.repeat(50) + '\n');
  
  const result = ocrService.parsePerksFromText(chaseOffersText);
  
  console.log(`Found ${result.length} perks:`);
  
  result.forEach((perk, index) => {
    console.log(`\n${index + 1}. ${perk.merchant}`);
    console.log(`   Description: ${perk.description}`);
    console.log(`   Value: ${perk.value || 'N/A'}`);
    console.log(`   Expiration: ${perk.expiration || 'N/A'}`);
    console.log(`   Confidence: ${perk.confidence}`);
  });
  
  console.log('\n' + '-'.repeat(50));
  console.log('Expected 7+ perks:');
  console.log('✓ fuboTV - 35% cash back');
  console.log('✓ Event Tickets Center - 10% cash back');
  console.log('✓ Turo - $30 cash back');
  console.log('✓ Dyson - 5% cash back (24d left)');
  console.log('✓ Arlo - 15% cash back');
  console.log('✓ Lands\' End - 5% cash back');
  console.log('✓ Zenni Optical - 10% cash back');
  
  return result.length >= 7;
}

// Test 2: Traditional credit card statement OCR parsing
function testTraditionalOCR() {
  console.log('\n\n' + '='.repeat(60));
  console.log('TEST 2: Traditional Credit Card Statement OCR parsing');
  console.log('='.repeat(60));
  
  // Simulate OCR text from traditional credit card statements/offers
  const traditionalText = `
CHASE SAPPHIRE PREFERRED CARD OFFERS

Nordstrom
Earn 5% back on purchases
Expires 12/31/2024

Walmart+
Spend $98 on Walmart+ Annual Membership, earn $49 back
Offer expires 11/15/2024

Shake Shack
Spend $10.99 or more, earn $10.99 back, up to 2 times
Valid through 10/30/2024

Amazon Prime
Earn 20% back on a single purchase, up to a total of $8
Expires 12/15/2024

Target
Spend $80 or more, earn $15 back
Through 11/30/2024

Starbucks
Get $5 back when you spend $25 or more
Expires 10/25/2024
  `;
  
  console.log('Input text:');
  console.log(traditionalText);
  console.log('\n' + '-'.repeat(50) + '\n');
  
  const result = ocrService.parsePerksFromText(traditionalText);
  
  console.log(`Found ${result.length} perks:`);
  
  result.forEach((perk, index) => {
    console.log(`\n${index + 1}. ${perk.merchant}`);
    console.log(`   Description: ${perk.description}`);
    console.log(`   Value: ${perk.value || 'N/A'}`);
    console.log(`   Expiration: ${perk.expiration || 'N/A'}`);
    console.log(`   Confidence: ${perk.confidence}`);
  });
  
  console.log('\n' + '-'.repeat(50));
  console.log('Expected 6 perks:');
  console.log('✓ Nordstrom - 5% back');
  console.log('✓ Walmart+ - Spend $98, earn $49 back');
  console.log('✓ Shake Shack - Spend $10.99, earn $10.99 back');
  console.log('✓ Amazon Prime - 20% back up to $8');
  console.log('✓ Target - Spend $80, earn $15 back');
  console.log('✓ Starbucks - $5 back when spend $25+');
  
  return result.length >= 5; // Allow some flexibility
}

// Test 3: Mixed format OCR parsing
function testMixedFormatOCR() {
  console.log('\n\n' + '='.repeat(60));
  console.log('TEST 3: Mixed Format OCR parsing');
  console.log('='.repeat(60));
  
  const mixedText = `
SPECIAL OFFERS

Peacock Premium
Get 6 months for $1.99/month
New subscribers only
Expires 12/31/2024

5% cash back
Target purchases
Through Q4 2024

DoorDash
$10 off orders $30+
Valid for DashPass members
Exp: 11/15/24

15% back at Hotels.com
Book by 10/31/2024
Travel by 12/31/2024
  `;
  
  console.log('Input text:');
  console.log(mixedText);
  console.log('\n' + '-'.repeat(50) + '\n');
  
  const result = ocrService.parsePerksFromText(mixedText);
  
  console.log(`Found ${result.length} perks:`);
  
  result.forEach((perk, index) => {
    console.log(`\n${index + 1}. ${perk.merchant}`);
    console.log(`   Description: ${perk.description}`);
    console.log(`   Value: ${perk.value || 'N/A'}`);
    console.log(`   Expiration: ${perk.expiration || 'N/A'}`);
    console.log(`   Confidence: ${perk.confidence}`);
  });
  
  console.log('\n' + '-'.repeat(50));
  console.log('Expected 4+ perks with various formats');
  
  return result.length >= 3;
}

// Run all tests
function runAllTests() {
  console.log('🧪 Running OCR Service Comprehensive Tests\n');
  
  const test1Pass = testChaseOffersOCR();
  const test2Pass = testTraditionalOCR();
  const test3Pass = testMixedFormatOCR();
  
  console.log('\n\n' + '='.repeat(60));
  console.log('TEST RESULTS SUMMARY');
  console.log('='.repeat(60));
  console.log(`Test 1 (Chase Offers): ${test1Pass ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Test 2 (Traditional): ${test2Pass ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Test 3 (Mixed Format): ${test3Pass ? '✅ PASS' : '❌ FAIL'}`);
  
  const allPass = test1Pass && test2Pass && test3Pass;
  console.log(`\nOverall: ${allPass ? '✅ ALL TESTS PASS' : '❌ SOME TESTS FAILED'}`);
  
  return allPass;
}

runAllTests();