const { ethers, upgrades } = require("hardhat");

async function main() {
  // 从JSON文件读取部署信息
  const fs = require('fs');
  const deploymentInfo = JSON.parse(fs.readFileSync('deployment-info.json'));
  const proxyAddress = deploymentInfo.proxyAddress;
  
  console.log("Using proxy address:", proxyAddress);
  console.log("Owner address:", deploymentInfo.owner);
  
  console.log("Preparing upgrade...");
  const MyTokenUpgradeableV2 = await ethers.getContractFactory("MyTokenUpgradeableV2");
  
  console.log("Upgrading MyToken to V2...");
  await upgrades.upgradeProxy(proxyAddress, MyTokenUpgradeableV2);
  
  console.log("Upgrade completed!");
  
  // 验证升级后状态
  const myToken = await ethers.getContractAt("MyTokenUpgradeableV2", proxyAddress);
  const [owner, addr1] = await ethers.getSigners();
  
  console.log("Verifying state after upgrade:");
  console.log("Owner balance:", (await myToken.balanceOf(owner.address)).toString());
  console.log("Addr1 balance (should be 100):", (await myToken.balanceOf(addr1.address)).toString());
  
  console.log("New functions available:");
  console.log("- mintMore(address to, uint256 amount)");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});