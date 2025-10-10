// Debug what extractOfferPatterns is returning

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
      console.log(`\n--- Processing ${block.name} ---`);
      
      const merchantIndex = lines.findIndex(line => block.merchantPattern.test(line));
      if (merchantIndex === -1) {
        console.log(`❌ No merchant found`);
        continue;
      }
      console.log(`✅ Merchant found at index ${merchantIndex}: "${lines[merchantIndex]}"`);
      
      // Look for the offer within the next few lines
      const offerIndex = lines.findIndex((line, i) => 
        i > merchantIndex && i < merchantIndex + 5 && block.offerPattern.test(line)
      );
      
      if (offerIndex === -1) {
        console.log(`❌ No offer found`);
        continue;
      }
      console.log(`✅ Offer found at index ${offerIndex}: "${lines[offerIndex]}"`);
      
      // Build the offer description with proper expiration handling
      const offerLines = [];
      let foundExpiration = '';
      
      for (let i = offerIndex; i < lines.length && i < offerIndex + 3; i++) {
        const line = lines[i];
        console.log(`  Processing line ${i}: "${line}"`);
        
        // Check if this line contains expiration info
        const expMatch = line.match(/exp\s*(\d{2}\/\d{2}\/\d{4})/i);
        if (expMatch) {
          foundExpiration = expMatch[0];
          console.log(`    Found expiration: ${foundExpiration}`);
          
          // Extract any offer text that comes before the expiration
          const beforeExp = line.substring(0, line.toLowerCase().indexOf('exp')).trim();
          if (beforeExp && (this.looksLikeOfferLine(beforeExp) || /spend|earn|\$\d+|%\s*back/i.test(beforeExp))) {
            offerLines.push(beforeExp);
            console.log(`    Added before-exp text: "${beforeExp}"`);
          }
          break;
        } else if (this.looksLikeOfferLine(line) || /spend|earn|\$\d+|%\s*back/i.test(line)) {
          offerLines.push(line);
          console.log(`    Added offer line: "${line}"`);
        }
      }
      
      const description = offerLines.map(line => this.cleanOCRText(line)).join(' ').trim();
      
      console.log(`Raw description: "${offerLines.join(' ')}"`);
      console.log(`Cleaned description: "${description}"`);
      
      offers.push({
        merchant: block.name,
        description: description,
        expiration: foundExpiration
      });
    }
    
    return offers;
  }
}

// Test clean lines
const parser = new MockAmexParser();

const cleanLines = ocrTextFromLogs
  .split('\n')
  .map(line => line.trim())
  .filter(line => line.length > 0)
  .filter(line => !parser.isNavigationOrUI(line));

console.log('Clean lines:');
cleanLines.forEach((line, i) => {
  console.log(`  ${i}: "${line}"`);
});

console.log('\n=== Running extractOfferPatterns ===');
const offers = parser.extractOfferPatterns(cleanLines);

console.log(`\n=== Final Offers ===`);
offers.forEach((offer, i) => {
  console.log(`\nOffer ${i + 1}:`);
  console.log(`  Merchant: "${offer.merchant}"`);
  console.log(`  Description: "${offer.description}"`);
  console.log(`  Expiration: "${offer.expiration}"`);
});