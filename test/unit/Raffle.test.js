const { network, deployments, ethers } = require('hardhat');
const {
    developmentChains,
    networkConfig,
} = require('../../helper-hardhat-config');
const { assert, expect } = require('chai');
const { beforeEach } = require('mocha');

!developmentChains.includes(network.name)
    ? describe.skip
    : describe('Raffle Unit Tests', function () {
          // 声明合约变量
          let raffle, vrfCoordinatorV2Mock, deployer;
          const chainId = network.config.chainId;
          const raffleEntranceFee = networkConfig[chainId]['entranceFee'];

          // 在before each阶段部署合约
          beforeEach(async function () {
              await deployments.fixture(['all']);
              [deployer] = await ethers.getSigners();

              const raffleContract = deployments.get('Raffle');
              const vrfCoordinatorV2MockContract = deployments.get(
                  'VRFCoordinatorV2_5Mock'
              );

              // 获取合约实例
              raffle = await ethers.getContractAt(
                  (await raffleContract).abi,
                  (await raffleContract).address
              );

              vrfCoordinatorV2Mock = await ethers.getContractAt(
                  (await vrfCoordinatorV2MockContract).abi,
                  (await vrfCoordinatorV2MockContract).address
              );
          });
          // 测试构造函数
          describe('Test Constructor', async function () {
              it('Sets state variables correctly', async function () {
                  const entranceFee = await raffle.getEntranceFee();
                  const gasLane = await raffle.getGasLane();
                  const callBackGasLimit = await raffle.getCallBackGasLimit();
                  const interval = await raffle.getInterval();
                  const enableNativePayment =
                      await raffle.getEnableNativePayment();

                  assert.equal(
                      entranceFee.toString(),
                      networkConfig[chainId]['entranceFee']
                  );
                  assert.equal(
                      gasLane.toString(),
                      networkConfig[chainId]['gasLane']
                  );
                  assert.equal(
                      callBackGasLimit.toString(),
                      networkConfig[chainId]['callBackGasLimit']
                  );
                  assert.equal(
                      interval.toString(),
                      networkConfig[chainId]['interval']
                  );
                  assert.equal(
                      enableNativePayment,
                      networkConfig[chainId]['enableNativePayment']
                  );
              });
          });

          // 测试参与抽奖
          describe('Test Enter Raffle', async function () {
              it('Revert if not enough eth', async function () {
                  expect(raffle.enterRaffle()).to.be.revertedWith(
                      'Raffle__NotEnoughEthSent'
                  );
              });

              it('Records player correctly', async function () {
                  await raffle.enterRaffle({
                      value: raffleEntranceFee,
                  });

                  const player = await raffle.getPlayer(0);
                  assert.equal(player, deployer.address);
              });

              it('Emits event on enter', async function () {
                  await expect(
                      raffle.enterRaffle({
                          value: networkConfig[chainId]['entranceFee'],
                      })
                  ).to.emit(raffle, 'RaffleEnter');
              });

              it('Does not allow entrance when raffle not open', async function () {
                  await raffle.enterRaffle({ value: raffleEntranceFee });
                  await network.provider.send('evm_increaseTime', [
                      networkConfig[chainId]['interval'] + 1,
                  ]);
                  await network.provider.send('evm_mine', []);
                  await raffle.performUpkeep('0x');
                  await expect(
                      raffle.enterRaffle({ value: raffleEntranceFee })
                  ).to.be.revertedWithCustomError(
                      raffle,
                      'Raffle__RaffleNotOpen'
                  );
              });
          });

          describe('Check upkeep', async function () {
              it('Return false if no ether sent', async function () {
                  await network.provider.send('evm_increaseTime', [
                      networkConfig[chainId]['interval'] + 1,
                  ]);
                  await network.provider.send('evm_mine', []);
                  const { upkeepNeeded } =
                      await raffle.checkUpkeep.staticCall('0x');
                  assert.equal(upkeepNeeded, false);
              });

              it('Return false if raffle is not open', async function () {
                  await raffle.enterRaffle({ value: raffleEntranceFee });
                  await network.provider.send('evm_increaseTime', [
                      networkConfig[chainId]['interval'] + 1,
                  ]);
                  await network.provider.send('evm_mine', []);
                  await raffle.performUpkeep('0x');

                  const { upkeepNeeded } =
                      await raffle.checkUpkeep.staticCall('0x');
                  const raffleState = await raffle.getRaffleState();
                  assert.equal(upkeepNeeded, false);
                  assert.equal(raffleState, 1);
              });

              it("returns false if enough time hasn't passed", async () => {
                  await raffle.enterRaffle({ value: raffleEntranceFee });

                  await network.provider.send('evm_increaseTime', [
                      networkConfig[chainId]['interval'] - 10,
                  ]); // use a higher number here if this test fails
                  await network.provider.request({
                      method: 'evm_mine',
                      params: [],
                  });

                  const { upkeepNeeded } =
                      await raffle.checkUpkeep.staticCall('0x'); // upkeepNeeded = (timePassed && isOpen && hasBalance && hasPlayers)
                  assert.equal(upkeepNeeded, false);
              });
              it('returns true if enough time has passed, has players, eth, and is open', async () => {
                  await raffle.enterRaffle({ value: raffleEntranceFee });
                  await network.provider.send('evm_increaseTime', [
                      networkConfig[chainId]['interval'] + 1,
                  ]);
                  await network.provider.request({
                      method: 'evm_mine',
                      params: [],
                  });
                  const { upkeepNeeded } =
                      await raffle.checkUpkeep.staticCall('0x');
                  assert.equal(upkeepNeeded, true);
              });
          });

          describe('Test performUpkeep', async function () {
              it('Only run if checkUpkeep returns true', async function () {
                  await raffle.enterRaffle({ value: raffleEntranceFee });
                  await network.provider.send('evm_increaseTime', [
                      networkConfig[chainId]['interval'] + 1,
                  ]);
                  await network.provider.request({
                      method: 'evm_mine',
                      params: [],
                  });
                  const tx = await raffle.performUpkeep('0x');
                  assert(tx);
              });

              it('Reverts if checkUpkeep returns false', async function () {
                  await expect(
                      raffle.performUpkeep('0x')
                  ).to.be.revertedWithCustomError(
                      raffle,
                      'Raffle__UpkeepNotNeeded'
                  );
              });

              it('Updates the raffle state, emits event, and calls the vrf coordinator', async function () {
                  await raffle.enterRaffle({ value: raffleEntranceFee });
                  await network.provider.send('evm_increaseTime', [
                      networkConfig[chainId]['interval'] + 1,
                  ]);
                  await network.provider.request({
                      method: 'evm_mine',
                      params: [],
                  });
                  const txResponse = await raffle.performUpkeep('0x');
                  const txReceipt = await txResponse.wait(1);
                  const requestId = txReceipt.logs[1].args.requestId;
                  assert(Number.parseInt(requestId) > 0);
                  assert((await raffle.getRaffleState()) == 1);
              });
          });

          describe('Test fulfillRandomWords', async function () {
              beforeEach(async function () {
                  await raffle.enterRaffle({ value: raffleEntranceFee });
                  await network.provider.send('evm_increaseTime', [
                      networkConfig[chainId]['interval'] + 1,
                  ]);
                  await network.provider.request({
                      method: 'evm_mine',
                      params: [],
                  });
              });

              it('can only be called after performupkeep', async function () {
                  await expect(
                      vrfCoordinatorV2Mock.fulfillRandomWords(
                          0,
                          await raffle.getAddress()
                      )
                  ).to.be.revertedWithCustomError(
                      vrfCoordinatorV2Mock,
                      'InvalidRequest'
                  );

                  await expect(
                      vrfCoordinatorV2Mock.fulfillRandomWords(
                          1,
                          await raffle.getAddress()
                      )
                  ).to.be.revertedWithCustomError(
                      vrfCoordinatorV2Mock,
                      'InvalidRequest'
                  );
              });

              it('Picks an winner, reset the lottery and sends money', async function () {
                  // 额外开放三名玩家进入抽奖
                  let startingBalance;
                  const addtionalEntrants = 3;
                  const startingAccountIndex = 1;
                  const accounts = await ethers.getSigners();
                  for (
                      let i = startingAccountIndex;
                      i < startingAccountIndex + addtionalEntrants;
                      i++
                  ) {
                      const accountConnectedRaffle = raffle.connect(
                          accounts[i]
                      );
                      await accountConnectedRaffle.enterRaffle({
                          value: raffleEntranceFee,
                      });
                  }
                  const startingTimeStamp = await raffle.getLatestTimestamp();
                  // 监听WinnerPicked事件
                  await new Promise(async (resolve, reject) => {
                      raffle.on('WinnerPicked', async () => {
                          console.log('We have got a winner');
                          try {
                              const recentWinner =
                                  await raffle.getRecentWinner();
                              const raffleState = await raffle.getRaffleState();
                              const winnerBalance =
                                  await ethers.provider.getBalance(
                                      accounts[1].address
                                  ); // 使用 provider 获取余额
                              const endingTimeStamp =
                                  await raffle.getLatestTimestamp();
                              await expect(raffle.getPlayer(0)).to.be.reverted;
                              // Comparisons to check if our ending values are correct:
                              assert.equal(
                                  recentWinner.toString(),
                                  accounts[1].address
                              );
                              assert.equal(raffleState, 0);
                              console.log(
                                  'Type of raffleEntranceFee:',
                                  typeof raffleEntranceFee
                              );
                              console.log(
                                  'Type of startingBalance:',
                                  typeof startingBalance
                              );

                              assert.equal(
                                  winnerBalance.toString(),
                                  (
                                      startingBalance +
                                      raffleEntranceFee *
                                          BigInt(addtionalEntrants) +
                                      raffleEntranceFee
                                  ).toString()
                              );
                              assert(endingTimeStamp > startingTimeStamp);
                              resolve();
                          } catch (error) {
                              reject(error);
                          }
                      });

                      console.log('Promise done');
                      const tx = await raffle.performUpkeep('0x');
                      const txReceipt = await tx.wait(1);
                      startingBalance = await ethers.provider.getBalance(
                          accounts[1].address
                      );
                      await vrfCoordinatorV2Mock.fulfillRandomWords(
                          txReceipt.logs[1].args.requestId,
                          raffle.target
                      );
                  });
              });
          });
      });
