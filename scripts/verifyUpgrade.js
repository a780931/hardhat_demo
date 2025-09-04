const { ethers } = require("hardhat");

async function main() {
  // 从部署记录获取代理地址（或手动输入）
  const proxyAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"; 
  
  // 通过升级插件获取正确的合约实例
  const MyTokenUpgradeableV2 = await ethers.getContractFactory("MyTokenUpgradeableV2");
  const myToken = await upgrades.erc1967.getImplementationAddress(proxyAddress)
    .then(implAddress => MyTokenUpgradeableV2.attach(proxyAddress));
  const [owner, addr1] = await ethers.getSigners();
  
  console.log("Verifying upgrade integrity...");
  
  // 验证名称和符号保持不变
  console.log("Token name (should be MyToken):", await myToken.name());
  console.log("Token symbol (should be MTK):", await myToken.symbol());
  
  // 验证addr1余额保持不变(初始应有100)
  const addr1Balance = await myToken.balanceOf(addr1.address);
  console.log(`Addr1 balance (should be 100): ${addr1Balance.toString()}`);
  
  // 验证新功能
  try {
    console.log("Testing new mintMore function...");
    await myToken.connect(owner).mintMore(owner.address, 50);
    console.log("mintMore successful! New owner balance:", 
      (await myToken.balanceOf(owner.address)).toString());
  } catch (error) {
    console.error("mintMore test failed:", error);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});