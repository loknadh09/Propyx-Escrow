const fetch = global.fetch || require('node-fetch');

const API = 'http://localhost:5000/api';

async function request(method, path, body, token) {
  const opts = { method, headers: {} };
  if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  if (token) opts.headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API}${path}`, opts);
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch (e) { data = { text }; }
  console.log(`${method} ${path} -> ${res.status}`, data);
  return { status: res.status, data };
}

async function post(path, body, token) { return (await request('POST', path, body, token)); }
async function put(path, body, token) { return (await request('PUT', path, body, token)); }
async function get(path, token) { return (await request('GET', path, undefined, token)); }

async function run() {
  console.log('E2E test start');

  // 1. Register admin
  const adminReg = await post('/auth/register', { name: 'AdminUser', email: 'admin@example.com', password: 'pass123', role: 'admin' });
  console.log('adminReg', adminReg.data.error || 'ok');

  // 2. Register seller
  const sellerReg = await post('/auth/register', { name: 'SellerUser', email: 'seller@example.com', password: 'pass123', role: 'seller', walletAddress: '0x' + 'a'.repeat(40) });
  console.log('sellerReg', sellerReg.data.error || 'ok');

  // 3. Register buyer
  const buyerReg = await post('/auth/register', { name: 'BuyerUser', email: 'buyer@example.com', password: 'pass123', role: 'buyer', walletAddress: '0x' + 'b'.repeat(40) });
  console.log('buyerReg', buyerReg.data.error || 'ok');

  // Login admin
  const adminLogin = await post('/auth/login', { email: 'admin@example.com', password: 'pass123' });
  const adminToken = adminLogin.data.token;
  console.log('adminLogin', adminLogin.data.error || 'ok');

  // Login seller
  const sellerLogin = await post('/auth/login', { email: 'seller@example.com', password: 'pass123' });
  const sellerToken = sellerLogin.data.token;
  console.log('sellerLogin', sellerLogin.data.error || 'ok');

  // Seller creates profile (authenticated)
  const sellerProfile = await post('/seller/register', { name: 'SellerUser', email: 'seller@example.com', walletAddress: '0x' + 'a'.repeat(40) }, sellerToken);
  console.log('sellerProfile', sellerProfile.data.error || 'ok');

  // Admin lists sellers and approves
  const sellers = await get('/seller', adminToken);
  console.log('sellers count', sellers.data.sellers?.length || 0);
  const firstSeller = sellers.data.sellers && sellers.data.sellers[0];
  if (!firstSeller) { console.log('No seller to approve'); return; }
  const approve = await put(`/seller/approve/${firstSeller._id}`, {}, adminToken);
  console.log('approve', approve.data.error || 'ok');

  // Seller creates listing
  const listing = await post('/escrow/create', { propertyDescription: 'Nice House', transactionAmount: 1, deadlineDurationDays: 7 }, sellerToken);
  console.log('listing', listing.data.error || 'ok');

  // Buyer requests buy
  // login buyer
  const buyerLogin = await post('/auth/login', { email: 'buyer@example.com', password: 'pass123' });
  const buyerToken = buyerLogin.data.token;
  const listings = listing.data.listing || (await get('/escrow', buyerToken));
  // find listing id: our create returns listing; fetch its id
  const createdListingId = listing.data.listing?._id;
  if (!createdListingId) { console.log('No listing created'); return; }
  const request = await post(`/escrow/request/${createdListingId}`, {}, buyerToken);
  console.log('requestBuy', request.data.error || 'ok');

  // After request, fetch escrows and attempt deposit
  const escrows = await get('/escrow', buyerToken);
  const createdEscrow = escrows.data.escrows && escrows.data.escrows[0];
  if (!createdEscrow) { console.log('No escrow created'); return; }

  console.log('Attempting deposit (may require local hardhat node)');
  const depositRes = await post(`/escrow/deposit/${createdEscrow._id}`, {}, buyerToken);
  console.log('deposit', depositRes.data.error || depositRes.data.txHash || 'ok');

  console.log('E2E test finished');
}

run().catch(err=>{ console.error('E2E error', err); process.exit(1); });
