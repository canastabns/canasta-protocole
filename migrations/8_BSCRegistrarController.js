const BSCRegistrarControllerContract = artifacts.require("./BSCRegistrarController"),
  BaseRegistrarContract = artifacts.require("./BaseRegistrarImplementation"),
  StablePriceOracleContract = artifacts.require("./StablePriceOracle");

const migrationRepository = require('../repositories/migrationDB');

const getBaseRegistrarInstance = async () => {
    const address = await migrationRepository.getBaseRegistrarImplementationAddress()
    return BaseRegistrarContract.at(address);
  },
  getStablePriceOracle = async () => {
    const address = await migrationRepository.getStablePriceOracleAddress()
    return StablePriceOracleContract.at(address);
  };

module.exports = async (deployer, network, accounts) => {
  const baseRegistrarInstance = await getBaseRegistrarInstance(),
    stablePriceOracleInstance = await getStablePriceOracle();

  await deployer.deploy(
    BSCRegistrarControllerContract,
    baseRegistrarInstance.address,
    stablePriceOracleInstance.address,
    60,
    86400,
    process.env.TOKEN_ADDRESS
  );
  const controllerInstance = await BSCRegistrarControllerContract.deployed();
  await migrationRepository.saveBSCRegistrarControllerAddress(controllerInstance.address);

  await baseRegistrarInstance.addController(controllerInstance.address, {from: accounts[0]});
  await controllerInstance.setPriceOracle(stablePriceOracleInstance.address, {from: accounts[0]});
}
