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
    console.log('Fetching data for queryId:', oracleQueryId);

    const currentTimestamp = Date.now();
    const MAX_SAFE_ENTRIES = 500;
    
    // Try to fetch real data first
    const results = [];
    let timestamp = currentTimestamp;
    let usedFallback = false;
    
    while (results.length < MAX_SAFE_ENTRIES) {
      const url = `${BASE_URL}/tellor-io/layer/oracle/get_data_before/${oracleQueryId}/${timestamp}`;
      console.log('Attempting with URL:', url);
      
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
            body: errorText
          });
          
          // If primary URL failed and we haven't tried fallback yet, switch to fallback
          if (BASE_URL === PRIMARY_URL && !usedFallback) {
            console.log('Primary URL failed, switching to fallback URL');
            BASE_URL = FALLBACK_URL;
            usedFallback = true;
            continue; // Retry with fallback URL
          }
          break;
        }
        
        const data = await response.json();
        
        if (data.aggregate?.aggregate_value) {
          try {
            const hexValue = data.aggregate.aggregate_value.replace('0x', '');
            const chunks = hexValue.match(/.{1,64}/g);
            
            console.log('Full API Response:', data);
            
            const decodedData = {
              dataSet: chunks[0].slice(-1) === '1',
              rightHand: parseInt(chunks[1], 16) / 1e18,
              leftHand: parseInt(chunks[2], 16) / 1e18,
              XHandle: hexToString(chunks[7]),
              githubUsername: hexToString(chunks[9]),
              hoursOfSleep: parseInt(chunks[5], 16),
              reporter: 'tellor17gc67q05d5rgsz9caznm0s7s5eazwg2e3fkk8e',
              readableTime: new Date(parseInt(data.timestamp)).toLocaleString(),
              timestamp: data.timestamp
            };
            
            console.log('Decoded data with tx hash:', decodedData);
            
            results.push(decodedData);
            timestamp = Math.min(data.timestamp - 1000, timestamp - 1000);
          } catch (error) {
            console.error('Error decoding data:', error);
            break;
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

    return results;
  } catch (error) {
    console.error('Fatal error:', error);
    // Reset BASE_URL to PRIMARY_URL in case of fatal error
    BASE_URL = PRIMARY_URL;
    throw error;
  }
}; 