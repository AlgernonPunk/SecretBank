import { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { SecretSubmit } from './SecretSubmit';
import { SecretView } from './SecretView';

export function SecretBankApp() {
  const [activeTab, setActiveTab] = useState<'submit' | 'view'>('submit');

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 20 }}>SecretBank</h1>
        <ConnectButton />
      </header>

      <nav style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        <button onClick={() => setActiveTab('submit')} style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #ddd', background: activeTab === 'submit' ? '#eef' : 'white' }}>Submit</button>
        <button onClick={() => setActiveTab('view')} style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #ddd', background: activeTab === 'view' ? '#eef' : 'white' }}>View</button>
      </nav>

      {activeTab === 'submit' ? <SecretSubmit /> : <SecretView />}
    </div>
  );
}

