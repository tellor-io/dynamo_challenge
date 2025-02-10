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
        oracleQueryId="0x0432de7bf6851ebf48cadbf3385044d815edd58208259a01aef949f0e445c9a9"
        bridgeTimestamp={timestamp}
      />
    </div>
  );
}

export default App; 