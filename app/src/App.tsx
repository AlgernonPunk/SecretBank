import { useState, useEffect } from 'react'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount } from 'wagmi'
import { DepositSecret } from './components/DepositSecret'
import { SecretsList } from './components/SecretsList'
import { OwnerPanel } from './components/OwnerPanel'
import { ContractInfo } from './components/ContractInfo'
import { useSecretBank } from './hooks/useSecretBank'

function App() {
  const { address, isConnected } = useAccount()
  const { contractAddress, owner, isOwner } = useSecretBank()
  const [activeTab, setActiveTab] = useState<'deposit' | 'secrets' | 'owner'>('deposit')

  useEffect(() => {
    if (!isConnected) {
      setActiveTab('deposit')
    }
  }, [isConnected])

  return (
    <div className="container">
      <div className="header">
        <div>
          <h1>SecretBank</h1>
          <p>Confidential Storage with Fully Homomorphic Encryption</p>
        </div>
        <ConnectButton />
      </div>

      <ContractInfo
        contractAddress={contractAddress}
        owner={owner}
        isOwner={isOwner}
        userAddress={address}
      />

      {isConnected && (
        <>
          <div style={{
            display: 'flex',
            gap: '1rem',
            marginBottom: '2rem',
            justifyContent: 'center'
          }}>
            <button
              className={`btn ${activeTab === 'deposit' ? '' : 'btn-secondary'}`}
              onClick={() => setActiveTab('deposit')}
            >
              Deposit Secret
            </button>
            <button
              className={`btn ${activeTab === 'secrets' ? '' : 'btn-secondary'}`}
              onClick={() => setActiveTab('secrets')}
            >
              My Secrets
            </button>
            {isOwner && (
              <button
                className={`btn ${activeTab === 'owner' ? '' : 'btn-secondary'}`}
                onClick={() => setActiveTab('owner')}
              >
                Owner Panel
              </button>
            )}
          </div>

          {activeTab === 'deposit' && <DepositSecret />}
          {activeTab === 'secrets' && <SecretsList userAddress={address} />}
          {activeTab === 'owner' && isOwner && <OwnerPanel />}
        </>
      )}

      {!isConnected && (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <h2>Welcome to SecretBank</h2>
          <p>Connect your wallet to start storing encrypted secrets on-chain.</p>
          <p>
            SecretBank uses Zama's Fully Homomorphic Encryption (FHE) to keep your data
            confidential while stored on the blockchain.
          </p>
        </div>
      )}
    </div>
  )
}

export default App