// Test the actual API endpoint with OCR text
const ocrTextFromLogs = `4:36 \\ al FT @)
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

console.log('=== Testing API Endpoint with OCR Text ===');
console.log('This tests the actual server behavior with our enhanced AmexParser\n');

async function testOCREndpoint() {
  try {
    // Test the OCR endpoint with text input
    const response = await fetch('http://localhost:5000/api/ocr/extract-text', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: ocrTextFromLogs,
        cardType: 'amex'
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    console.log('📊 API Response:');
    console.log('Status:', response.status);
    console.log('Found perks:', result.perks ? result.perks.length : 0);
    
    if (result.perks && result.perks.length > 0) {
      console.log('\n🎯 Extracted Perks:');
      result.perks.forEach((perk, i) => {
        console.log(`\n${i + 1}. 🏪 ${perk.merchant}`);
        console.log(`   📝 Description: ${perk.description}`);
        console.log(`   💰 Value: ${perk.value}`);
        console.log(`   📅 Expiration: ${perk.expiration || 'None'}`);
        console.log(`   🎯 Confidence: ${perk.confidence}`);
      });
      
      // Check if we found the expected merchants
      const expectedMerchants = ['Nordstrom & Nordstrom Rack', 'Shake Shack', 'Peacock', 'Walmart+ Annual Membership'];
      const foundMerchants = result.perks.map(p => p.merchant);
      
      console.log('\n🔍 VALIDATION:');
      console.log('Expected:', expectedMerchants);
      console.log('Found:', foundMerchants);
      
      const allFound = expectedMerchants.every(expected => 
        foundMerchants.some(found => found.includes(expected.split(' ')[0]))
      );
      
      console.log(`\n${allFound ? '✅' : '❌'} Success: ${result.perks.length}/4 perks, all merchants found: ${allFound}`);
      
      if (result.perks.length === 4 && allFound) {
        console.log('\n🎉 PERFECT! The enhanced AmexParser is working in the server!');
      } else {
        console.log('\n⚠️  The enhanced AmexParser may not be fully working in the server environment.');
      }
    } else {
      console.log('\n❌ No perks found - there may be an issue with the parser.');
    }
    
  } catch (error) {
    console.error('❌ Error testing API:', error.message);
    console.log('\nThis could mean:');
    console.log('1. Server is not running');
    console.log('2. API endpoint doesn\'t exist');
    console.log('3. Request format is incorrect');
  }
}

// Run the test
testOCREndpoint();