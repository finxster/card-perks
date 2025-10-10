// Test and fix the extractValue function

function extractValue(description) {
  console.log(`Extracting value from: "${description}"`);
  
  // Try percentage first (highest priority)
  const percentMatch = description.match(/(\d+)%/);
  if (percentMatch) {
    console.log(`  Found percentage: ${percentMatch[1]}%`);
    return percentMatch[1] + '%';
  }
  
  // Try points (specific pattern)
  const pointsMatch = description.match(/(\d{1,3}(?:,\d{3})*)\s*(?:membership\s*rewards\s*)?points/i);
  if (pointsMatch) {
    console.log(`  Found points: ${pointsMatch[1]} points`);
    return pointsMatch[1] + ' points';
  }
  
  // Try dollar amount (last)
  const dollarMatch = description.match(/\$(\d+)/);
  if (dollarMatch) {
    console.log(`  Found dollar amount: $${dollarMatch[1]}`);
    return dollarMatch[1];
  }
  
  console.log(`  No value found`);
  return 'Unknown';
}

// Test cases
const testDescriptions = [
  "Get $30 back on purchases of $150+ total",
  "Soo [Earn 20% back on purchases of $30+ total.",
  "Earn 2,500 Membership Rewards points on purchases of $5+ total.",
  "Earn $50 back on purchases of $98+ total."
];

console.log('Testing extractValue function:');
testDescriptions.forEach((desc, i) => {
  console.log(`\nTest ${i + 1}:`);
  const value = extractValue(desc);
  console.log(`Result: "${value}"`);
});

console.log('\n=== Expected vs Actual ===');
const expectations = [
  { desc: testDescriptions[0], expected: '30' },
  { desc: testDescriptions[1], expected: '20%' },
  { desc: testDescriptions[2], expected: '2,500 points' },
  { desc: testDescriptions[3], expected: '50' }
];

expectations.forEach((test, i) => {
  const actual = extractValue(test.desc);
  const match = actual === test.expected;
  console.log(`${i + 1}. ${match ? '✅' : '❌'} Expected: "${test.expected}", Got: "${actual}"`);
});