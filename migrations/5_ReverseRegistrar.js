const ReverseRegistrar = artifacts.require("./ReverseRegistrar"),
  ENSRegistry = artifacts.require("./ENSRegistry"),
  PublicResolver = artifacts.require("./PublicResolver"),
  deployConstants = require('../constants/deploy');

const migrationRepository = require('../repositories/migrationDB');

const getENSContract = async () => {
    const address = await migrationRepository.getENSRegisterAddress();
    return ENSRegistry.at(address)
  },
  getPublicResolverContract = async () => {
    const address = await migrationRepository.getPublicResolverAddress();
    return PublicResolver.at(address);
  }

async function setupReverseRegistrar(ens, resolver, reverseRegistrar, accounts) {
  await ens.setSubnodeOwner(
    "0x0000000000000000000000000000000000000000",
    deployConstants.REVERSE_NODE,
    accounts[0]
  );
  await ens.setSubnodeOwner(
    deployConstants.REVERSE_NAMEHASH,
    deployConstants.ADDR_NODE,
    reverseRegistrar.address
  );
}

module.exports = async function (deployer, network, accounts) {
  const ensInstance = await getENSContract(),
    resolverContractInstance = await getPublicResolverContract();

  await deployer.deploy(
    ReverseRegistrar,
    ensInstance.address,
    resolverContractInstance.address
  );

  const reverseRegistrarInstance = await ReverseRegistrar.deployed();

  await migrationRepository.saveReverseRegistrarAddress(reverseRegistrarInstance.address);

  await setupReverseRegistrar(
    ensInstance,
    resolverContractInstance,
    reverseRegistrarInstance,
    accounts
  );
}
