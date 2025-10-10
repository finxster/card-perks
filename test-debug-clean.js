// Debug each step of cleanOCRText

function debugCleanOCRText(text) {
  console.log(`Starting with: "${text}"`);
  
  let result = text;
  
  result = result.replace(/=/g, '');
  console.log(`After removing =: "${result}"`);
  
  result = result.replace(/\s+/g, ' ');
  console.log(`After normalizing whitespace: "${result}"`);
  
  result = result.replace(/AF$/, '');
  console.log(`After removing trailing AF: "${result}"`);
  
  result = result.replace(/\$\d+\.\d+$/, '');
  console.log(`After removing truncated dollars: "${result}"`);
  
  result = result.replace(/\$$/, '');
  console.log(`After removing trailing $: "${result}"`);
  
  result = result.replace(/\s+\w+\d+/g, '');
  console.log(`After removing OCR artifacts like "Walmart+2": "${result}"`);
  
  result = result.trim();
  console.log(`Final result: "${result}"`);
  
  return result;
}

// Test the problematic text
console.log('=== Debugging "Soo [Earn 20% back on purchases" ===');
debugCleanOCRText("Soo [Earn 20% back on purchases");

console.log('\n=== Testing each regex individually ===');
const testText = "Soo [Earn 20% back on purchases";

console.log('Original:', testText);
console.log('Remove =:', testText.replace(/=/g, ''));
console.log('Normalize whitespace:', testText.replace(/\s+/g, ' '));
console.log('Remove trailing AF:', testText.replace(/AF$/, ''));
console.log('Remove truncated dollars:', testText.replace(/\$\d+\.\d+$/, ''));
console.log('Remove trailing $:', testText.replace(/\$$/, ''));
console.log('Remove OCR artifacts:', testText.replace(/\s+\w+\d+/g, ''));

// Let's check the OCR artifacts pattern more carefully
console.log('\n=== Testing OCR artifacts regex ===');
const ocrPattern = /\s+\w+\d+/g;
const matches = testText.match(ocrPattern);
console.log('OCR pattern matches:', matches);

// Maybe it's matching " 20" in the middle?
console.log('Does " 20%" match /\\s+\\w+\\d+/?', /\s+\w+\d+/.test(' 20%'));
console.log('Does " 20%" match /\\s+\\w+\\d+/g?', ' 20%'.match(/\s+\w+\d+/g));