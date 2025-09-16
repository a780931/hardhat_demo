const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("MyNft (Upgradeable)", function () {
  let myNft;
  let owner;
  let addr1;
  
  // 测试网络的Chainlink VRF参数
  const vrfCoordinatorMock = "0x8103B0A8A00be2DDC778e6e7eaa21791Cd364625"; // 这里应该使用模拟地址
  const subscriptionId = 1;
  const keyHash = "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c";

  beforeEach(async function () {
    // 获取签名者
    [owner, addr1] = await ethers.getSigners();

    // 部署可升级合约
    const MyNft = await ethers.getContractFactory("MyNft");
    myNft = await upgrades.deployProxy(
      MyNft, 
      [vrfCoordinatorMock, subscriptionId, keyHash],
      { 
        initializer: 'initialize',
        constructorArgs: [vrfCoordinatorMock],
        kind: 'uups'
      }
    );
    await myNft.deployed();
  });

  it("应该设置正确的名称和符号", async function () {
    expect(await myNft.name()).to.equal("MyNft");
    expect(await myNft.symbol()).to.equal("MTK");
  });

  it("应该允许所有者铸造NFT", async function () {
    const tokenURI = "https://example.com/token/1";
    await myNft.safeMint(addr1.address, tokenURI);
    
    expect(await myNft.ownerOf(0)).to.equal(addr1.address);
    expect(await myNft.tokenURI(0)).to.equal(tokenURI);
  });

  it("应该允许请求随机NFT", async function () {
    // 注意：这个测试只验证请求函数不会回滚，但不会测试回调
    // 因为在测试环境中VRF协调器是模拟的
    const tokenURI = "https://example.com/token/random";
    
    // 请求随机NFT
    await expect(myNft.requestRandomNFT(tokenURI))
      .to.emit(myNft, "RequestedRandomness");
  });
});