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
    <form onSubmit={onSubmit} style={{ display: 'grid', gap: 12 }}>
      <label>
        <div>String</div>
        <input value={text} onChange={e => setText(e.target.value)} required placeholder="Secret text" style={{ width: '100%', padding: 8, border: '1px solid #ddd', borderRadius: 6 }} />
      </label>
      <label>
        <div>Encryption address (optional)</div>
        <input value={encAddr} onChange={e => setEncAddr(e.target.value)} placeholder="0x... (defaults to your address)" style={{ width: '100%', padding: 8, border: '1px solid #ddd', borderRadius: 6 }} />
      </label>
      <label>
        <div>Public At (UTC, optional)</div>
        <input type="datetime-local" value={publicAt} onChange={e => setPublicAt(e.target.value)} style={{ width: '100%', padding: 8, border: '1px solid #ddd', borderRadius: 6 }} />
      </label>
      <div style={{ display: 'flex', gap: 12 }}>
        <button type="submit" style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #ddd', background: '#eef' }}>Submit</button>
        <div style={{ alignSelf: 'center' }}>{status}</div>
      </div>
    </form>
  );
}

