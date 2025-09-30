import { useState } from 'react';
import { useAccount } from 'wagmi';
import { BrowserProvider, Contract } from 'ethers';
import { useZamaInstance } from '../hooks/useZamaInstance';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../config/contracts';

export function SecretSubmit() {
  const { address } = useAccount();
  const { instance } = useZamaInstance();
  const [text, setText] = useState('');
  const [encAddr, setEncAddr] = useState('');
  const [publicAt, setPublicAt] = useState('');
  const [status, setStatus] = useState('');

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('');
    if (!address) { setStatus('Connect wallet'); return; }
    if (!instance) { setStatus('Encryption not ready'); return; }
    const contractAddress = CONTRACT_ADDRESS;
    if (!contractAddress) { setStatus('Contract not configured'); return; }

    const user = address;
    const useAddr = encAddr || user;

    // Encrypt address + bytes
    const buffer = instance.createEncryptedInput(contractAddress, user);
    buffer.addAddress(useAddr);
    const bytes = new TextEncoder().encode(text);
    for (const b of bytes) buffer.add8(b);
    const encrypted = await buffer.encrypt();

    // Prepare write with ethers (wagmi provides injected provider)
    const provider = new BrowserProvider((window as any).ethereum);
    const signer = await provider.getSigner();
    const contract = new Contract(contractAddress, CONTRACT_ABI as any, signer);

    const pubAt = publicAt ? Math.floor(new Date(publicAt).getTime() / 1000) : Math.floor(Date.now() / 1000) + 60;
    setStatus('Submitting...');
    const tx = await contract.submitSecret(encrypted.handles[0], encrypted.handles.slice(1), encrypted.inputProof, pubAt);
    await tx.wait();
    setStatus('Submitted');
  };

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
          <span>🔒</span>
          Submit Your Secret
        </h2>
        <p style={{
          margin: 0,
          color: 'var(--text-tertiary)',
          fontSize: '14px'
        }}>
          Encrypt and store your secret on-chain with time-locked access
        </p>
      </div>

      <form onSubmit={onSubmit} style={{ display: 'grid', gap: '24px' }}>
        <label style={{ display: 'grid', gap: '8px' }}>
          <div style={{
            fontSize: '14px',
            fontWeight: '600',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <span>📝</span>
            Secret Text
            <span style={{ color: 'var(--danger)', fontSize: '16px' }}>*</span>
          </div>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            required
            placeholder="Enter your secret message..."
            rows={4}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              fontSize: '15px',
              fontFamily: 'inherit',
              transition: 'var(--transition)',
              resize: 'vertical'
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'var(--primary)';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'var(--border)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
        </label>

        <label style={{ display: 'grid', gap: '8px' }}>
          <div style={{
            fontSize: '14px',
            fontWeight: '600',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <span>⏰</span>
            Public At (UTC)
            <span style={{
              fontSize: '12px',
              fontWeight: '400',
              color: 'var(--text-tertiary)',
              marginLeft: '4px'
            }}>
              (optional - defaults to +60s)
            </span>
          </div>
          <input
            type="datetime-local"
            value={publicAt}
            onChange={e => setPublicAt(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              fontSize: '15px',
              fontFamily: 'inherit',
              transition: 'var(--transition)'
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'var(--primary)';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'var(--border)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
          <div style={{
            fontSize: '13px',
            color: 'var(--text-tertiary)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <span>💡</span>
            After this time, anyone can trigger public decryption
          </div>
        </label>

        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginTop: '8px' }}>
          <button
            type="submit"
            disabled={!address || !instance}
            style={{
              padding: '14px 32px',
              borderRadius: 'var(--radius)',
              border: 'none',
              background: address && instance
                ? 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)'
                : 'var(--bg-tertiary)',
              color: 'white',
              fontSize: '16px',
              fontWeight: '600',
              cursor: address && instance ? 'pointer' : 'not-allowed',
              transition: 'var(--transition)',
              boxShadow: address && instance ? 'var(--shadow)' : 'none',
              opacity: address && instance ? 1 : 0.5
            }}
            onMouseEnter={(e) => {
              if (address && instance) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
              }
            }}
            onMouseLeave={(e) => {
              if (address && instance) {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'var(--shadow)';
              }
            }}
          >
            {status === 'Submitting...' ? '⏳ Submitting...' : '🚀 Submit Secret'}
          </button>

          {status && status !== 'Submitting...' && (
            <div style={{
              padding: '12px 20px',
              borderRadius: 'var(--radius)',
              background: status === 'Submitted'
                ? 'rgba(16, 185, 129, 0.1)'
                : status.includes('Connect') || status.includes('not')
                  ? 'rgba(239, 68, 68, 0.1)'
                  : 'rgba(59, 130, 246, 0.1)',
              border: `1px solid ${
                status === 'Submitted'
                  ? 'var(--success)'
                  : status.includes('Connect') || status.includes('not')
                    ? 'var(--danger)'
                    : 'var(--info)'
              }`,
              color: status === 'Submitted'
                ? 'var(--success)'
                : status.includes('Connect') || status.includes('not')
                  ? 'var(--danger)'
                  : 'var(--info)',
              fontSize: '14px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span>{status === 'Submitted' ? '✅' : '⚠️'}</span>
              {status}
            </div>
          )}
        </div>

        {!address && (
          <div style={{
            padding: '16px',
            borderRadius: 'var(--radius)',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid var(--danger)',
            color: 'var(--danger)',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <span style={{ fontSize: '20px' }}>⚠️</span>
            <span>Please connect your wallet to submit secrets</span>
          </div>
        )}

        {address && !instance && (
          <div style={{
            padding: '16px',
            borderRadius: 'var(--radius)',
            background: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid var(--warning)',
            color: 'var(--warning)',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <span style={{ fontSize: '20px' }}>⏳</span>
            <span>Initializing encryption... Please wait</span>
          </div>
        )}
      </form>
    </div>
  );
}

