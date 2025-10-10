// Quick script to update existing cards with issuer information
import { storage } from './server/storage.js';

// Function to determine issuer from card name
function determineIssuer(cardName) {
  const name = cardName.toLowerCase();
  
  if (name.includes('chase') || name.includes('sapphire') || name.includes('freedom') || name.includes('ink')) {
    return 'Chase';
  }
  if (name.includes('amex') || name.includes('american express') || name.includes('platinum') || name.includes('gold') || name.includes('green')) {
    return 'American Express';
  }
  if (name.includes('citi') || name.includes('citibank') || name.includes('prestige') || name.includes('premier')) {
    return 'Citi';
  }
  if (name.includes('capital one') || name.includes('venture') || name.includes('quicksilver') || name.includes('savor')) {
    return 'Capital One';
  }
  if (name.includes('discover') || name.includes('it card')) {
    return 'Discover';
  }
  if (name.includes('wells fargo') || name.includes('propel') || name.includes('active cash')) {
    return 'Wells Fargo';
  }
  if (name.includes('bank of america') || name.includes('travel rewards') || name.includes('cash rewards')) {
    return 'Bank of America';
  }
  
  // Default fallback
  return 'Other';
}

async function updateCardIssuers() {
  try {
    console.log('📋 Updating existing cards with issuer information...');
    
    // Get all cards
    const cards = await storage.getAllCards();
    console.log(`Found ${cards.length} cards to update`);
    
    for (const card of cards) {
      const issuer = determineIssuer(card.name);
      console.log(`Updating "${card.name}" → issuer: ${issuer}`);
      
      // Update the card with issuer
      await storage.updateCard(card.id, { issuer });
    }
    
    console.log('✅ All cards updated successfully!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error updating cards:', error);
    process.exit(1);
  }
}

updateCardIssuers();