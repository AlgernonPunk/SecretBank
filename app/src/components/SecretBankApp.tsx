import { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { SecretSubmit } from './SecretSubmit';
import { SecretMy } from './SecretMy';
import { SecretPublic } from './SecretPublic';

export function SecretBankApp() {
  const [activeTab, setActiveTab] = useState<'submit' | 'my' | 'public'>('submit');

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 20 }}>SecretBank</h1>
        <ConnectButton />
      </header>

      <nav style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        <button onClick={() => setActiveTab('submit')} style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #ddd', background: activeTab === 'submit' ? '#eef' : 'white' }}>Submit</button>
        <button onClick={() => setActiveTab('my')} style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #ddd', background: activeTab === 'my' ? '#eef' : 'white' }}>My Secret</button>
        <button onClick={() => setActiveTab('public')} style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #ddd', background: activeTab === 'public' ? '#eef' : 'white' }}>Public</button>
      </nav>

      {activeTab === 'submit' && <SecretSubmit />}
      {activeTab === 'my' && <SecretMy />}
      {activeTab === 'public' && <SecretPublic />}

      <section style={{ marginTop: 32, paddingTop: 16, borderTop: '1px solid #eee' }}>
        <h2 style={{ fontSize: 16, margin: '0 0 8px' }}>How To Use</h2>
        <ol style={{ paddingLeft: 18, margin: 0, lineHeight: 1.6 }}>
          <li>Connect a wallet on Sepolia.</li>
          <li>Go to “Submit”. Enter your string.</li>
          <li>Optional: set “Encryption address”. If empty, your wallet address is used to encrypt.</li>
          <li>Optional: set “Public At” time (UTC). Default is now + 60s.</li>
          <li>Click “Submit”. The app encrypts address + bytes and writes on-chain.</li>
          <li>Go to “My Secret”. Click “Find My Records” to list your submitted records.</li>
          <li>Click “Decrypt (user)” on a record to reveal the plaintext locally via Zama Relayer.</li>
        </ol>
        <div style={{ marginTop: 12, fontSize: 13, color: '#555' }}>
          Public reveal (after Public At): anyone can go to “Public” and call <code>makePublic(id)</code> to allow public decryption.
        </div>
      </section>
    </div>
  );
}
