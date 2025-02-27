// Define both URLs
const PRIMARY_URL = 'https://tellorlayer.com';
const FALLBACK_URL = 'https://rpc.layer-node.com'; // Example fallback URL
let BASE_URL = PRIMARY_URL;

// Helper function to decode hex string to number
const hexToNumber = (hex) => {
  return parseInt(hex, 16);
};

// Helper function to decode hex string to string
const hexToString = (hex) => {
  if (!hex) return '';  // Return empty string if hex is undefined or null
  try {
    // Remove trailing zeros
    hex = hex.replace(/0+$/, '');
    // Convert hex to string
    let str = '';
    for (let i = 0; i < hex.length; i += 2) {
      str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
    }
    return str;
  } catch (error) {
    console.warn('Error decoding hex string:', error);
    return '';  // Return empty string on error
  }
};

export const fetchOracleData = async (oracleQueryId, bridgeTimestamp) => {
  try {
    console.log('Fetching data for queryId:', oracleQueryId);

    const currentTimestamp = Date.now();
    const MAX_SAFE_ENTRIES = 500;
    
    // Try to fetch real data first
    const results = [];
    let timestamp = currentTimestamp;
    let usedFallback = false;
    
    console.log('Starting data fetch loop with timestamp:', timestamp);
    
    while (results.length < MAX_SAFE_ENTRIES) {
      const url = `${BASE_URL}/tellor-io/layer/oracle/get_data_before/${oracleQueryId}/${timestamp}`;
      console.log(`Fetch attempt #${results.length + 1} with timestamp:`, timestamp);
      
      try {
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
            body: errorText,
            timestamp: timestamp
          });
          
          // If primary URL failed and we haven't tried fallback yet, switch to fallback
          if (BASE_URL === PRIMARY_URL && !usedFallback) {
            console.log('Primary URL failed, switching to fallback URL');
            BASE_URL = FALLBACK_URL;
            usedFallback = true;
            continue; // Retry with fallback URL
          }
          console.log('Breaking loop due to response error after', results.length, 'entries');
          break;
        }
        
        const data = await response.json();
        console.log('API Response for timestamp', timestamp, ':', data);
        
        if (data.aggregate?.aggregate_value) {
          try {
            const hexValue = data.aggregate.aggregate_value.replace('0x', '');
            const chunks = hexValue.match(/.{1,64}/g) || [];
            
            // Only proceed if we have enough chunks
            if (chunks.length >= 10) {
              const decodedData = {
                dataSet: chunks[0]?.slice(-1) === '1',
                rightHand: chunks[1] ? parseInt(chunks[1], 16) / 1e18 : 0,
                leftHand: chunks[2] ? parseInt(chunks[2], 16) / 1e18 : 0,
                XHandle: hexToString(chunks[7]),
                githubUsername: hexToString(chunks[9]),
                hoursOfSleep: chunks[5] ? parseInt(chunks[5], 16) : 0,
                reporter: 'tellor17gc67q05d5rgsz9caznm0s7s5eazwg2e3fkk8e',
                readableTime: new Date(parseInt(data.timestamp)).toLocaleString(),
                timestamp: data.timestamp
              };
              
              console.log('Successfully decoded data:', decodedData);
              
              results.push(decodedData);
              const oldTimestamp = timestamp;
              timestamp = Math.min(data.timestamp - 1000, timestamp - 1000);
              console.log('Updated timestamp from', oldTimestamp, 'to', timestamp);
            } else {
              console.warn('Skipping entry due to insufficient data chunks:', chunks.length);
              timestamp = Math.min(data.timestamp - 1000, timestamp - 1000);
            }
          } catch (error) {
            console.error('Error decoding data:', error);
            console.log('Continuing to next entry after decode error');
            timestamp = Math.min(data.timestamp - 1000, timestamp - 1000);
            continue; // Continue instead of breaking
          }
        } else {
          console.log('No more data available after fetching', results.length, 'entries');
          break;
        }
        
      } catch (fetchError) {
        console.error('Fetch error:', fetchError);
        
        // If primary URL failed and we haven't tried fallback yet, switch to fallback
        if (BASE_URL === PRIMARY_URL && !usedFallback) {
          console.log('Primary URL failed, switching to fallback URL');
          BASE_URL = FALLBACK_URL;
          usedFallback = true;
          continue; // Retry with fallback URL
        }
        console.log('Breaking loop due to fetch error after', results.length, 'entries');
        break;
      }
    }

    // Reset BASE_URL to PRIMARY_URL for next time
    BASE_URL = PRIMARY_URL;

    // If no results were found, return empty array
    if (results.length === 0) {
      console.log('No data found from either URL, returning empty array');
      return [];
    }

    if (results.length >= MAX_SAFE_ENTRIES) {
      console.warn(`Reached safety limit of ${MAX_SAFE_ENTRIES} entries. Some older entries might not be included.`);
    }

    console.log('Final results count:', results.length);
    return results;
  } catch (error) {
    console.error('Fatal error:', error);
    // Reset BASE_URL to PRIMARY_URL in case of fatal error
    BASE_URL = PRIMARY_URL;
    throw error;
  }
}; 