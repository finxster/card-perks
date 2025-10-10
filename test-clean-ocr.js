// Test the fixed cleanOCRText function

function cleanOCRText(text) {
  return text
    .replace(/=/g, '') // Remove OCR artifacts like "earn = $10"
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/AF$/, '') // Remove trailing "AF"
    .replace(/\$\d+\.\d+$/, '') // Remove truncated dollar amounts at the end
    .replace(/\$$/, '') // Remove trailing dollar signs
    .replace(/\s+\w+\d+/g, '') // Remove OCR artifacts like "Walmart+2"
    .trim();
}

// Test the problematic Shake Shack text
const testTexts = [
  "Soo [Earn 20% back on purchases",
  "of $30+ total.",
  "Get $30 back on purchases of",
  "$150+ total",
  "Earn 2,500 Membership Rewards",
  "points on purchases of $5+ total.",
  "Earn $50 back on purchases of",
  "$98+ total."
];

console.log('Testing cleanOCRText function:');
testTexts.forEach(text => {
  const cleaned = cleanOCRText(text);
  console.log(`"${text}" → "${cleaned}"`);
});

// Test the complete Shake Shack description
const shakeShackParts = ["Soo [Earn 20% back on purchases", "of $30+ total."];
const combined = shakeShackParts.map(part => cleanOCRText(part)).join(' ');
console.log(`\nShake Shack combined: "${combined}"`);

if (combined.includes('20%')) {
  console.log('✅ SUCCESS: 20% preserved in Shake Shack description');
} else {
  console.log('❌ FAILED: 20% still missing');
}