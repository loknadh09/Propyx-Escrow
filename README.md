# Propyx Project — Complete Setup & Development Guide

A blockchain-based property transaction escrow system with MetaMask wallet integration.

## 🚀 Quick Start (Development)

### Prerequisites
- Node.js 16+ installed
- MongoDB running locally or MongoDB URI configured
- MetaMask browser extension installed for testing

### Step 1: Start Hardhat Local Blockchain

```bash
cd blockchain
npm install
npx hardhat node
```

This starts a local Ethereum node with unlocked test accounts at `http://127.0.0.1:8545`

**Output should show:**
```
Started HTTP and WebSocket JSON-RPC server at http://127.0.0.1:8545/
Accounts (20 available):
Account #0: 0x...
Account #1: 0x...
...
```

### Step 2: Configure Backend Environment

Create `backend/.env` with:

```
MONGODB_URI=mongodb://localhost:27017/propyx
NODE_ENV=development
PORT=5000
JWT_SECRET=your-secure-jwt-secret-change-in-production
HARDHAT_RPC=http://127.0.0.1:8545
TX_TIMEOUT_MS=60000
DEBUG_BLOCKCHAIN=false
DEBUG_AUTH=false
```

### Step 3: Start Backend API

```bash
cd backend
npm install
npm start
# or for development with auto-reload:
npm run dev
```

**Expected output:**
```
🚀 Propyx Backend running on http://localhost:5000
📦 Connected to MongoDB
```

### Step 4: Configure Frontend Environment

Create `frontend/.env` with:

```
VITE_API_BASE=http://localhost:5000
VITE_ENVIRONMENT=development
```

### Step 5: Start Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend will typically run at `http://localhost:5173`

## 📋 Testing the Application

### End-to-End Test

Run automated E2E tests:

```bash
cd backend
node scripts/e2eTest.js
```

This will:
1. Register admin/seller/buyer accounts
2. Approve the seller
3. Create a property listing
4. Initiate purchase request
5. Execute deposit transaction
6. Confirm transaction states

### Manual Testing with MetaMask

1. **Connect MetaMask to Hardhat**:
   - Open MetaMask
   - Networks > Add Network
   - Network name: "Hardhat"
   - RPC URL: `http://127.0.0.1:8545`
   - Chain ID: `31337`
   - Currency: ETH

2. **Import Test Account**:
   - Copy first account private key from Hardhat console
   - MetaMask > Import Account > Paste private key

3. **Register & Login**:
   - Register as Seller/Buyer
   - Connect MetaMask during registration
   - Login to access dashboard

## 🔧 Environment Variables

### Backend (`.env` or `.env.example`)

| Variable | Default | Description |
|----------|---------|-------------|
| `MONGODB_URI` | mongodb://localhost:27017/propyx | MongoDB connection string |
| `NODE_ENV` | development | Environment (development/production) |
| `PORT` | 5000 | Backend server port |
| `JWT_SECRET` | devsecret | JWT signing secret (⚠️ change in production) |
| `HARDHAT_RPC` | http://127.0.0.1:8545 | Blockchain RPC endpoint |
| `TX_TIMEOUT_MS` | 60000 | Transaction timeout in milliseconds |
| `DEBUG_BLOCKCHAIN` | false | Enable blockchain debug logging |
| `DEBUG_AUTH` | false | Enable auth debug logging |

### Frontend (`.env` or `.env.example`)

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_BASE` | http://localhost:5000 | Backend API URL |
| `VITE_ENVIRONMENT` | development | Environment type |
| `VITE_DEBUG_MODE` | false | Enable frontend debug mode |

## 🐛 Troubleshooting

### "No accounts available on blockchain provider"
**Solution**: Ensure Hardhat node is running with `npx hardhat node`

### "Cannot connect to MongoDB"
**Solution**: 
- Start MongoDB: `mongod`
- Or update `MONGODB_URI` in `.env`

### "Contract deployment failed"
**Solution**: 
- Check Hardhat is running with unlocked accounts
- Verify `HARDHAT_RPC` in `.env` points to running node

### MetaMask Connection Issues
**Solution**:
- Hardhat network not configured: Add network manually (see Manual Testing)
- Wrong Chain ID: Should be `31337` for Hardhat local
- Switch to Hardhat network before registering

### "Invalid token" or "Token expired"
**Solution**: 
- Clear browser localStorage: `localStorage.clear()`
- Re-login to get new token

### Backend not receiving requests from frontend
**Solution**:
- Check frontend API URL: `echo $VITE_API_BASE`
- Verify backend is running on correct port
- Check CORS is not blocked (should be open in dev)
- Browser console may show actual error

## 📁 Project Structure

```
Propyx_Project1/
├── blockchain/               # Smart contracts & Hardhat config
│   ├── contracts/
│   │   └── Escrow.sol       # Main escrow smart contract
│   ├── scripts/
│   │   ├── deploy.js        # Contract deployment
│   │   └── interact.js      # Contract interaction
│   └── hardhat.config.cjs
│
├── backend/                  # Express.js API server
│   ├── controllers/          # Business logic
│   │   ├── authController.js
│   │   ├── escrowController.js
│   │   ├── sellerController.js
│   │   └── userController.js
│   ├── middleware/           # Express middleware
│   │   ├── auth.js          # JWT authentication
│   │   ├── validation.js    # Request validation
│   │   └── errorHandler.js  # Global error handling
│   ├── models/              # MongoDB schemas
│   ├── routes/              # API route definitions
│   ├── services/            # Business services
│   │   └── blockchainService.js  # Blockchain operations
│   ├── scripts/
│   │   └── e2eTest.js       # End-to-end test
│   ├── config/
│   │   └── db.js            # Database configuration
│   └── index.js             # Express app entry
│
├── frontend/                # React + Vite
│   ├── src/
│   │   ├── pages/           # Page components
│   │   ├── services/        # API & wallet services
│   │   ├── auth/            # Auth context
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── vite.config.js
│
└── README.md
```

## 🔐 Security Notes

### Development Only ⚠️
- JWT_SECRET is hardcoded default (`devsecret`)
- CORS allows all origins
- MongoDB has no authentication
- Test accounts are unlocked on Hardhat

### Production Deployment ⚠️
- Set strong `JWT_SECRET`
- Restrict CORS to frontend domain
- Enable MongoDB authentication
- Use mainnet or testnet (never local Hardhat)
- Use environment variables for sensitive data
- Enable HTTPS
- Validate all inputs server-side

## 🧪 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Listings
- `GET /api/listing` - Get all listings
- `POST /api/listing` - Create listing (seller only)

### Escrow
- `POST /api/escrow/:listingId` - Request purchase
- `GET /api/escrow` - Get all escrows
- `POST /api/escrow/:id/deposit` - Deposit funds
- `POST /api/escrow/:id/confirm-buyer` - Buyer confirmation
- `POST /api/escrow/:id/confirm-seller` - Seller confirmation
- `POST /api/escrow/:id/refund` - Process refund

## 🎯 Key Features

✅ **MetaMask Integration**: Connect and authenticate with Web3 wallets
✅ **Smart Contract Escrow**: Automated property transaction escrow
✅ **Multi-role Support**: Admin, Seller, Buyer roles with permissions
✅ **Comprehensive Error Handling**: Detailed error messages with error codes
✅ **Development Tools**: E2E testing, route debugging, blockchain debug logging
✅ **Request Validation**: Middleware for input validation
✅ **JWT Authentication**: Secure token-based auth

## 📚 Additional Resources

- [Hardhat Documentation](https://hardhat.org/docs)
- [Ethers.js Documentation](https://docs.ethers.org/v6/)
- [MetaMask Developer Docs](https://docs.metamask.io/)
- [Solidity Documentation](https://docs.soliditylang.org/)

## 📝 Files of Interest

**Key Backend Files**:
- `backend/services/blockchainService.js` - Blockchain contract interactions
- `backend/controllers/escrowController.js` - Escrow business logic
- `backend/scripts/e2eTest.js` - Complete test flow
- `backend/middleware/errorHandler.js` - Centralized error handling

**Smart Contracts**:
- `blockchain/contracts/Escrow.sol` - Escrow smart contract
- `blockchain/artifacts/` - Compiled contract artifacts

**Frontend Key Files**:
- `frontend/src/services/walletService.js` - MetaMask integration
- `frontend/src/services/api.js` - API client
- `frontend/src/auth/AuthProvider.jsx` - Auth state management

## 🤝 Contributing

When making changes:
1. Follow existing code style
2. Add error handling with descriptive messages
3. Update relevant .env.example files
4. Test with E2E script before committing
5. Keep error codes consistent

---

**Last Updated**: April 2026
**Status**: Development Ready ✅
