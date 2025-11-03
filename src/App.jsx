import React, { useState } from 'react';
import Leaderboard from './components/Leaderboard';
import Submission from './components/Submission';
import './components/Leaderboard.css';

function App() {
  const timestamp = Math.floor(Date.now() / 1000);
  const [currentPage, setCurrentPage] = useState('leaderboard'); // 'leaderboard' or 'submission'
  
  // Add error boundary
  const [error, setError] = useState(null);

  if (error) {
    return <div className="error-container">An error occurred: {error.message}</div>;
  }

  return (
    <div className="App">
      {currentPage === 'leaderboard' ? (
        <>
          <div style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 1000 }}>
            <button 
              onClick={() => setCurrentPage('submission')}
              style={{
                padding: '0.75rem 1.5rem',
                background: 'rgba(255, 255, 255, 0.9)',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '1rem',
                boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
                transition: 'transform 0.2s ease'
              }}
              onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
              onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
            >
              Submit Your Data
            </button>
          </div>
          <Leaderboard 
            oracleQueryId="0x5d1bd59b60b85541794db87f4b5b2128f583a97800ea6c695378211b29bd1815"
            bridgeTimestamp={timestamp}
          />
        </>
      ) : (
        <Submission onBack={() => setCurrentPage('leaderboard')} />
      )}
    </div>
  );
}

export default App; 