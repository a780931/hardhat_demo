const { ethers, upgrades } = require("hardhat");
require("dotenv").config();

async function main() {
  const proxyAddress = process.env.NFT_CONTRACT_ADDRESS;
  
  if (!proxyAddress) {
    console.error("请在.env文件中设置NFT_CONTRACT_ADDRESS");
    return;
  }

  console.log("准备升级代理合约:", proxyAddress);

  // 部署新的实现合约
  const vrfCoordinatorV2 = "0x8103B0A8A00be2DDC778e6e7eaa21791Cd364625"; // Sepolia VRF Coordinator
  const MyNftV2 = await ethers.getContractFactory("MyNft");
  
  console.log("开始升级...");
  const upgraded = await upgrades.upgradeProxy(proxyAddress, MyNftV2, {
    constructorArgs: [vrfCoordinatorV2]
  });

  console.log("代理已升级! 代理地址:", upgraded.address);
  
  // 获取新的实现合约地址
  const implementationAddress = await upgrades.erc1967.getImplementationAddress(upgraded.address);
  console.log("新的实现合约地址:", implementationAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });