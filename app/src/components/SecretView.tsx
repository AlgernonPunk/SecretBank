import { useState } from 'react';
import { useAccount } from 'wagmi';
import { createPublicClient, http } from 'viem';
import { sepolia } from 'viem/chains';
import { useZamaInstance } from '../hooks/useZamaInstance';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../config/contracts';

export function SecretView() {
  const { address } = useAccount();
  const { instance } = useZamaInstance();
  const [id, setId] = useState('1');
  const [length, setLength] = useState<number | null>(null);
  const [decrypted, setDecrypted] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const client = createPublicClient({ chain: sepolia, transport: http() });

  const loadLength = async () => {
    setLoading(true);
    try {
      const len = await client.readContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: CONTRACT_ABI as any,
        functionName: 'getLength',
        args: [BigInt(id)],
      });
      setLength(Number(len));
    } finally {
      setLoading(false);
    }
  };

  const userDecrypt = async () => {
    if (!instance) return;
    if (!length) return;
    const handles: string[] = [];
    for (let i = 0; i < length; i++) {
      const handle = await client.readContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: CONTRACT_ABI as any,
        functionName: 'getByte',
        args: [BigInt(id), BigInt(i)],
      });
      handles.push(handle as string);
    }

    const keypair = instance.generateKeypair();
    const contractAddresses = [CONTRACT_ADDRESS];
    const startTimeStamp = Math.floor(Date.now() / 1000).toString();
    const durationDays = '10';
    const eip712 = instance.createEIP712(keypair.publicKey, contractAddresses, startTimeStamp, durationDays);

    const provider = (window as any).ethereum;
    const accounts = await provider.request({ method: 'eth_requestAccounts' });
    const signerAddr = accounts[0];
    const signature = await provider.request({
      method: 'eth_signTypedData_v4',
      params: [signerAddr, JSON.stringify({ domain: eip712.domain, types: { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification }, primaryType: 'UserDecryptRequestVerification', message: eip712.message })],
    });

    const pairs = handles.map(h => ({ handle: h, contractAddress: CONTRACT_ADDRESS }));
    const result = await instance.userDecrypt(
      pairs,
      keypair.privateKey,
      keypair.publicKey,
      (signature as string).replace('0x', ''),
      contractAddresses,
      signerAddr,
      startTimeStamp,
      durationDays,
    );

    const values: number[] = handles.map(h => Number(result[h]));
    const text = new TextDecoder().decode(Uint8Array.from(values));
    setDecrypted(text);
  };

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', gap: 12 }}>
        <input value={id} onChange={e => setId(e.target.value)} style={{ padding: 8, border: '1px solid #ddd', borderRadius: 6 }} />
        <button onClick={loadLength} style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #ddd' }}>Load</button>
      </div>
      {length !== null && <div>Length: {length}</div>}
      <div style={{ display: 'flex', gap: 12 }}>
        <button disabled={!length || loading} onClick={userDecrypt} style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #ddd' }}>Decrypt (user)</button>
      </div>
      {decrypted && (
        <div>
          <div>Plaintext:</div>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{decrypted}</pre>
        </div>
      )}
    </div>
  );
}

