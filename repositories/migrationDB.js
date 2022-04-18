const low = require('lowdb'),
  FileSync = require('lowdb/adapters/FileSync'),
  path = require('path');

const adapter = new FileSync(`${path.resolve(__dirname)}/migrationDB.json`)
const db = low(adapter);

const insertValueByKey = (key, value) => db.set(key, value).write();
const selectByKey = key => db.get(key).write();

module.exports = {
  saveMigrationAddress: address => insertValueByKey("migration", address),
  saveENSRegisterAddress: address => insertValueByKey("ENSRegistry", address),
  savePublicResolverAddress: address => insertValueByKey("PublicResolver", address),
  saveFIFSRegistrarAddress: address => insertValueByKey("FIFSRegistrar", address),
  saveReverseRegistrarAddress: address => insertValueByKey("ReverseRegistrar", address),
  saveTestRegistrarAddress: address => insertValueByKey("TestRegistrar", address),
  saveBaseRegistrarImplementationAddress: address => insertValueByKey("BaseRegistrarImplementation", address),
  saveStablePriceOracleAddress: address => insertValueByKey("StablePriceOracle", address),
  saveBSCRegistrarControllerAddress: address => insertValueByKey("BSCRegistrarController", address),
  saveBulkRenewalAddress: address => insertValueByKey("BulkRenewal", address),
  saveENSRegistryWithFallbackAddress: address => insertValueByKey("ENSRegistryWithFallback", address),

  getMigrationAddress: () => selectByKey('migration'),
  getENSRegisterAddress: () => selectByKey('ENSRegistry'),
  getPublicResolverAddress: () => selectByKey('PublicResolver'),
  getFIFSRegistrarAddress: () => selectByKey('FIFSRegistrar'),
  getReverseRegistrarAddress: () => selectByKey('ReverseRegistrar'),
  getStablePriceOracleAddress: () => selectByKey('StablePriceOracle'),
  getBaseRegistrarImplementationAddress: () => selectByKey('BaseRegistrarImplementation'),
  getBSCRegistrarControllerAddress: () => selectByKey('BSCRegistrarController'),
  getBulkRenewalAddress: () => selectByKey('BulkRenewal'),
  getENSRegistryWithFallbackAddress: () => selectByKey('ENSRegistryWithFallback'),
};
