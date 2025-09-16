const { ethers, upgrades } = require("hardhat");

async function main() {
  // Chainlink VRF配置参数 (Sepolia测试网)
  const vrfCoordinatorV2 = "0x8103B0A8A00be2DDC778e6e7eaa21791Cd364625";
  const subscriptionId = 1; // 您需要创建一个Chainlink VRF订阅并获取ID
  const keyHash = "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c";

  console.log("开始部署可升级的MyNft合约...");

  // 部署可升级合约
  const MyNft = await ethers.getContractFactory("MyNft");
  
  console.log("部署代理...");
  const myNft = await upgrades.deployProxy(
    MyNft, 
    [vrfCoordinatorV2, subscriptionId, keyHash],
    { 
      initializer: 'initialize',
      constructorArgs: [vrfCoordinatorV2],
      kind: 'uups'
    }
  );

  await myNft.deployed();
  console.log("MyNft代理已部署到:", myNft.address);
  
  // 获取实现合约地址
  const implementationAddress = await upgrades.erc1967.getImplementationAddress(myNft.address);
  console.log("实现合约地址:", implementationAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });