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
    <div style={{ display: 'grid', gap: 12 }}>
      <label>
        <div>Record ID</div>
        <input value={id} onChange={e => setId(e.target.value)} placeholder="e.g. 1" style={{ width: '100%', padding: 8, border: '1px solid #ddd', borderRadius: 6 }} />
      </label>
      <div style={{ display: 'flex', gap: 12 }}>
        <button onClick={makePublic} style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #ddd', background: '#eef' }}>Make Public</button>
        <div style={{ alignSelf: 'center' }}>{status}</div>
      </div>
      <div style={{ fontSize: 13, color: '#555' }}>
        After success, anyone can fetch ciphertext handles and use public decryption via Zama Relayer.
      </div>
    </div>
  );
}

