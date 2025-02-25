import React from 'react';
import Leaderboard from './components/Leaderboard';
import './components/Leaderboard.css';

function App() {
  const timestamp = Math.floor(Date.now() / 1000);
  
  // Add error boundary
  const [error, setError] = React.useState(null);

  if (error) {
    return <div className="error-container">An error occurred: {error.message}</div>;
  }

  return (
    <div className="App">
      <Leaderboard 
        oracleQueryId="0x5d1bd59b60b85541794db87f4b5b2128f583a97800ea6c695378211b29bd1815"
        bridgeTimestamp={timestamp}
      />
    </div>
  );
}

export default App; 