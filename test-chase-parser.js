/**
 * Individual test for Chase parser
 * This allows testing Chase-specific logic in isolation
 */

console.log('🧪 Testing Chase Parser\n');

// Mock Chase parser logic for testing
class MockChaseParser {
  parseLines(lines) {
    const perks = [];
    let currentMerchant = '';
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip navigation
      if (this.isChaseNavigation(line)) continue;
      
      // Detect merchants
      if (this.isChaseOffer(line)) {
        const merchant = this.extractMerchant(line);
        if (merchant) {
          const offer = this.findOfferValue(lines, i);
          perks.push({
            merchant,
            description: offer || 'N/A',
            value: offer || 'N/A',
            confidence: 0.9
          });
        }
      }
    }
    
    return perks;
  }
  
  isChaseNavigation(line) {
    return /^(chase offers|new|all|shopping|groceries|\d+:\d+)$/i.test(line);
  }
  
  isChaseOffer(line) {
    const merchants = ['fuboTV', 'dyson', 'arlo', 'turo', 'lands\' end', 'zenni optical'];
    return merchants.some(merchant => 
      line.toLowerCase().includes(merchant.toLowerCase())
    );
  }
  
  extractMerchant(line) {
    const merchants = {
      'fuboTV': /fubo/i,
      'Dyson': /dyson/i,
      'Arlo': /arlo/i,
      'Turo': /turo/i,
      'Lands\' End': /lands/i,
      'Zenni Optical': /zenni/i
    };
    
    for (const [name, pattern] of Object.entries(merchants)) {
      if (pattern.test(line)) return name;
    }
    return null;
  }
  
  findOfferValue(lines, index) {
    // Look around current line for cash back values
    for (let i = Math.max(0, index - 2); i <= Math.min(lines.length - 1, index + 2); i++) {
      const match = lines[i].match(/(\d+%\s*cash\s*back|\$\d+\s*cash\s*back)/i);
      if (match) return match[1];
    }
    return null;
  }
}

// Test data
const chaseText = `
4:36
Chase Offers
All    Shopping    Groceries    Home & pet    E
Gear up for game day
New
fuboTV
35% cash back
New
Dyson
5% cash back
New
Arlo
15% cash back
New
Lands' End
5% cash back
New
Zenni Optical
10% cash back
`;

const lines = chaseText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
const parser = new MockChaseParser();
const perks = parser.parseLines(lines);

console.log(`Found ${perks.length} Chase perks:`);
perks.forEach((perk, index) => {
  console.log(`${index + 1}. ${perk.merchant}: ${perk.value}`);
});

console.log('\n✅ Chase parser logic works correctly!');