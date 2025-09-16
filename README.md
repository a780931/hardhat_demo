# Chainlink VRF 可升级 NFT 项目

这个项目展示了如何使用Chainlink VRF（可验证随机函数）来创建具有随机特性的可升级NFT合约。

## 项目设置

1. 安装依赖：
```
npm install
```

2. 复制环境变量文件并填写您的信息：
```
cp .env.example .env
```
然后编辑`.env`文件，填入您的私钥和API密钥。

## Chainlink VRF 设置

要使用Chainlink VRF，您需要：

1. 访问 [Chainlink VRF Subscription Manager](https://vrf.chain.link/)
2. 连接您的钱包
3. 创建一个新的订阅
4. 为订阅添加资金（LINK代币）
5. 获取您的订阅ID
6. 部署合约后，将合约地址添加为订阅的消费者

## 部署可升级合约

```
npx hardhat run scripts/deploy-mynft-upgradeable.js --network sepolia
```

## 使用合约

部署后，您可以：

1. 使用`safeMint`函数直接铸造NFT
2. 使用`requestRandomNFT`函数请求一个带有随机特性的NFT

## 升级合约

如果需要升级合约，可以创建一个新版本的合约，然后使用以下命令升级：

```
npx hardhat run scripts/upgrade-mynft.js --network sepolia
```

## Chainlink VRF 网络配置

本项目使用Sepolia测试网的Chainlink VRF配置：

- VRF协调器: 0x8103B0A8A00be2DDC778e6e7eaa21791Cd364625
- Key Hash: 0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c

如果您想使用其他网络，请参考[Chainlink文档](https://docs.chain.link/vrf/v2/subscription/supported-networks)更新相应参数。