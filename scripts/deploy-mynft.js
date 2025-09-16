const { ethers } = require("hardhat");

async function main() {
  console.log("开始部署MyNft合约...");

  // 这些参数需要根据您的实际情况进行修改
  // 以下是Sepolia测试网的示例参数
  const vrfCoordinatorV2 = "0x8103B0A8A00be2DDC778e6e7eaa21791Cd364625"; // Sepolia VRF Coordinator
  const subscriptionId = "YOUR_SUBSCRIPTION_ID"; // 需要在Chainlink VRF网站上创建
  const gasLane = "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c"; // Sepolia 30 gwei Key Hash
  const callbackGasLimit = "500000"; // 500,000 gas

  // 示例NFT的URI
  const tokenURIs = [
    "ipfs://QmNddFsVbibLbAQRXjFJnXGXN2rTqiR3zAcqAJJCXyYZYo/0", // 普通
    "ipfs://QmNddFsVbibLbAQRXjFJnXGXN2rTqiR3zAcqAJJCXyYZYo/1", // 稀有
    "ipfs://QmNddFsVbibLbAQRXjFJnXGXN2rTqiR3zAcqAJJCXyYZYo/2"  // 超稀有
  ];

  // 部署合约
  const MyNft = await ethers.getContractFactory("MyNft");
  console.log("正在部署合约...");
  
  const myNft = await MyNft.deploy(
    vrfCoordinatorV2,
    subscriptionId,
    gasLane,
    callbackGasLimit,
    tokenURIs
  );

  await myNft.waitForDeployment();
  const myNftAddress = await myNft.getAddress();
  console.log(`MyNft合约已部署到地址: ${myNftAddress}`);

  console.log("部署完成！");
  
  // 如果在测试网上，可以进行合约验证
  if (network.name !== "hardhat" && network.name !== "localhost") {
    console.log("等待区块确认后进行合约验证...");
    await myNft.deploymentTransaction().wait(6); // 等待6个区块确认
    
    console.log("开始验证合约...");
    await hre.run("verify:verify", {
      address: myNftAddress,
      constructorArguments: [
        vrfCoordinatorV2,
        subscriptionId,
        gasLane,
        callbackGasLimit,
        tokenURIs
      ],
    });
    console.log("合约验证完成！");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });