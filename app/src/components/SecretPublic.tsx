import { useState } from 'react';
import { BrowserProvider, Contract } from 'ethers';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../config/contracts';

export function SecretPublic() {
  const [id, setId] = useState('');
  const [status, setStatus] = useState('');

  const makePublic = async () => {
    setStatus('');
    if (!id) { setStatus('Record id required'); return; }
    try {
      const provider = new BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const contract = new Contract(CONTRACT_ADDRESS as string, CONTRACT_ABI as any, signer);
      setStatus('Sending transaction...');
      const tx = await contract.makePublic(BigInt(id));
      await tx.wait();
      setStatus('Success: record is now publicly decryptable');
    } catch (e: any) {
      setStatus(e?.shortMessage || e?.message || 'Transaction failed');
    }
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
          <span>🌐</span>
          Make Secret Public
        </h2>
        <p style={{
          margin: 0,
          color: 'var(--text-tertiary)',
          fontSize: '14px'
        }}>
          Enable public decryption for time-locked secrets
        </p>
      </div>

      <div style={{
        padding: '24px',
        borderRadius: 'var(--radius)',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--info)',
        marginBottom: '32px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
          color: 'var(--text-secondary)',
          fontSize: '14px',
          lineHeight: '1.6'
        }}>
          <span style={{ fontSize: '20px', flexShrink: 0 }}>💡</span>
          <div>
            <strong style={{ color: 'var(--info)' }}>How it works:</strong>
            <br />
            After a secret's "Public At" timestamp has passed, anyone can call this function
            to mark the secret as publicly decryptable. Once marked, anyone can fetch the
            ciphertext handles and decrypt them via Zama Relayer.
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gap: '24px' }}>
        <label style={{ display: 'grid', gap: '8px' }}>
          <div style={{
            fontSize: '14px',
            fontWeight: '600',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <span>🔑</span>
            Record ID
            <span style={{ color: 'var(--danger)', fontSize: '16px' }}>*</span>
          </div>
          <input
            type="number"
            value={id}
            onChange={e => setId(e.target.value)}
            placeholder="Enter record ID (e.g., 1)"
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
            <span>ℹ️</span>
            The record must have passed its "Public At" timestamp
          </div>
        </label>

        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <button
            onClick={makePublic}
            disabled={!id || status === 'Sending transaction...'}
            style={{
              padding: '14px 32px',
              borderRadius: 'var(--radius)',
              border: 'none',
              background: id && status !== 'Sending transaction...'
                ? 'linear-gradient(135deg, var(--success) 0%, #059669 100%)'
                : 'var(--bg-tertiary)',
              color: 'white',
              fontSize: '16px',
              fontWeight: '600',
              cursor: id && status !== 'Sending transaction...' ? 'pointer' : 'not-allowed',
              transition: 'var(--transition)',
              boxShadow: id && status !== 'Sending transaction...' ? 'var(--shadow)' : 'none',
              opacity: id && status !== 'Sending transaction...' ? 1 : 0.5
            }}
            onMouseEnter={(e) => {
              if (id && status !== 'Sending transaction...') {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
              }
            }}
            onMouseLeave={(e) => {
              if (id && status !== 'Sending transaction...') {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'var(--shadow)';
              }
            }}
          >
            {status === 'Sending transaction...' ? '⏳ Processing...' : '🌐 Make Public'}
          </button>

          {status && status !== 'Sending transaction...' && (
            <div style={{
              padding: '12px 20px',
              borderRadius: 'var(--radius)',
              background: status.includes('Success')
                ? 'rgba(16, 185, 129, 0.1)'
                : 'rgba(239, 68, 68, 0.1)',
              border: `1px solid ${status.includes('Success') ? 'var(--success)' : 'var(--danger)'}`,
              color: status.includes('Success') ? 'var(--success)' : 'var(--danger)',
              fontSize: '14px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              flex: 1
            }}>
              <span>{status.includes('Success') ? '✅' : '❌'}</span>
              {status}
            </div>
          )}
        </div>

        {!id && (
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
            <span style={{ fontSize: '20px' }}>⚠️</span>
            <span>Please enter a record ID to continue</span>
          </div>
        )}
      </div>

      <div style={{
        marginTop: '32px',
        padding: '20px',
        borderRadius: 'var(--radius)',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)'
      }}>
        <h3 style={{
          fontSize: '16px',
          fontWeight: '700',
          color: 'var(--text-primary)',
          margin: '0 0 12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span>📋</span>
          Important Notes
        </h3>
        <ul style={{
          margin: 0,
          paddingLeft: '24px',
          color: 'var(--text-tertiary)',
          fontSize: '14px',
          lineHeight: '1.8'
        }}>
          <li style={{ marginBottom: '8px' }}>
            Only secrets that have passed their <strong style={{ color: 'var(--text-secondary)' }}>"Public At"</strong> timestamp can be made public
          </li>
          <li style={{ marginBottom: '8px' }}>
            Once made public, <strong style={{ color: 'var(--text-secondary)' }}>anyone</strong> can decrypt the secret
          </li>
          <li style={{ marginBottom: '8px' }}>
            This action is <strong style={{ color: 'var(--danger)' }}>irreversible</strong> and requires a blockchain transaction
          </li>
          <li>
            After success, the secret can be decrypted using Zama Relayer's public decryption API
          </li>
        </ul>
      </div>
    </div>
  );
}

