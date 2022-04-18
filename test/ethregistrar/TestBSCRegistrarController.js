const Web3Utils = require("web3-utils"),
  Web3 = require("web3"),
  namehash = require('eth-ens-namehash');

const sha3 = require('web3-utils').sha3;
const toBN = require('web3-utils').toBN;

const calculateReward = ({
                                 totalStaked,
                                 depositAmount,
                           stakedAmount
                               }) => {
    const onE8 = toBN(`${1e18}`);

  const nDepositAmount = toBN(`${depositAmount}`),
    nAccount1StakeAmount = toBN(`${stakedAmount}`),
    percentageRate = nAccount1StakeAmount
      .div(totalStaked.div(onE8))
      .add(onE8),
    cal = nDepositAmount
      .mul(percentageRate)
      .div(onE8)
      .sub(nDepositAmount);

  return cal.toString();
}


const ENS = artifacts.require('./registry/ENSRegistry'),
  PublicResolver = artifacts.require('./resolvers/PublicResolver'),
  BaseRegistrar = artifacts.require('./BaseRegistrarImplementation'),
  BSCRegistrarController = artifacts.require('./BSCRegistrarController'),
  DummyOracle = artifacts.require('./DummyOracle'),
  StablePriceOracle = artifacts.require('./StablePriceOracle'),
  CNSTContract = artifacts.require('./staking/CNST');

const { evm, exceptions } = require("../test-utils");

const DAYS = 24 * 60 * 60;
const NULL_ADDRESS = "0x0000000000000000000000000000000000000000"

contract('BSCRegistrarController', function (accounts) {
  let ens,
    resolver,
    baseRegistrar,
    controller,
    priceOracle,
    CNSTInstance;

  const secret = process.env.SECRET_TEST;
  const ownerAccount = accounts[0]; // Account that owns the registrar
  const registrantAccount = accounts[1]; // Account that owns test names

  before(async () => {
    CNSTInstance = await CNSTContract.new({from: ownerAccount});
    ens = await ENS.new();

    resolver = await PublicResolver.new(ens.address);

    baseRegistrar = await BaseRegistrar.new(ens.address, namehash.hash('bsc'), {from: ownerAccount});
    await ens.setSubnodeOwner('0x0', sha3('bnb'), baseRegistrar.address);

    const dummyOracle = await DummyOracle.new(toBN(100000000));
    priceOracle = await StablePriceOracle.new(dummyOracle.address, [1]);
    controller = await BSCRegistrarController.new(
      baseRegistrar.address,
      priceOracle.address,
      600,
      86400,
      CNSTInstance.address,
      {from: ownerAccount});
    await baseRegistrar.addController(controller.address, {from: ownerAccount});
    await controller.setPriceOracle(priceOracle.address, {from: ownerAccount});

    await CNSTInstance.addMinter(ownerAccount, {from: ownerAccount});
  });

  const checkLabels = {
    "testing": true,
    "longname12345678": true,
    "sixsix": true,
    "five5": true,
    "four": true,
    "iii": true,
    "ii": false,
    "i": false,
    "": false,

    // { ni } { hao } { ma } (chinese; simplified)
    "\u4f60\u597d\u5417": true,

    // { ta } { ko } (japanese; hiragana)
    "\u305f\u3053": false,

    // { poop } { poop } { poop } (emoji)
    "\ud83d\udca9\ud83d\udca9\ud83d\udca9": true,

    // { poop } { poop } (emoji)
    "\ud83d\udca9\ud83d\udca9": false
  };

  it('should report label validity', async () => {
    for (const label in checkLabels) {
      assert.equal(await controller.valid(label), checkLabels[label], label);
    }
  });

  it('should report unused names as available', async () => {
    assert.equal(await controller.available(sha3('available')), true);
  });

  it('should permit new registrations', async () => {
    const commitment = await controller.makeCommitment("newname", registrantAccount, secret);
    let tx = await controller.commit(commitment);
    assert.equal(await controller.commitments(commitment), (await web3.eth.getBlock(tx.receipt.blockNumber)).timestamp);

    await evm.advanceTime((await controller.minCommitmentAge()).toNumber());
    const balanceBefore = await web3.eth.getBalance(controller.address);
    tx = await controller.register("newname", registrantAccount, 28 * DAYS, secret, {value: 28 * DAYS + 1, gasPrice: 0});
    assert.equal(tx.logs.length, 1);
    assert.equal(tx.logs[0].event, "NameRegistered");
    assert.equal(tx.logs[0].args.name, "newname");
    assert.equal(tx.logs[0].args.owner, registrantAccount);
    assert.equal((await web3.eth.getBalance(controller.address)) - balanceBefore, 28 * DAYS);
  });

  it('should report registered names as unavailable', async () => {
    assert.equal(await controller.available('newname'), false);
  });

  it('should permit new registrations with config', async () => {
    const commitment = await controller.makeCommitmentWithConfig("newconfigname", registrantAccount, secret, resolver.address, registrantAccount);
    let tx = await controller.commit(commitment);
    assert.equal(await controller.commitments(commitment), (await web3.eth.getBlock(tx.receipt.blockNumber)).timestamp);

    await evm.advanceTime((await controller.minCommitmentAge()).toNumber());

    const balanceBefore = await web3.eth.getBalance(controller.address);
    tx = await controller.registerWithConfig("newconfigname", registrantAccount, 28 * DAYS, secret, resolver.address, registrantAccount, {value: 28 * DAYS + 1, gasPrice: 0});
    assert.equal(tx.logs.length, 1);
    assert.equal(tx.logs[0].event, "NameRegistered");
    assert.equal(tx.logs[0].args.name, "newconfigname");
    assert.equal(tx.logs[0].args.owner, registrantAccount);
    assert.equal((await web3.eth.getBalance(controller.address)) - balanceBefore, 28 * DAYS);

    const nodehash = namehash.hash("newconfigname.bsc");
    assert.equal((await ens.resolver(nodehash)), resolver.address);
    assert.equal((await ens.owner(nodehash)), registrantAccount);
    assert.equal((await resolver.addr(nodehash)), registrantAccount);
  });

  it('should not allow a commitment with addr but not resolver', async () => {
    await exceptions.expectFailure(controller.makeCommitmentWithConfig("newconfigname2", registrantAccount, secret, NULL_ADDRESS, registrantAccount));
  });

  it('should permit a registration with resolver but not addr', async () => {
    const commitment = await controller.makeCommitmentWithConfig("newconfigname2", registrantAccount, secret, resolver.address, NULL_ADDRESS);
    let tx = await controller.commit(commitment);
    assert.equal(await controller.commitments(commitment), (await web3.eth.getBlock(tx.receipt.blockNumber)).timestamp);

    await evm.advanceTime((await controller.minCommitmentAge()).toNumber());
    const balanceBefore = await web3.eth.getBalance(controller.address);

    tx = await controller.registerWithConfig("newconfigname2", registrantAccount, 28 * DAYS, secret, resolver.address, NULL_ADDRESS, {value: 28 * DAYS + 1, gasPrice: 0});
    assert.equal(tx.logs.length, 1);
    assert.equal(tx.logs[0].event, "NameRegistered");
    assert.equal(tx.logs[0].args.name, "newconfigname2");
    assert.equal(tx.logs[0].args.owner, registrantAccount);
    assert.equal((await web3.eth.getBalance(controller.address)) - balanceBefore, 28 * DAYS);

    const nodehash = namehash.hash("newconfigname2.bsc");
    assert.equal((await ens.resolver(nodehash)), resolver.address);
    assert.equal((await resolver.addr(nodehash)), 0);
  });

  it('should include the owner in the commitment', async () => {
    await controller.commit(await controller.makeCommitment("newname2", accounts[2], secret));

    await evm.advanceTime((await controller.minCommitmentAge()).toNumber());
    await exceptions.expectFailure(controller.register("newname2", registrantAccount, 28 * DAYS, secret, {value: 28 * DAYS, gasPrice: 0}));
  });

  it('should reject duplicate registrations', async () => {
    await controller.commit(await controller.makeCommitment("newname", registrantAccount, secret));

    await evm.advanceTime((await controller.minCommitmentAge()).toNumber());
    await exceptions.expectFailure(controller.register("newname", registrantAccount, 28 * DAYS, secret, {value: 28 * DAYS, gasPrice: 0}));
  });

  it('should reject for expired commitments', async () => {
    await controller.commit(await controller.makeCommitment("newname2", registrantAccount, secret));

    await evm.advanceTime((await controller.maxCommitmentAge()).toNumber() + 1);

    await exceptions.expectFailure(controller.register("newname2", registrantAccount, 28 * DAYS, secret, {value: 28 * DAYS, gasPrice: 0}));
  });

  it('should allow anyone to renew a name', async () => {
    const expires = await baseRegistrar.nameExpires(sha3("newname")),
      balanceBefore = await web3.eth.getBalance(controller.address);
    await controller.renew("newname", 86400, {value: 86400 + 1});

    const newExpires = await baseRegistrar.nameExpires(sha3("newname"));
    assert.equal(newExpires.toNumber() - expires.toNumber(), 86400);
    assert.equal( (await web3.eth.getBalance(controller.address)) - balanceBefore, 86400);
  });

  it('should require sufficient value for a renewal', async () => {
    await exceptions.expectFailure(controller.renew("name", 86400));
  });

  it('Give rewards to stakeholder', async () => {
    const snapshot = await evm.snapshot();
    try {
      const account1 = accounts[5].toLowerCase(),
        account2 = accounts[4].toLowerCase(),
        depositAmount = Web3Utils.toWei('0.01', 'ether'),
        mintTokenAmount = web3.utils.toWei('100', 'ether'),
        account1StakeAmount = Web3Utils.toWei('7', 'ether'),
        account2StakeAmount = Web3Utils.toWei('3', 'ether');

      await CNSTInstance.mint(account1, mintTokenAmount, {from: ownerAccount});
      await CNSTInstance.approve(controller.address, mintTokenAmount, {from: account1});

      await CNSTInstance.mint(account2, mintTokenAmount, {from: ownerAccount});
      await CNSTInstance.approve(controller.address, mintTokenAmount, {from: account2});

      await controller.deposit({
        gasPrice: 0,
        from: ownerAccount,
        value: depositAmount
      });

      await controller.createStake(account1StakeAmount, {from: account1});
      await controller.createStake(account2StakeAmount, {from: account2});

      await evm.advanceTime(1001);

      const account1EstimateReward = await controller.getEstimateReward(account1),
        account2EstimateReward = await controller.getEstimateReward(account2),
        contractBalanceBeforeDistribute = await web3.eth.getBalance(controller.address);

      await controller.distributeRewards({from: ownerAccount});

      const rewardOfAccount1 = await controller.rewardOf(account1),
        rewardOfAccount2 = await controller.rewardOf(account2),
        givenRewards = await controller.givenRewards(),
        totalBalanceForRewards = await controller.totalBalanceForRewards();

      assert.equal(rewardOfAccount1.toString(), account1EstimateReward.toString());
      assert.equal(rewardOfAccount2.toString(), account2EstimateReward.toString());
      assert.equal(givenRewards.toString(), contractBalanceBeforeDistribute.toString());
      assert.equal(totalBalanceForRewards.toString(), '0');

      await snapshot.restore();
    } catch (error) {
      await snapshot.restore();
      throw error;
    }
  });
});
