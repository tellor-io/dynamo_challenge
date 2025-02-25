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
        oracleQueryId="0x4f7379e37f7d3185be12069ced51b0cea622a6edf255ffb9986a20c6e561bdf8"
        bridgeTimestamp={timestamp}
      />
    </div>
  );
}

export default App; 