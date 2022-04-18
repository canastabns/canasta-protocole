const namehash = require('eth-ens-namehash'),
  sha3 = require('web3-utils').sha3;

module.exports = {
  TLD_NAMEHASH: namehash.hash("bnb"),
  TLD_NODE: sha3("bnb"),

  TLD_TEST_NAMEHASH: namehash.hash("test"),
  TLD_TEST_NODE: sha3("test"),

  RESOLVER_NODE: sha3("resolver"),
  RESOLVER_NAMEHASH: namehash.hash("resolver"),

  REVERSE_NAMEHASH: namehash.hash("reverse"),
  REVERSE_NODE: sha3("reverse"),

  ADDR_NAMEHASH: namehash.hash("addr"),
  ADDR_NODE: sha3("addr"),
}
