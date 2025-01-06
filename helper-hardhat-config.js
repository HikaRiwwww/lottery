const { ethers } = require("hardhat");

const networkConfig = {
    11155111: {
        name: "sepolia",
        vrfCoordinatorV2: "0x9DdfaCa8183c41ad55329BdeeD9F6A8d53168B1B",
        subscriptionId: "69465728816760727579327628911695068294540564045686150415703701673186929891273",
        entranceFee: ethers.parseEther("0.0001"),
        gasLane: "0x787d74caea10b2b357790d5b5247c2f63d1d91572a9846f780606e4d953677ae",
        callBackGasLimit: "500000",
        interval: "1",
        enableNativePayment: false,
        fundAmount: ethers.parseEther("1"),
    },
    31337: {
        name: "hardhat",
        entranceFee: ethers.parseEther("0.0001"),
        gasLane: "0x8077df514608a09f83e4e8d300645594e5d7234665448ba83f51a50f842bd3d9",
        callBackGasLimit: "500000",
        interval: "30",
        enableNativePayment: false,
    },
}

const developmentChains = ["hardhat", "localhost"]
const DECIMALS = "8"
const INITIAL_ANSWER = "200000000000"
module.exports = {
    networkConfig,
    developmentChains,
    DECIMALS,
    INITIAL_ANSWER,
}
