const { ethers, upgrades } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // 部署可升级合约
  const UpgradeableNftAuctionFactory = await ethers.getContractFactory("UpgradeableNftAuctionFactory");
  const factory = await upgrades.deployProxy(UpgradeableNftAuctionFactory, [deployer.address], {
    initializer: "initialize",
    kind: "uups"
  });

  await factory.waitForDeployment();
  console.log("Factory deployed to:", await factory.getAddress());

  // 初始化测试数据
  console.log("Initializing test data...");
  const MockNFT = await ethers.getContractFactory("MyNft");
  const mockNFT = await MockNFT.deploy();
  await mockNFT.waitForDeployment();
  
  // 创建测试拍卖
  await mockNFT.safeMint(deployer.address, "test-nft");
  await mockNFT.approve(await factory.getAddress(), 0);
  
  const tx = await factory.createAuction(
    3600, // 1小时
    100,  // 起拍价
    await mockNFT.getAddress(),
    0     // tokenId
  );
  await tx.wait();
  console.log("Test auction created");

  // 保存部署信息
  const deploymentInfo = {
    mockNFT: await mockNFT.getAddress(),
    testAuctionTx: tx.hash,
    network: network.name,
    contractAddress: await factory.getAddress(),
    deployer: deployer.address,
    timestamp: new Date().toISOString()
  };

  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir);
  }

  fs.writeFileSync(
    path.join(deploymentsDir, `upgradeable-factory-${network.name}.json`),
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log("Deployment info saved");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});