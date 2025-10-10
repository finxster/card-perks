// Standalone test for Shake Shack extraction debugging

const ocrTextFromLogs = `CD Wallet
CD Amex Offers
4:36
Potential savings
Add all offers
9 offers
Nordstrom & Nordstrom Rack
Get $30 back on purchases of
$150+ total
Exp 02/28/2025
CD
Add to card
Shake Shack
Soo [Earn 20% back on purchases
of $30+ total. Exp 02/14/2025
Shake Shack
CD
Peacock
Earn 2,500 Membership Rewards
points on purchases of $5+ total.
CD
Walmart+ Annual Membership
Earn $50 back on purchases of
$98+ total. Exp 02/28/2025
CD
Add to card
Shake Shack
Soo [Earn 20% back on purchases
of $30+ total. Exp 02/14/2025
CD`;

// Navigation and UI detection
function isNavigationOrUI(line) {
  const trimmed = line.trim();
  
  if (trimmed.length <= 2) return true;
  if (/^\d{1,2}:\d{2}$/.test(trimmed)) return true;
  if (trimmed === 'CD' || trimmed === 'Soo') return true;
  if (/^(Add to card|Add all offers|offers|Potential savings)$/i.test(trimmed)) return true;
  if (/^\d+\s+offers?$/i.test(trimmed)) return true;
  
  return false;
}

// Extract clean lines
function extractCleanLines(text) {
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .filter(line => !isNavigationOrUI(line));
}

// Pattern-based extraction for Shake Shack
function debugShakeShackExtraction(lines) {
  console.log('=== Debug Shake Shack Extraction ===\n');
  
  const cleanLines = extractCleanLines(lines.join('\n'));
  
  console.log('Clean lines:');
  cleanLines.forEach((line, i) => {
    console.log(`  ${i}: "${line}"`);
  });
  
  console.log('\n--- Shake Shack Pattern Matching ---');
  
  const shakePattern = /Shake\s*Shack/i;
  const offerPattern = /earn\s*20%|20%\s*back/i;
  
  // Find all merchant mentions
  const merchantMatches = [];
  cleanLines.forEach((line, i) => {
    if (shakePattern.test(line)) {
      merchantMatches.push({ index: i, line });
      console.log(`✅ Merchant found at index ${i}: "${line}"`);
    }
  });
  
  // Find all offer mentions
  const offerMatches = [];
  cleanLines.forEach((line, i) => {
    if (offerPattern.test(line)) {
      offerMatches.push({ index: i, line });
      console.log(`💰 Offer found at index ${i}: "${line}"`);
    }
  });
  
  console.log('\n--- Grouping Logic ---');
  
  // Try to group them
  const groups = [];
  merchantMatches.forEach(merchant => {
    const nearbyOffers = offerMatches.filter(offer => 
      offer.index > merchant.index && offer.index <= merchant.index + 5
    );
    
    if (nearbyOffers.length > 0) {
      const group = {
        merchant: merchant.line,
        offer: nearbyOffers[0].line,
        merchantIndex: merchant.index,
        offerIndex: nearbyOffers[0].index
      };
      groups.push(group);
      console.log(`✅ Grouped: "${merchant.line}" + "${nearbyOffers[0].line}"`);
    } else {
      console.log(`❌ No offer found near merchant: "${merchant.line}"`);
    }
  });
  
  console.log(`\n--- Results ---`);
  console.log(`Found ${merchantMatches.length} merchant mentions`);
  console.log(`Found ${offerMatches.length} offer mentions`);
  console.log(`Successfully grouped: ${groups.length}`);
  
  return groups;
}

// Run the debug
const result = debugShakeShackExtraction([ocrTextFromLogs]);

console.log('\n=== Final Analysis ===');
if (result.length > 0) {
  console.log('✅ Shake Shack should be extracted successfully');
  result.forEach((group, i) => {
    console.log(`Group ${i + 1}:`);
    console.log(`  Merchant: ${group.merchant}`);
    console.log(`  Offer: ${group.offer}`);
  });
} else {
  console.log('❌ Shake Shack extraction would fail');
}