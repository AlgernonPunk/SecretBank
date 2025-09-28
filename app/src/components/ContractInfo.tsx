import { Address } from 'viem'

interface ContractInfoProps {
  contractAddress: Address
  owner: Address | null
  isOwner: boolean
  userAddress: Address | undefined
}

export function ContractInfo({ contractAddress, owner, isOwner, userAddress }: ContractInfoProps) {
  const isContractDeployed = contractAddress !== '0x0000000000000000000000000000000000000000'

  if (!isContractDeployed) {
    return (
      <div style={{
        background: '#ff6b6b',
        color: 'white',
        padding: '1rem',
        borderRadius: '8px',
        margin: '1rem 0',
        textAlign: 'center'
      }}>
        <h3>⚠️ Contract Not Deployed</h3>
        <p>
          The SecretBank contract has not been deployed yet. Please deploy the contract first using:
        </p>
        <code style={{ background: 'rgba(0,0,0,0.2)', padding: '0.5rem', borderRadius: '4px', display: 'block', margin: '1rem 0' }}>
          npx hardhat --network sepolia deploy
        </code>
        <p>
          Then update the CONTRACT_ADDRESS in the frontend configuration.
        </p>
      </div>
    )
  }

  return (
    <div style={{
      background: '#1a1a1a',
      padding: '1rem',
      borderRadius: '8px',
      border: '1px solid #333',
      margin: '1rem 0'
    }}>
      <h3>Contract Information</h3>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '1rem',
        marginTop: '1rem'
      }}>
        <div>
          <strong>Contract Address:</strong>
          <div style={{ fontFamily: 'monospace', fontSize: '0.875rem', color: '#646cff', wordBreak: 'break-all' }}>
            {contractAddress}
          </div>
        </div>

        <div>
          <strong>Owner:</strong>
          <div style={{ fontFamily: 'monospace', fontSize: '0.875rem', color: owner ? '#51cf66' : '#aaa', wordBreak: 'break-all' }}>
            {owner || 'Loading...'}
          </div>
        </div>

        {userAddress && (
          <div>
            <strong>Your Address:</strong>
            <div style={{ fontFamily: 'monospace', fontSize: '0.875rem', color: '#fff', wordBreak: 'break-all' }}>
              {userAddress}
            </div>
          </div>
        )}

        {userAddress && (
          <div>
            <strong>Role:</strong>
            <div style={{ fontSize: '0.875rem', color: isOwner ? '#ffa500' : '#aaa' }}>
              {isOwner ? '👑 Contract Owner' : '👤 Regular User'}
            </div>
          </div>
        )}
      </div>

      <div style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#aaa' }}>
        <p>
          📡 <strong>Network:</strong> Sepolia Testnet
        </p>
        <p>
          🔐 <strong>Encryption:</strong> Zama FHE (Fully Homomorphic Encryption)
        </p>
        {isOwner && (
          <p style={{ color: '#ffa500' }}>
            ⚡ As the contract owner, you can reveal secrets after their reveal time.
          </p>
        )}
      </div>
    </div>
  )
}