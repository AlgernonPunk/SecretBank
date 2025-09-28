import { useState, useEffect } from 'react'
import { createInstance, SepoliaConfig } from '@zama-fhe/relayer-sdk'
import { ZAMA_CONFIG } from '../config/contracts'

export function useFHE() {
  const [fhevmInstance, setFhevmInstance] = useState<any>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const initFHE = async () => {
      try {
        // Use window.ethereum as the network provider
        const config = {
          ...SepoliaConfig,
          network: window.ethereum,
        }

        const instance = await createInstance(config)
        setFhevmInstance(instance)
        setIsInitialized(true)
      } catch (err) {
        console.error('Error initializing FHE:', err)
        setError(err instanceof Error ? err.message : 'Failed to initialize FHE')
      }
    }

    if (typeof window !== 'undefined' && window.ethereum) {
      initFHE()
    }
  }, [])

  const encryptAddress = async (address: string, contractAddress: string, userAddress: string) => {
    if (!fhevmInstance || !isInitialized) {
      throw new Error('FHE instance not initialized')
    }

    try {
      const input = fhevmInstance.createEncryptedInput(contractAddress, userAddress)
      input.addAddress(address)
      const encryptedInput = await input.encrypt()

      return {
        handle: encryptedInput.handles[0],
        proof: encryptedInput.inputProof,
      }
    } catch (err) {
      console.error('Error encrypting address:', err)
      throw err
    }
  }

  const decryptAddress = async (
    encryptedAddress: string,
    contractAddress: string,
    signer: any
  ) => {
    if (!fhevmInstance || !isInitialized) {
      throw new Error('FHE instance not initialized')
    }

    try {
      const keypair = fhevmInstance.generateKeypair()
      const handleContractPairs = [
        {
          handle: encryptedAddress,
          contractAddress: contractAddress,
        },
      ]

      const startTimeStamp = Math.floor(Date.now() / 1000).toString()
      const durationDays = "10"
      const contractAddresses = [contractAddress]

      const eip712 = fhevmInstance.createEIP712(
        keypair.publicKey,
        contractAddresses,
        startTimeStamp,
        durationDays
      )

      const signature = await signer.signTypedData(
        eip712.domain,
        {
          UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification,
        },
        eip712.message
      )

      const result = await fhevmInstance.userDecrypt(
        handleContractPairs,
        keypair.privateKey,
        keypair.publicKey,
        signature.replace("0x", ""),
        contractAddresses,
        signer.address,
        startTimeStamp,
        durationDays
      )

      return result[encryptedAddress]
    } catch (err) {
      console.error('Error decrypting address:', err)
      throw err
    }
  }

  return {
    fhevmInstance,
    isInitialized,
    error,
    encryptAddress,
    decryptAddress,
  }
}