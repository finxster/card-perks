import { ocrService } from './server/ocr-service.ts';

// Test with messy OCR text that might be closer to real OCR output
function testMessyOCR() {
  console.log('Testing messy OCR parsing...\n');
  
  // Simulate messier OCR text with typical errors
  const messyOcrText = `
4:36 $
Chase 0ffers
All Shopping Groceries Home & pet E
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
ArIo
15% cash back
New
Lands' End
5% cash back
New
Zenni 0ptical
10% cash back
Cole Haan
Wild Alaskan
  `;
  
  console.log('Input text (with OCR errors):');
  console.log(messyOcrText);
  console.log('\n' + '='.repeat(50) + '\n');
  
  const result = ocrService.parsePerksFromText(messyOcrText);
  
  console.log(`Found ${result.length} perks:`);
  
  result.forEach((perk, index) => {
    console.log(`\n${index + 1}. ${perk.merchant}`);
    console.log(`   Description: ${perk.description}`);
    console.log(`   Value: ${perk.value || 'N/A'}`);
    console.log(`   Expiration: ${perk.expiration || 'N/A'}`);
    console.log(`   Confidence: ${perk.confidence}`);
  });
  
  console.log('\n' + '='.repeat(50));
  console.log('Testing common OCR character substitutions:');
  console.log('- "0ffers" instead of "Offers"');
  console.log('- "ArIo" instead of "Arlo"');
  console.log('- "0ptical" instead of "Optical"');
}

testMessyOCR();