import React, { useState, useEffect } from 'react';
import { fetchOracleData } from '../services/oracleService';
import './Leaderboard.css';

const Leaderboard = ({ oracleQueryId, bridgeTimestamp }) => {
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [updateLog, setUpdateLog] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await fetchOracleData(oracleQueryId, bridgeTimestamp);
        const timestamp = new Date().toLocaleTimeString();
        
        // Sort data by combined grip strength (descending order)
        const sortedData = data.sort((a, b) => {
          const totalA = (a.rightHand || 0) + (a.leftHand || 0);  // Add null checks
          const totalB = (b.rightHand || 0) + (b.leftHand || 0);  // Add null checks
          return totalA - totalB;  // Changed from totalB - totalA to totalA - totalB
        });
        
        // Handle array of entries
        if (Array.isArray(sortedData)) {
          setLeaderboardData(sortedData);
          
          // Update log with all unique entries
          setUpdateLog(prevLog => {
            const newLog = [...prevLog];
            
            sortedData.forEach(entry => {
              // Check if this entry already exists in the log
              const exists = newLog.some(logEntry => 
                logEntry.reporter === entry.reporter &&
                logEntry.timestamp === entry.timestamp
              );
              
              if (!exists) {
                newLog.unshift({
                  time: timestamp,
                  ...entry
                });
              }
            });
            
            // Keep only the last 10 entries
            return newLog.slice(0, 10);
          });
        }
        
        setError(null);
      } catch (err) {
        const timestamp = new Date().toLocaleTimeString();
        setError('Failed to fetch leaderboard data: ' + err.message);
        console.error(`[${timestamp}] Error:`, err);
      }
    };

    // Initial fetch
    fetchData();

    // Set up interval
    const intervalId = setInterval(fetchData, 5000);
    console.log('Started update interval');

    return () => {
      clearInterval(intervalId);
      console.log('Cleared update interval');
    };
  }, [oracleQueryId, bridgeTimestamp]);

  // Helper function to truncate Ethereum addresses
  const truncateAddress = (address) => {
    if (!address) return 'N/A';
    return `${address.slice(0, 8)}...${address.slice(-8)}`;
  };

  const renderUpdateLog = (log) => {
    return (
      <table className="update-log-table">
        <thead>
          <tr>
            <th>Dataset</th>
            <th>Grip Strength</th>
            <th>Social (X/GitHub)</th>
            <th>Sleep</th>
            <th>Reporter</th>
          </tr>
        </thead>
        <tbody>
          {log.map((entry, index) => (
            <tr key={index}>
              <td>{entry.dataSet ? "Men's" : "Women's"}</td>
              <td>
                R: {entry.rightHand?.toFixed(2) || 'N/A'} lbs<br/>
                L: {entry.leftHand?.toFixed(2) || 'N/A'} lbs
              </td>
              <td>
                {entry.XHandle || 'N/A'} / {entry.githubUsername || 'N/A'}
              </td>
              <td>{entry.hoursOfSleep || 'N/A'} hrs</td>
              <td className="reporter-cell">{truncateAddress(entry.reporter)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <>
      <div 
        className="side-image-left" 
        style={{backgroundImage: `url(${process.env.PUBLIC_URL}/images/dumnbell_jellyfish.png)`}}
      ></div>
      <div 
        className="side-image-2" 
        style={{backgroundImage: `url(${process.env.PUBLIC_URL}/images/dumnbell_jellyfish.png)`}}
      ></div>
      <div 
        className="side-image-3" 
        style={{backgroundImage: `url(${process.env.PUBLIC_URL}/images/dumnbell_jellyfish.png)`}}
      ></div>
      <div 
        className="side-image-4" 
        style={{backgroundImage: `url(${process.env.PUBLIC_URL}/images/dumnbell_jellyfish.png)`}}
      ></div>
      <div 
        className="side-image-5" 
        style={{backgroundImage: `url(${process.env.PUBLIC_URL}/images/dumnbell_jellyfish.png)`}}
      ></div>
      <div 
        className="side-image-6" 
        style={{backgroundImage: `url(${process.env.PUBLIC_URL}/images/dumnbell_jellyfish.png)`}}
      ></div>
      <div 
        className="side-image-7" 
        style={{backgroundImage: `url(${process.env.PUBLIC_URL}/images/dumnbell_jellyfish.png)`}}
      ></div>
      <div className="leaderboard">
        <div className="wwf-title">
          <div className="title-text">TELLOR</div>
          <div className="title-text accent">DYNAMO</div>
          <div className="title-text">CHALLENGE</div>
        </div>
        <div className="update-log">
          <div className="leaderboard-header">
            <img 
              src={`${process.env.PUBLIC_URL}/images/tellor_logo.png`} 
              alt="Tellor Logo" 
              className="tellor-logo"
            />
            <h2 className="leaderboard-heading">Leaderboard</h2>
          </div>
          {updateLog.length > 0 ? renderUpdateLog(updateLog) : <p>No updates yet</p>}
        </div>
      </div>
    </>
  );
};

export default Leaderboard; 