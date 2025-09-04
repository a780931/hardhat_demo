const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  // 读取部署信息
  const deploymentInfo = JSON.parse(fs.readFileSync("deployment-info.json"));
  const { proxyAddress, owner, addr1, addr2 } = deploymentInfo;

  // 获取合约实例
  const MyToken = await ethers.getContractFactory("MyTokenUpgradeableV2");
  const myToken = MyToken.attach(proxyAddress);

  console.log("=== 开始合约测试 ===");
  console.log(`代理合约地址: ${proxyAddress}`);
  console.log(`Owner地址: ${owner}`);
  console.log(`Addr1地址: ${addr1}`);
  console.log(`Addr2地址: ${addr2}`);

  // 1. 验证基础信息
  console.log("\n[1/4] 验证基础信息...");
  console.log("代币名称:", await myToken.name());
  console.log("代币符号:", await myToken.symbol());
  console.log("总供应量:", (await myToken.totalSupply()).toString());

  // 2. 验证初始余额
  console.log("\n[2/4] 验证地址余额...");
  console.log("Owner余额:", (await myToken.balanceOf(owner)).toString());
  console.log("Addr1余额:", (await myToken.balanceOf(addr1)).toString());
  console.log("Addr2余额:", (await myToken.balanceOf(addr2)).toString());

  // 3. 验证转账功能
  console.log("\n[3/4] 测试转账功能...");
  const transferAmount = 50;
  await (await myToken.transfer(addr2, transferAmount)).wait();
  console.log(`已从Owner转账${transferAmount}到Addr2`);
  console.log("Owner新余额:", (await myToken.balanceOf(owner)).toString());
  console.log("Addr2新余额:", (await myToken.balanceOf(addr2)).toString());

  // 4. 验证新增功能(mintMore)
  console.log("\n[4/4] 测试mintMore功能...");
  const mintAmount = 200;
  await (await myToken.mintMore(owner, mintAmount)).wait();
  console.log(`已为Owner增发${mintAmount}代币`);
  console.log("Owner最终余额:", (await myToken.balanceOf(owner)).toString());

  console.log("\n=== 所有测试通过 ===");
}

main().catch((error) => {
  console.error("测试失败:", error);
  process.exitCode = 1;
});