const BaseRegistrarImplementation = artifacts.require("./BaseRegistrarImplementation"),
  BSCRegistrarController = artifacts.require("./BSCRegistrarController");

const migrationRepository = require('../repositories/migrationDB');

const getBaseRegistrarImplementationContract = async () => {
    const address = await migrationRepository.getBaseRegistrarImplementationAddress();
    return BaseRegistrarImplementation.at(address);
  },
  getBSCRegistrarControllerContract = async () => {
    const address = await migrationRepository.getBSCRegistrarControllerAddress();
    return BSCRegistrarController.at(address);
  };

module.exports = async function (deployer, network, accounts) {
  const iBaseRegistrarImplementation = await getBaseRegistrarImplementationContract(),
    iBSCRegistrarController = await getBSCRegistrarControllerContract(),
    ownerAccount = accounts[0];

  await iBaseRegistrarImplementation.addController(
    iBSCRegistrarController.address,
    {from: ownerAccount}
  );

  await iBaseRegistrarImplementation.addController(
    ownerAccount,
    {from: ownerAccount}
  );
}
