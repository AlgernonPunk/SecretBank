# SecretBank 🔐

A decentralized secret management platform built on Fully Homomorphic Encryption (FHE) technology, enabling users to securely store, encrypt, and time-lock sensitive information on the blockchain.

## 📖 Overview

SecretBank is a privacy-preserving decentralized application (dApp) that leverages Zama's FHEVM (Fully Homomorphic Encryption Virtual Machine) to store encrypted secrets on-chain. Users can submit sensitive information that remains encrypted throughout its entire lifecycle, with built-in time-lock mechanisms for controlled disclosure.

## 🌟 Key Features

### 🔒 **End-to-End Encryption**
- Secrets are encrypted client-side using Zama's FHE technology
- Data remains encrypted on-chain and can only be decrypted by authorized users
- Each byte of the secret is individually encrypted as `euint8` for maximum security

### ⏰ **Time-Lock Mechanism**
- Set a future timestamp (`publicAt`) when secrets can be revealed
- Before the threshold, only the submitter can decrypt their secret
- After the threshold, secrets can be made publicly decryptable

### 👤 **User-Owned Secrets**
- Each secret is linked to its submitter's address
- User-specific indexing allows efficient retrieval of all secrets owned by an account
- Privacy is maintained through encrypted address fields (`eaddress`)

### 🔓 **Flexible Decryption Options**
- **User Decryption**: Submitters can decrypt their secrets at any time using Zama Relayer
- **Public Decryption**: After the time threshold, anyone can trigger `makePublic()` to enable public decryption
- **Oracle Decryption**: Contract can request on-chain decryption via Zama's oracle network (callback pattern)

### 📊 **Per-User Indexing**
- Efficient data structure for tracking user secrets without scanning entire blockchain
- `getUserRecordCount()` and `getUserRecordIdAt()` enable quick lookups
- No need for event scanning or external indexers

## 🛠️ Technology Stack

### Smart Contract Layer
- **Solidity**: ^0.8.24
- **FHEVM**: Zama's Fully Homomorphic Encryption Virtual Machine
- **Hardhat**: Development environment and deployment framework
- **TypeChain**: TypeScript bindings for smart contracts

### Frontend Layer
- **React**: ^19.1.1 (Modern UI framework)
- **TypeScript**: Type-safe development
- **Vite**: Fast build tool and development server
- **Wagmi**: React hooks for Ethereum interaction
- **RainbowKit**: Beautiful wallet connection UI
- **Ethers.js**: ^6.15.0 (Ethereum library)
- **TanStack Query**: Data fetching and state management

### Encryption & Privacy
- **@fhevm/solidity**: ^0.8.0 (FHE Solidity library)
- **@zama-fhe/relayer-sdk**: ^0.2.0 (Client-side encryption/decryption)
- **@zama-fhe/oracle-solidity**: ^0.1.0 (On-chain decryption oracle)
- **encrypted-types**: ^0.0.4 (FHE type definitions)

## 💡 Problem Statement & Solution

### Problems Addressed

1. **On-Chain Privacy**: Traditional blockchains expose all data publicly, making it impossible to store sensitive information
2. **Secure Time-Locks**: No native mechanism for time-locked secret revelation with strong cryptographic guarantees
3. **Centralized Secret Storage**: Existing solutions rely on centralized servers vulnerable to breaches
4. **Lack of Confidential Computing**: Smart contracts cannot process encrypted data without decrypting it first

### How SecretBank Solves These Problems

- **FHE Technology**: Enables computation on encrypted data without revealing plaintext
- **Decentralized Architecture**: Secrets stored on-chain with no central point of failure
- **Cryptographic Time-Locks**: Blockchain timestamps combined with FHE ensure time-based access control
- **Selective Disclosure**: Users control who can decrypt their secrets and when
- **Zero-Knowledge Proofs**: Relayer SDK uses ZK proofs to verify encryption without exposing data

## 📁 Project Structure

```
SecretBank/
├── contracts/               # Solidity smart contracts
│   ├── SecretBank.sol      # Main contract for secret storage
│   └── FHECounter.sol      # Example FHE counter contract
├── deploy/                  # Deployment scripts
│   └── deploy.ts           # Hardhat deployment configuration
├── test/                    # Contract test suites
│   ├── FHECounter.ts       # Unit tests for FHE functionality
│   └── FHECounterSepolia.ts # Sepolia testnet tests
├── tasks/                   # Hardhat custom tasks
│   ├── accounts.ts         # Account management tasks
│   ├── FHECounter.ts       # Counter interaction tasks
│   └── SecretBank.ts       # SecretBank interaction tasks
├── app/                     # Frontend React application
│   ├── src/
│   │   ├── components/      # React components
│   │   │   ├── SecretBankApp.tsx   # Main app component
│   │   │   ├── SecretSubmit.tsx    # Secret submission form
│   │   │   ├── SecretMy.tsx        # User's secrets view
│   │   │   └── SecretPublic.tsx    # Public revelation interface
│   │   ├── hooks/           # Custom React hooks
│   │   │   ├── useZamaInstance.ts  # Zama FHE instance hook
│   │   │   └── useEthersSigner.ts  # Ethers signer hook
│   │   ├── config/          # Configuration files
│   │   │   ├── wagmi.ts    # Wagmi/RainbowKit config
│   │   │   └── contracts.ts # Contract addresses/ABIs
│   │   ├── App.tsx         # App entry point
│   │   └── main.tsx        # React DOM mount
│   ├── package.json        # Frontend dependencies
│   └── vite.config.ts      # Vite configuration
├── hardhat.config.ts        # Hardhat configuration
├── package.json             # Root dependencies
├── tsconfig.json            # TypeScript configuration
└── .env                     # Environment variables
```

## 🚀 Getting Started

### Prerequisites

- **Node.js**: Version 20 or higher
- **npm**: Version 7.0.0 or higher
- **MetaMask** or compatible Web3 wallet
- **Sepolia ETH**: For deploying and testing on Sepolia testnet

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/SecretBank.git
   cd SecretBank
   ```

2. **Install dependencies**

   ```bash
   # Install root dependencies
   npm install

   # Install frontend dependencies
   cd app
   npm install
   cd ..
   ```

3. **Configure environment variables**

   Create a `.env` file in the root directory:

   ```env
   # Private key for deploying contracts
   PRIVATE_KEY=your_private_key_here

   # Infura API key for Sepolia access
   INFURA_API_KEY=your_infura_api_key

   # Etherscan API key for contract verification (optional)
   ETHERSCAN_API_KEY=your_etherscan_api_key

   # Mnemonic for development (alternative to PRIVATE_KEY)
   MNEMONIC=your_mnemonic_phrase
   ```

   Configure frontend environment:

   ```bash
   cd app
   # Create a .env file with contract address after deployment
   echo "VITE_CONTRACT_ADDRESS=0xYourDeployedContractAddress" > .env
   cd ..
   ```

4. **Compile contracts**

   ```bash
   npm run compile
   ```

### 🧪 Testing

Run the test suite:

```bash
# Run local tests
npm run test

# Run tests on Sepolia
npm run test:sepolia
```

### 📦 Deployment

#### Deploy to Local Network

```bash
# Start local Hardhat node
npm run chain

# In another terminal, deploy
npm run deploy:localhost
```

#### Deploy to Sepolia Testnet

```bash
# Deploy contract
npm run deploy:sepolia

# Verify on Etherscan (optional)
npm run verify:sepolia <CONTRACT_ADDRESS>
```

### 🌐 Running the Frontend

1. **Update contract address**

   After deployment, update `app/src/config/contracts.ts` with your deployed contract address:

   ```typescript
   export const CONTRACT_ADDRESS = '0xYourDeployedContractAddress';
   ```

2. **Start development server**

   ```bash
   cd app
   npm run dev
   ```

3. **Open in browser**

   Navigate to `http://localhost:5173` (or the port shown in terminal)

4. **Connect wallet**

   - Click "Connect Wallet" button
   - Select your wallet (MetaMask recommended)
   - Ensure you're on Sepolia testnet

## 📚 Usage Guide

### Submitting a Secret

1. **Navigate to "Submit" tab**
2. **Enter your secret text** in the input field
3. **(Optional) Set Public At timestamp** - defaults to current time + 60 seconds
4. **Click "Submit"**
   - App encrypts your text using Zama FHE
   - Creates encrypted handles for each byte
   - Submits transaction to blockchain
5. **Wait for confirmation**

### Viewing Your Secrets

1. **Navigate to "My Secret" tab**
2. **Click "Find My Records"**
   - Queries contract for all your submissions
   - Displays record ID, public timestamp, and status
3. **Click "Decrypt (user)"** on any record
   - Generates keypair for decryption
   - Signs EIP-712 message for authorization
   - Fetches encrypted data from contract
   - Decrypts locally using Zama Relayer
4. **View plaintext** in the displayed result

### Making a Secret Public

1. **Navigate to "Public" tab**
2. **Enter the record ID** you want to make public
3. **Click "Make Public"**
   - Only works after the `publicAt` timestamp
   - Marks all ciphertexts as publicly decryptable
   - Anyone can now decrypt the secret using the relayer

## 🏗️ Architecture & Design

### Smart Contract Architecture

```
┌─────────────────────────────────────────────────────┐
│              SecretBank Contract                     │
├─────────────────────────────────────────────────────┤
│                                                       │
│  struct Record {                                     │
│    address submitter                                 │
│    eaddress encOwner        // Encrypted address     │
│    euint8[] encBytes        // Encrypted bytes       │
│    uint64 publicAt          // Time threshold        │
│    bool isPublic                                     │
│    bool isDecrypted                                  │
│    string cleartext         // On-chain plaintext    │
│  }                                                    │
│                                                       │
│  Functions:                                          │
│  • submitSecret()         - Store encrypted secret   │
│  • makePublic()           - Enable public decryption │
│  • requestDecryption()    - Trigger oracle decrypt   │
│  • decryptionCallback()   - Oracle callback          │
│  • getUserRecordCount()   - Get user's record count  │
│  • getUserRecordIdAt()    - Get record ID by index   │
│                                                       │
└─────────────────────────────────────────────────────┘
```

### Frontend Architecture

```
┌──────────────────────────────────────────────────────┐
│                  React Frontend                      │
├──────────────────────────────────────────────────────┤
│                                                       │
│  Components:                                         │
│  ┌─────────────────────────────────────────────┐   │
│  │ SecretBankApp (Main Container)              │   │
│  │  ├─ SecretSubmit (Encryption + Submit)      │   │
│  │  ├─ SecretMy (List + Decrypt User Secrets)  │   │
│  │  └─ SecretPublic (Make Secrets Public)      │   │
│  └─────────────────────────────────────────────┘   │
│                                                       │
│  Hooks:                                              │
│  • useZamaInstance() - FHE instance management       │
│  • useEthersSigner() - Wallet signer access          │
│  • useAccount()      - Wagmi wallet connection       │
│                                                       │
│  Libraries:                                          │
│  • Zama Relayer SDK - Client-side FHE operations     │
│  • Ethers.js        - Contract interactions          │
│  • RainbowKit       - Wallet connection UI           │
│                                                       │
└──────────────────────────────────────────────────────┘
```

### Encryption Flow

```
User Input (Plaintext)
    ↓
TextEncoder.encode()
    ↓
Byte Array [b1, b2, ..., bn]
    ↓
For each byte:
    ↓
Zama FHE.encrypt(byte)
    ↓
euint8 Encrypted Handle
    ↓
Submit all handles to contract
    ↓
Store on-chain as euint8[]
    ↓
FHE.allowThis() + FHE.allow(submitter)
    ↓
Encrypted storage complete
```

### Decryption Flow

```
User requests decryption
    ↓
Generate keypair
    ↓
Create EIP-712 signature
    ↓
Fetch euint8 handles from contract
    ↓
Send to Zama Relayer with signature
    ↓
Relayer decrypts using KMS
    ↓
Return plaintext bytes
    ↓
TextDecoder.decode()
    ↓
Display plaintext to user
```

## 🎯 Use Cases

1. **Time-Locked Wills & Messages**
   - Store encrypted messages that reveal after a specific date
   - Digital inheritance planning

2. **Whistleblower Protection**
   - Submit encrypted evidence with future revelation date
   - Protect sources while ensuring accountability

3. **Auction Bids**
   - Submit sealed bids that reveal after auction closes
   - Prevent bid sniping

4. **Research Data Embargoes**
   - Store encrypted research findings with future publication date
   - Establish priority while maintaining confidentiality

5. **Secret Sharing Ceremonies**
   - Coordinate multi-party secret reveals at specific times
   - Birthday surprises, event announcements

6. **Confidential Voting**
   - Submit encrypted votes that reveal after voting period
   - Prevent vote manipulation

## 🔮 Future Roadmap

### Phase 1: Core Enhancements (Q2 2025)
- [ ] **Multi-party Decryption**: Require N-of-M signatures for decryption
- [ ] **Secret Splitting**: Shamir's Secret Sharing integration
- [ ] **IPFS Integration**: Store large encrypted files off-chain with on-chain pointers
- [ ] **Subscription Model**: Recurring access patterns for secrets

### Phase 2: Advanced Features (Q3 2025)
- [ ] **Conditional Reveals**: Smart contract conditions for automatic revelation
- [ ] **Secret Marketplace**: Trade access rights to encrypted data
- [ ] **Cross-Chain Bridge**: Support for multiple EVM chains
- [ ] **Mobile App**: Native iOS/Android applications

### Phase 3: Enterprise Features (Q4 2025)
- [ ] **Role-Based Access Control**: Organizational permission management
- [ ] **Audit Trails**: Comprehensive logging of decryption attempts
- [ ] **SLA Guarantees**: Enterprise-grade reliability commitments
- [ ] **Custom Encryption Schemes**: Support for customer-managed keys

### Phase 4: Ecosystem Growth (2026)
- [ ] **SDK Release**: Developer toolkit for building on SecretBank
- [ ] **Plugin Ecosystem**: Third-party extensions marketplace
- [ ] **Governance Token**: Decentralized protocol governance
- [ ] **Layer 2 Integration**: Optimistic/ZK rollup support for lower fees

## 🔧 Development Scripts

| Script                  | Description                                    |
|-------------------------|------------------------------------------------|
| `npm run compile`       | Compile Solidity contracts                     |
| `npm run test`          | Run contract tests locally                     |
| `npm run test:sepolia`  | Run tests on Sepolia testnet                   |
| `npm run coverage`      | Generate test coverage report                  |
| `npm run lint`          | Run linting (Solidity + TypeScript)            |
| `npm run lint:sol`      | Lint Solidity files only                       |
| `npm run lint:ts`       | Lint TypeScript files only                     |
| `npm run prettier:check`| Check code formatting                          |
| `npm run prettier:write`| Auto-format code                               |
| `npm run clean`         | Clean build artifacts and temp files           |
| `npm run chain`         | Start local Hardhat node                       |
| `npm run deploy:localhost` | Deploy to local network                     |
| `npm run deploy:sepolia`   | Deploy to Sepolia testnet                   |
| `npm run verify:sepolia`   | Verify contract on Etherscan               |

## 🛡️ Security Considerations

### Smart Contract Security
- **Access Control**: Only submitters can decrypt their secrets before `publicAt`
- **Time Validation**: Enforced timestamp checks prevent premature revelation
- **Reentrancy Protection**: No external calls during state changes
- **Oracle Verification**: KMS signatures verified via `FHE.checkSignatures()`

### Client-Side Security
- **EIP-712 Signatures**: Typed data signing prevents replay attacks
- **Keypair Isolation**: Decryption keypairs generated per-session
- **No Private Key Exposure**: All signing happens through wallet interface
- **HTTPS Enforced**: Frontend served over secure connection

### Known Limitations
- **Gas Costs**: FHE operations are more expensive than plaintext
- **Storage Constraints**: Each encrypted byte costs significant gas
- **Relayer Dependency**: Decryption requires Zama Relayer availability
- **Network Support**: Currently limited to Zama-supported networks

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Guidelines

- Write tests for all new features
- Follow existing code style (run `npm run lint`)
- Update documentation for API changes
- Ensure all tests pass before submitting PR

## 📄 License

This project is licensed under the BSD-3-Clause-Clear License. See the [LICENSE](LICENSE) file for details.

## 🆘 Support & Resources

### Documentation
- [FHEVM Documentation](https://docs.zama.ai/fhevm)
- [Zama Solidity Guides](https://docs.zama.ai/protocol/solidity-guides/getting-started/setup)
- [Hardhat Documentation](https://hardhat.org/docs)
- [Wagmi Documentation](https://wagmi.sh/)

### Community
- **GitHub Issues**: [Report bugs or request features](https://github.com/yourusername/SecretBank/issues)
- **Zama Discord**: [Join the community](https://discord.gg/zama)
- **Twitter**: [@zama_fhe](https://twitter.com/zama_fhe)

### Deployed Contracts
- **Sepolia Testnet**: `0xYourContractAddress` (update after deployment)

## 🙏 Acknowledgments

- **Zama Team**: For pioneering FHEVM technology
- **OpenZeppelin**: Security best practices and libraries
- **Hardhat Team**: Excellent development framework
- **RainbowKit**: Beautiful wallet connection UX

---

**Built with 🔐 using Fully Homomorphic Encryption**

*Empowering privacy on the blockchain, one encrypted secret at a time.*