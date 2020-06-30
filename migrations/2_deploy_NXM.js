const NXMToken = artifacts.require("NXMToken");

module.exports = function (deployer, network, accounts) {
  const operator = accounts[0]
  const member = accounts[1]
  return deployer.then(async () => {
    const initialSupply = web3.utils.toWei('1000', 'ether')
    const NXM = await deployer.deploy(NXMToken, operator, initialSupply);

    await NXM.changeOperator(operator)
    await NXM.addToWhiteList(member)
  })
};
