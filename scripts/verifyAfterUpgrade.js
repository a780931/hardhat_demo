const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Verifying with account:", deployer.address);

  // 读取部署信息
  const network = await ethers.provider.getNetwork();
  const deploymentFile = path.join(
    __dirname, 
    `../deployments/upgradeable-factory-${network.name}.json`
  );

  if (!fs.existsSync(deploymentFile)) {
    throw new Error("No deployment file found");
  }

  const deploymentInfo = JSON.parse(fs.readFileSync(deploymentFile));
  const factoryAddress = deploymentInfo.contractAddress;

  // 获取合约实例
  const UpgradeableNftAuctionFactory = await ethers.getContractFactory("UpgradeableNftAuctionFactory");
  const factory = UpgradeableNftAuctionFactory.attach(factoryAddress);

  // 验证拍卖数量
  const auctionCount = await factory.allAuctionsLength();
  console.log("Auction count after upgrade:", auctionCount.toString());
  
  if (auctionCount < 1) {
    throw new Error("Test auction data lost after upgrade");
  }

  // 验证NFT映射
  const auctionAddress = await factory.getAuction(deploymentInfo.mockNFT, 0);
  if (auctionAddress === ethers.ZeroAddress) {
    throw new Error("Auction mapping lost after upgrade");
  }
  console.log("Auction address preserved:", auctionAddress);

  console.log("Upgrade verification successful - all test data preserved");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});