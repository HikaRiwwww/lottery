# 智能合约彩票系统

这是一个基于 Hardhat 开发的去中心化彩票系统，使用 Chainlink VRF 实现可验证的随机数生成。

## 已部署合约

### Sepolia测试网
- 合约地址: [0xFCEa21b603a675093AE52B7638f6EeCC240fF395](https://sepolia.etherscan.io/address/0xFCEa21b603a675093AE52B7638f6EeCC240fF395)
- 网络: Sepolia Testnet
- 验证状态: 已验证

您可以通过以下方式与合约交互：
1. 直接在 Etherscan 上与合约交互
2. 使用 Web3 钱包（如 MetaMask）连接到 Sepolia 测试网
3. 通过合约 ABI 在您的 DApp 中集成

## 功能特性

* 自动化抽奖：使用 Chainlink Automation 实现定时自动开奖
* 随机数生成：使用 Chainlink VRF 确保随机性
* 资金管理：自动处理参与者投资和奖金分配
* 状态控制：完整的彩票状态管理机制
* 安全保障：多重安全检查机制

## 技术栈

* Solidity ^0.8.27 & ^0.6.6
* Hardhat
* Chainlink VRF & Automation
* Ethers.js
* Mocha & Chai (测试框架)

## 配置

本项目使用 env-enc 进行环境变量的加密管理。

1. 安装 env-enc：
```bash
yarn add @chainlink/env-enc
```

2. 创建密码：
```bash
yarn env-enc set-password
```
输入并保存您的密码，这将用于加密环境变量。

3. 设置环境变量：
```bash
# 设置 Sepolia 网络 RPC URL
yarn env-enc set SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/your-api-key

# 设置私钥
yarn env-enc set SEPOLIA_PRIVATE_KEY=your-wallet-private-key

# 设置 API 密钥
yarn env-enc set ETHERSCAN_API_KEY=your-etherscan-api-key
yarn env-enc set COINMARKETCAP_API_KEY=your-coinmarketcap-api-key
```

注意：
* 环境变量将被加密存储在 .env-enc 文件中
* .env-enc 文件可以安全地提交到版本控制系统
* 请妥善保管您的加密密码
* 建议使用专门的测试账户，不要使用主网账户的私钥

## 快速开始

1. 安装依赖：
```bash
yarn install
```

2. 加载环境变量：
```bash
# 输入之前设置的密码
yarn env-enc load
```

3. 编译合约：
```bash
yarn hardhat compile
```

4. 运行测试：
```bash
yarn hardhat test
```

5. 部署合约：
```bash
# 本地网络
yarn hardhat deploy
# Sepolia测试网
yarn hardhat deploy --network sepolia
```

## 测试

项目包含两种测试：

1. 单元测试：
```bash
yarn hardhat test
```

2. 集成测试（在测试网上运行）：
```bash
yarn hardhat test --network sepolia
```

## 项目结构
```text
├── contracts/          # 智能合约源码
├── deploy/            # 部署脚本
│   └── 00-deploy-mocks.js  # Mock合约部署
├── test/              # 测试文件
│   ├── unit/         # 单元测试
│   └── staging/      # 集成测试
├── scripts/          # 辅助脚本
└── hardhat.config.js # Hardhat配置文件
```

## 合约功能

* 参与彩票：用户可以支付 ETH 参与彩票
* 自动开奖：到达指定时间后自动开奖
* 随机选择：使用 Chainlink VRF 随机选择获胜者
* 奖金分配：自动将奖金池分配给获胜者
* 状态查询：随时查询彩票状态和参与者信息

## 安全性考虑

* 使用 Chainlink VRF 确保随机性
* 状态锁定防止重入
* 访问控制限制
* 金额检查机制
* 完整的测试覆盖
* 环境变量加密存储

## 注意事项

* 确保在部署前正确配置并加载环境变量
* 测试网部署前建议先在本地网络完成测试
* Gas报告默认关闭，需要时手动开启
* 确保有足够的测试网 ETH 和 LINK 代币
* 保管好 env-enc 的加密密码

## 许可证

MIT

## 与合约交互

### 通过 Etherscan
1. 访问 [合约页面](https://sepolia.etherscan.io/address/0xFCEa21b603a675093AE52B7638f6EeCC240fF395#writeContract)
2. 连接您的 Web3 钱包
3. 在 "Write Contract" 标签页中可以：
   - 参与彩票（enterRaffle）
   - 查看当前状态
   - 查询获奖信息

### 通过代码
```javascript
const contractAddress = "0xFCEa21b603a675093AE52B7638f6EeCC240fF395";
const contract = await ethers.getContractAt("Raffle", contractAddress);

// 参与彩票
const entranceFee = await contract.getEntranceFee();
await contract.enterRaffle({ value: entranceFee });

// 查询状态
const raffleState = await contract.getRaffleState();
const players = await contract.getPlayers();
const recentWinner = await contract.getRecentWinner();
```

## 测试网络资源

- [Sepolia 测试网水龙头](https://sepoliafaucet.com/) - 获取测试网 ETH
- [Chainlink Faucet](https://faucets.chain.link/) - 获取测试网 LINK 代币
