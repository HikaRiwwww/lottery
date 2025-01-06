const { network, deployments, ethers } = require('hardhat');
const {
    developmentChains,
    networkConfig,
} = require('../../helper-hardhat-config');
const { assert, expect } = require('chai');
const { beforeEach } = require('mocha');

developmentChains.includes(network.name)
    ? describe.skip
    : describe('Raffle Staging Tests', function () {
          // 声明合约变量
          let raffle, deployer, raffleEntranceFee;
          const chainId = network.config.chainId;
          // 在before each阶段部署合约
          beforeEach(async function () {
              [deployer] = await ethers.getSigners();
              const raffleContract = deployments.get('Raffle');
              // 获取合约实例
              raffle = await ethers.getContractAt(
                  (await raffleContract).abi,
                  (await raffleContract).address
              );
              console.log(
                  'Raffle contract address: ',
                  (await raffleContract).address
              );
              raffleEntranceFee = networkConfig[chainId]['entranceFee'];
              console.log('Raffle entrance fee: ', raffleEntranceFee);
          });

          describe('fulfillRandomWords', async function () {
              it('Works with live chainlink keeprs and chainlink vrf', async function () {
                  // setup listener before raffle starts
                  const accounts = await ethers.getSigners();
                  const startingTime = await raffle.getLatestTimestamp();
                  await new Promise(async (resolve, reject) => {
                      raffle.on('WinnerPicked', async () => {
                          console.log('WinnerPicked event fired');
                          try {
                              const recentWinner =
                                  await raffle.getRecentWinner();
                              const raffleState = await raffle.getRaffleState();
                              const winnerEndingBalance =
                                  await ethers.provider.getBalance(
                                      accounts[0].address
                                  );
                              const endingTimeStamp =
                                  await raffle.getLatestTimestamp();

                              await expect(
                                  raffle.getPlayer(0)
                              ).to.be.reverted();
                              assert.equal(recentWinner, accounts[0].address);
                              assert.equal(raffleState, 0);
                              assert.equal(
                                  winnerEndingBalance,
                                  winnerStartingBalance + raffleEntranceFee
                              );
                              assert(endingTimeStamp > startingTime);
                              resolve();
                          } catch (error) {
                              reject(error);
                          }
                      });

                      try {
                          const tx = await raffle.enterRaffle({
                              value: raffleEntranceFee,
                          });
                          await tx.wait(1);
                          console.log('enter raffle successfully!');
                          const winnerStartingBalance =
                              await ethers.provider.getBalance(
                                  accounts[0].address
                              );
                          console.log(
                              'Winner starting balance: ',
                              winnerStartingBalance
                          );
                      } catch (error) {
                          console.log('enter raffle failed: ', error);
                      }
                  });
              });
          });
      });
