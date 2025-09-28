import { useState } from 'react'
import { useAccount, useWalletClient } from 'wagmi'
import { ethers } from 'ethers'
import { SECRET_BANK_ABI, SECRET_BANK_ADDRESS } from '../config/contracts'
import { useFHE } from '../hooks/useFHE'

export function DepositSecret() {
  const { address } = useAccount()
  const { data: walletClient } = useWalletClient()
  const { encryptAddress, isInitialized } = useFHE()

  const [secretContent, setSecretContent] = useState('')
  const [targetAddress, setTargetAddress] = useState('')
  const [hoursFromNow, setHoursFromNow] = useState('24')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!address || !walletClient || !isInitialized) {
      setMessage({ type: 'error', text: 'Please connect your wallet and wait for FHE initialization' })
      return
    }

    if (!secretContent.trim()) {
      setMessage({ type: 'error', text: 'Please enter secret content' })
      return
    }

    if (!ethers.isAddress(targetAddress)) {
      setMessage({ type: 'error', text: 'Please enter a valid Ethereum address' })
      return
    }

    const hours = parseInt(hoursFromNow)
    if (isNaN(hours) || hours <= 0) {
      setMessage({ type: 'error', text: 'Please enter a valid number of hours' })
      return
    }

    if (SECRET_BANK_ADDRESS === '0x0000000000000000000000000000000000000000') {
      setMessage({ type: 'error', text: 'Contract not deployed. Please deploy the SecretBank contract first.' })
      return
    }

    setIsSubmitting(true)
    setMessage(null)

    try {
      // Calculate reveal time
      const currentTime = Math.floor(Date.now() / 1000)
      const revealTime = currentTime + (hours * 3600)

      // Encrypt the target address
      const encryptedData = await encryptAddress(targetAddress, SECRET_BANK_ADDRESS, address)

      // Create ethers provider and signer
      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()

      // Create contract instance
      const contract = new ethers.Contract(SECRET_BANK_ADDRESS, SECRET_BANK_ABI, signer)

      // Submit the transaction
      const tx = await contract.depositSecret(
        secretContent,
        encryptedData.handle,
        revealTime,
        encryptedData.proof
      )

      setMessage({ type: 'success', text: `Transaction submitted: ${tx.hash}` })

      // Wait for confirmation
      const receipt = await tx.wait()

      if (receipt.status === 1) {
        setMessage({
          type: 'success',
          text: `Secret deposited successfully! Transaction: ${tx.hash}`
        })

        // Reset form
        setSecretContent('')
        setTargetAddress('')
        setHoursFromNow('24')
      } else {
        setMessage({ type: 'error', text: 'Transaction failed' })
      }

    } catch (error: any) {
      console.error('Error depositing secret:', error)
      setMessage({
        type: 'error',
        text: error.message || 'Failed to deposit secret'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isInitialized) {
    return (
      <div className="secret-form">
        <div className="loading">Initializing FHE encryption...</div>
      </div>
    )
  }

  return (
    <div className="secret-form">
      <h2>Deposit New Secret</h2>
      <p>Store encrypted content with a reveal time and encrypted address.</p>

      {message && (
        <div className={message.type === 'success' ? 'success' : 'error'}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="secretContent">Secret Content:</label>
          <textarea
            id="secretContent"
            value={secretContent}
            onChange={(e) => setSecretContent(e.target.value)}
            placeholder="Enter your secret content here..."
            required
            disabled={isSubmitting}
          />
        </div>

        <div className="form-group">
          <label htmlFor="targetAddress">Target Address:</label>
          <input
            type="text"
            id="targetAddress"
            value={targetAddress}
            onChange={(e) => setTargetAddress(e.target.value)}
            placeholder="0x742d35Cc6634C0532925a3b8D56B0C62d8a5C1b2"
            required
            disabled={isSubmitting}
          />
          <small style={{ color: '#aaa', display: 'block', marginTop: '0.5rem' }}>
            This address will be encrypted and stored with your secret
          </small>
        </div>

        <div className="form-group">
          <label htmlFor="hoursFromNow">Reveal Time (hours from now):</label>
          <input
            type="number"
            id="hoursFromNow"
            value={hoursFromNow}
            onChange={(e) => setHoursFromNow(e.target.value)}
            min="1"
            required
            disabled={isSubmitting}
          />
          <small style={{ color: '#aaa', display: 'block', marginTop: '0.5rem' }}>
            When the secret can be revealed by the contract owner
          </small>
        </div>

        <button
          type="submit"
          className="btn"
          disabled={isSubmitting || !isInitialized}
        >
          {isSubmitting ? 'Depositing...' : 'Deposit Secret'}
        </button>
      </form>
    </div>
  )
}