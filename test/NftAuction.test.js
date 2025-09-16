const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("NftAuction", function () {
  let nftAuction;
  let mockNFT;
  let mockERC20;
  let mockPriceFeed;
  let mockUSDCPriceFeed;
  let owner;
  let bidder1;
  let bidder2;
  let seller;

  // 模拟价格数据
  const ETH_USD_PRICE = 3000n * 10n**8n; // 3000美元，带8位小数
  const USDC_USD_PRICE = 1n * 10n**8n;   // 1美元，带8位小数

  beforeEach(async function () {
    // 获取签名者
    [owner, bidder1, bidder2, seller] = await ethers.getSigners();

    // 部署模拟NFT合约
    const MockNFT = await ethers.getContractFactory("MockNFT");
    mockNFT = await MockNFT.deploy("MockNFT", "MNFT");

    // 部署模拟ERC20代币合约
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    mockERC20 = await MockERC20.deploy("MockUSDC", "USDC", 6); // 6位小数

    // 部署模拟价格预言机
    const MockPriceFeed = await ethers.getContractFactory("MockPriceFeed");
    mockPriceFeed = await MockPriceFeed.deploy();

    // 设置ETH和USDC的价格
    await mockPriceFeed.setLatestAnswer(ETH_USD_PRICE); // ETH价格
    
    // 部署另一个价格预言机用于USDC
    const MockUSDCPriceFeed = await ethers.getContractFactory("MockPriceFeed");
    mockUSDCPriceFeed = await MockUSDCPriceFeed.deploy();
    await mockUSDCPriceFeed.setLatestAnswer(USDC_USD_PRICE); // USDC价格

    // 部署拍卖合约
    const NftAuction = await ethers.getContractFactory("NftAuction");
    nftAuction = await upgrades.deployProxy(NftAuction, [], { initializer: 'initialize' });

    // 为bidder1和bidder2铸造一些ERC20代币
    await mockERC20.mint(bidder1.address, ethers.parseUnits("10000", 6)); // 10000 USDC
    await mockERC20.mint(bidder2.address, ethers.parseUnits("10000", 6)); // 10000 USDC

    // 为seller铸造一个NFT
    await mockNFT.mint(seller.address, "https://example.com/token/1");

    // 授权拍卖合约使用NFT
    await mockNFT.connect(seller).setApprovalForAll(nftAuction.address, true);

    // 授权拍卖合约使用ERC20代币
    await mockERC20.connect(bidder1).approve(nftAuction.address, ethers.parseUnits("10000", 6));
    await mockERC20.connect(bidder2).approve(nftAuction.address, ethers.parseUnits("10000", 6));
  });

  describe("setPriceFeed", function () {
    it("应该正确设置价格预言机", async function () {
      // 设置ETH价格预言机
      await nftAuction.setPriceFeed(ethers.ZeroAddress, mockPriceFeed.address);
      
      // 设置USDC价格预言机
      await nftAuction.setPriceFeed(mockERC20.address, mockUSDCPriceFeed.address);
      
      // 验证价格预言机是否正确设置
      expect(await nftAuction.priceFeeds(ethers.ZeroAddress)).to.equal(mockPriceFeed.address);
      expect(await nftAuction.priceFeeds(mockERC20.address)).to.equal(mockUSDCPriceFeed.address);
    });

    it("应该允许任何人设置价格预言机", async function () {
      // 使用非管理员账户设置价格预言机
      await nftAuction.connect(bidder1).setPriceFeed(mockERC20.address, mockUSDCPriceFeed.address);
      
      // 验证价格预言机是否正确设置
      expect(await nftAuction.priceFeeds(mockERC20.address)).to.equal(mockUSDCPriceFeed.address);
    });

    it("应该能够获取最新的价格数据", async function () {
      // 设置价格预言机
      await nftAuction.setPriceFeed(ethers.ZeroAddress, mockPriceFeed.address);
      await nftAuction.setPriceFeed(mockERC20.address, mockUSDCPriceFeed.address);
      
      // 获取并验证价格数据
      expect(await nftAuction.getChainlinkDataFeedLatestAnswer(ethers.ZeroAddress)).to.equal(ETH_USD_PRICE);
      expect(await nftAuction.getChainlinkDataFeedLatestAnswer(mockERC20.address)).to.equal(USDC_USD_PRICE);
    });
  });

  describe("createAuction", function () {
    it("只有管理员可以创建拍卖", async function () {
      // 使用管理员账户创建拍卖
      await expect(
        nftAuction.connect(owner).createAuction(
          3600, // 1小时
          ethers.parseEther("1"), // 1 ETH起拍价
          mockNFT.address,
          0
        )
      ).to.be.revertedWith("ERC721: caller is not token owner or approved");

      // 使用非管理员账户创建拍卖
      await expect(
        nftAuction.connect(bidder1).createAuction(
          3600,
          ethers.parseEther("1"),
          mockNFT.address,
          0
        )
      ).to.be.revertedWith("Only admin can create auctions");
    });

    it("应该成功创建拍卖", async function () {
      // 将NFT转移给管理员
      await mockNFT.connect(seller).transferFrom(seller.address, owner.address, 0);
      
      // 创建拍卖
      await nftAuction.createAuction(
        3600, // 1小时
        ethers.parseEther("1"), // 1 ETH起拍价
        mockNFT.address,
        0
      );
      
      // 验证拍卖是否创建成功
      const auction = await nftAuction.auctions(0);
      expect(auction.seller).to.equal(owner.address);
      expect(auction.duration).to.equal(3600);
      expect(auction.startPrice).to.equal(ethers.parseEther("1"));
      expect(auction.ended).to.equal(false);
      expect(auction.nftContract).to.equal(mockNFT.address);
      expect(auction.tokenId).to.equal(0);
      expect(auction.tokenAddress).to.equal(ethers.ZeroAddress);
      
      // 验证NFT是否已转移到合约
      expect(await mockNFT.ownerOf(0)).to.equal(nftAuction.address);
    });

    it("拍卖持续时间必须大于10秒", async function () {
      // 将NFT转移给管理员
      await mockNFT.connect(seller).transferFrom(seller.address, owner.address, 0);
      
      // 尝试创建持续时间小于10秒的拍卖
      await expect(
        nftAuction.createAuction(
          5, // 5秒
          ethers.parseEther("1"),
          mockNFT.address,
          0
        )
      ).to.be.revertedWith("Duration must be greater than 10s");
    });

    it("起拍价必须大于0", async function () {
      // 将NFT转移给管理员
      await mockNFT.connect(seller).transferFrom(seller.address, owner.address, 0);
      
      // 尝试创建起拍价为0的拍卖
      await expect(
        nftAuction.createAuction(
          3600,
          0, // 0 ETH
          mockNFT.address,
          0
        )
      ).to.be.revertedWith("Start price must be greater than 0");
    });
  });

  describe("placeBid", function () {
    beforeEach(async function () {
      // 设置价格预言机
      await nftAuction.setPriceFeed(ethers.ZeroAddress, mockPriceFeed.address);
      await nftAuction.setPriceFeed(mockERC20.address, mockUSDCPriceFeed.address);
      
      // 将NFT转移给管理员
      await mockNFT.connect(seller).transferFrom(seller.address, owner.address, 0);
      
      // 创建拍卖
      await nftAuction.createAuction(
        3600, // 1小时
        ethers.parseEther("1"), // 1 ETH起拍价
        mockNFT.address,
        0
      );
    });

    it("应该能够使用ETH出价", async function () {
      // 使用ETH出价
      await nftAuction.connect(bidder1).placeBid(
        0, // 拍卖ID
        0, // 金额参数在使用ETH时会被忽略
        ethers.ZeroAddress, // 使用ETH
        { value: ethers.parseEther("1.5") } // 1.5 ETH
      );
      
      // 验证出价是否成功
      const auction = await nftAuction.auctions(0);
      expect(auction.highestBidder).to.equal(bidder1.address);
      expect(auction.highestBid).to.equal(ethers.parseEther("1.5"));
      expect(auction.tokenAddress).to.equal(ethers.ZeroAddress);
    });

    it("应该能够使用ERC20代币出价", async function () {
      // 使用USDC出价 (3000 USDC 相当于 1 ETH 的价值)
      const bidAmount = ethers.parseUnits("3000", 6); // 3000 USDC
      await nftAuction.connect(bidder1).placeBid(
        0, // 拍卖ID
        bidAmount, // 3000 USDC
        mockERC20.address // 使用USDC
      );
      
      // 验证出价是否成功
      const auction = await nftAuction.auctions(0);
      expect(auction.highestBidder).to.equal(bidder1.address);
      expect(auction.highestBid).to.equal(bidAmount);
      expect(auction.tokenAddress).to.equal(mockERC20.address);
      
      // 验证USDC是否已转移到合约
      expect(await mockERC20.balanceOf(nftAuction.address)).to.equal(bidAmount);
    });

    it("出价必须高于当前最高出价", async function () {
      // 先出一个高价
      await nftAuction.connect(bidder1).placeBid(
        0,
        0,
        ethers.ZeroAddress,
        { value: ethers.parseEther("2") } // 2 ETH
      );
      
      // 尝试出一个低价
      await expect(
        nftAuction.connect(bidder2).placeBid(
          0,
          0,
          ethers.ZeroAddress,
          { value: ethers.parseEther("1.5") } // 1.5 ETH
        )
      ).to.be.revertedWith("Bid must be higher than the current highest bid");
    });

    it("应该退还前一个最高出价者的资金", async function () {
      // bidder1先出价
      await nftAuction.connect(bidder1).placeBid(
        0,
        0,
        ethers.ZeroAddress,
        { value: ethers.parseEther("1.5") } // 1.5 ETH
      );
      
      // 记录bidder1的初始余额
      const initialBalance = await ethers.provider.getBalance(bidder1.address);
      
      // bidder2出更高的价
      await nftAuction.connect(bidder2).placeBid(
        0,
        0,
        ethers.ZeroAddress,
        { value: ethers.parseEther("2") } // 2 ETH
      );
      
      // 验证bidder1是否收到退款
      const finalBalance = await ethers.provider.getBalance(bidder1.address);
      const difference = finalBalance - initialBalance;
      expect(difference).to.be.closeTo(
        ethers.parseEther("1.5"), // 应该退还1.5 ETH
        ethers.parseEther("0.01") // 允许有小额误差
      );
    });

    it("拍卖结束后不能出价", async function () {
      // 增加时间使拍卖结束
      await ethers.provider.send("evm_increaseTime", [3601]); // 增加3601秒
      await ethers.provider.send("evm_mine"); // 挖一个新区块
      
      // 尝试出价
      await expect(
        nftAuction.connect(bidder1).placeBid(
          0,
          0,
          ethers.ZeroAddress,
          { value: ethers.parseEther("1.5") }
        )
      ).to.be.revertedWith("Auction has ended");
    });
  });

  describe("endAuction", function () {
    beforeEach(async function () {
      // 设置价格预言机
      await nftAuction.setPriceFeed(ethers.ZeroAddress, mockPriceFeed.address);
      
      // 将NFT转移给管理员
      await mockNFT.connect(seller).transferFrom(seller.address, owner.address, 0);
      
      // 创建拍卖
      await nftAuction.createAuction(
        3600, // 1小时
        ethers.parseEther("1"), // 1 ETH起拍价
        mockNFT.address,
        0
      );
      
      // bidder1出价
      await nftAuction.connect(bidder1).placeBid(
        0,
        0,
        ethers.ZeroAddress,
        { value: ethers.parseEther("1.5") }
      );
    });

    it("拍卖结束前不能结束拍卖", async function () {
      // 尝试结束拍卖
      await expect(
        nftAuction.endAuction(0)
      ).to.be.revertedWith("Auction has not ended");
    });

    it("应该成功结束拍卖并转移NFT", async function () {
      // 增加时间使拍卖结束
      await ethers.provider.send("evm_increaseTime", [3601]); // 增加3601秒
      await ethers.provider.send("evm_mine"); // 挖一个新区块
      
      // 结束拍卖
      await nftAuction.endAuction(0);
      
      // 验证拍卖是否已结束
      const auction = await nftAuction.auctions(0);
      expect(auction.ended).to.equal(true);
      
      // 验证NFT是否已转移给最高出价者
      expect(await mockNFT.ownerOf(0)).to.equal(bidder1.address);
    });

    it("已结束的拍卖不能再次结束", async function () {
      // 增加时间使拍卖结束
      await ethers.provider.send("evm_increaseTime", [3601]);
      await ethers.provider.send("evm_mine");
      
      // 结束拍卖
      await nftAuction.endAuction(0);
      
      // 尝试再次结束拍卖
      await expect(
        nftAuction.endAuction(0)
      ).to.be.revertedWith("Auction has not ended");
    });
  });
});