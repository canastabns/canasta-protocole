const FIFSRegistrarContract = artifacts.require("./FIFSRegistrar"),
  ENSRegistryContract = artifacts.require("./ENSRegistry");

const migrationRepository = require('../repositories/migrationDB'),
  deployConstants = require('../constants/deploy');

const getENSContract = async () => {
    const address = await migrationRepository.getENSRegisterAddress()
    return ENSRegistryContract.at(address);
  },
  setupRegistrar = (ens, registrar) => ens.setSubnodeOwner(
    "0x0000000000000000000000000000000000000000",
    deployConstants.TLD_NODE,
    registrar.address
  );

module.exports = async function (deployer, network, accounts) {
  const ensInstance = await getENSContract();

  await deployer.deploy(
    FIFSRegistrarContract,
    ensInstance.address,
    deployConstants.TLD_NAMEHASH
  );

  const registrarInstance = await FIFSRegistrarContract.deployed();

  await migrationRepository.saveFIFSRegistrarAddress(registrarInstance.address);
  await setupRegistrar(ensInstance, registrarInstance);
}
