// Test the fixed cleanOCRText function

function cleanOCRText(text) {
  return text
    .replace(/=/g, '') // Remove OCR artifacts like "earn = $10"
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/AF$/, '') // Remove trailing "AF"
    .replace(/\$\d+\.\d+$/, '') // Remove truncated dollar amounts at the end
    .replace(/\$$/, '') // Remove trailing dollar signs
    .replace(/\w+\+\d+/g, '') // Remove OCR artifacts like "Walmart+2" (plus sign required)
    .trim();
}

// Test cases
const testCases = [
  "Soo [Earn 20% back on purchases",
  "of $30+ total.",
  "Walmart+2 something",
  "Target+5 store",
  "Get $30 back",
  "Earn 2,500 points"
];

console.log('Testing fixed cleanOCRText:');
testCases.forEach(text => {
  const cleaned = cleanOCRText(text);
  console.log(`"${text}" → "${cleaned}"`);
});

// Test the specific Shake Shack case
const shakeShackParts = ["Soo [Earn 20% back on purchases", "of $30+ total."];
const combined = shakeShackParts.map(part => cleanOCRText(part)).join(' ');
console.log(`\nShake Shack combined: "${combined}"`);

if (combined.includes('20%')) {
  console.log('✅ SUCCESS: 20% preserved in Shake Shack description');
} else {
  console.log('❌ FAILED: 20% still missing');
}