// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract StakeForDistributeProfits is Ownable {
    using Address for address;
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    // ERC20 basic token contract being held
    IERC20 public token;

    /**
    * @notice How often the profits are distributed.
    */
    uint256 public rewardPerHour = 168 hours;

    /**
    * @notice We usually require to know who are all the stakeHolders.
    */
    address[] internal stakeHolders;

    /**
    * @notice
    * A stake struct is used to represent the way we store stakes,
    * A Stake will contain the users address, the amount staked and a timestamp,
    * Since which is when the stake was made
    */
    struct Stake {
        uint256 amount;
        uint256 startedAt;
    }

    /**
     * @notice The stakes for each stakeholder.
     */
    mapping(address => Stake) internal stakes;

    /**
     * @notice The accumulated rewards for each stakeholder.
     */
    mapping(address => uint256) internal rewards;

    uint256 public givenRewards = 0;

    function setToken(IERC20 _token) public onlyOwner {
        token = _token;
    }

    /**
     * @notice A method for a stakeholder to create a stake.
     * @param _stake The size of the stake to be created.
     */
    function createStake(uint256 _stake) external {
        require(token.transferFrom(msg.sender, address(this), _stake));

        if (stakes[msg.sender].amount == 0) _addStakeholder(msg.sender);

        Stake storage userStake = stakes[msg.sender];

        userStake.amount = userStake.amount.add(_stake);
        userStake.startedAt = block.timestamp;
    }

    /**
    * @notice A method for a stakeholder to remove a stake.
    * @param _stake The size of the stake to be removed.
    */
    function removeStake(uint256 _stake) external {
        Stake storage userStake = stakes[msg.sender];

        require(userStake.amount >= _stake, "!holderAmount >= _stake");

        userStake.amount = userStake.amount.sub(_stake);

        if (userStake.amount == 0) _removeStakeholder(msg.sender);

        token.safeTransfer(msg.sender, _stake);
    }

    /**
    * @notice A method to retrieve the stake for a stakeholder.
    * @param _stakeHolder The stakeholder to retrieve the stake for.
    * @return uint256 The amount of wei staked.
    */
    function stakeAmountOf(address _stakeHolder) external view returns (uint256) {
        return stakes[_stakeHolder].amount;
    }

    /**
    * @notice A method to the aggregated stakes from all stakeHolders.
    * @return uint256 The aggregated stakes from all stakeHolders.
    */
    function totalStakes() public view returns (uint256) {
        uint256 _totalStakes = 0;
        for (uint256 s = 0; s < stakeHolders.length; s += 1) {
            _totalStakes = _totalStakes.add(stakes[stakeHolders[s]].amount);
        }
        return _totalStakes;
    }

    // ---------- STAKEHOLDERS ----------

    /**
     * @notice A method to check if an address is a stakeholder.
     * @param _address The address to verify.
     * @return bool, uint256 Whether the address is a stakeholder,
     * and if so its position in the stakeHolders array.
     */
    function isStakeholder(address _address) public view returns (bool, uint256) {
        for (uint256 s = 0; s < stakeHolders.length; s += 1) {
            if (_address == stakeHolders[s]) return (true, s);
        }
        return (false, 0);
    }

    /**
    * @notice A method to add a stakeholder.
    * @param _stakeHolder The stakeholder to add.
    */
    function _addStakeholder(address _stakeHolder) private {
        (bool _isStakeholder,) = isStakeholder(_stakeHolder);
        if (!_isStakeholder) stakeHolders.push(_stakeHolder);
    }

    /**
    * @notice A method to remove a stakeholder.
    * @param _stakeHolder The stakeholder to remove.
    */
    function _removeStakeholder(address _stakeHolder) private {
        (bool _isStakeholder, uint256 s) = isStakeholder(_stakeHolder);

        require(_isStakeholder, "removeStakeholder: !holder");

        stakeHolders[s] = stakeHolders[stakeHolders.length - 1];
        stakeHolders.pop();
    }

    // ---------- REWARDS ----------

    /**
    * @notice A method to allow a stakeholder to check his rewards.
    * @param _stakeHolder The stakeholder to check rewards for.
    */
    function rewardOf(address _stakeHolder) public view returns (uint256) {
        return rewards[_stakeHolder];
    }

    /**
    * @notice A method to the aggregated rewards from all stakeHolders.
    * @return uint256 The aggregated rewards from all stakeHolders.
    */
    function totalRewards() public view returns (uint256) {
        uint256 _totalRewards = 0;
        for (uint256 s = 0; s < stakeHolders.length; s += 1) {
            _totalRewards = _totalRewards.add(rewards[stakeHolders[s]]);
        }
        return _totalRewards;
    }

    /**
    * @notice Available balance for rewards..
    */
    function totalBalanceForRewards() public view returns (uint256) {
        uint256 currentTotalRewards = totalRewards();

        return address(this).balance.sub(currentTotalRewards);
    }

    /**
    * @notice A simple method that calculates the rewards for each stakeholder.
    * @param _stakeHolder The stakeholder to calculate rewards for.
    * @param _totalStaked Total staked in contract.
    * @param _bnbForRewardsInContract BNB balance in contract.
    */
    function _calculateReward(address _stakeHolder, uint256 _totalStaked, uint256 _bnbForRewardsInContract) private view returns (uint256) {
        Stake memory userStake = stakes[_stakeHolder];

        uint256 hoursElapsed = (block.timestamp - userStake.startedAt);
        bool isAvailableForClaimRewards = hoursElapsed > rewardPerHour;

        if(isAvailableForClaimRewards == false) return 0;

        if(_bnbForRewardsInContract <= 0) return 0;

        uint256 percentage = userStake.amount
        .div(_totalStaked.div(1e18))
        .add(1 ether);

        uint256 reward = _bnbForRewardsInContract
        .mul(percentage)
        .div(1e18)
        .sub(_bnbForRewardsInContract);

        if(_bnbForRewardsInContract <= reward)
            return _bnbForRewardsInContract;

        return reward;
    }

    /**
    * @notice Estimates the rewards of a holder.
    * @param _stakeHolder The stakeholder to calculate rewards for.
    */
    function getEstimateReward(address _stakeHolder) public view returns(uint256) {
        Stake memory userStake = stakes[_stakeHolder];
        uint256 bnbForRewardsInContract = totalBalanceForRewards();
        uint256 _totalStaked = totalStakes();

        uint256 percentage = userStake.amount
        .div(_totalStaked.div(1e18))
        .add(1 ether);

        return bnbForRewardsInContract
        .mul(percentage)
        .div(1e18)
        .sub(bnbForRewardsInContract);
    }

    /*
     @notice allows to deposit balance to be redistributed to stakeholders.
    */
    function deposit() public payable returns (bool) {
        return true;
    }

    /**
    * @notice A method to distribute rewards to all stakeHolders.
    */
    function distributeRewards() public onlyOwner {
        uint256 bnbForRewardsInContract = totalBalanceForRewards();
        uint256 _totalStaked = totalStakes();

        for (uint256 s = 0; s < stakeHolders.length; s += 1) {
            address stakeHolder = stakeHolders[s];
            uint256 reward = _calculateReward(stakeHolder, _totalStaked, bnbForRewardsInContract);
            rewards[stakeHolder] = rewards[stakeHolder].add(reward);
            givenRewards = givenRewards.add(reward);
        }
    }

    /**
    * @notice A method to allow a stakeholder to withdraw his rewards.
    */
    function withdrawReward() external {
        uint256 reward = rewards[msg.sender];

        require(reward > 0, "!reward");

        uint256 balanceTokenInContract = address(this).balance;
        require(balanceTokenInContract > 0, "!balanceTokenInContract");

        payable(msg.sender).transfer(reward);

        rewards[msg.sender] = 0;
    }
}
