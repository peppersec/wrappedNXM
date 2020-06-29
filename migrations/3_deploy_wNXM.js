const wNXM = artifacts.require("wNXM");
const NXM = artifacts.require("NXMToken");

module.exports = function(deployer, network, accounts) {
  return deployer.then(async () => {
    const nxm = await NXM.deployed()
    await deployer.deploy(wNXM, nxm.address);
  })
};

