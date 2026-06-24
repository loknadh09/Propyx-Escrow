const API_BASE = 'http://localhost:5000';

async function testBuyerFlow() {
  try {
    console.log('🔄 Testing Buyer Flow...\n');

    // 1. Register a test buyer
    console.log('1. Registering test buyer...');
    const registerResponse = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Buyer',
        email: 'buyer@test.com',
        password: 'password123',
        role: 'buyer',
        walletAddress: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8'
      })
    });
    
    const registerData = await registerResponse.json();
    if (!registerResponse.ok) {
      throw new Error(registerData.error || 'Registration failed');
    }
    
    const buyerToken = registerData.token;
    const buyerUser = registerData.user;
    console.log('✅ Buyer registered:', buyerUser.email);
    console.log('📝 Wallet:', buyerUser.walletAddress);

    // 2. Get available listings
    console.log('\n2. Fetching available listings...');
    const listingsResponse = await fetch(`${API_BASE}/api/listing`, {
      headers: { Authorization: `Bearer ${buyerToken}` }
    });
    
    const listingsData = await listingsResponse.json();
    const listings = listingsData.listings;
    console.log(`📋 Found ${listings.length} listings:`);
    listings.forEach(listing => {
      console.log(`  - ${listing.propertyDescription} (${listing.transactionAmount} ETH) - Status: ${listing.status}`);
    });

    // 3. Get buyer's escrows
    console.log('\n3. Fetching buyer escrows...');
    const escrowsResponse = await fetch(`${API_BASE}/api/escrow`, {
      headers: { Authorization: `Bearer ${buyerToken}` }
    });
    
    const escrowsData = await escrowsResponse.json();
    const escrows = escrowsData.escrows;
    console.log(`💼 Found ${escrows.length} total escrows`);
    
    const buyerEscrows = escrows.filter(e => e.buyerAddress === buyerUser.walletAddress);
    console.log(`🎯 ${buyerEscrows.length} escrows belong to this buyer:`);
    buyerEscrows.forEach(escrow => {
      console.log(`  - ${escrow.propertyDescription} - Status: ${escrow.status} - Deposited: ${escrow.isDeposited}`);
    });

    console.log('\n✅ Buyer flow test completed successfully!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testBuyerFlow();
