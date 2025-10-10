// Test the updated extraction logic for Shake Shack

const testLine = "of $30+ total. Exp 02/14/2025";

// Test the expiration extraction
console.log('=== Testing Expiration Extraction ===');
const expMatch = testLine.match(/exp\s*(\d{2}\/\d{2}\/\d{4})/i);
if (expMatch) {
  console.log('Found expiration:', expMatch[0]);
  
  const beforeExp = testLine.substring(0, testLine.toLowerCase().indexOf('exp')).trim();
  console.log('Text before exp:', `"${beforeExp}"`);
  
  if (beforeExp) {
    console.log('✅ Will add to offer description');
  }
} else {
  console.log('❌ No expiration found');
}

// Test the complete flow
console.log('\n=== Testing Complete Flow ===');

const shakeShackLines = [
  "Shake Shack",
  "Soo [Earn 20% back on purchases", 
  "of $30+ total. Exp 02/14/2025"
];

console.log('Lines:');
shakeShackLines.forEach((line, i) => console.log(`  ${i}: "${line}"`));

// Simulate the extraction
const merchantPattern = /Shake\s*Shack/i;
const offerPattern = /earn\s*20%|20%\s*back/i;

const merchantIndex = shakeShackLines.findIndex(line => merchantPattern.test(line));
const offerIndex = shakeShackLines.findIndex((line, i) => 
  i > merchantIndex && i < merchantIndex + 5 && offerPattern.test(line)
);

console.log(`\nMerchant index: ${merchantIndex}`);
console.log(`Offer index: ${offerIndex}`);

if (merchantIndex !== -1 && offerIndex !== -1) {
  const offerLines = [];
  let foundExpiration = '';
  
  for (let i = offerIndex; i < shakeShackLines.length && i < offerIndex + 3; i++) {
    const line = shakeShackLines[i];
    console.log(`Processing line ${i}: "${line}"`);
    
    // Check if this line contains expiration info
    const expMatch = line.match(/exp\s*(\d{2}\/\d{2}\/\d{4})/i);
    if (expMatch) {
      foundExpiration = expMatch[0];
      console.log(`  Found expiration: ${foundExpiration}`);
      
      // Extract any offer text that comes before the expiration
      const beforeExp = line.substring(0, line.toLowerCase().indexOf('exp')).trim();
      console.log(`  Text before exp: "${beforeExp}"`);
      
      if (beforeExp && /spend|earn|\$\d+|%\s*back/i.test(beforeExp)) {
        offerLines.push(beforeExp);
        console.log(`  ✅ Added to offer: "${beforeExp}"`);
      }
      break;
    } else if (/spend|earn|\$\d+|%\s*back/i.test(line)) {
      offerLines.push(line);
      console.log(`  ✅ Added to offer: "${line}"`);
    }
  }
  
  const description = offerLines.join(' ').trim();
  
  console.log('\n=== Final Result ===');
  console.log(`Merchant: Shake Shack`);
  console.log(`Description: "${description}"`);
  console.log(`Expiration: "${foundExpiration}"`);
  
  if (description.includes('20%') && foundExpiration.includes('02/14/2025')) {
    console.log('✅ SUCCESS: Proper extraction achieved!');
  } else {
    console.log('❌ FAILED: Still missing parts');
  }
}