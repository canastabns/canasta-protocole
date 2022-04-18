const StablePriceOracleContract = artifacts.require("./StablePriceOracle");

const migrationRepository = require('../repositories/migrationDB');

module.exports = async function (deployer) {
  return deployer.deploy(
    StablePriceOracleContract,
    process.env.ORACLE_STABLE_PRICE,
    [0, 0, 20294266869609, 5073566717402, 158548959919]
  ).then(instance => migrationRepository.saveStablePriceOracleAddress(instance.address));
}
