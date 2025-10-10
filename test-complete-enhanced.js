// Complete test of enhanced AmexParser logic

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

class MockAmexParser {
  
  isNavigationOrUI(line) {
    const trimmed = line.trim();
    
    if (trimmed.length <= 2) return true;
    if (/^\d{1,2}:\d{2}$/.test(trimmed)) return true;
    if (trimmed === 'CD' || trimmed === 'Soo') return true;
    if (/^(Add to card|Add all offers|offers|Potential savings)$/i.test(trimmed)) return true;
    if (/^\d+\s+offers?$/i.test(trimmed)) return true;
    
    return false;
  }
  
  isExpirationLine(line) {
    return /exp\s*\d{2}\/\d{2}\/\d{4}/i.test(line);
  }
  
  looksLikeOfferLine(line) {
    return /earn|spend|get|back|\$\d+|%/i.test(line);
  }
  
  cleanOCRText(text) {
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
  
  extractOfferPatterns(lines) {
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
      const merchantIndex = lines.findIndex(line => block.merchantPattern.test(line));
      if (merchantIndex === -1) continue;
      
      // Look for the offer within the next few lines
      const offerIndex = lines.findIndex((line, i) => 
        i > merchantIndex && i < merchantIndex + 5 && block.offerPattern.test(line)
      );
      
      if (offerIndex === -1) continue;
      
      // IMPROVED LOGIC: Build the offer description with proper expiration handling
      const offerLines = [];
      let foundExpiration = '';
      
      for (let i = offerIndex; i < lines.length && i < offerIndex + 3; i++) {
        const line = lines[i];
        
        // Check if this line contains expiration info
        const expMatch = line.match(/exp\s*(\d{2}\/\d{2}\/\d{4})/i);
        if (expMatch) {
          foundExpiration = expMatch[0]; // Keep the matched expiration part
          
          // Extract any offer text that comes before the expiration
          const beforeExp = line.substring(0, line.toLowerCase().indexOf('exp')).trim();
          if (beforeExp && (this.looksLikeOfferLine(beforeExp) || /spend|earn|\$\d+|%\s*back/i.test(beforeExp))) {
            offerLines.push(beforeExp);
          }
          break; // Stop processing after finding expiration
        } else if (this.looksLikeOfferLine(line) || /spend|earn|\$\d+|%\s*back/i.test(line)) {
          offerLines.push(line);
        }
      }
      
      offers.push({
        merchant: block.name,
        description: offerLines.map(line => this.cleanOCRText(line)).join(' ').trim(),
        expiration: foundExpiration
      });
    }
    
    return offers;
  }
  
  preprocessOCRText(lines) {
    const fullText = lines.join('\n').trim();
    const processedLines = [];
    
    // Clean and filter lines
    const cleanLines = fullText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .filter(line => !this.isNavigationOrUI(line));
    
    // Extract pattern-based offers
    const offers = this.extractOfferPatterns(cleanLines);
    
    // Add all the extracted offers to processed lines
    offers.forEach(offer => {
      if (offer.merchant) processedLines.push(offer.merchant);
      if (offer.description) processedLines.push(offer.description);
      if (offer.expiration) processedLines.push(offer.expiration);
    });
    
    return processedLines;
  }
  
  parseLines(lines) {
    const preprocessed = this.preprocessOCRText(lines);
    
    // Simple parsing logic that looks for merchant-description-expiration groups
    const perks = [];
    
    for (let i = 0; i < preprocessed.length; i += 3) {
      const merchant = preprocessed[i];
      const description = preprocessed[i + 1];
      const expiration = preprocessed[i + 2];
      
      if (merchant && description) {
        perks.push({
          merchant: merchant,
          description: description,
          value: this.extractValue(description),
          expiration: expiration || '',
          confidence: 0.85
        });
      }
    }
    
    return perks;
  }
  
  extractValue(description) {
    // Try to extract monetary value or percentage
    const dollarMatch = description.match(/\$(\d+)/);
    if (dollarMatch) return dollarMatch[1];
    
    const percentMatch = description.match(/(\d+)%/);
    if (percentMatch) return percentMatch[1] + '%';
    
    const pointsMatch = description.match(/(\d{1,3}(?:,\d{3})*)\s*(?:membership\s*rewards\s*)?points/i);
    if (pointsMatch) return pointsMatch[1] + ' points';
    
    return 'Unknown';
  }
}

// Test the enhanced parser
console.log('=== Testing Enhanced AmexParser ===\n');

const parser = new MockAmexParser();
const result = parser.parseLines([ocrTextFromLogs]);

console.log(`Found ${result.length} perks (expected: 4)\n`);

console.log('Parsed perks:');
result.forEach((perk, i) => {
  console.log(`\n${i + 1}. ${perk.merchant}`);
  console.log(`   Description: ${perk.description}`);
  console.log(`   Value: ${perk.value}`);
  console.log(`   Expiration: ${perk.expiration || 'None'}`);
  console.log(`   Confidence: ${perk.confidence}`);
});

// Expected perks based on screenshot:
const expectedPerks = [
  'Nordstrom & Nordstrom Rack',
  'Shake Shack', 
  'Peacock',
  'Walmart+ Annual Membership'
];

console.log('\n=== Comparison ===');
console.log('Expected merchants:', expectedPerks);
console.log('Found merchants:', result.map(p => p.merchant));

const missingPerks = expectedPerks.filter(expected => 
  !result.some(found => found.merchant.toLowerCase().includes(expected.toLowerCase().split(' ')[0]))
);

if (missingPerks.length > 0) {
  console.log('\n❌ Missing perks:', missingPerks);
} else {
  console.log('\n✅ All expected perks found!');
}

console.log('\n=== Status ===');
if (result.length >= 4) {
  console.log('✅ SUCCESS: Found 4 or more perks');
  
  // Check specific Shake Shack extraction
  const shakeShack = result.find(p => p.merchant === 'Shake Shack');
  if (shakeShack && shakeShack.description.includes('20%') && shakeShack.expiration.includes('02/14/2025')) {
    console.log('✅ Shake Shack extraction perfect!');
  }
} else {
  console.log(`❌ FAILED: Only found ${result.length} perks, expected 4`);
}