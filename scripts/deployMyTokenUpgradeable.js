const { ethers, upgrades } = require("hardhat");

async function main() {
  const [owner, addr1] = await ethers.getSigners();
  const MyTokenUpgradeable = await ethers.getContractFactory("MyTokenUpgradeable");
  
  console.log("Deploying MyTokenUpgradeable...");
  const myToken = await upgrades.deployProxy(MyTokenUpgradeable, [], {
    initializer: "initialize",
    kind: "uups"
  });

  await myToken.waitForDeployment();
  
  console.log("MyTokenUpgradeable deployed to:", await myToken.getAddress());
  
  // 给addr1分配100代币
  console.log("Transferring 100 tokens to addr1...");
  await myToken.transfer(addr1.address, 100);
  console.log("Done. Addr1 balance:", (await myToken.balanceOf(addr1.address)).toString());

  // 保存部署信息到JSON文件
  const deploymentInfo = {
    proxyAddress: await myToken.getAddress(),
    owner: owner.address,
    addr1: addr1.address,
    addr2: (await ethers.getSigners())[2].address
  };
  
  const fs = require('fs');
  fs.writeFileSync('deployment-info.json', JSON.stringify(deploymentInfo, null, 2));
  console.log("Deployment info saved to deployment-info.json");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});