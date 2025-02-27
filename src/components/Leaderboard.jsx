import React, { useState, useEffect } from 'react';
import { fetchOracleData } from '../services/oracleService';
import './Leaderboard.css';

const Leaderboard = ({ oracleQueryId, bridgeTimestamp }) => {
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [updateLog, setUpdateLog] = useState([]);
  const [error, setError] = useState(null);
  const [datasetFilter, setDatasetFilter] = useState('all'); // 'all', 'mens', or 'womens'
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: 'asc'
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await fetchOracleData(oracleQueryId, bridgeTimestamp);
        const timestamp = new Date().toLocaleTimeString();
        
        // Sort data by combined grip strength (descending order)
        const sortedData = data.sort((a, b) => {
          const totalA = (a.rightHand || 0) + (a.leftHand || 0);
          const totalB = (b.rightHand || 0) + (b.leftHand || 0);
          return totalB - totalA;
        });
        
        // Handle array of entries
        if (Array.isArray(sortedData)) {
          setLeaderboardData(sortedData);
          
          // Update log with all unique entries without limiting to 10
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
            
            // Return all entries without slicing
            return newLog;
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

  // Update the truncateHash function (replaces truncateAddress)
  const truncateHash = (hash) => {
    if (!hash) return 'N/A';
    return `${hash.slice(0, 8)}...${hash.slice(-8)}`;
  };

  const filterDataByDataset = (data) => {
    switch(datasetFilter) {
      case 'mens':
        return data.filter(entry => entry.dataSet === true);
      case 'womens':
        return data.filter(entry => entry.dataSet === false);
      default:
        return data;
    }
  };

  const renderDatasetFilter = () => (
    <div className="dataset-filter">
      <button 
        className={`filter-btn ${datasetFilter === 'all' ? 'active' : ''}`}
        onClick={() => setDatasetFilter('all')}
      >
        All
      </button>
      <button 
        className={`filter-btn ${datasetFilter === 'mens' ? 'active' : ''}`}
        onClick={() => setDatasetFilter('mens')}
      >
        Men's
      </button>
      <button 
        className={`filter-btn ${datasetFilter === 'womens' ? 'active' : ''}`}
        onClick={() => setDatasetFilter('womens')}
      >
        Women's
      </button>
    </div>
  );

  // Add new function to handle copy
  const copyToClipboard = (text) => {
    // Check if navigator.clipboard is available
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(() => {
        console.log('Address copied to clipboard');
      }).catch(err => {
        console.error('Failed to copy address:', err);
        fallbackCopyToClipboard(text);
      });
    } else {
      // Fallback for browsers that don't support clipboard API
      fallbackCopyToClipboard(text);
    }
  };

  const fallbackCopyToClipboard = (text) => {
    try {
      // Create temporary input element
      const textArea = document.createElement('textarea');
      textArea.value = text;
      
      // Make it invisible but part of the document
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      
      // Select and copy
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      
      // Clean up
      textArea.remove();
      console.log('Address copied using fallback method');
    } catch (err) {
      console.error('Fallback copy failed:', err);
    }
  };

  const sortData = (data, key) => {
    const sortedData = [...data];
    
    sortedData.sort((a, b) => {
      let aValue, bValue;
      
      switch(key) {
        case 'dataSet':
          aValue = a.dataSet ? "Men's" : "Women's";
          bValue = b.dataSet ? "Men's" : "Women's";
          break;
        case 'strength':
          aValue = (a.rightHand || 0) + (a.leftHand || 0);
          bValue = (b.rightHand || 0) + (b.leftHand || 0);
          break;
        case 'social':
          aValue = `${a.XHandle || ''}${a.githubUsername || ''}`.toLowerCase();
          bValue = `${b.XHandle || ''}${b.githubUsername || ''}`.toLowerCase();
          break;
        case 'sleep':
          aValue = a.hoursOfSleep || 0;
          bValue = b.hoursOfSleep || 0;
          break;
        case 'reporter':
          aValue = a.reporter || '';
          bValue = b.reporter || '';
          break;
        case 'readableTime':
          aValue = a.readableTime || '';
          bValue = b.readableTime || '';
          break;
        default:
          return 0;
      }
      
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    
    return sortedData;
  };

  const handleSort = (key) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const renderUpdateLog = (log) => {
    const filteredLog = filterDataByDataset(log);
    const sortedLog = sortConfig.key ? sortData(filteredLog, sortConfig.key) : filteredLog;
    
    return (
      <table className="update-log-table">
        <thead>
          <tr>
            <th 
              onClick={() => handleSort('dataSet')}
              className={`sortable ${sortConfig.key === 'dataSet' ? sortConfig.direction : ''}`}
            >
              Dataset
            </th>
            <th 
              onClick={() => handleSort('strength')}
              className={`sortable ${sortConfig.key === 'strength' ? sortConfig.direction : ''}`}
            >
              Grip Strength
            </th>
            <th 
              onClick={() => handleSort('social')}
              className={`sortable ${sortConfig.key === 'social' ? sortConfig.direction : ''}`}
            >
              Social (X/GitHub)
            </th>
            <th 
              onClick={() => handleSort('sleep')}
              className={`sortable ${sortConfig.key === 'sleep' ? sortConfig.direction : ''}`}
            >
              Sleep
            </th>
            <th 
              onClick={() => handleSort('readableTime')}
              className={`sortable ${sortConfig.key === 'readableTime' ? sortConfig.direction : ''}`}
            >
              Time
            </th>
            <th 
              onClick={() => handleSort('reporter')}
              className={`sortable ${sortConfig.key === 'reporter' ? sortConfig.direction : ''}`}
            >
              Reporter
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedLog.length > 0 ? (
            sortedLog.map((entry, index) => (
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
                <td>{entry.readableTime}</td>
                <td className="reporter-cell copyable" onClick={() => copyToClipboard(entry.reporter)}>
                  {truncateAddress(entry.reporter)}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="6" style={{ textAlign: 'center', padding: '20px' }}>
                No entries yet
              </td>
            </tr>
          )}
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
          {renderDatasetFilter()}
          {renderUpdateLog(updateLog)}
        </div>
      </div>
    </>
  );
};

export default Leaderboard; 