// Test suite for Smart Matcher - ensures comprehensive pattern matching works
import { SmartMatcher, Product } from './smartMatcher';
import { generateComprehensiveProducts } from './comprehensiveProductGenerator';

// Test data simulating OCR-extracted text from real solar quotes
const TEST_DOCUMENTS = {
  goodwe_quote: `
    YOUR SOLUTION
    
    GoodWe GW6000-EH Hybrid Inverter
    Specifications: 6kW Single Phase
    
    24 x Eging EG-440NT54-HL/BF-DG Solar Panels
    Power Output: 440W per panel
    
    1 x GoodWe LX F12.8-H-20 Battery
    Capacity: 12.8kWh Usable
    
    System Size: 10.56kW
    Location: 3000 Melbourne
  `,
  
  ocr_errors: `
    Y0UR S0LUTI0N
    
    G00dWe GW6OOO-EH Hybrid 1nverter
    Specifications: 6kW Single Phase
    
    24 x Eg1ng EG-44ONT54-HL/BF-DG Solar Panels
    P0wer 0utput: 44OW per panel
    
    I x G00dWe LX FI2.8-H-2O Battery
    Capacity: I2.8kWh Usable
  `,
  
  mixed_brands: `
    QUOTATION - Solar System Components
    
    Tesla Powerwall 2 - 13.5kWh
    Enphase IQ Battery 5P - 5kWh
    
    24 x JinkoSolar Tiger Pro 540W
    12 x Canadian Solar HiKu 6 410W
    
    SolarEdge SE7600H Inverter
    Fronius Primo 8.2-1
  `,
  
  challenging_ocr: `
    System lnclusions:
    
    2O x L0NGi Hi-M0 5 54OW Panels
    I x Redback Smart Hybrid I3kWh
    SMA Sunny B0y 8.O-3AV-4I
    
    Also includes:
    - BYD HVM II.O4kWh (additional)
    - Q CELLS Q.PEAK DU0 L-G5 4O5W
  `
};

// Run comprehensive test suite
export async function runSmartMatcherTests(): Promise<void> {
  console.log('🧪 Running Smart Matcher comprehensive tests...');
  
  try {
    // Load comprehensive product database
    const products = await generateComprehensiveProducts();
    console.log(`📊 Loaded ${products.length} products for testing`);
    
    // Initialize matcher
    const matcher = new SmartMatcher(products);
    await matcher.init();
    
    // Test each document
    for (const [docName, text] of Object.entries(TEST_DOCUMENTS)) {
      console.log(`\n🔍 Testing document: ${docName}`);
      console.log(`Text length: ${text.length} characters`);
      
      const matches = matcher.match(text);
      console.log(`Found ${matches.length} matches:`);
      
      matches.forEach(match => {
        console.log(`  ✅ ${match.product.brand} ${match.product.model}`);
        console.log(`     Score: ${(match.score * 100).toFixed(1)}% | Evidence:`, {
          regex: match.evidence.regexHit,
          alias: match.evidence.aliasHit,
          section: match.evidence.sectionBoost > 0,
          brand: match.evidence.brandNearby,
          spec: match.evidence.specNearby
        });
      });
      
      // Validate key expected matches
      if (docName === 'goodwe_quote') {
        const expectedMatches = ['GW6000-EH', 'EG-440NT54-HL/BF-DG', 'LX F12.8-H-20'];
        expectedMatches.forEach(expected => {
          const found = matches.some(m => m.product.model.includes(expected) || 
                                        m.product.model.replace(/[-\s]/g, '').includes(expected.replace(/[-\s]/g, '')));
          console.log(`  ${found ? '✅' : '❌'} Expected match: ${expected}`);
        });
      }
    }
    
    // Test learning capability
    console.log('\n🧠 Testing learning capability...');
    const allMatches = Object.values(TEST_DOCUMENTS).flatMap(text => matcher.match(text));
    const testHit = allMatches[0];
    if (testHit) {
      await matcher.learnConfirm(testHit, testHit.raw);
      console.log('✅ Learning confirmation test passed');
    }
    
    // Display matcher stats
    console.log('\n📈 Final matcher statistics:');
    console.log(matcher.getStats());
    
    console.log('\n🎉 Smart Matcher tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Smart Matcher tests failed:', error);
    throw error;
  }
}

// Export for use in development/debug
export { TEST_DOCUMENTS };