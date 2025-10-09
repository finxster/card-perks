import { ocrService } from './server/ocr-service.ts';

// Test the enhanced Chase Offers parsing
function testChaseOffersOCR() {
  console.log('Testing Chase Offers OCR parsing...\n');
  
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
  console.log('\n' + '='.repeat(50) + '\n');
  
  const result = ocrService.parsePerksFromText(chaseOffersText);
  
  console.log(`Found ${result.length} perks:`);
  
  result.forEach((perk, index) => {
    console.log(`\n${index + 1}. ${perk.merchant}`);
    console.log(`   Description: ${perk.description}`);
    console.log(`   Value: ${perk.value || 'N/A'}`);
    console.log(`   Expiration: ${perk.expiration || 'N/A'}`);
    console.log(`   Confidence: ${perk.confidence}`);
  });
  
  console.log('\n' + '='.repeat(50));
  console.log('Expected 7 perks:');
  console.log('1. fuboTV - 35% cash back');
  console.log('2. Event Tickets Center - 10% cash back');
  console.log('3. Turo - $30 cash back');
  console.log('4. Dyson - 5% cash back (24d left)');
  console.log('5. Arlo - 15% cash back');
  console.log('6. Lands\' End - 5% cash back');
  console.log('7. Zenni Optical - 10% cash back');
}

testChaseOffersOCR();