// Test the exact extractOfferPatterns logic for Shake Shack

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

// Replicate isNavigationOrUI logic
function isNavigationOrUI(line) {
  const trimmed = line.trim();
  
  if (trimmed.length <= 2) return true;
  if (/^\d{1,2}:\d{2}$/.test(trimmed)) return true;
  if (trimmed === 'CD' || trimmed === 'Soo') return true;
  if (/^(Add to card|Add all offers|offers|Potential savings)$/i.test(trimmed)) return true;
  if (/^\d+\s+offers?$/i.test(trimmed)) return true;
  
  return false;
}

// Replicate isExpirationLine logic  
function isExpirationLine(line) {
  return /exp\s*\d{2}\/\d{2}\/\d{4}/i.test(line);
}

// Replicate looksLikeOfferLine logic
function looksLikeOfferLine(line) {
  return /earn|spend|get|back|\$\d+|%/i.test(line);
}

// Replicate cleanOCRText logic
function cleanOCRText(text) {
  return text
    .replace(/=/g, '') 
    .replace(/\s+/g, ' ') 
    .replace(/AF$/, '') 
    .replace(/\d+$/, '') 
    .replace(/\$\d+\.\d+$/, '') 
    .replace(/\$$/, '') 
    .replace(/\s+\w+\d+/g, '') 
    .trim();
}

// Replicate extractOfferPatterns logic
function extractOfferPatterns(lines) {
  const offers = [];
  
  const merchantBlocks = [
    {
      merchantPattern: /Nordstrom.*Rack/i,
      offerPattern: /get\s*\$30|spend\s*\$150/i,
      name: 'Nordstrom & Nordstrom Rack'
    },
    {
      merchantPattern: /Shake\s*Shack/i,
      offerPattern: /earn\s*20%|20%\s*back/i,
      name: 'Shake Shack'
    },
    {
      merchantPattern: /Peacock/i,
      offerPattern: /earn\s*2,?500|membership\s*rewards/i,
      name: 'Peacock'
    },
    {
      merchantPattern: /Walmart.*Annual.*Membership/i,
      offerPattern: /earn\s*\$50|spend\s*\$98/i,
      name: 'Walmart+ Annual Membership'
    }
  ];
  
  for (const block of merchantBlocks) {
    console.log(`\n--- Processing ${block.name} ---`);
    
    const merchantIndex = lines.findIndex(line => block.merchantPattern.test(line));
    console.log(`Merchant index: ${merchantIndex}`);
    if (merchantIndex !== -1) {
      console.log(`Merchant line: "${lines[merchantIndex]}"`);
    }
    
    if (merchantIndex === -1) {
      console.log(`❌ No merchant found for ${block.name}`);
      continue;
    }
    
    // Look for the offer within the next few lines
    const offerIndex = lines.findIndex((line, i) => 
      i > merchantIndex && i < merchantIndex + 5 && block.offerPattern.test(line)
    );
    
    console.log(`Offer index: ${offerIndex}`);
    if (offerIndex !== -1) {
      console.log(`Offer line: "${lines[offerIndex]}"`);
    }
    
    if (offerIndex === -1) {
      console.log(`❌ No offer found for ${block.name}`);
      continue;
    }
    
    // Look for expiration within the next few lines after the offer
    const expirationIndex = lines.findIndex((line, i) => 
      i > offerIndex && i < offerIndex + 3 && isExpirationLine(line)
    );
    
    console.log(`Expiration index: ${expirationIndex}`);
    if (expirationIndex !== -1) {
      console.log(`Expiration line: "${lines[expirationIndex]}"`);
    }
    
    // Build the offer description by combining relevant lines
    const offerLines = [];
    for (let i = offerIndex; i < lines.length && i < offerIndex + 3; i++) {
      if (isExpirationLine(lines[i])) break;
      if (looksLikeOfferLine(lines[i]) || /spend|earn|\$\d+|%\s*back/i.test(lines[i])) {
        offerLines.push(lines[i]);
        console.log(`Added offer line: "${lines[i]}"`);
      }
    }
    
    const offer = {
      merchant: block.name,
      description: offerLines.map(line => cleanOCRText(line)).join(' ').trim(),
      expiration: expirationIndex !== -1 ? lines[expirationIndex] : ''
    };
    
    console.log(`✅ Created offer:`, offer);
    offers.push(offer);
  }
  
  return offers;
}

// Test with clean lines
const cleanLines = ocrTextFromLogs
  .split('\n')
  .map(line => line.trim())
  .filter(line => line.length > 0)
  .filter(line => !isNavigationOrUI(line));

console.log('Clean lines:');
cleanLines.forEach((line, i) => {
  console.log(`  ${i}: "${line}"`);
});

console.log('\n=== Running extractOfferPatterns ===');
const offers = extractOfferPatterns(cleanLines);

console.log(`\n=== Final Results ===`);
console.log(`Total offers found: ${offers.length}`);
offers.forEach((offer, i) => {
  console.log(`\nOffer ${i + 1}:`);
  console.log(`  Merchant: ${offer.merchant}`);
  console.log(`  Description: ${offer.description}`);
  console.log(`  Expiration: ${offer.expiration}`);
});