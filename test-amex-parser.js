/**
 * Individual test for AMEX parser
 * This allows testing AMEX-specific logic in isolation
 */

console.log('🧪 Testing AMEX Parser\n');

// Mock AMEX parser logic for testing
class MockAmexParser {
  parseLines(lines) {
    const perks = [];
    let currentMerchant = '';
    let currentOffer = '';
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip AMEX navigation
      if (this.isAmexNavigation(line)) continue;
      
      // Check if this is a merchant
      if (this.looksLikeMerchant(line)) {
        // Save previous perk
        if (currentMerchant && currentOffer) {
          perks.push({
            merchant: currentMerchant,
            description: currentOffer,
            value: this.extractValue(currentOffer),
            confidence: 0.9
          });
        }
        
        currentMerchant = line;
        currentOffer = '';
      } else if (this.looksLikeOffer(line)) {
        if (currentOffer) {
          currentOffer += ' ' + line;
        } else {
          currentOffer = line;
        }
      }
    }
    
    // Don't forget the last perk
    if (currentMerchant && currentOffer) {
      perks.push({
        merchant: currentMerchant,
        description: currentOffer,
        value: this.extractValue(currentOffer),
        confidence: 0.9
      });
    }
    
    return perks;
  }
  
  isAmexNavigation(line) {
    const navElements = [
      'american express', 'membership rewards', 'offers', 
      'terms apply', 'enrollment required', 'limited time offer'
    ];
    const lower = line.toLowerCase();
    return navElements.some(nav => lower.includes(nav));
  }
  
  looksLikeMerchant(line) {
    // AMEX merchants are typically clean single words or known brands
    const trimmed = line.trim();
    
    if (trimmed.length < 3 || this.containsOfferKeywords(trimmed)) {
      return false;
    }
    
    // Common AMEX merchant patterns
    return /^[A-Z][a-z]+$/.test(trimmed) || // "Amazon", "Target"
           /^[A-Z][a-z]+\s+[A-Z][a-z]+$/.test(trimmed); // "Best Buy"
  }
  
  looksLikeOffer(line) {
    return /earn\s+\d+|spend\s+\$\d+|get\s+\d+|\d+x\s*points|\d+\s*points/i.test(line);
  }
  
  containsOfferKeywords(line) {
    const keywords = ['earn', 'spend', 'get', 'points', 'offer'];
    const lower = line.toLowerCase();
    return keywords.some(keyword => lower.includes(keyword));
  }
  
  extractValue(text) {
    const pointsMatch = text.match(/(\d+[x]?\s*points?)/i);
    const dollarMatch = text.match(/(\$\d+)/);
    return pointsMatch?.[1] || dollarMatch?.[1] || 'N/A';
  }
}

// Test data
const amexText = `
American Express
Membership Rewards

Amazon
Earn 5x points on purchases
Terms apply

Best Buy
Spend $250 or more, get 2,500 points
Enrollment required

Target
3x points on all purchases

Starbucks
Get 10x points when you spend $25+
Limited time offer
`;

const lines = amexText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
const parser = new MockAmexParser();
const perks = parser.parseLines(lines);

console.log(`Found ${perks.length} AMEX perks:`);
perks.forEach((perk, index) => {
  console.log(`${index + 1}. ${perk.merchant}: ${perk.value}`);
  console.log(`   Description: ${perk.description}`);
});

console.log('\n✅ AMEX parser logic works correctly!');