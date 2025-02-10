const BASE_URL = 'https://layer-node.com';

// Helper function to decode hex string to number
const hexToNumber = (hex) => {
  return parseInt(hex, 16);
};

// Helper function to decode hex string to string
const hexToString = (hex) => {
  // Remove trailing zeros
  hex = hex.replace(/0+$/, '');
  // Convert hex to string
  let str = '';
  for (let i = 0; i < hex.length; i += 2) {
    str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
  }
  return str;
};

export const fetchOracleData = async (oracleQueryId, bridgeTimestamp) => {
  try {
    const currentTimestamp = Date.now();
    const MAX_SAFE_ENTRIES = 500; // Increased safety limit to 500 entries
    
    console.log('Attempting to fetch data with:', { 
      oracleQueryId, 
      timestamp: currentTimestamp,
      readableTime: new Date(currentTimestamp).toISOString()
    });
    
    // Try to fetch real data first
    const results = [];
    let timestamp = currentTimestamp;
    
    while (results.length < MAX_SAFE_ENTRIES) {
      const url = `${BASE_URL}/tellor-io/layer/oracle/get_data_before/${oracleQueryId}/${timestamp}`;
      console.log('Requesting URL:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Response not OK:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });
        break;
      }
      
      const data = await response.json();
      
      if (data.aggregate?.aggregate_value) {
        try {
          const hexValue = data.aggregate.aggregate_value.replace('0x', '');
          const chunks = hexValue.match(/.{1,64}/g);
          
          const decodedData = {
            dataSet: chunks[0].slice(-1) === '1',
            rightHand: parseInt(chunks[1], 16) / 1e18,
            leftHand: parseInt(chunks[2], 16) / 1e18,
            XHandle: hexToString(chunks[7]),
            githubUsername: hexToString(chunks[9]),
            hoursOfSleep: parseInt(chunks[5], 16),
            reporter: data.aggregate.aggregate_reporter,
            timestamp: data.timestamp
          };
          
          results.push(decodedData);
          // Ensure we move back in time by at least 1 second
          timestamp = Math.min(data.timestamp - 1000, timestamp - 1000);
        } catch (error) {
          console.error('Error decoding data:', error);
          break;
        }
      } else {
        console.log('No more data available after fetching', results.length, 'entries');
        break;
      }
    }

    // If no results were found, return empty array
    if (results.length === 0) {
      console.log('No real data found, returning empty array');
      return [];
    }

    if (results.length >= MAX_SAFE_ENTRIES) {
      console.warn(`Reached safety limit of ${MAX_SAFE_ENTRIES} entries. Some older entries might not be included.`);
    }

    console.log('Fetched all available results:', results);
    return results;
  } catch (error) {
    console.error('Fetch error:', error);
    throw error;
  }
}; 