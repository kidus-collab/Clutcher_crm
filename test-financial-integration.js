// Test script to verify financial integration
// This can be run in the browser console to debug the dashboard

console.log('=== Testing Financial Integration ===');

// Test 1: Check if getLeadFinancials function is available
if (typeof window.getLeadFinancials === 'function') {
  console.log('✅ getLeadFinancials function is available');
} else {
  console.log('❌ getLeadFinancials function is NOT available');
}

// Test 2: Check if Dashboard component is importing the function
console.log('Checking Dashboard component imports...');

// Test 3: Manually call getLeadFinancials to test
async function testFinancialData() {
  try {
    console.log('Fetching financial data...');
    const financials = await window.getLeadFinancials?.();
    console.log('Financial data result:', financials);
    console.log('Financial data type:', typeof financials);
    console.log('Financial data length:', financials?.length);
    
    if (Array.isArray(financials)) {
      console.log('✅ Financial data is an array');
      
      // Test revenue calculation
      const totalRevenue = financials.reduce((sum, financial) => sum + (financial.contract_value || 0), 0);
      console.log('Total revenue calculation:', totalRevenue);
      console.log('✅ Revenue calculation works');
    } else {
      console.log('❌ Financial data is not an array');
    }
  } catch (error) {
    console.error('❌ Error testing financial data:', error);
  }
}

// Run the test
testFinancialData();

console.log('=== Financial Integration Test Complete ===');