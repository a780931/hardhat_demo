const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MyNft", function () {
  let myNft;
  let vrfCoordinatorV2Mock;
  let owner;
  let user;

  // 测试参数
  const BASE_FEE = "100000000000000000"; // 0.1 LINK
  const GAS_PRICE_LINK = "1000000000"; // 0.000000001 LINK per gas
  const FUND_AMOUNT = "1000000000000000000"; // 1 LINK
  const gasLane = "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c";
  const callbackGasLimit = "500000";
  const tokenURIs = [
    "ipfs://QmNddFsVbibLbAQRXjFJnXGXN2rTqiR3zAcqAJJCXyYZYo/0",
    "ipfs://QmNddFsVbibLbAQRXjFJnXGXN2rTqiR3zAcqAJJCXyYZYo/1",
    "ipfs://QmNddFsVbibLbAQRXjFJnXGXN2rTqiR3zAcqAJJCXyYZYo/2"
  ];

  beforeEach(async function () {
    // 获取签名者
    [owner, user] = await ethers.getSigners();

    // 部署VRF协调器模拟合约
    const VRFCoordinatorV2Mock = await ethers.getContractFactory("VRFCoordinatorV2Mock");
    vrfCoordinatorV2Mock = await VRFCoordinatorV2Mock.deploy(BASE_FEE, GAS_PRICE_LINK);
    await vrfCoordinatorV2Mock.waitForDeployment();

    // 创建VRF订阅
    const tx = await vrfCoordinatorV2Mock.createSubscription();
    const txReceipt = await tx.wait(1);
    const subscriptionId = txReceipt.logs[0].args[0];

    // 为订阅添加资金
    await vrfCoordinatorV2Mock.fundSubscription(subscriptionId, FUND_AMOUNT);

    // 部署MyNft合约
    const MyNft = await ethers.getContractFactory("MyNft");
    myNft = await MyNft.deploy(
      await vrfCoordinatorV2Mock.getAddress(),
      subscriptionId,
      gasLane,
      callbackGasLimit,
      tokenURIs
    );
    await myNft.waitForDeployment();

    // 将消费者添加到订阅中
    await vrfCoordinatorV2Mock.addConsumer(subscriptionId, await myNft.getAddress());
  });

  describe("构造函数", function () {
    it("应该正确初始化合约", async function () {
      expect(await myNft.getTokenCounter()).to.equal(0);
      expect(await myNft.getTokenURIsLength()).to.equal(3);
      expect(await myNft.getTokenURI(0)).to.equal(tokenURIs[0]);
      expect(await myNft.getTokenURI(1)).to.equal(tokenURIs[1]);
      expect(await myNft.getTokenURI(2)).to.equal(tokenURIs[2]);
    });
  });

  describe("requestNft", function () {
    it("应该发出NftRequested事件", async function () {
      await expect(myNft.requestNft())
        .to.emit(myNft, "NftRequested")
        .withArgs(1, owner.address);
    });
  });

  describe("fulfillRandomWords", function () {
    it("应该铸造NFT并发出NftMinted事件", async function () {
      // 请求NFT
      const requestNftTx = await myNft.requestNft();
      const requestNftReceipt = await requestNftTx.wait(1);
      const requestId = requestNftReceipt.logs[1].args[0];

      // 模拟VRF回调
      await expect(
        vrfCoordinatorV2Mock.fulfillRandomWords(
          requestId,
          await myNft.getAddress()
        )
      ).to.emit(myNft, "NftMinted");

      // 验证NFT是否已铸造
      expect(await myNft.getTokenCounter()).to.equal(1);
      expect(await myNft.ownerOf(0)).to.equal(owner.address);
    });
  });

  describe("getTokenURIIndex", function () {
    it("应该根据随机数返回正确的URI索引", async function () {
      // 测试不同范围的随机数
      expect(await myNft.getTokenURIIndex(0)).to.equal(0); // 0-59 -> 普通
      expect(await myNft.getTokenURIIndex(59)).to.equal(0);
      expect(await myNft.getTokenURIIndex(60)).to.equal(1); // 60-89 -> 稀有
      expect(await myNft.getTokenURIIndex(89)).to.equal(1);
      expect(await myNft.getTokenURIIndex(90)).to.equal(2); // 90-99 -> 超稀有
      expect(await myNft.getTokenURIIndex(99)).to.equal(2);
    });
  });

  describe("getChanceArray", function () {
    it("应该返回正确的概率分布", async function () {
      const chanceArray = await myNft.getChanceArray();
      expect(chanceArray[0]).to.equal(60); // 普通 60%
      expect(chanceArray[1]).to.equal(30); // 稀有 30%
      expect(chanceArray[2]).to.equal(10); // 超稀有 10%
    });
  });
});