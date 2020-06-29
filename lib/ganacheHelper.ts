// This module is used only for tests
function send(method: string, params: any[] = []): Promise<any> {
  return new Promise((resolve, reject) => {
    // eslint-disable-next-line no-undef
    web3.currentProvider.send({
      jsonrpc: '2.0',
      id: Date.now(),
      method,
      params
    }, (err: any, res: any) => {
      return err ? reject(err) : resolve(res);
    });
  });
}

export const takeSnapshot = async (): Promise<{ result: string }> => {
  return send('evm_snapshot');
};

const traceTransaction = async (tx: any) => {
  return send('debug_traceTransaction', [tx, {}]);
};

export const revertSnapshot = async (id: string) => {
  await send('evm_revert', [id]);
};

const mineBlock = async (timestamp: number) => {
  await send('evm_mine', [timestamp]);
};

const increaseTime = async (seconds: number) => {
  await send('evm_increaseTime', [seconds]);
};

const minerStop = async () => {
  await send('miner_stop', []);
};

const minerStart = async () => {
  await send('miner_start', []);
};

export default {
  takeSnapshot,
  revertSnapshot,
  mineBlock,
  minerStop,
  minerStart,
  increaseTime,
  traceTransaction
};
