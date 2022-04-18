const PublicResolver = artifacts.require("./PublicResolver"),
  ENSRegistry = artifacts.require("./ENSRegistry"),
  BaseRegistrarImplementation = artifacts.require("./BaseRegistrarImplementation"),
  BSCRegistrarController = artifacts.require("./BSCRegistrarController");

const migrationRepository = require('../repositories/migrationDB'),
  deployConstants = require('../constants/deploy');

const getENSContract = async () => {
    const address = await migrationRepository.getENSRegisterAddress();
    return ENSRegistry.at(address)
  },
  getPublicResolverContract = async () => {
    const address = await migrationRepository.getPublicResolverAddress();
    return PublicResolver.at(address);
  },
  getBaseRegistrarImplementationContract = async () => {
    const address = await migrationRepository.getBaseRegistrarImplementationAddress();
    return BaseRegistrarImplementation.at(address);
  },
  getBSCRegistrarControllerContract = async () => {
    const address = await migrationRepository.getBSCRegistrarControllerAddress();
    return BSCRegistrarController.at(address);
  };

module.exports = async function (deployer, network, accounts) {
  const iENSRegister = await getENSContract(),
    iPublicResolverAddress = await getPublicResolverContract(),
    iBaseRegistrarImplementation = await getBaseRegistrarImplementationContract(),
    iBSCRegistrarController = await getBSCRegistrarControllerContract(),
    ownerAccount = accounts[0];

  await iENSRegister.setSubnodeRecord(
    '0x0',
    deployConstants.TLD_NODE,
    ownerAccount,
    iPublicResolverAddress.address,
    0
  );

  await iPublicResolverAddress.setInterface(
    deployConstants.TLD_NAMEHASH,
    '0x018fac06',
    iBSCRegistrarController.address
  );

  await iENSRegister.setOwner(
    deployConstants.TLD_NAMEHASH,
    iBaseRegistrarImplementation.address
  );
}
