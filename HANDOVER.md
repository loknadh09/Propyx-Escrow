Project handover — Propyx

Summary
- Implemented role-based auth (admin/seller/buyer), seller verification, listing creation, buyer request flow that deploys an `Escrow` contract, and deposit/confirm/refund flows proxied through the backend.
- Backend uses JWT auth and MongoDB (Mongoose). Blockchain interactions use `ethers` and Hardhat artifacts.

Changed/Added files (high level)
- backend/
  - `services/blockchainService.js` — deploy, deposit, confirm, refund helpers; Hardhat RPC integration and test impersonation fallback.
  - `controllers/escrowController.js` — listing creation, buyer request => deploy, deposit endpoint, confirmations, refund.
  - `scripts/e2eTest.js` — automated end-to-end script exercising full flow.
  - `scripts/listAccounts.js` — helper to list provider accounts.
- blockchain/
  - `contracts/Escrow.sol` — Escrow contract.
  - `compile.js` — solc-based fallback compiler (used to regenerate artifact during development).
  - `artifacts/contracts/Escrow.sol/Escrow.json` — regenerated artifact matching `Escrow.sol`.
- README.md — replaced with concise run & test instructions.

How to run locally (quick)
1) Start Hardhat node (unlocked accounts):

```bash
cd blockchain
npx hardhat node
```

2) Start backend API (in another terminal):

```bash
cd backend
node index.js
```

3) Start frontend (optional):

```bash
cd frontend
npm install
npm run dev
```

4) Run end-to-end test (backend):

```bash
cd backend
node scripts/e2eTest.js
```

Notes and troubleshooting
- Ensure `HARDHAT_RPC` is reachable (default: `http://127.0.0.1:8545`).
- To enable extra blockchain debug logs, set `DEBUG_BLOCKCHAIN=1` before running the backend.
- The E2E script assumes a local Hardhat node with unlocked accounts; if using a remote node, adjust `backend/services/blockchainService.js` accordingly.

Suggested next tasks (optional)
- Frontend wallet onboarding UI: allow users to connect a real wallet (MetaMask) and sign actions client-side rather than proxying through the backend.
- Add unit/integration tests for controllers and blockchain service.
- Add CI job to run E2E with a headless Hardhat node.
- Commit + open PR; add contribution notes.

Contact
- If you want me to commit these changes and create a PR or further polish UI, tell me which branch name to use and whether to include tests.
