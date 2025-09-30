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
    <div>
      <div style={{
        marginBottom: '32px',
        paddingBottom: '24px',
        borderBottom: '1px solid var(--border)'
      }}>
        <h2 style={{
          fontSize: '24px',
          fontWeight: '700',
          color: 'var(--text-primary)',
          margin: '0 0 8px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <span>📝</span>
          My Secrets
        </h2>
        <p style={{
          margin: 0,
          color: 'var(--text-tertiary)',
          fontSize: '14px'
        }}>
          View and decrypt your submitted secrets
        </p>
      </div>

      {!address ? (
        <div style={{
          padding: '32px',
          borderRadius: 'var(--radius)',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔌</div>
          <div style={{
            fontSize: '16px',
            color: 'var(--text-secondary)',
            fontWeight: '600',
            marginBottom: '8px'
          }}>
            Wallet Not Connected
          </div>
          <div style={{ fontSize: '14px', color: 'var(--text-tertiary)' }}>
            Connect your wallet to view your secrets
          </div>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: '24px' }}>
            <button
              disabled={finding}
              onClick={findMy}
              style={{
                padding: '12px 24px',
                borderRadius: 'var(--radius)',
                border: 'none',
                background: finding
                  ? 'var(--bg-tertiary)'
                  : 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)',
                color: 'white',
                fontSize: '15px',
                fontWeight: '600',
                cursor: finding ? 'not-allowed' : 'pointer',
                transition: 'var(--transition)',
                boxShadow: finding ? 'none' : 'var(--shadow)',
                opacity: finding ? 0.7 : 1
              }}
              onMouseEnter={(e) => {
                if (!finding) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
                }
              }}
              onMouseLeave={(e) => {
                if (!finding) {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'var(--shadow)';
                }
              }}
            >
              {finding ? '🔍 Searching...' : '🔍 Find My Records'}
            </button>
          </div>

          {status && (
            <div style={{
              padding: '16px',
              borderRadius: 'var(--radius)',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid var(--danger)',
              color: 'var(--danger)',
              fontSize: '14px',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <span style={{ fontSize: '20px' }}>⚠️</span>
              <span>{status}</span>
            </div>
          )}

          {records.length > 0 ? (
            <div style={{ display: 'grid', gap: '16px' }}>
              {records.map(r => (
                <div
                  key={r.id.toString()}
                  style={{
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '20px',
                    background: 'var(--bg-secondary)',
                    transition: 'var(--transition)'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '16px',
                    flexWrap: 'wrap',
                    gap: '12px'
                  }}>
                    <div>
                      <div style={{
                        fontWeight: '700',
                        fontSize: '16px',
                        color: 'var(--text-primary)',
                        marginBottom: '6px'
                      }}>
                        🔑 Record ID: {r.id.toString()}
                      </div>
                      <div style={{
                        fontSize: '13px',
                        color: 'var(--text-tertiary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        <span>⏰</span>
                        Public At: {r.publicAt ? new Date(Number(r.publicAt) * 1000).toLocaleString() : 'N/A'}
                      </div>
                    </div>
                    <div style={{
                      display: 'flex',
                      gap: '8px',
                      alignItems: 'center'
                    }}>
                      <span style={{
                        padding: '4px 12px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '12px',
                        fontWeight: '600',
                        background: r.isPublic
                          ? 'rgba(16, 185, 129, 0.1)'
                          : 'rgba(245, 158, 11, 0.1)',
                        color: r.isPublic ? 'var(--success)' : 'var(--warning)',
                        border: `1px solid ${r.isPublic ? 'var(--success)' : 'var(--warning)'}`
                      }}>
                        {r.isPublic ? '🌐 Public' : '🔒 Private'}
                      </span>
                      {r.isDecrypted && (
                        <span style={{
                          padding: '4px 12px',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '12px',
                          fontWeight: '600',
                          background: 'rgba(59, 130, 246, 0.1)',
                          color: 'var(--info)',
                          border: '1px solid var(--info)'
                        }}>
                          📄 On-chain
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                    <button
                      onClick={() => decrypt(r)}
                      disabled={r.decrypting}
                      style={{
                        padding: '10px 20px',
                        borderRadius: 'var(--radius)',
                        border: 'none',
                        background: r.decrypting
                          ? 'var(--bg-tertiary)'
                          : 'linear-gradient(135deg, var(--secondary) 0%, var(--primary) 100%)',
                        color: 'white',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: r.decrypting ? 'not-allowed' : 'pointer',
                        transition: 'var(--transition)',
                        boxShadow: r.decrypting ? 'none' : 'var(--shadow-sm)',
                        opacity: r.decrypting ? 0.7 : 1
                      }}
                      onMouseEnter={(e) => {
                        if (!r.decrypting) {
                          e.currentTarget.style.transform = 'translateY(-1px)';
                          e.currentTarget.style.boxShadow = 'var(--shadow)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!r.decrypting) {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                        }
                      }}
                    >
                      {r.decrypting ? '⏳ Decrypting...' : '🔓 Decrypt Secret'}
                    </button>
                  </div>

                  {r.error && (
                    <div style={{
                      padding: '12px 16px',
                      borderRadius: 'var(--radius)',
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid var(--danger)',
                      color: 'var(--danger)',
                      fontSize: '13px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <span>❌</span>
                      <span>{r.error}</span>
                    </div>
                  )}

                  {r.plaintext && (
                    <div style={{
                      padding: '16px',
                      borderRadius: 'var(--radius)',
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border-light)'
                    }}>
                      <div style={{
                        fontSize: '13px',
                        fontWeight: '600',
                        color: 'var(--text-tertiary)',
                        marginBottom: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        <span>📜</span>
                        Decrypted Plaintext:
                      </div>
                      <pre style={{
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        margin: 0,
                        fontFamily: 'monospace',
                        fontSize: '14px',
                        color: 'var(--text-primary)',
                        lineHeight: '1.6'
                      }}>
                        {r.plaintext}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            !finding && !status && (
              <div style={{
                padding: '48px 32px',
                borderRadius: 'var(--radius)',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '64px', marginBottom: '16px' }}>📭</div>
                <div style={{
                  fontSize: '16px',
                  color: 'var(--text-secondary)',
                  fontWeight: '600',
                  marginBottom: '8px'
                }}>
                  No Secrets Found
                </div>
                <div style={{ fontSize: '14px', color: 'var(--text-tertiary)' }}>
                  Click "Find My Records" to search for your secrets
                </div>
              </div>
            )
          )}
        </>
      )}
    </div>
  );
}
