import { useEffect, useMemo, useState } from 'react';
import { useAccount } from 'wagmi';
import { createPublicClient, http } from 'viem';
import { sepolia } from 'viem/chains';
import { useZamaInstance } from '../hooks/useZamaInstance';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../config/contracts';

type FoundRecord = {
  id: bigint;
  publicAt?: bigint;
  isPublic?: boolean;
  isDecrypted?: boolean;
  decrypting?: boolean;
  plaintext?: string;
  error?: string;
};

export function SecretMy() {
  const { address } = useAccount();
  const { instance } = useZamaInstance();
  const [finding, setFinding] = useState(false);
  const [records, setRecords] = useState<FoundRecord[]>([]);
  const [status, setStatus] = useState<string>('');
  const client = useMemo(() => createPublicClient({ chain: sepolia, transport: http() }), []);

  const findMy = async () => {
    if (!address) return;
    setFinding(true);
    setStatus('');
    try {
      // Read per-user records directly from contract (no events, no global scan)
      let count: bigint;
      try {
        count = await client.readContract({
          address: CONTRACT_ADDRESS as `0x${string}`,
          abi: CONTRACT_ABI as any,
          functionName: 'getUserRecordCount',
          args: [address as `0x${string}`],
        }) as bigint;
      } catch (e: any) {
        setStatus('This contract address does not support per-user index. Please deploy the latest SecretBank and update CONTRACT_ADDRESS.');
        setRecords([]);
        return;
      }

      const metas: FoundRecord[] = [];
      for (let i = 0n; i < count; i++) {
        const id = await client.readContract({
          address: CONTRACT_ADDRESS as `0x${string}`,
          abi: CONTRACT_ABI as any,
          functionName: 'getUserRecordIdAt',
          args: [address as `0x${string}`, i],
        }) as bigint;
        const [submitter, publicAt, isPublic, isDecrypted] = await client.readContract({
          address: CONTRACT_ADDRESS as `0x${string}`,
          abi: CONTRACT_ABI as any,
          functionName: 'getRecordMeta',
          args: [id],
        }) as [string, bigint, boolean, boolean];
        metas.push({ id, publicAt, isPublic, isDecrypted });
      }
      setRecords(metas.sort((a, b) => Number((b.publicAt ?? 0n) - (a.publicAt ?? 0n))));
    } finally {
      setFinding(false);
    }
  };

  const decrypt = async (rec: FoundRecord) => {
    if (!instance) return;
    const id = rec.id;
    try {
      setRecords(prev => prev.map(r => r.id === id ? { ...r, decrypting: true, error: undefined } : r));
      const len = await client.readContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: CONTRACT_ABI as any,
        functionName: 'getLength',
        args: [id],
      }) as bigint;
      const handles: string[] = [];
      for (let i = 0n; i < len; i++) {
        const handle = await client.readContract({
          address: CONTRACT_ADDRESS as `0x${string}`,
          abi: CONTRACT_ABI as any,
          functionName: 'getByte',
          args: [id, i],
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
      setRecords(prev => prev.map(r => r.id === id ? { ...r, decrypting: false, plaintext: text } : r));
    } catch (e: any) {
      setRecords(prev => prev.map(r => r.id === id ? { ...r, decrypting: false, error: e?.shortMessage || e?.message || 'Failed to decrypt' } : r));
    }
  };

  useEffect(() => {
    setRecords([]);
  }, [address]);

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {!address && <div style={{ color: '#555' }}>Connect your wallet to find your secrets.</div>}
      <div style={{ display: 'flex', gap: 12 }}>
        <button disabled={!address || finding} onClick={findMy} style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #ddd', background: '#eef' }}>{finding ? 'Searching...' : 'Find My Records'}</button>
      </div>
      {status && <div style={{ color: '#b00', fontSize: 13 }}>{status}</div>}
      {records.length > 0 && (
        <div style={{ display: 'grid', gap: 12 }}>
          {records.map(r => (
            <div key={r.id.toString()} style={{ border: '1px solid #eee', borderRadius: 8, padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>ID: {r.id.toString()}</div>
                  <div style={{ fontSize: 13, color: '#555' }}>Public At: {r.publicAt ? new Date(Number(r.publicAt) * 1000).toISOString() : 'N/A'}</div>
                </div>
                <div style={{ fontSize: 12, color: '#555', alignSelf: 'center' }}>
                  {r.isPublic ? 'Public' : 'Private'}{r.isDecrypted ? ' • On-chain plaintext' : ''}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button onClick={() => decrypt(r)} disabled={r.decrypting} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #ddd' }}>{r.decrypting ? 'Decrypting...' : 'Decrypt (user)'}</button>
              </div>
              {r.error && <div style={{ color: '#b00', marginTop: 8, fontSize: 13 }}>{r.error}</div>}
              {r.plaintext && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontSize: 13, color: '#555' }}>Plaintext</div>
                  <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{r.plaintext}</pre>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
