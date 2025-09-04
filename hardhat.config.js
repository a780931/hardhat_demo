require("@nomicfoundation/hardhat-toolbox");
require("@openzeppelin/hardhat-upgrades");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.28",
  networks: {
    test: {
      url: "http://127.0.0.1:8545", // 本地测试网络
      chainId: 31337,
    }
  }
};
