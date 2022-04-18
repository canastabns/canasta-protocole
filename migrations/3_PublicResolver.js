const deployConstants = require('../constants/deploy');

const PublicResolverContract = artifacts.require("./PublicResolver"),
  ENSRegistryContract = artifacts.require("./ENSRegistry");

const migrationRepository = require('../repositories/migrationDB'),
  getENSContract = async () => {
    const ensAddress = await migrationRepository.getENSRegisterAddress();
    return ENSRegistryContract.at(ensAddress);
  };

async function setupResolver(ens, resolver, accounts) {
  const resolverNode = deployConstants.RESOLVER_NODE;
  const resolverLabel = deployConstants.RESOLVER_NAMEHASH;

  await ens.setSubnodeOwner("0x0000000000000000000000000000000000000000", resolverNode, accounts[0]);
  await ens.setResolver(resolverLabel, resolver.address, {from: accounts[0]});
  await resolver.setAddr(resolverLabel, resolver.address);
}

module.exports = async function (deployer, network, accounts) {
  const ensInstance = await getENSContract();

  await deployer.deploy(PublicResolverContract, ensInstance.address);
  const resolverInstance = await PublicResolverContract.deployed();
  await migrationRepository.savePublicResolverAddress(resolverInstance.address);
  await setupResolver(ensInstance, resolverInstance, accounts);
}
