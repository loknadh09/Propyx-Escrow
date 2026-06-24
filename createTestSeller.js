const API_BASE = 'http://localhost:5000';

async function createTestSellerAndProperty() {
  try {
    console.log('🔄 Creating Test Seller and Property...\n');

    // 1. Register a test seller
    console.log('1. Registering test seller...');
    const registerResponse = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Seller',
        email: 'seller@test.com',
        password: 'password123',
        role: 'seller',
        walletAddress: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC'
      })
    });
    
    const registerData = await registerResponse.json();
    if (!registerResponse.ok) {
      throw new Error(registerData.error || 'Seller registration failed');
    }
    
    const sellerToken = registerData.token;
    const sellerUser = registerData.user;
    console.log('✅ Seller registered:', sellerUser.email);

    // 2. Register seller profile
    console.log('2. Registering seller profile...');
    const profileResponse = await fetch(`${API_BASE}/api/seller/register`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sellerToken}`
      },
      body: JSON.stringify({
        name: 'Test Seller',
        email: 'seller@test.com',
        walletAddress: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC'
      })
    });
    
    const profileData = await profileResponse.json();
    if (!profileResponse.ok) {
      throw new Error(profileData.error || 'Seller profile registration failed');
    }
    
    console.log('✅ Seller profile registered, awaiting admin approval');

    // 3. Admin approves seller (using admin token from e2e test)
    console.log('3. Admin approving seller...');
    const adminToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5Y2JmYmZkNDA3ZTU4ZmE1YzU0MWVmIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzI1MjMxMzA5LCJleHAiOjE3MjU4MzYxMDl9.example'; // You'll need to get real admin token
    
    // Skip admin approval for now - let's just show the property creation works
    console.log('⚠️  Skipping admin approval - you need to approve this seller in admin panel');

    console.log('\n✅ Test seller created successfully!');
    console.log('📧 Email: seller@test.com');
    console.log('🔑 Password: password123');
    console.log('💼 Wallet: 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC');
    console.log('\n👉 Next steps:');
    console.log('1. Login as admin and approve this seller');
    console.log('2. Login as seller and create a property listing');
    console.log('3. Login as buyer and purchase the property');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

createTestSellerAndProperty();
