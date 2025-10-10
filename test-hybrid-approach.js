import { ocrService } from './server/ocr-service.ts';

// Test with a focused solution that's still scalable
function testHybridApproach() {
  console.log('Testing hybrid approach...\n');
  
  // Create a focused test to validate the core logic
  const lines = [
    'fuboTV Event Tickets Ce... Turo',
    '35% cash back 10% cash back $30 cash back',
    'Dyson Arlo',
    '5% cash back 15% cash back',
    'Lands\' End Zenni Optical',
    '5% cash back 10% cash back'
  ];
  
  console.log('Testing specific problematic lines:');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    console.log(`\nLine ${i}: "${line}"`);
    
    // Test multi-merchant extraction
    const merchants = ocrService['extractMultipleChaseOfferMerchants'](line);
    console.log(`  Merchants found: ${merchants.join(', ')}`);
    
    // Test offer extraction for each merchant
    if (merchants.length > 0 && i + 1 < lines.length) {
      const offerLine = lines[i + 1];
      for (const merchant of merchants) {
        const offer = ocrService['extractOfferForMerchant'](offerLine, merchant);
        console.log(`  ${merchant} -> ${offer}`);
      }
    }
  }
}

testHybridApproach();