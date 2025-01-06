// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {VRFConsumerBaseV2Plus} from "@chainlink/contracts/src/v0.8/vrf/dev/VRFConsumerBaseV2Plus.sol";
import {VRFV2PlusClient} from "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";
import {AutomationCompatibleInterface} from "@chainlink/contracts/src/v0.8/automation/AutomationCompatible.sol";

error Raffle__NotEnoughEthSent();
error Raffle__TransferFailed();
error Raffle__RaffleNotOpen();
error Raffle__UpkeepNotNeeded();

event RaffleEnter(address indexed player);
event RequestedRaffleWinner(uint256 indexed requestId);
event WinnerPicked(address indexed winner);

contract Raffle is VRFConsumerBaseV2Plus, AutomationCompatibleInterface {
    // 抽奖状态
    enum RaffleState {
        OPEN,
        CALCULATING
    }
    /**
     * 1. 入局门槛校验
     * 2. 记录玩家地址
     * 3. 设置抽奖时间
     */

    // 玩家地址
    address payable[] private s_players;
    // 入局门槛
    uint256 private immutable i_entranceFee;
    // gasLane的keyHash，代表你所愿意支付的以wei为单位的最大请求价格
    bytes32 private immutable i_gasLane;
    // 随机数合约的订阅者id
    uint256 private immutable i_subscriptionId;
    // 回调函数消耗的gas上限
    uint32 private immutable i_callbackGasLimit;
    // 是否启用原生货币支付 true为是，false为使用link支付
    bool private immutable i_enableNativePayment;
    // 请求确认数
    uint16 private constant REQUEST_COMFIRMATIONS = 3;
    // 请求随机数时返回的随机数个数
    uint32 private constant NUM_WORDS = 1;

    // 最近一次抽奖的获奖者
    address payable private s_recentWinner;
    //当前抽奖状态
    RaffleState private s_raffleState;
    // 最近一次抽奖的时间（上一个区块的时间）
    uint256 private s_lastTimeStamp;
    // 抽奖间隔时间
    uint256 private immutable i_interval;

    constructor(
        uint256 entranceFee,
        address _vrfCoordinator,
        bytes32 gasLane,
        uint256 subscriptionId,
        uint32 callbackGasLimit,
        bool enableNativePayment,
        uint256 interval
    ) VRFConsumerBaseV2Plus(_vrfCoordinator) {
        i_entranceFee = entranceFee;
        i_gasLane = gasLane;
        i_subscriptionId = subscriptionId;
        i_callbackGasLimit = callbackGasLimit;
        i_enableNativePayment = enableNativePayment;
        i_interval = interval;
        s_raffleState = RaffleState.OPEN;
        s_lastTimeStamp = block.timestamp;
    }

    function enterRaffle() public payable {
        // 1. 入局门槛校验
        if (msg.value < i_entranceFee) {
            revert Raffle__NotEnoughEthSent();
        }

        // 2. 检查抽奖状态
        if (s_raffleState != RaffleState.OPEN) {
            revert Raffle__RaffleNotOpen();
        }
        // 3. 记录玩家地址
        s_players.push(payable(msg.sender));
        emit RaffleEnter(msg.sender);
    }

    function performUpkeep(bytes calldata /* performData */) external override {
        (bool upkeepNeeded, ) = checkUpkeep("");
        if (!upkeepNeeded) {
            revert Raffle__UpkeepNotNeeded();
        }
        s_raffleState = RaffleState.CALCULATING;
        uint256 requestId = s_vrfCoordinator.requestRandomWords(
            VRFV2PlusClient.RandomWordsRequest({
                keyHash: i_gasLane,
                subId: i_subscriptionId,
                requestConfirmations: REQUEST_COMFIRMATIONS,
                callbackGasLimit: i_callbackGasLimit,
                numWords: NUM_WORDS,
                extraArgs: VRFV2PlusClient._argsToBytes(
                    VRFV2PlusClient.ExtraArgsV1({nativePayment: false})
                )
            })
        );
        emit RequestedRaffleWinner(requestId);
    }

    /**
     * 根据随机数选出获奖者并执行转账操作
     */
    function fulfillRandomWords(
        uint256 /* requestId */,
        uint256[] calldata randomWords
    ) internal override {
        uint256 indexOfWinner = randomWords[0] % s_players.length;
        address payable recentWinner = s_players[indexOfWinner];
        s_recentWinner = recentWinner;
        s_raffleState = RaffleState.OPEN;
        s_players = new address payable[](0);
        s_lastTimeStamp = block.timestamp;
        (bool success, ) = recentWinner.call{value: address(this).balance}("");
        if (!success) {
            revert Raffle__TransferFailed();
        }
        emit WinnerPicked(recentWinner);
    }

    function getRecentWinner() public view returns (address) {
        return s_recentWinner;
    }

    /**
     * 检查是否需要执行抽奖操作
     */
    function checkUpkeep(
        bytes memory /* checkData */
    )
        public
        override
        returns (bool upkeepNeeded, bytes memory /* performData */)
    {
        bool isOpen = s_raffleState == RaffleState.OPEN;
        bool timeHasPassed = ((block.timestamp - s_lastTimeStamp) >=
            i_interval);
        bool hasPlayers = s_players.length > 0;
        bool hasBalance = address(this).balance > 0;
        upkeepNeeded = (isOpen && timeHasPassed && hasPlayers && hasBalance);
        return (upkeepNeeded, "0x0");
    }

    /**
     * 获取当前抽奖状态
     */
    function getRaffleState() public view returns (RaffleState) {
        return s_raffleState;
    }

    function getNumWords() public pure returns (uint32) {
        return NUM_WORDS;
    }

    function getEntranceFee() public view returns (uint256){
        return i_entranceFee;
    }

    function getGasLane() public view returns (bytes32) {
        return i_gasLane;
    }

    function getCallBackGasLimit() public view returns (uint32) {
        return i_callbackGasLimit;
    }

    function getEnableNativePayment() public view returns (bool) {
        return i_enableNativePayment;
    }

    function getInterval() public view returns (uint256) {
        return i_interval;
    }

    function getPlayer(uint256 index) public view returns(address){
        return s_players[index];
    }

    function getNumberOfPlayers() public view returns (uint256) {
        return s_players.length;
    }

    function getLatestTimestamp() public view returns (uint256) {
        return s_lastTimeStamp;
    }

    function getSubscriptionId() public view returns (uint256) {
        return i_subscriptionId;
    }
}

