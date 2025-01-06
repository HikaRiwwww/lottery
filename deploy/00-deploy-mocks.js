const { ethers } = require('hardhat');
const { networkConfig } = require('../helper-hardhat-config');
const { developmentChains } = require('../helper-hardhat-config');
// 每次请求的固定费用
const BASE_FEE = ethers.parseEther('0.0001');
// 每个随机数的费用
const GAS_PRICE_LINK = 1e9;
const WEIGHT_PER_UNIT_LINK = ethers.parseEther('0.0001');
``
module.exports = async function ({ getNamedAccounts, deployments }) {
    const { deploy, log } = deployments;
    const { deployer } = await getNamedAccounts();
    const args = [BASE_FEE, GAS_PRICE_LINK, WEIGHT_PER_UNIT_LINK];
    if (developmentChains.includes(network.name)) {
        log('Local network detected! Deploying mocks...');
        await deploy('VRFCoordinatorV2_5Mock', {
            contract: 'VRFCoordinatorV2_5Mock',
            from: deployer,
            log: true,
            args: args,
        });
        log('Mocks Deployed!');
        log('-----------------------------------');
    }
};

module.exports.tags = ['all', 'raffle'];
