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
  }
}

export default networkConfig
