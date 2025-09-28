import { useState, useEffect } from 'react'
import { usePublicClient } from 'wagmi'
import { Address } from 'viem'
import { SECRET_BANK_ABI, SECRET_BANK_ADDRESS } from '../config/contracts'
import { SecretWithStatus } from '../types'
import { useFHE } from '../hooks/useFHE'

interface SecretsListProps {
  userAddress: Address | undefined
}

export function SecretsList({ userAddress }: SecretsListProps) {
  const publicClient = usePublicClient()
  const { decryptAddress, isInitialized } = useFHE()
  const [secrets, setSecrets] = useState<SecretWithStatus[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchUserSecrets = async () => {
      if (!publicClient || !userAddress || SECRET_BANK_ADDRESS === '0x0000000000000000000000000000000000000000') {
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        setError(null)

        // Get user's secret IDs
        const secretIds = await publicClient.readContract({
          address: SECRET_BANK_ADDRESS,
          abi: SECRET_BANK_ABI,
          functionName: 'getUserSecrets',
          args: [userAddress],
        }) as bigint[]

        if (secretIds.length === 0) {
          setSecrets([])
          setIsLoading(false)
          return
        }

        // Fetch detailed information for each secret
        const secretsWithStatus: SecretWithStatus[] = []

        for (const secretId of secretIds) {
          try {
            const [secretInfo, decryptionStatus, canBeRevealed] = await Promise.all([
              publicClient.readContract({
                address: SECRET_BANK_ADDRESS,
                abi: SECRET_BANK_ABI,
                functionName: 'getSecret',
                args: [secretId],
              }),
              publicClient.readContract({
                address: SECRET_BANK_ADDRESS,
                abi: SECRET_BANK_ABI,
                functionName: 'getDecryptionStatus',
                args: [secretId],
              }),
              publicClient.readContract({
                address: SECRET_BANK_ADDRESS,
                abi: SECRET_BANK_ABI,
                functionName: 'canSecretBeRevealed',
                args: [secretId],
              }),
            ])

            const [encryptedString, encryptedAddress, revealTime, depositor, isRevealed] = secretInfo as [string, string, bigint, string, boolean]
            const [requested, pending] = decryptionStatus as [boolean, boolean]

            secretsWithStatus.push({
              secretId,
              encryptedString,
              encryptedAddress,
              revealTime,
              depositor,
              isRevealed,
              decryptionStatus: { requested, pending },
              canBeRevealed: canBeRevealed as boolean,
            })
          } catch (err) {
            console.error(`Error fetching secret ${secretId}:`, err)
          }
        }

        setSecrets(secretsWithStatus)
      } catch (err) {
        console.error('Error fetching user secrets:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch secrets')
      } finally {
        setIsLoading(false)
      }
    }

    fetchUserSecrets()
  }, [publicClient, userAddress])

  const formatDate = (timestamp: bigint) => {
    return new Date(Number(timestamp) * 1000).toLocaleString()
  }

  const getSecretStatus = (secret: SecretWithStatus) => {
    if (secret.isRevealed) return { text: 'Revealed', class: 'status-revealed' }
    if (secret.canBeRevealed) return { text: 'Ready to Reveal', class: 'status-ready' }
    return { text: 'Pending', class: 'status-pending' }
  }

  const handleDecryptAddress = async (secret: SecretWithStatus) => {
    if (!isInitialized || !userAddress) {
      alert('FHE not initialized or wallet not connected')
      return
    }

    try {
      // This would require proper signer implementation
      // For now, just show that the feature is available
      alert('Address decryption would be performed here with proper access permissions')
    } catch (error) {
      console.error('Error decrypting address:', error)
      alert('Failed to decrypt address')
    }
  }

  if (isLoading) {
    return (
      <div className="secrets-list">
        <div className="loading">Loading your secrets...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="secrets-list">
        <div className="error">Error: {error}</div>
      </div>
    )
  }

  if (secrets.length === 0) {
    return (
      <div className="secrets-list">
        <h2>Your Secrets</h2>
        <p style={{ textAlign: 'center', color: '#aaa', padding: '2rem' }}>
          No secrets found. Deposit your first secret to get started.
        </p>
      </div>
    )
  }

  return (
    <div className="secrets-list">
      <h2>Your Secrets ({secrets.length})</h2>

      {secrets.map((secret) => {
        const status = getSecretStatus(secret)
        return (
          <div key={secret.secretId.toString()} className="secret-item">
            <div className="secret-header">
              <span className="secret-id">Secret #{secret.secretId.toString()}</span>
              <span className={`secret-status ${status.class}`}>
                {status.text}
              </span>
            </div>

            <div className="secret-content">
              <strong>Content:</strong> {secret.encryptedString}
            </div>

            <div className="secret-meta">
              <div><strong>Reveal Time:</strong> {formatDate(secret.revealTime)}</div>
              <div><strong>Deposited:</strong> {new Date(Number(secret.revealTime) * 1000 - 24 * 3600 * 1000).toLocaleString()}</div>
              <div><strong>Encrypted Address:</strong> {secret.encryptedAddress.slice(0, 10)}...{secret.encryptedAddress.slice(-8)}</div>
            </div>

            {secret.decryptionStatus.requested && (
              <div className="secret-meta">
                <div style={{ color: '#ffa500' }}>
                  <strong>Decryption Status:</strong> {secret.decryptionStatus.pending ? 'Pending' : 'Completed'}
                </div>
              </div>
            )}

            <div style={{ marginTop: '1rem' }}>
              <button
                className="btn btn-secondary"
                onClick={() => handleDecryptAddress(secret)}
                disabled={!isInitialized}
                style={{ marginRight: '0.5rem' }}
              >
                Try Decrypt Address
              </button>

              {secret.canBeRevealed && !secret.isRevealed && (
                <span style={{ color: '#ff6b6b', fontSize: '0.875rem' }}>
                  ⚡ Ready for owner to reveal
                </span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}