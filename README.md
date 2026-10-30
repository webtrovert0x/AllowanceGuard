<p align="center">
  <img src="./logo.png" alt="AllowanceGuard Logo" width="160" height="160" style="border-radius: 24px;" />
</p>

<h1 align="center">AllowanceGuard</h1>
<p align="center">
  <strong>On-Chain Token Approval Auditing & Risk Mitigation Protocol on BOT Chain</strong>
</p>

<p align="center">
  <a href="./WHITEPAPER.md"><strong>Read the Whitepaper »</strong></a>
</p>

---

## ⚡ Overview

**AllowanceGuard** is a Web3 security protocol and decentralized application built for **BOT Chain**. It enables users to:
- Inspect which smart contracts have permission to spend their ERC-20 tokens.
- Identify dangerous **Unlimited Allowances** ($\ge 2^{255}$).
- Record audit verifications on-chain in `AllowanceGuard.sol` for an immutable security log.
- Revoke approvals in one click via a direct `approve(spender, 0)` transaction.

---

## 🌐 BOT Chain Network Information

| Parameter | Value |
| :--- | :--- |
| **Network Name** | BOT Chain |
| **Chain ID** | `677` |
| **RPC Endpoint** | [https://rpc.botchain.ai](https://rpc.botchain.ai) |
| **Native Token** | BOT |
| **Official Website** | [https://botchain.ai](https://botchain.ai) |
| **Block Explorer** | [https://scan.botchain.ai](https://scan.botchain.ai) |

---

## 📍 Deployed & Verified Contracts (BOT Chain - Chain ID: 677)

| Contract | Address | Verification Status | Explorer Link |
| :--- | :--- | :--- | :--- |
| **AllowanceGuard** | `0xA17E767F0E6b4A2B0A58046CaFede7ed92be82AF` | **Verified** ✅ | [View Verified Code on BotScan](https://scan.botchain.ai/address/0xA17E767F0E6b4A2B0A58046CaFede7ed92be82AF#code) |

---

## 🏗️ Architecture

```
       [User Wallet]
             │
             ├── (1) recordCheck(token, spender) ──> [AllowanceGuard Contract]
             │                                               │
             │                                               ├─> Reads IERC20.allowance
             │                                               ├─> Stores CheckRecord
             │                                               └─> Emits AllowanceChecked
             │
             └── (2) approve(spender, 0) ──────────> [ERC-20 Token Contract]
                                                             │
                                                             └─> Resets Allowance to 0
```

1. **Smart Contracts (`contracts/`)**:
   - `AllowanceGuard.sol`: Core contract managing state-changing audit checks and batch queries.
   - Deployed and verified on BOT Chain Mainnet.
   - Hardhat test suite with 100% test pass rate.

2. **Frontend (`frontend/`)**:
   - Built on Next.js with Turbopack and React 19.
   - Web3 connectivity via `@reown/appkit`, `@reown/appkit-adapter-wagmi`, and `viem`.
   - Small gas fee optimization for BOT Chain.
   - Visible clickable links to [https://botchain.ai](https://botchain.ai) and [https://scan.botchain.ai](https://scan.botchain.ai) with official BOT Chain logo.

---

## 🚀 Quick Start

### 1. Environment Setup
Configure your keys in `.env.local` (kept private, git-ignored):
```env
PRIVATE_KEY=your_private_key_here
PROJECT_ID=d9690df1851903b53a4f8c440127edec
RPC_URL=https://rpc.botchain.ai
CHAIN_ID=677
EXPLORER_URL=https://scan.botchain.ai
CONTRACT_ADDRESS=0xA17E767F0E6b4A2B0A58046CaFede7ed92be82AF
```

### 2. Run Smart Contract Tests
```bash
cd contracts
npx hardhat test
```

### 3. Run the Frontend
```bash
cd frontend
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📄 Documentation

- [AllowanceGuard Whitepaper](./WHITEPAPER.md)

## 🛡️ License

MIT License.
