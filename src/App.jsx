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
          <div style={{ position: 'fixed', top: '30px', right: '30px', zIndex: 1000 }}>
            <button 
              onClick={() => setCurrentPage('submission')}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontWeight: '400',
                fontSize: '2.5rem',
                fontFamily: 'Courier New, monospace',
                transition: 'opacity 0.2s ease',
                color: '#fff',
                textShadow: '1px 1px 0px rgba(0,0,0,0.8)',
                padding: '0',
                opacity: '0.85'
              }}
              onMouseOver={(e) => {
                e.target.style.opacity = '1';
              }}
              onMouseOut={(e) => {
                e.target.style.opacity = '0.85';
              }}
              title="Submit Your Data"
            >
              π
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