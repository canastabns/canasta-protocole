const BaseRegistrarContract = artifacts.require("./BaseRegistrarImplementation");

const migrationRepository = require('../repositories/migrationDB'),
  deployConstants = require('../constants/deploy');

module.exports = async function (deployer, network, accounts) {
  const ensAddress = await migrationRepository.getENSRegisterAddress();
  await deployer.deploy(
    BaseRegistrarContract,
    ensAddress,
    deployConstants.TLD_NAMEHASH
  );
  const baseRegistrarInstance = await BaseRegistrarContract.deployed();
  await migrationRepository.saveBaseRegistrarImplementationAddress(baseRegistrarInstance.address);
}
