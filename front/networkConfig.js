const networkConfig = {
  netId1: {
    verifyingContract: '0x0d438F3b5175Bebc262bF23753C1E53d03432bDE',
    NXM: '0xd7c49CEE7E9188cCa6AD8FF264C1DA2e69D4Cf3B',
    rpcCallRetryAttempt: 10,
    currencyName: 'ETH',
    explorerUrl: {
      tx: 'https://etherscan.io'
    },
    networkName: 'Mainnet',
    rpcUrl: 'https://api.mycryptoapi.com/eth',
    gasPrice: { fast: 21, low: 1, standard: 5 },
    gasOracleUrls: [
      'https://www.etherchain.org/api/gasPriceOracle',
      'https://gasprice.poa.network/'
    ],
    smartContractPollTime: 15
  },
  netId42: {
    verifyingContract: '0x80d4d07546D106727E4E6f024a564Eb51EA5a9e8',
    NXM: '0xe70362E21233Bc8F9FB275d067875A0B3e61ACeA',
    rpcCallRetryAttempt: 10,
    currencyName: 'kETH',
    explorerUrl: {
      tx: 'https://kovan.etherscan.io'
    },
    networkName: 'Kovan',
    rpcUrl: 'https://kovan.poa.network',
    gasPrice: { fast: 21, low: 1, standard: 5 },
    gasOracleUrls: [
      'https://www.etherchain.org/api/gasPriceOracle',
      'https://gasprice.poa.network/'
    ],
    smartContractPollTime: 15
  }
}

export default networkConfig
