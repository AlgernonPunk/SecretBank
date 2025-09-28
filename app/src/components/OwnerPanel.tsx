import { useState, useEffect } from 'react'
import { usePublicClient } from 'wagmi'
import { ethers } from 'ethers'
import { SECRET_BANK_ABI, SECRET_BANK_ADDRESS } from '../config/contracts'
import { SecretWithStatus } from '../types'

export function OwnerPanel() {
  const publicClient = usePublicClient()
  const [allSecrets, setAllSecrets] = useState<SecretWithStatus[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [processingSecretId, setProcessingSecretId] = useState<bigint | null>(null)

  useEffect(() => {
    const fetchAllSecrets = async () => {
      if (!publicClient || SECRET_BANK_ADDRESS === '0x0000000000000000000000000000000000000000') {
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        setError(null)

        // Get total number of secrets
        const totalSecrets = await publicClient.readContract({
          address: SECRET_BANK_ADDRESS,
          abi: SECRET_BANK_ABI,
          functionName: 'getTotalSecrets',
        }) as bigint

        if (totalSecrets === 0n) {
          setAllSecrets([])
          setIsLoading(false)
          return
        }

        // Fetch detailed information for all secrets
        const secretsWithStatus: SecretWithStatus[] = []

        for (let i = 0; i < Number(totalSecrets); i++) {
          try {
            const secretId = BigInt(i)
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
            console.error(`Error fetching secret ${i}:`, err)
          }
        }

        setAllSecrets(secretsWithStatus)
      } catch (err) {
        console.error('Error fetching all secrets:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch secrets')
      } finally {
        setIsLoading(false)
      }
    }

    fetchAllSecrets()
  }, [publicClient])

  const handleRequestDecryption = async (secretId: bigint) => {
    if (!window.ethereum) {
      setMessage({ type: 'error', text: 'Please connect your wallet' })
      return
    }

    setProcessingSecretId(secretId)
    setMessage(null)

    try {
      // Create ethers provider and signer
      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()

      // Create contract instance
      const contract = new ethers.Contract(SECRET_BANK_ADDRESS, SECRET_BANK_ABI, signer)

      // Submit the transaction
      const tx = await contract.requestDecryption(secretId)

      setMessage({ type: 'success', text: `Decryption request submitted: ${tx.hash}` })

      // Wait for confirmation
      const receipt = await tx.wait()

      if (receipt.status === 1) {
        setMessage({
          type: 'success',
          text: `Decryption requested successfully! Transaction: ${tx.hash}`
        })

        // Refresh the secrets list
        window.location.reload()
      } else {
        setMessage({ type: 'error', text: 'Transaction failed' })
      }

    } catch (error: any) {
      console.error('Error requesting decryption:', error)
      setMessage({
        type: 'error',
        text: error.message || 'Failed to request decryption'
      })
    } finally {
      setProcessingSecretId(null)
    }
  }

  const formatDate = (timestamp: bigint) => {
    return new Date(Number(timestamp) * 1000).toLocaleString()
  }

  const getSecretStatus = (secret: SecretWithStatus) => {
    if (secret.isRevealed) return { text: 'Revealed', class: 'status-revealed' }
    if (secret.decryptionStatus.pending) return { text: 'Decryption Pending', class: 'status-pending' }
    if (secret.decryptionStatus.requested) return { text: 'Decryption Requested', class: 'status-pending' }
    if (secret.canBeRevealed) return { text: 'Ready to Reveal', class: 'status-ready' }
    return { text: 'Locked', class: 'status-pending' }
  }

  const getStats = () => {
    const total = allSecrets.length
    const revealed = allSecrets.filter(s => s.isRevealed).length
    const readyToReveal = allSecrets.filter(s => s.canBeRevealed && !s.isRevealed && !s.decryptionStatus.requested).length
    const pending = allSecrets.filter(s => s.decryptionStatus.pending).length

    return { total, revealed, readyToReveal, pending }
  }

  if (isLoading) {
    return (
      <div className="secrets-list">
        <div className="loading">Loading all secrets...</div>
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

  const stats = getStats()

  return (
    <div className="secrets-list">
      <h2>Owner Panel - All Secrets</h2>

      {message && (
        <div className={message.type === 'success' ? 'success' : 'error'}>
          {message.text}
        </div>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
        margin: '2rem 0',
        padding: '1rem',
        background: '#1a1a1a',
        borderRadius: '8px',
        border: '1px solid #333'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#646cff' }}>{stats.total}</div>
          <div>Total Secrets</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#51cf66' }}>{stats.revealed}</div>
          <div>Revealed</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#ff6b6b' }}>{stats.readyToReveal}</div>
          <div>Ready to Reveal</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#ffa500' }}>{stats.pending}</div>
          <div>Pending Decryption</div>
        </div>
      </div>

      {allSecrets.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#aaa', padding: '2rem' }}>
          No secrets found in the contract.
        </p>
      ) : (
        allSecrets.map((secret) => {
          const status = getSecretStatus(secret)
          const isProcessing = processingSecretId === secret.secretId
          const canRequestDecryption = secret.canBeRevealed && !secret.isRevealed && !secret.decryptionStatus.requested && !secret.decryptionStatus.pending

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
                <div><strong>Depositor:</strong> {secret.depositor}</div>
                <div><strong>Reveal Time:</strong> {formatDate(secret.revealTime)}</div>
                <div><strong>Encrypted Address:</strong> {secret.encryptedAddress.slice(0, 10)}...{secret.encryptedAddress.slice(-8)}</div>
                <div><strong>Current Time:</strong> {new Date().toLocaleString()}</div>
              </div>

              {secret.decryptionStatus.requested && (
                <div className="secret-meta">
                  <div style={{ color: '#ffa500' }}>
                    <strong>Decryption Status:</strong> {secret.decryptionStatus.pending ? 'Pending' : 'Completed'}
                  </div>
                </div>
              )}

              <div style={{ marginTop: '1rem' }}>
                {canRequestDecryption && (
                  <button
                    className="btn"
                    onClick={() => handleRequestDecryption(secret.secretId)}
                    disabled={isProcessing}
                  >
                    {isProcessing ? 'Requesting...' : 'Request Decryption'}
                  </button>
                )}

                {secret.isRevealed && (
                  <span style={{ color: '#51cf66', fontSize: '0.875rem' }}>
                    ✅ Secret has been revealed
                  </span>
                )}

                {!secret.canBeRevealed && !secret.isRevealed && (
                  <span style={{ color: '#aaa', fontSize: '0.875rem' }}>
                    🔒 Still locked until {formatDate(secret.revealTime)}
                  </span>
                )}
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}