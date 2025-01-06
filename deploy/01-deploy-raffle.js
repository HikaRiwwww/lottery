const { network, ethers } = require('hardhat');
const {
    developmentChains,
    networkConfig,
} = require('../helper-hardhat-config');
const { verify } = require('../utils/verify');
module.exports = async function ({ getNamedAccounts, deployments }) {
    const { deploy, log } = deployments;
    const { deployer } = await getNamedAccounts();
    const VRF_SUB_FUND_AMOUNT = ethers.parseEther('2');
    const chainId = network.config.chainId;
    let vrfCoordinatorV2Address, subscriptionId, vrfCoordinatorV2Mock;
    if (developmentChains.includes(network.name)) {
        const vrfCoordinatorV2MockContract = await deployments.get(
            'VRFCoordinatorV2_5Mock'
        );
        vrfCoordinatorV2Address = vrfCoordinatorV2MockContract.address;

        vrfCoordinatorV2Mock = await ethers.getContractAt(
            vrfCoordinatorV2MockContract.abi,
            vrfCoordinatorV2Address
        );
        const transaction = await vrfCoordinatorV2Mock.createSubscription();
        const transactionReceipt = await transaction.wait(1);

        // 获取订阅ID
        subscriptionId = transactionReceipt.logs[0].args.subId;
        await vrfCoordinatorV2Mock.fundSubscription(
            subscriptionId,
            VRF_SUB_FUND_AMOUNT
        );
    } else {
        vrfCoordinatorV2Address = networkConfig[chainId]['vrfCoordinatorV2'];
        subscriptionId = networkConfig[chainId]['subscriptionId'];
    }

    const entranceFee = networkConfig[chainId]['entranceFee'];
    const gasLane = networkConfig[chainId]['gasLane'];
    const callBackGasLimit = networkConfig[chainId]['callBackGasLimit'];
    const enableNativePayment = networkConfig[chainId]['enableNativePayment'];
    const interval = networkConfig[chainId]['interval'];

    const args = [
        entranceFee,
        vrfCoordinatorV2Address,
        gasLane,
        subscriptionId,
        callBackGasLimit,
        enableNativePayment,
        interval,
    ];
    const raffle = await deploy('Raffle', {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    });
    log('Raffle deployed at:', raffle.address);
    if (developmentChains.includes(network.name)) {
        await vrfCoordinatorV2Mock.addConsumer(
            subscriptionId,
            await raffle.address
        );
        // console.log(
        //     `consumer added: subscriptionId=${subscriptionId}, address=${raffle.address}`
        // );
    }

    // 如果不在开发链上，并且有etherscan的api key，则进行验证
    if (
        !developmentChains.includes(network.name) &&
        process.env.ETHERSCAN_API_KEY
    ) {
        log('Verifying...');
        await verify(raffle.address, args);
        log('Verified!');
        log('-----------------------------------');
    }
};

module.exports.tags = ['all', 'raffle'];
