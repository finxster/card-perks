import { ocrService } from './server/ocr-service.ts';

// Let's create a simple focused solution that works reliably
function testTargetedSolution() {
  console.log('Testing targeted solution...\n');
  
  const actualText = `fuboTV Event Tickets Ce... Turo
35% cash back 10% cash back $30 cash back
Dyson Arlo
5% cash back 15% cash back
Lands' End Zenni Optical
5% cash back 10% cash back`;

  console.log('Testing with focused lines:');
  console.log(actualText);
  console.log('\n' + '='.repeat(50) + '\n');
  
  const lines = actualText.split('\n');
  console.log('Processing lines:', lines);
  
  // Test the current parsing logic
  const result = ocrService.parsePerksFromText(actualText);
  
  console.log(`Found ${result.length} perks:`);
  result.forEach((perk, index) => {
    console.log(`${index + 1}. ${perk.merchant}: ${perk.value}`);
  });
}

testTargetedSolution();