import { useState, useEffect } from 'react'
import { useAccount, usePublicClient } from 'wagmi'
import { Address } from 'viem'
import { SECRET_BANK_ABI, SECRET_BANK_ADDRESS } from '../config/contracts'

export function useSecretBank() {
  const { address } = useAccount()
  const publicClient = usePublicClient()
  const [owner, setOwner] = useState<Address | null>(null)
  const [totalSecrets, setTotalSecrets] = useState<bigint>(0n)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchContractInfo = async () => {
      if (!publicClient || SECRET_BANK_ADDRESS === '0x0000000000000000000000000000000000000000') {
        setIsLoading(false)
        return
      }

      try {
        const [ownerResult, totalSecretsResult] = await Promise.all([
          publicClient.readContract({
            address: SECRET_BANK_ADDRESS,
            abi: SECRET_BANK_ABI,
            functionName: 'owner',
          }),
          publicClient.readContract({
            address: SECRET_BANK_ADDRESS,
            abi: SECRET_BANK_ABI,
            functionName: 'getTotalSecrets',
          }),
        ])

        setOwner(ownerResult as Address)
        setTotalSecrets(totalSecretsResult as bigint)
      } catch (error) {
        console.error('Error fetching contract info:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchContractInfo()
  }, [publicClient])

  const isOwner = address && owner && address.toLowerCase() === owner.toLowerCase()

  return {
    contractAddress: SECRET_BANK_ADDRESS,
    owner,
    totalSecrets,
    isOwner,
    isLoading,
  }
}