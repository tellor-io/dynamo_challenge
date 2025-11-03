// Keplr wallet integration for Tellor Layer
const CHAIN_ID = 'layertest-4'; // Testnet chain ID (change to 'tellor-1' for mainnet)
const CHAIN_NAME = 'Layer Testnet';
// RPC endpoints matching Tellor Hub configuration
const RPC_ENDPOINT = process.env.REACT_APP_RPC_URL || 'https://node-palmito.tellorlayer.com/rpc';
const REST_ENDPOINT = process.env.REACT_APP_REST_URL || 'https://node-palmito.tellorlayer.com/rpc';

// Chain configuration for Keplr (matching Tellor Hub)
const getChainConfig = () => ({
  chainId: CHAIN_ID,
  chainName: CHAIN_NAME,
  rpc: RPC_ENDPOINT,
  rest: REST_ENDPOINT,
  bip44: {
    coinType: 118,
  },
  bech32Config: {
    bech32PrefixAccAddr: 'tellor',
    bech32PrefixAccPub: 'tellorpub',
    bech32PrefixValAddr: 'tellorvaloper',
    bech32PrefixValPub: 'tellorvaloperpub',
    bech32PrefixConsAddr: 'tellorvalcons',
    bech32PrefixConsPub: 'tellorvalconspub',
  },
  currencies: [
    {
      coinDenom: 'TRB',
      coinMinimalDenom: 'loya',
      coinDecimals: 6,
    },
  ],
  feeCurrencies: [
    {
      coinDenom: 'TRB',
      coinMinimalDenom: 'loya',
      coinDecimals: 6,
      gasPriceStep: {
        low: 0.01,
        average: 0.025,
        high: 0.04,
      },
    },
  ],
  stakeCurrency: {
    coinDenom: 'TRB',
    coinMinimalDenom: 'loya',
    coinDecimals: 6,
  },
});

// Wait for Keplr to be injected (especially important for mobile)
const waitForKeplr = async (maxRetries = 20, retryDelay = 300) => {
  for (let i = 0; i < maxRetries; i++) {
    console.log(`Checking for Keplr... attempt ${i + 1}/${maxRetries}`);
    console.log('window exists:', typeof window !== 'undefined');
    console.log('window.keplr exists:', typeof window !== 'undefined' && typeof window.keplr !== 'undefined');
    console.log('window.keplr value:', typeof window !== 'undefined' ? window.keplr : 'window undefined');
    
    if (typeof window !== 'undefined' && window.keplr) {
      console.log(`✅ Keplr detected after ${i} retries!`);
      return true;
    }
    
    // Check if we're in mobile browser
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    console.log('Is mobile device:', isMobile);
    
    if (i < maxRetries - 1) {
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
  console.log('❌ Keplr not detected after all retries');
  return false;
};

// Check if Keplr is installed
export const isKeplrInstalled = async () => {
  // First check immediately
  if (typeof window !== 'undefined' && window.keplr) {
    return true;
  }
  
  // If not found, wait for it (mobile apps inject asynchronously)
  console.log('Keplr not immediately available, waiting for injection...');
  return await waitForKeplr();
};

// Connect to Keplr wallet
export const connectKeplr = async () => {
  const keplrAvailable = await isKeplrInstalled();
  
  if (!keplrAvailable) {
    throw new Error('Keplr wallet is not installed or not available. Please install it from https://www.keplr.app/ or open this page in the Keplr mobile app browser.');
  }

  try {
    console.log('Attempting to connect to Keplr...');
    
    // Suggest the chain to Keplr
    console.log('Suggesting chain configuration to Keplr...');
    await window.keplr.experimentalSuggestChain(getChainConfig());
    
    // Enable the chain
    console.log('Enabling chain in Keplr...');
    await window.keplr.enable(CHAIN_ID);
    
    // Get the offline signer
    console.log('Getting offline signer...');
    const offlineSigner = window.keplr.getOfflineSigner(CHAIN_ID);
    
    // Get accounts
    console.log('Getting accounts...');
    const accounts = await offlineSigner.getAccounts();
    
    if (accounts.length === 0) {
      throw new Error('No accounts found in Keplr wallet');
    }
    
    console.log('Successfully connected to Keplr:', accounts[0].address);
    
    return {
      address: accounts[0].address,
      offlineSigner,
    };
  } catch (error) {
    console.error('Error connecting to Keplr:', error);
    throw error;
  }
};

// Get the current Keplr account
export const getKeplrAccount = async () => {
  const keplrAvailable = await isKeplrInstalled();
  
  if (!keplrAvailable) {
    return null;
  }

  try {
    const key = await window.keplr.getKey(CHAIN_ID);
    return {
      address: key.bech32Address,
      name: key.name,
    };
  } catch (error) {
    console.error('Error getting Keplr account:', error);
    return null;
  }
};

// Submit a NoStakeReport transaction using CosmJS (matching Tellor Hub implementation)
export const submitNoStakeReport = async (queryData, value) => {
  const keplrAvailable = await isKeplrInstalled();
  
  if (!keplrAvailable) {
    throw new Error('Keplr wallet is not installed');
  }

  try {
    // Enable Keplr for the chain
    await window.keplr.enable(CHAIN_ID);
    
    // Get account
    const key = await window.keplr.getKey(CHAIN_ID);
    const address = key.bech32Address;
    
    console.log('Submitting from address:', address);
    console.log('Using RPC endpoint:', RPC_ENDPOINT);
    
    // Convert query data to bytes
    let queryDataBytes;
    if (typeof queryData === 'string') {
      const hexString = queryData.startsWith('0x') ? queryData.slice(2) : queryData;
      queryDataBytes = new Uint8Array(hexString.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
    } else if (queryData instanceof Uint8Array) {
      queryDataBytes = queryData;
    } else {
      throw new Error('Query data must be a hex string or Uint8Array');
    }
    
    console.log('Query data length:', queryDataBytes.length);
    console.log('Value:', value);
    
    // Import protobuf.js for message encoding (like Tellor Hub)
    const protobuf = await import('protobufjs');
    
    // Get offline signer from Keplr
    const offlineSigner = window.keplr.getOfflineSigner(CHAIN_ID);
    
    // Import required CosmJS modules
    const { SigningStargateClient, defaultRegistryTypes } = await import('@cosmjs/stargate');
    const { Registry } = await import('@cosmjs/proto-signing');
    
    // Create protobuf type for MsgNoStakeReport (following Tellor Hub pattern)
    const root = new protobuf.Root();
    const MsgNoStakeReport = new protobuf.Type("MsgNoStakeReport")
      .add(new protobuf.Field("creator", 1, "string"))
      .add(new protobuf.Field("query_data", 2, "bytes"))
      .add(new protobuf.Field("value", 3, "string"));
    
    root.add(MsgNoStakeReport);
    const MsgType = root.lookupType("MsgNoStakeReport");
    
    console.log('Created protobuf MsgNoStakeReport type');
    
    // Create the custom encoder/decoder using protobuf.js
    const MsgNoStakeReportType = {
      encode: (message, writer) => {
        const msgValue = {
          creator: message.creator,
          query_data: message.query_data,
          value: message.value
        };
        console.log('Encoding message value:', msgValue);
        const created = MsgType.create(msgValue);
        console.log('Created protobuf message:', created);
        
        // Use provided writer or create a new one
        if (!writer) {
          writer = protobuf.Writer.create();
        }
        
        // Encode the message into the writer
        MsgType.encode(created, writer);
        console.log('Encoded into writer');
        
        // Return the writer (CosmJS will call finish() on it)
        return writer;
      },
      decode: (input) => {
        const reader = input instanceof protobuf.Reader ? input : protobuf.Reader.create(input);
        return MsgType.decode(reader);
      },
      fromPartial: (object) => {
        return {
          creator: object.creator || '',
          query_data: object.query_data || new Uint8Array(),
          value: object.value || ''
        };
      }
    };
    
    // Create custom registry
    const registry = new Registry(defaultRegistryTypes);
    registry.register('/layer.oracle.MsgNoStakeReport', MsgNoStakeReportType);
    
    console.log('Registered MsgNoStakeReport with CosmJS registry');
    
    // Create the Stargate client with custom registry
    const client = await SigningStargateClient.connectWithSigner(
      RPC_ENDPOINT,
      offlineSigner,
      { registry }
    );
    
    console.log('Connected to RPC with protobuf.js encoding');
    
    // Create the no-stake report message
    const msg = {
      typeUrl: '/layer.oracle.MsgNoStakeReport',
      value: {
        creator: address,
        query_data: queryDataBytes,
        value: value
      }
    };
    
    console.log('Prepared message:', {
      creator: msg.value.creator,
      query_data_length: queryDataBytes.length,
      value: msg.value.value
    });
    
    // Use higher gas limits like Tellor Hub does
    const fee = {
      amount: [{ denom: 'loya', amount: '15000' }],
      gas: '1000000'
    };
    
    console.log('Broadcasting transaction with fee:', fee);
    
    // Sign and broadcast
    const result = await client.signAndBroadcast(
      address,
      [msg],
      fee,
      'Dynamo Challenge Submission'
    );
    
    console.log('Transaction result:', result);
    
    if (result && result.code === 0) {
      // Extract transaction hash (trying different possible field names)
      const txHash = result.transactionHash || 
                    result.txhash || 
                    result.hash || 
                    result.tx_response?.txhash ||
                    result.tx_response?.hash;
      
      return {
        success: true,
        txHash: txHash,
        height: result.height || result.tx_response?.height,
        message: 'Transaction submitted successfully! Check the leaderboard in a few seconds.',
      };
    } else {
      throw new Error(`Transaction failed with code: ${result.code}`);
    }
    
  } catch (error) {
    console.error('Error submitting no stake report:', error);
    
    // Provide more helpful error messages
    if (error.message.includes('rejected')) {
      throw new Error('Transaction rejected by user');
    }
    if (error.message.includes('not found')) {
      throw new Error('Chain not found in Keplr. Make sure you are connected to the correct network.');
    }
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      throw new Error('Network error: Could not connect to RPC endpoint. Please try again.');
    }
    
    throw error;
  }
};

// Listen for Keplr account changes
export const onKeplrAccountChange = (callback) => {
  if (!isKeplrInstalled()) {
    return () => {};
  }

  window.addEventListener('keplr_keystorechange', callback);
  
  return () => {
    window.removeEventListener('keplr_keystorechange', callback);
  };
};

