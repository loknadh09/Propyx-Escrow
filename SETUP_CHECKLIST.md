# ✅ Propyx Setup Checklist

Follow these steps to get Propyx running in your development environment.

## 🔧 Pre-Setup Checklist

- [ ] Node.js 16+ installed (`node --version`)
- [ ] npm installed (`npm --version`)
- [ ] MongoDB running locally OR connection string ready
- [ ] MetaMask browser extension installed
- [ ] Git installed (optional, for version control)

## 📦 Installation Checklist

### 1. Smart Contract Setup (Blockchain)
```bash
cd blockchain
npm install
```
- [ ] No installation errors
- [ ] All dependencies installed

### 2. Backend Setup
```bash
cd backend
npm install
```
- [ ] No installation errors
- [ ] Necessary packages: express, mongoose, ethers, dotenv, bcryptjs, jsonwebtoken

### 3. Frontend Setup
```bash
cd frontend
npm install
```
- [ ] No installation errors
- [ ] React 19+ installed
- [ ] React Router installed
- [ ] Ethers.js installed

## 🔑 Configuration Checklist

### Backend Configuration
Create `backend/.env`:
- [ ] `MONGODB_URI` configured
- [ ] `NODE_ENV=development`
- [ ] `PORT=5000`
- [ ] `JWT_SECRET` set (can be default in dev)
- [ ] `HARDHAT_RPC=http://127.0.0.1:8545`

### Frontend Configuration
Create `frontend/.env`:
- [ ] `VITE_API_BASE=http://localhost:5000`
- [ ] `VITE_ENVIRONMENT=development`

## 🚀 Startup Checklist

### Terminal 1: Start Blockchain
```bash
cd blockchain
npx hardhat node
```
- [ ] Outputs "Started HTTP and WebSocket JSON-RPC server"
- [ ] Shows 20 accounts with addresses
- [ ] Running on http://127.0.0.1:8545

### Terminal 2: Start Backend
```bash
cd backend
npm start
```
- [ ] No errors in startup
- [ ] Shows "✅ Propyx Backend Running"
- [ ] Shows "📦 Connected to MongoDB"
- [ ] Running on http://localhost:5000

### Terminal 3: Start Frontend
```bash
cd frontend
npm run dev
```
- [ ] No compilation errors
- [ ] Shows local URL (typically http://localhost:5173)
- [ ] Shows network access info

## 🧪 Testing Checklist

### Manual Testing
- [ ] Visit http://localhost:5173
- [ ] Register as Seller with email
- [ ] Register as Buyer with MetaMask
- [ ] Login with email/password
- [ ] Login with MetaMask
- [ ] Create listing (seller)
- [ ] Request purchase (buyer)
- [ ] Deposit funds (buyer)
- [ ] Confirm transaction (both parties)

### Automated Testing
```bash
cd backend
node scripts/e2eTest.js
```
- [ ] All test steps complete successfully
- [ ] No errors in blockchain transactions
- [ ] Escrow state transitions correctly

## 🌐 MetaMask Setup for Testing

- [ ] MetaMask installed in browser
- [ ] Add Hardhat network:
  - [ ] Network name: "Hardhat"
  - [ ] RPC: http://127.0.0.1:8545
  - [ ] Chain ID: 31337
  - [ ] Currency: ETH
- [ ] Import test account:
  - [ ] Copy first account private key from Hardhat console
  - [ ] Import into MetaMask
- [ ] Account has test ETH (should show balance)

## 🐛 Troubleshooting Checklist

If you encounter issues:

### Blockchain Issues
- [ ] Hardhat node is running (check Terminal 1)
- [ ] Correct RPC URL in backend .env
- [ ] Contracts compiled (`blockchain/artifacts/` exists)
- [ ] Chain ID set to 31337 in MetaMask

### Backend Issues
- [ ] MongoDB is running (`mongod`)
- [ ] Port 5000 is not in use
- [ ] All dependencies installed (`npm install`)
- [ ] Environment variables in .env match .env.example
- [ ] No syntax errors in code

### Frontend Issues
- [ ] Backend running on http://localhost:5000
- [ ] VITE_API_BASE set correctly
- [ ] MetaMask installed and enabled
- [ ] No network/CORS errors in browser console

### MetaMask Issues
- [ ] Connected to Hardhat network
- [ ] Account has sufficient test ETH
- [ ] Try disconnecting and reconnecting
- [ ] Check browser console for errors

## 📝 Common Commands

### Backend
```bash
npm start              # Start backend
npm run dev           # Start with auto-reload
npm test              # Run tests (if configured)
```

### Frontend
```bash
npm run dev           # Start dev server
npm run build         # Build for production
npm run preview       # Preview production build
npm run lint          # Run ESLint
```

### Blockchain
```bash
npx hardhat compile   # Compile contracts
npx hardhat node      # Start local node
npx hardhat test      # Run contract tests
```

## 📊 Status Verification

To verify everything is working:

1. **Blockchain**: http://127.0.0.1:8545 (check Hardhat console)
2. **Backend**: http://localhost:5000 (should show status)
3. **Frontend**: http://localhost:5173 (should load app)
4. **Database**: MongoDB running locally

## 🎯 Next Steps After Setup

1. [ ] Read IMPROVEMENTS.md for feature overview
2. [ ] Read README.md for architecture overview
3. [ ] Explore smart contract in blockchain/contracts/
4. [ ] Review API documentation in README
5. [ ] Run end-to-end tests
6. [ ] Start developing features

## 🆘 Getting Help

- Check IMPROVEMENTS.md for what was fixed
- Check README.md troubleshooting section
- Check error messages and error codes
- Enable DEBUG_BLOCKCHAIN=true for more logs
- Check browser console for frontend errors
- Check backend logs for API errors

---

**Last Updated**: April 2026
**Status**: Ready to use ✅
