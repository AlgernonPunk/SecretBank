import { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { SecretSubmit } from './SecretSubmit';
import { SecretMy } from './SecretMy';
import { SecretPublic } from './SecretPublic';

export function SecretBankApp() {
  const [activeTab, setActiveTab] = useState<'submit' | 'my' | 'public'>('submit');

  const tabs = [
    { id: 'submit', label: 'Submit Secret', icon: '🔒' },
    { id: 'my', label: 'My Secrets', icon: '📝' },
    { id: 'public', label: 'Public', icon: '🌐' }
  ] as const;

  return (
    <div style={{ minHeight: '100vh', padding: '24px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <header style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '48px',
          padding: '24px 32px',
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-lg)',
          border: '1px solid var(--border)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              fontSize: '32px',
              background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontWeight: 'bold'
            }}>
              🔐
            </div>
            <div>
              <h1 style={{
                margin: 0,
                fontSize: '28px',
                fontWeight: '700',
                background: 'linear-gradient(135deg, var(--primary-light) 0%, var(--secondary) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                SecretBank
              </h1>
              <p style={{
                margin: 0,
                fontSize: '14px',
                color: 'var(--text-tertiary)',
                fontWeight: '500'
              }}>
                Privacy-First Secret Management
              </p>
            </div>
          </div>
          <ConnectButton />
        </header>

        {/* Navigation Tabs */}
        <nav style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '32px',
          padding: '8px',
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow)',
          border: '1px solid var(--border)'
        }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                flex: 1,
                padding: '12px 24px',
                borderRadius: 'var(--radius)',
                border: 'none',
                background: activeTab === tab.id
                  ? 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)'
                  : 'transparent',
                color: activeTab === tab.id ? 'white' : 'var(--text-secondary)',
                fontSize: '15px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'var(--transition)',
                boxShadow: activeTab === tab.id ? 'var(--shadow)' : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
              onMouseEnter={(e) => {
                if (activeTab !== tab.id) {
                  e.currentTarget.style.background = 'var(--bg-hover)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== tab.id) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }
              }}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>

        {/* Main Content */}
        <main style={{
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-xl)',
          padding: '32px',
          boxShadow: 'var(--shadow-lg)',
          border: '1px solid var(--border)',
          minHeight: '500px'
        }}>
          {activeTab === 'submit' && <SecretSubmit />}
          {activeTab === 'my' && <SecretMy />}
          {activeTab === 'public' && <SecretPublic />}
        </main>

        {/* How To Use Section */}
        <section style={{
          marginTop: '32px',
          padding: '32px',
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow)',
          border: '1px solid var(--border)'
        }}>
          <h2 style={{
            fontSize: '20px',
            margin: '0 0 20px',
            fontWeight: '700',
            color: 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <span style={{ fontSize: '24px' }}>📖</span>
            How To Use
          </h2>
          <ol style={{
            paddingLeft: '24px',
            margin: 0,
            lineHeight: '1.8',
            color: 'var(--text-secondary)'
          }}>
            <li style={{ marginBottom: '8px' }}>Connect a wallet on Sepolia testnet.</li>
            <li style={{ marginBottom: '8px' }}>Go to <strong style={{ color: 'var(--primary-light)' }}>"Submit Secret"</strong>. Enter your secret text.</li>
            <li style={{ marginBottom: '8px' }}>Optional: set <strong style={{ color: 'var(--primary-light)' }}>"Public At"</strong> time (UTC). Default is current time + 60 seconds.</li>
            <li style={{ marginBottom: '8px' }}>Click <strong style={{ color: 'var(--primary-light)' }}>"Submit"</strong>. The app encrypts your text and writes it on-chain.</li>
            <li style={{ marginBottom: '8px' }}>Go to <strong style={{ color: 'var(--primary-light)' }}>"My Secrets"</strong>. Click <strong style={{ color: 'var(--primary-light)' }}>"Find My Records"</strong> to list your submitted secrets.</li>
            <li style={{ marginBottom: '8px' }}>Click <strong style={{ color: 'var(--primary-light)' }}>"Decrypt"</strong> on a record to reveal the plaintext locally via Zama Relayer.</li>
          </ol>
          <div style={{
            marginTop: '20px',
            padding: '16px',
            background: 'var(--bg-secondary)',
            borderRadius: 'var(--radius)',
            fontSize: '14px',
            color: 'var(--text-tertiary)',
            borderLeft: '4px solid var(--info)'
          }}>
            <strong style={{ color: 'var(--info)' }}>💡 Public Reveal:</strong> After the "Public At" timestamp,
            anyone can go to <strong style={{ color: 'var(--text-secondary)' }}>"Public"</strong> and
            call <code style={{
              padding: '2px 6px',
              background: 'var(--bg-tertiary)',
              borderRadius: 'var(--radius-sm)',
              fontFamily: 'monospace',
              color: 'var(--primary-light)'
            }}>makePublic(id)</code> to enable public decryption.
          </div>
        </section>

        {/* Footer */}
        <footer style={{
          marginTop: '32px',
          padding: '24px',
          textAlign: 'center',
          color: 'var(--text-tertiary)',
          fontSize: '14px'
        }}>
          <p style={{ margin: 0 }}>
            Built with 🔐 using <span style={{ color: 'var(--primary-light)' }}>Zama FHEVM</span> ·
            Privacy-First Blockchain Storage
          </p>
        </footer>
      </div>
    </div>
  );
}
