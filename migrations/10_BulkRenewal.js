const BulkRenewal = artifacts.require("./BulkRenewal");

const ENSRegistry = artifacts.require("./ENSRegistry");

const migrationRepository = require('../repositories/migrationDB');

const getENSContract = async () => {
    const address = await migrationRepository.getENSRegisterAddress();
    return ENSRegistry.at(address)
  };

module.exports = async function (deployer) {
  const iENSRegister = await getENSContract();

  await deployer.deploy(
    BulkRenewal,
    iENSRegister.address
  ).then(instance => migrationRepository.saveBulkRenewalAddress(instance.address));
}
