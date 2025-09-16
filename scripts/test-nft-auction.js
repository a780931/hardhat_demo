const { ethers } = require("hardhat");

async function main() {
  console.log("运行NftAuction合约测试...");
  
  try {
    await hre.run("test", { grep: "NftAuction" });
    console.log("测试完成！");
  } catch (error) {
    console.error("测试失败:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });