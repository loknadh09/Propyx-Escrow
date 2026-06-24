# 🚀 Propyx Quick Reference Card

## Terminal Commands

```bash
# Start Blockchain
cd blockchain && npx hardhat node

# Start Backend
cd backend && npm start

# Start Frontend  
cd frontend && npm run dev

# Run E2E Tests
cd backend && node scripts/e2eTest.js
```

## Important URLs

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:5000 |
| Blockchain RPC | http://127.0.0.1:8545 |
| API Status | http://localhost:5000 |
| Health Check | http://localhost:5000/health |
| Route List | http://localhost:5000/debug/routes |

## API Endpoints

### Auth
- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login user

### Listings
- `GET /api/listing` - Get all listings
- `POST /api/listing` - Create listing

### Escrow
- `GET /api/escrow` - Get all escrows
- `POST /api/escrow/:listingId` - Create escrow
- `POST /api/escrow/:id/deposit` - Deposit funds
- `POST /api/escrow/:id/confirm-buyer` - Buyer confirm
- `POST /api/escrow/:id/confirm-seller` - Seller confirm
- `POST /api/escrow/:id/refund` - Refund

### User
- `GET /api/user/profile` - Get user profile
- `PUT /api/user/profile` - Update profile

## Environment Variables

### Backend
```
MONGODB_URI=mongodb://localhost:27017/propyx
NODE_ENV=development
PORT=5000
JWT_SECRET=your-secret
HARDHAT_RPC=http://127.0.0.1:8545
TX_TIMEOUT_MS=60000
DEBUG_BLOCKCHAIN=false
DEBUG_AUTH=false
```

### Frontend
```
VITE_API_BASE=http://localhost:5000
VITE_ENVIRONMENT=development
```

## Common Error Codes

| Code | Meaning |
|------|---------|
| `MISSING_FIELDS` | Required field missing |
| `INVALID_EMAIL` | Invalid email format |
| `INVALID_WALLET` | Invalid Ethereum address |
| `DUPLICATE_EMAIL` | Email already registered |
| `WEAK_PASSWORD` | Password too weak |
| `NOT_AUTHENTICATED` | User not logged in |
| `FORBIDDEN` | Permission denied |
| `SELLER_NOT_APPROVED` | Seller not approved |
| `DEPLOYMENT_FAILED` | Contract deployment failed |
| `OPERATION_TIMEOUT` | Operation timed out |

## MetaMask Setup

1. Add Network:
   - Name: Hardhat
   - RPC: http://127.0.0.1:8545
   - Chain ID: 31337

2. Import Account:
   - Get private key from Hardhat console
   - Import into MetaMask

## Debug Tips

```bash
# Enable blockchain debugging
DEBUG_BLOCKCHAIN=true npm start

# Enable auth debugging
DEBUG_AUTH=true npm start

# Check running routes
curl http://localhost:5000/debug/routes

# Check backend status
curl http://localhost:5000

# Check health
curl http://localhost:5000/health
```

## File Locations

| Item | Path |
|------|------|
| Smart Contract | `blockchain/contracts/Escrow.sol` |
| Contract ABI | `blockchain/artifacts/contracts/` |
| Blockchain Service | `backend/services/blockchainService.js` |
| Auth Controller | `backend/controllers/authController.js` |
| Error Handler | `backend/middleware/errorHandler.js` |
| Wallet Service | `frontend/src/services/walletService.js` |
| API Service | `frontend/src/services/api.js` |

## Testing

```bash
# Run E2E test
cd backend && node scripts/e2eTest.js

# View test accounts
# Check Hardhat console output
```

## Hardhat Test Accounts

First 3 accounts from `npx hardhat node`:

1. **Account #0** (Admin/Main)
2. **Account #1** (Seller)
3. **Account #2** (Buyer)

All have ~10000 ETH for testing

## Password Reset

```javascript
// In backend code
const bcrypt = require("bcryptjs");
const hash = await bcrypt.hash("newpassword", 10);
// Update user document with hash
```

## Database

```javascript
// Connect to local MongoDB
mongodb://localhost:27017/propyx

// Collections:
// - users
// - listings
// - escrows
// - sellers
```

## Key Features

✅ User Registration & Login
✅ Email + MetaMask Auth
✅ Role-based Access
✅ Smart Contract Escrow
✅ Fund Deposit & Withdrawal
✅ Transaction Confirmation
✅ Error Handling
✅ Debug Logging

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Connection refused | Ensure all services running |
| MetaMask error | Check network settings in MetaMask |
| Contract deploy fail | Verify Hardhat node is running |
| MongoDB error | Start MongoDB or update URI |
| Token expired | Re-login to get new token |
| CORS error | Check VITE_API_BASE matches backend |

## Development Workflow

1. Start blockchain: `npx hardhat node`
2. Start backend: `npm start` in backend/
3. Start frontend: `npm run dev` in frontend/
4. Make changes
5. Test in browser
6. Check console/logs for errors
7. Use error codes to debug

## Performance Tips

- Use `DEBUG_BLOCKCHAIN=false` in production
- Set `TX_TIMEOUT_MS` based on network
- Use connection pooling for MongoDB
- Cache contract ABIs
- Implement request rate limiting
- Use CDN for frontend assets

## Security Notes

⚠️ Change JWT_SECRET in production
⚠️ Restrict CORS to frontend domain
⚠️ Use HTTPS in production
⚠️ Validate all inputs server-side
⚠️ Use environment variables for secrets
⚠️ Never commit .env files
⚠️ Use mainnet/testnet for production

## Resources

- [📖 README.md](README.md) - Full documentation
- [🎯 GETTING_STARTED.md](GETTING_STARTED.md) - Setup guide
- [✅ SETUP_CHECKLIST.md](SETUP_CHECKLIST.md) - Verification
- [📝 IMPROVEMENTS.md](IMPROVEMENTS.md) - What changed

---

**Print this card for quick reference!** 📋
