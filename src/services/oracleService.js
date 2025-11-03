// Define RPC endpoints - can be configured via environment variables
// For React apps, use REACT_APP_ prefix for env vars
const PRIMARY_URL = process.env.REACT_APP_RPC_URL || process.env.REACT_APP_PRIMARY_RPC_URL || 'https://node-palmito.tellorlayer.com';
const FALLBACK_URL = process.env.REACT_APP_FALLBACK_RPC_URL || 'https://tellorlayer.com';
let BASE_URL = PRIMARY_URL;

// Log the configured RPC endpoint for debugging
console.log('RPC Configuration:', { PRIMARY_URL, FALLBACK_URL, using: BASE_URL });

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
    console.log('Fetching no stake reports for queryId:', oracleQueryId);

    const MAX_SAFE_ENTRIES = 500;
    const results = [];
    let usedFallback = false;
    let nextKey = null;
    
    // Remove 0x prefix if present for the API call
    const cleanQueryId = oracleQueryId.startsWith('0x') ? oracleQueryId.slice(2) : oracleQueryId;
    console.log('Starting data fetch from no stake reports endpoint with clean queryId:', cleanQueryId);
    
    // Fetch with pagination support
    while (results.length < MAX_SAFE_ENTRIES) {
      let url = `${BASE_URL}/tellor-io/layer/oracle/get_no_stake_reports_by_qid/${cleanQueryId}`;
      
      // Add pagination if we have a next key
      if (nextKey) {
        url += `?pagination.key=${encodeURIComponent(nextKey)}`;
      }
      
      console.log(`Fetching no stake reports from: ${url}`);
      
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
            nextKey = null; // Reset pagination for retry
            continue; // Retry with fallback URL
          }
          console.log('Breaking loop due to response error after', results.length, 'entries');
          break;
        }
        
        const data = await response.json();
        console.log('API Response:', data);
        
        // Handle the no stake reports response structure
        if (data.no_stake_reports && Array.isArray(data.no_stake_reports)) {
          for (const report of data.no_stake_reports) {
            try {
              // Decode the value field (hex string)
              const hexValue = report.value.replace('0x', '');
              const chunks = hexValue.match(/.{1,64}/g) || [];
              
              // Only proceed if we have enough chunks
              if (chunks.length >= 10) {
                // Debug: log the raw timestamp to figure out its format
                console.log('Raw timestamp from API:', report.timestamp);
                
                // Try to parse the timestamp - it might be a string representation of nanoseconds
                let timestampMs;
                const timestampStr = report.timestamp.toString();
                
                if (timestampStr.length >= 18) {
                  // Timestamp is in nanoseconds (19 digits) - divide by 1,000,000
                  timestampMs = parseInt(timestampStr) / 1000000;
                } else if (timestampStr.length >= 15) {
                  // Timestamp is in microseconds (16 digits) - divide by 1,000
                  timestampMs = parseInt(timestampStr) / 1000;
                } else if (timestampStr.length >= 12) {
                  // Timestamp is already in milliseconds (13 digits)
                  timestampMs = parseInt(timestampStr);
                } else {
                  // Timestamp is in seconds (10 digits) - multiply by 1,000
                  timestampMs = parseInt(timestampStr) * 1000;
                }
                
                console.log('Converted timestamp to ms:', timestampMs);
                console.log('Date:', new Date(timestampMs));
                
                const decodedData = {
                  dataSet: chunks[0]?.charAt(0) === '1', // Check first character, not last
                  rightHand: chunks[1] ? parseInt(chunks[1], 16) / 1e18 : 0,
                  leftHand: chunks[2] ? parseInt(chunks[2], 16) / 1e18 : 0,
                  XHandle: hexToString(chunks[7]),
                  githubUsername: hexToString(chunks[9]),
                  hoursOfSleep: chunks[5] ? parseInt(chunks[5], 16) : 0,
                  reporter: report.reporter || 'N/A',
                  readableTime: new Date(timestampMs).toLocaleString(),
                  timestamp: report.timestamp,
                  blockNumber: report.block_number // Store block number for linking
                };
                
                console.log('Successfully decoded no stake report:', decodedData);
                console.log('Report object keys:', Object.keys(report));
                results.push(decodedData);
              } else {
                console.warn('Skipping report due to insufficient data chunks:', chunks.length);
              }
            } catch (error) {
              console.error('Error decoding report:', error, report);
              continue; // Continue to next report
            }
          }
          
          // Check for pagination
          if (data.pagination?.next_key) {
            nextKey = data.pagination.next_key;
            console.log('More results available, continuing pagination');
          } else {
            console.log('No more pages available');
            break;
          }
        } else {
          console.log('No no_stake_reports found in response');
          break;
        }
        
      } catch (fetchError) {
        console.error('Fetch error:', fetchError);
        
        // If primary URL failed and we haven't tried fallback yet, switch to fallback
        if (BASE_URL === PRIMARY_URL && !usedFallback) {
          console.log('Primary URL failed, switching to fallback URL');
          BASE_URL = FALLBACK_URL;
          usedFallback = true;
          nextKey = null; // Reset pagination for retry
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