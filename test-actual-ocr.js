import { ocrService } from './server/ocr-service.ts';

// Test with the actual messy OCR text from the user's image
function testActualOCR() {
  console.log('Testing actual OCR output...\n');
  
  // The actual OCR text from the user's uploaded image
  const actualOcrText = `4:36 \\ wT @)
<
Chase Offers
Q a Shopping Groceries Home & pet E
acai up U1 sailic uay
New [4 a8 New : 3s New
PE GR a La ts = Zo
wep JID aU — §
Gamih -& d el bigde y —af
fubo 57 event tickets 38 'B A i -
fuboTV Event Tickets Ce... Turo
35% cash back 10% cash back $30 cash back
All offers
x ey
dyson | ] arlo™ oo
ew
Dyson Arlo
5% cash back 15% cash back
24d left [] ®
Md /
"lk :
) WW i !
{ Tg
= \\ =e ZAINNT
) I oo New '
Lands' End Zenni Optical
5% cash back 10% cash back
" y Ce r ye i ———
AF ERT BP
coLe HAAN IF] x B\\- a
y aamm— a`;
  
  console.log('Input text (actual OCR):');
  console.log(actualOcrText);
  console.log('\n' + '='.repeat(60) + '\n');
  
  const result = ocrService.parsePerksFromText(actualOcrText);
  
  console.log(`Found ${result.length} perks:`);
  
  result.forEach((perk, index) => {
    console.log(`\n${index + 1}. ${perk.merchant}`);
    console.log(`   Description: ${perk.description}`);
    console.log(`   Value: ${perk.value || 'N/A'}`);
    console.log(`   Expiration: ${perk.expiration || 'N/A'}`);
    console.log(`   Confidence: ${perk.confidence}`);
  });
  
  console.log('\n' + '='.repeat(60));
  console.log('Expected 7 perks:');
  console.log('1. fuboTV - 35% cash back');
  console.log('2. Event Tickets Center - 10% cash back');
  console.log('3. Turo - $30 cash back');
  console.log('4. Dyson - 5% cash back (24d left)');
  console.log('5. Arlo - 15% cash back');
  console.log('6. Lands\' End - 5% cash back');
  console.log('7. Zenni Optical - 10% cash back');
}

testActualOCR();