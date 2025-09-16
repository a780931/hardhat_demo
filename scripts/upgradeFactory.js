const { ethers, upgrades } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Upgrading with account:", deployer.address);

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

  // 部署新版本
  const UpgradeableNftAuctionFactoryV2 = await ethers.getContractFactory("UpgradeableNftAuctionFactoryV2");
  
  console.log("Upgrading factory...");
  await upgrades.upgradeProxy(factoryAddress, UpgradeableNftAuctionFactoryV2);
  console.log("Factory upgraded to V2");

  // 验证新功能
  const factory = UpgradeableNftAuctionFactoryV2.attach(factoryAddress);
  console.log("New version:", await factory.version());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});