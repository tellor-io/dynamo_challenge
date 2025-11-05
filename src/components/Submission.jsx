import React, { useState, useEffect } from 'react';
import { connectKeplr, isKeplrInstalled, submitNoStakeReport, onKeplrAccountChange } from '../services/walletService';
import './Submission.css';

const QUERY_DATA = '0x00000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000000d45746844656e7665723230323500000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000019677269705f737472656e6774685f64796e616d6f6d6574657200000000000000';

// SHA-256 hash of the password
const PASSWORD_HASH = '18ec4a1211fae1944f9484f2f8e76acd2ed4d4c9e54e8b72a68bf608faa552ae'; // hash of 'wags'

// Simple SHA-256 implementation
const sha256 = async (message) => {
  try {
    // Check if crypto.subtle is available
    if (!crypto || !crypto.subtle) {
      console.error('crypto.subtle not available');
      throw new Error('Secure crypto not available');
    }
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (error) {
    console.error('Error in sha256:', error);
    throw error;
  }
};

// Helper function to convert string to hex
const stringToHex = (str) => {
  let hex = '';
  for (let i = 0; i < str.length; i++) {
    const charCode = str.charCodeAt(i);
    hex += charCode.toString(16).padStart(2, '0');
  }
  return hex;
};

// Helper function to pad hex to 64 characters (32 bytes)
const padHex = (hex, length = 64) => {
  return hex.padEnd(length, '0');
};

// Helper function to convert number to hex uint256
const numberToUint256Hex = (num) => {
  if (num === 0) return '0'.repeat(64);
  const numStr = Math.floor(num).toString(16);
  return numStr.padStart(64, '0');
};

// Encode the value data structure
const encodeValue = (data) => {
  const chunks = [];
  
  // Chunk 0: Dataset (0x1 for Men's, 0x0 for Women's)
  const datasetValue = data.dataset === 'mens' ? '1' : '0';
  chunks[0] = padHex(datasetValue);
  
  // Chunk 1: Right hand grip (lbs * 1e18)
  const rightHandScaled = Math.floor((data.rightHand || 0) * 1e18);
  chunks[1] = numberToUint256Hex(rightHandScaled);
  
  // Chunk 2: Left hand grip (lbs * 1e18)
  const leftHandScaled = Math.floor((data.leftHand || 0) * 1e18);
  chunks[2] = numberToUint256Hex(leftHandScaled);
  
  // Chunk 3-4: Empty (zeros)
  chunks[3] = '0'.repeat(64);
  chunks[4] = '0'.repeat(64);
  
  // Chunk 5: Hours of sleep
  chunks[5] = numberToUint256Hex(data.hoursOfSleep || 0);
  
  // Chunk 6: Empty
  chunks[6] = '0'.repeat(64);
  
  // Chunk 7: X Handle (string, hex-encoded)
  const xHandleHex = stringToHex(data.xHandle || '');
  chunks[7] = padHex(xHandleHex);
  
  // Chunk 8: Empty
  chunks[8] = '0'.repeat(64);
  
  // Chunk 9: GitHub username (string, hex-encoded)
  const githubHex = stringToHex(data.githubUsername || '');
  chunks[9] = padHex(githubHex);
  
  // Combine all chunks
  return '0x' + chunks.join('');
};

const Submission = ({ onBack }) => {
  const [formData, setFormData] = useState({
    dataset: 'mens',
    rightHand: '',
    leftHand: '',
    hoursOfSleep: '',
    xHandle: '',
    githubUsername: ''
  });
  
  const [encodedValue, setEncodedValue] = useState('');
  const [copied, setCopied] = useState(false);
  const [copiedQueryData, setCopiedQueryData] = useState(false);
  const [errors, setErrors] = useState({});
  const [walletAddress, setWalletAddress] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState(null);
  
  // Password gate state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(true);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    // Check if sessionStorage is available
    let storageAvailable = false;
    try {
      storageAvailable = typeof sessionStorage !== 'undefined' && sessionStorage !== null;
      if (storageAvailable) {
        const authenticated = sessionStorage.getItem('dynamo_authenticated') === 'true';
        if (authenticated) {
          setIsAuthenticated(true);
          setShowPasswordModal(false);
          return;
        }
      }
    } catch (e) {
      console.log('sessionStorage not available:', e);
    }
    
    // Bypass password on non-HTTPS (local dev) or if storage unavailable
    // crypto.subtle requires HTTPS or localhost
    const isSecureContext = window.isSecureContext || window.location.protocol === 'https:';
    if (!isSecureContext || !storageAvailable) {
      console.log('Non-HTTPS or storage unavailable, bypassing password check');
      setIsAuthenticated(true);
      setShowPasswordModal(false);
    }
  }, []);

  useEffect(() => {
    // Listen for account changes
    const cleanup = onKeplrAccountChange(async () => {
      // Reload wallet info when account changes
      try {
        const { address } = await connectKeplr();
        setWalletAddress(address);
      } catch (error) {
        setWalletAddress(null);
      }
    });
    
    return cleanup;
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setErrors(prev => ({
      ...prev,
      [name]: ''
    }));
  };

  const handleConnectWallet = async () => {
    try {
      const keplrAvailable = await isKeplrInstalled();
      
      if (!keplrAvailable) {
        alert('Keplr wallet is not installed or not detected. Please install it from https://www.keplr.app/ or open this page in the Keplr mobile app browser.');
        return;
      }
      
      const { address } = await connectKeplr();
      setWalletAddress(address);
    } catch (error) {
      console.error('Error connecting wallet:', error);
      alert(`Failed to connect wallet: ${error.message}`);
    }
  };

  const handleDisconnectWallet = () => {
    setWalletAddress(null);
  };

  const handleSubmitToChain = async () => {
    if (!walletAddress) {
      alert('Please connect your wallet first');
      return;
    }

    if (!encodedValue) {
      alert('Please encode your data first');
      return;
    }

    setIsSubmitting(true);
    setSubmissionResult(null);

    try {
      const result = await submitNoStakeReport(QUERY_DATA, encodedValue);
      setSubmissionResult({
        success: true,
        message: 'Successfully submitted to chain!',
        txHash: result.txHash,
        height: result.height,
      });
    } catch (error) {
      console.error('Error submitting to chain:', error);
      setSubmissionResult({
        success: false,
        message: `Failed to submit: ${error.message}`,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const validate = () => {
    const newErrors = {};
    
    if (!formData.rightHand || parseFloat(formData.rightHand) <= 0) {
      newErrors.rightHand = 'Please enter a valid right hand grip strength';
    }
    
    if (!formData.leftHand || parseFloat(formData.leftHand) <= 0) {
      newErrors.leftHand = 'Please enter a valid left hand grip strength';
    }
    
    if (!formData.hoursOfSleep || parseFloat(formData.hoursOfSleep) < 0) {
      newErrors.hoursOfSleep = 'Please enter valid hours of sleep';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleEncode = (e) => {
    e.preventDefault();
    
    if (!validate()) {
      return;
    }
    
    const data = {
      dataset: formData.dataset,
      rightHand: parseFloat(formData.rightHand),
      leftHand: parseFloat(formData.leftHand),
      hoursOfSleep: parseInt(formData.hoursOfSleep) || 0,
      xHandle: formData.xHandle.trim(),
      githubUsername: formData.githubUsername.trim()
    };
    
    const encoded = encodeValue(data);
    setEncodedValue(encoded);
    setCopied(false);
  };

  const copyToClipboard = (text) => {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }).catch(err => {
        console.error('Failed to copy:', err);
      });
    } else {
      // Fallback
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError('');
    
    try {
      const hash = await sha256(passwordInput);
      
      if (hash === PASSWORD_HASH) {
        setIsAuthenticated(true);
        setShowPasswordModal(false);
        // Try to save to sessionStorage if available
        try {
          if (typeof sessionStorage !== 'undefined' && sessionStorage !== null) {
            sessionStorage.setItem('dynamo_authenticated', 'true');
          }
        } catch (e) {
          console.log('Could not save to sessionStorage:', e);
        }
      } else {
        setPasswordError('Incorrect password. Please try again.');
        setPasswordInput('');
      }
    } catch (error) {
      console.error('Password verification error:', error);
      setPasswordError('Error verifying password. Try refreshing the page or use HTTPS.');
    }
  };

  return (
    <div className="submission-container">
      {/* Password Modal */}
      {showPasswordModal && !isAuthenticated && (
        <div className="password-modal-overlay">
          <div className="password-modal">
            <h2>Access Required</h2>
            <p>Please enter the password to access the submission form.</p>
            <form onSubmit={handlePasswordSubmit}>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Enter password"
                className="password-input"
                autoFocus
              />
              {passwordError && <p className="password-error">{passwordError}</p>}
              <button type="submit" className="password-submit-button">
                Submit
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="submission-header">
        <button className="back-button" onClick={onBack}>← Back to Leaderboard</button>
        <h1>Submit Your Grip-Strength Challenge Data</h1>
        
        <div className="wallet-section">
          {walletAddress ? (
            <div className="wallet-connected">
              <span className="wallet-icon">🔒</span>
              <span className="wallet-address">{walletAddress.substring(0, 12)}...{walletAddress.substring(walletAddress.length - 8)}</span>
              <button className="disconnect-button" onClick={handleDisconnectWallet}>Disconnect</button>
            </div>
          ) : (
            <button className="connect-wallet-button" onClick={handleConnectWallet}>
              Connect Keplr Wallet
            </button>
          )}
        </div>
      </div>
      
      <div className="submission-form-wrapper">
        <form onSubmit={handleEncode} className="submission-form">
          <div className="form-group">
            <label>Dataset *</label>
            <select 
              name="dataset" 
              value={formData.dataset} 
              onChange={handleChange}
              className="form-input"
            >
              <option value="mens">Men's</option>
              <option value="womens">Women's</option>
            </select>
          </div>

          <div className="form-group">
            <label>Right Hand Grip Strength (lbs) *</label>
            <input
              type="number"
              name="rightHand"
              value={formData.rightHand}
              onChange={handleChange}
              step="0.1"
              min="0"
              className={`form-input ${errors.rightHand ? 'error' : ''}`}
              placeholder="e.g., 45.5"
            />
            {errors.rightHand && <span className="error-text">{errors.rightHand}</span>}
          </div>

          <div className="form-group">
            <label>Left Hand Grip Strength (lbs) *</label>
            <input
              type="number"
              name="leftHand"
              value={formData.leftHand}
              onChange={handleChange}
              step="0.1"
              min="0"
              className={`form-input ${errors.leftHand ? 'error' : ''}`}
              placeholder="e.g., 42.0"
            />
            {errors.leftHand && <span className="error-text">{errors.leftHand}</span>}
          </div>

          <div className="form-group">
            <label>Hours of Sleep *</label>
            <input
              type="number"
              name="hoursOfSleep"
              value={formData.hoursOfSleep}
              onChange={handleChange}
              step="0.1"
              min="0"
              max="24"
              className={`form-input ${errors.hoursOfSleep ? 'error' : ''}`}
              placeholder="e.g., 7.5"
            />
            {errors.hoursOfSleep && <span className="error-text">{errors.hoursOfSleep}</span>}
          </div>

          <div className="form-group">
            <label>X Handle (optional)</label>
            <input
              type="text"
              name="xHandle"
              value={formData.xHandle}
              onChange={handleChange}
              className="form-input"
              placeholder="e.g., @johndoe"
            />
          </div>

          <div className="form-group">
            <label>GitHub Username (optional)</label>
            <input
              type="text"
              name="githubUsername"
              value={formData.githubUsername}
              onChange={handleChange}
              className="form-input"
              placeholder="e.g., johndoe"
            />
          </div>

          <button type="submit" className="encode-button">Encode Value</button>
        </form>

        {encodedValue && (
          <div className="encoded-result">
            <h3>Encoded Value (Hex)</h3>
            <div className="encoded-value-container">
              <textarea 
                readOnly 
                value={encodedValue} 
                className="encoded-value"
                rows="3"
              />
              <button 
                onClick={() => copyToClipboard(encodedValue)}
                className="copy-button"
              >
                {copied ? '✓ Copied!' : 'Copy'}
              </button>
            </div>
            
            <div className="submission-instructions">
              <h4>Submission Instructions:</h4>
              
              <div className="query-data-section">
                <label><strong>Query Data (use this for every submission):</strong></label>
                <div className="encoded-value-container">
                  <textarea 
                    readOnly 
                    value={QUERY_DATA} 
                    className="encoded-value query-data-value"
                    rows="2"
                  />
                  <button 
                    onClick={() => {
                      copyToClipboard(QUERY_DATA);
                      setCopiedQueryData(true);
                      setTimeout(() => setCopiedQueryData(false), 2000);
                    }}
                    className="copy-button"
                  >
                    {copiedQueryData ? '✓ Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              {walletAddress ? ( // Wallet integration enabled using Tellor Hub method
                <>
                  <div className="direct-submission-section">
                    <button 
                      onClick={handleSubmitToChain}
                      disabled={isSubmitting || !encodedValue}
                      className="submit-to-chain-button"
                    >
                      {isSubmitting ? 'Submitting...' : '🚀 Submit to Chain'}
                    </button>
                    
                    {submissionResult && (
                      <div className={`submission-result ${submissionResult.success ? 'success' : 'error'}`}>
                        <p>{submissionResult.message}</p>
                        {submissionResult.success && submissionResult.txHash && (
                          <p className="tx-hash">
                            Transaction Hash: <code>{submissionResult.txHash}</code>
                            <br/>
                            <a 
                              href={`https://explorer.tellor.io/txs/${submissionResult.txHash}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              style={{
                                color: '#2e7d32',
                                textDecoration: 'none',
                                fontWeight: '600',
                                fontSize: '0.9rem',
                                display: 'inline-block',
                                marginTop: '0.5rem'
                              }}
                            >
                              🔍 View on Block Explorer →
                            </a>
                          </p>
                        )}
                      </div>
                    )}
                    
                    <p style={{fontSize: '0.85rem', color: '#666', marginTop: '0.5rem', textAlign: 'center'}}>
                      Using the same method as Tellor Hub. If it fails, use CLI below.
                    </p>
                  </div>
                  
                  <div className="or-divider">
                    <span>Use CLI</span>
                  </div>
                </>
              ) : null}
              
              {encodedValue && (
                <div className="cli-command-section">
                  <label><strong>✅ Submit Using Layer CLI (Recommended)</strong></label>
                  <p style={{fontSize: '0.9rem', color: '#2e7d32', margin: '0.5rem 0', fontWeight: '600'}}>
                    Copy and run this command in your terminal:
                  </p>
                  <div className="encoded-value-container">
                    <textarea 
                      readOnly 
                      value={`layerd tx oracle submit-no-stake-report '${QUERY_DATA}' '${encodedValue}' --from ${walletAddress || 'YOUR_KEY_NAME'} --chain-id layertest-4 --fees 10000loya --gas 300000 --node https://node-palmito.tellorlayer.com:26657`}
                      className="encoded-value cli-command"
                      rows="3"
                    />
                    <button 
                      onClick={() => {
                        const cmd = `layerd tx oracle submit-no-stake-report '${QUERY_DATA}' '${encodedValue}' --from ${walletAddress || 'YOUR_KEY_NAME'} --chain-id layertest-4 --fees 10000loya --gas 300000 --node https://node-palmito.tellorlayer.com:26657`;
                        copyToClipboard(cmd);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="copy-button"
                    >
                      {copied ? '✓ Copied!' : 'Copy'}
                    </button>
                  </div>
                  <p style={{fontSize: '0.8rem', color: '#888', marginTop: '0.5rem'}}>
                    <strong>Note:</strong> Replace 'YOUR_KEY_NAME' with your key name if not using wallet address
                  </p>
                </div>
              )}

              <div className="submission-instructions-text">
                <h4>How to Submit:</h4>
                <ol>
                  <li>Make sure you have <code>layerd</code> CLI installed and configured</li>
                  <li>Copy the command above by clicking the "Copy" button</li>
                  <li>Paste and run it in your terminal</li>
                  <li>Confirm the transaction when prompted</li>
                  <li>Your data will appear on the leaderboard within 5-10 seconds!</li>
                </ol>
                
                <div style={{marginTop: '1rem', padding: '1rem', background: '#fff3cd', borderRadius: '6px', border: '1px solid #ffc107'}}>
                  <p style={{margin: 0, fontSize: '0.85rem', color: '#856404'}}>
                    <strong>⚠️ Note:</strong> Only one report per query ID is allowed per block. 
                    If you get an error, wait a few seconds and try again.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Submission;

