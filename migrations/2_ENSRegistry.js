const ENS = artifacts.require("./ENSRegistry");
const migrationRepository = require('../repositories/migrationDB');

module.exports = function(deployer) {
  deployer.deploy(ENS)
    .then(async i => migrationRepository.saveENSRegisterAddress(i.address))
}
