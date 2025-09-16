const { ethers } = require("hardhat");
const { expect } = require("chai");
const { any } = require("hardhat/internal/core/params/argumentTypes");

describe("MockPriceFeed", main);



function main() {
    let mockPriceFeed;
    let myToken;

    let mockPriceFeed2;
    let myToken2;

    let myNft;

    let nftAuctionFactory;




    let ethPriceConsumerV3;
    let owner;
    let addr1;
    let addr2;
    beforeEach(async function () {
        [owner, addr1, addr2] = await ethers.getSigners();
        const MockPriceFeed = await ethers.getContractFactory("MockPriceFeed");
        mockPriceFeed = await MockPriceFeed.deploy();
        await mockPriceFeed.waitForDeployment();

        const MyToken = await ethers.getContractFactory("MyToken");
        myToken = await MyToken.deploy();
        await myToken.waitForDeployment();
        await myToken.mint(addr1,1000);
        await myToken.mint(addr2,1000);

        const MockPriceFeed2 = await ethers.getContractFactory("MockPriceFeed2");
        mockPriceFeed2 = await MockPriceFeed2.deploy();
        await mockPriceFeed2.waitForDeployment();


        const MyToken2 = await ethers.getContractFactory("MyToken2");
        myToken2 = await MyToken2.deploy();
        await myToken2.waitForDeployment();
        await myToken2.mint(addr1,1000);
        await myToken2.mint(addr2,1000);

        //nft
        const MyNft = await ethers.getContractFactory("MyNft");
        myNft = await MyNft.deploy();
        await myNft.waitForDeployment();



        console.log("first mynft id:",await myNft.safeMint(addr1.address,"baidu"));
        await myNft.connect(addr1).approve(owner.address,0);
        await myNft.connect(addr1).setApprovalForAll(owner.address,true);
        console.log("owner of mynft:",await myNft.ownerOf(0));
        console.log(addr1.address);
        
        const NftAuctionFactory = await ethers.getContractFactory("NftAuctionFactory");
        nftAuctionFactory = await NftAuctionFactory.deploy();
        await nftAuctionFactory.waitForDeployment();


        






        const EthPriceConsumerV3 = await ethers.getContractFactory("EthPriceConsumerV3");
        ethPriceConsumerV3 = await EthPriceConsumerV3.deploy(mockPriceFeed.target);
        await ethPriceConsumerV3.waitForDeployment();
        console.log("MockPriceFeed deployed to:", mockPriceFeed.target);
        console.log("EthPriceConsumerV3 deployed to:", ethPriceConsumerV3.target);
        //部署藏品合约
    });

    describe("set LatestAnswer", function () {
        it("should set the latest answer", async function () {
            await mockPriceFeed.setLatestAnswer(10000);
            const [any,latestAnswer]   = await mockPriceFeed.latestRoundData();
            await expect(latestAnswer).to.equal(10000);
            await expect(await ethPriceConsumerV3.getLatestPrice()).to.equal(10000);
        })
    });

        describe("create auction", function () {
        it("create auction", async function () {
            // 先授权工厂合约操作NFT
            await myNft.connect(addr1).approve(nftAuctionFactory.target, 0);
            
            await expect(
                nftAuctionFactory.connect(owner).createAuction(
                    1000, // 1小时
                    100, // 
                    myNft.target,
                    0
                )
            ).to.be.revertedWith("Not NFT owner");
            // 1. 确认NFT所有权状态
            console.log("NFT所有者:", await myNft.ownerOf(0));
            console.log("操作者地址:", addr1.address);

            // 2. 检查工厂合约授权状态
            const isApproved = await myNft.getApproved(0) === nftAuctionFactory.target;
            const isApprovedForAll = await myNft.isApprovedForAll(addr1.address, nftAuctionFactory.target);
            console.log("工厂合约授权状态:", {isApproved, isApprovedForAll});

            try {
                // 3. 发送创建拍卖交易
                console.log("正在创建拍卖合约...");
                const tx = await nftAuctionFactory.connect(addr1).createAuction(
                    11, // 1小时
                    100, // 
                    myNft.target,
                    0
                );
                console.log("ttttxxxx:",tx);
                console.log("交易已发送，哈希:", tx.hash);
                // 4. 等待交易确认
                console.log("等待交易确认...");
                const receipt = await tx.wait();
                console.log("receiptreceiptreceipt:",receipt);
                console.log("交易已确认，区块:", receipt.blockNumber);
                console.log("交易状态:", receipt.status === 1 ? "成功" : "失败");

                // 5. 解析交易日志
                console.log("解析交易日志...");
                const eventInterface = new ethers.Interface([
                    "event AuctionCreated(address indexed nftContract, uint256 indexed tokenId, address auction, address indexed seller, uint256 duration, uint256 startPrice)"
                ]);
                
                const parsedLogs = receipt.logs.map(log => {
                    try {
                        return eventInterface.parseLog(log);
                    } catch (e) {
                        return null;
                    }
                }).filter(log => log !== null);
                
                if (parsedLogs.length === 0) {
                    throw new Error("未解析到任何有效事件日志");
                }
                
                console.log("解析到的事件:", parsedLogs);
                
                // 6. 查找目标事件
                const auctionCreatedLog = parsedLogs.find(log => log.name === "AuctionCreated");
                if (!auctionCreatedLog) {
                    throw new Error("未找到AuctionCreated事件日志");
                }
                
                // 7. 提取拍卖地址
                const auctionAddress = auctionCreatedLog.args.auction;

                console.log("获取到的拍卖地址:", auctionAddress);
                if (!auctionAddress) {
                    throw new Error("事件日志中未包含拍卖地址");
                }

                // 8. 验证地址格式
                console.log("获取到的拍卖地址:", auctionAddress);
                expect(auctionAddress).to.be.a('string');
                expect(auctionAddress).to.match(/^0x[a-fA-F0-9]{40}$/);
                console.log("地址格式验证通过");
                
                const NftAuction = await ethers.getContractFactory("NftAuction");
                const nftAuction = NftAuction.attach(auctionAddress);
                await nftAuction.connect(addr1).setPriceFeed(myToken.target,mockPriceFeed.target);
                await nftAuction.connect(addr1).setPriceFeed(myToken2.target,mockPriceFeed2.target);
                await nftAuction.connect(addr1).setPriceFeed(ethers.ZeroAddress,mockPriceFeed.target); // 设置ETH价格预言机
                
                // 设置预言机返回值
                await mockPriceFeed.setLatestAnswer(99);
                await mockPriceFeed2.setLatestAnswer(88);
                
               expect(await nftAuction.connect(addr1).getChainlinkDataFeedLatestAnswer(myToken.target)).to.equal(99);
               expect(await nftAuction.connect(addr1).getChainlinkDataFeedLatestAnswer(myToken2.target)).to.equal(88);
               expect(await nftAuction.connect(addr1).getChainlinkDataFeedLatestAnswer(ethers.ZeroAddress)).to.equal(99);
               
                // 授权拍卖合约从owner和addr2账户转移代币
                await myToken.connect(owner).approve(nftAuction.target, 500);
                await myToken2.connect(addr2).approve(nftAuction.target, 200);
                await nftAuction.connect(addr2).placeBid(200,myToken2.target);
                await nftAuction.connect(owner).placeBid(200,myToken.target);
                
                // 增加20秒等待拍卖结束
                await ethers.provider.send("evm_increaseTime", [20]);
                await ethers.provider.send("evm_mine"); // 挖一个新块使时间生效
                
                await nftAuction.connect(addr1).endAuction();
                expect(await myNft.ownerOf(0)).to.equal(owner.address);


 
               // expect(await nftAuction.connect(owner).getPriceFeed(myToken.target)).to.equal(true);
                // expect(await nftAuction.connect(owner).getPriceFeed(myToken.target)).to.equal(true);
            } catch (error) {
                console.error("获取拍卖地址过程中出错:");
                console.error("错误类型:", error.constructor.name);
                console.error("错误信息:", error.message);
                if (error.receipt) {
                    console.error("交易收据:", error.receipt);
                }
                throw error;
            }

            
            // expect().to.be.a('string');
            // await mockPriceFeed.setLatestAnswer(10000);
            // const [any,latestAnswer]   = await mockPriceFeed.latestRoundData();
            // await expect(latestAnswer).to.equal(10000);
            // await expect(await ethPriceConsumerV3.getLatestPrice()).to.equal(10000);
        })
    });


}