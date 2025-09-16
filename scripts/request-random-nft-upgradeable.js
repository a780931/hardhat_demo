const hre = require("hardhat");
require("dotenv").config();

async function main() {
  // 获取部署的NFT合约地址
  const nftAddress = process.env.NFT_CONTRACT_ADDRESS;
  if (!nftAddress) {
    console.error("请在.env文件中设置NFT_CONTRACT_ADDRESS");
    return;
  }

  // 连接到合约
  const MyNft = await hre.ethers.getContractFactory("MyNft");
  const myNft = MyNft.attach(nftAddress);

  // 请求随机NFT
  const tokenURI = "https://example.com/metadata/random-nft";
  const tx = await myNft.requestRandomNFT(tokenURI);
  
  console.log("交易已发送:", tx.hash);
  console.log("等待交易确认...");
  
  const receipt = await tx.wait();
  
  // 从事件中获取requestId
  const requestId = receipt.events.find(event => event.event === "RequestedRandomness").args.requestId;
  console.log("随机NFT请求已提交，requestId:", requestId);
  console.log("请等待Chainlink VRF回调完成铸造过程");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });