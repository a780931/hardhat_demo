// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

contract NftAuction is ReentrancyGuard, IERC721Receiver, Ownable {
    struct AuctionInfo {
        address seller;
        uint256 duration;
        uint256 startPrice;
        uint256 startTime;
        bool ended;
        address highestBidder;
        uint256 highestBid;
        address nftContract;
        uint256 tokenId;
        address tokenAddress;
    }

    constructor() Ownable(msg.sender) {}

    AuctionInfo public auction;
    bool public paused;
    
    // Chainlink 价格预言机
    mapping(address => AggregatorV3Interface) public priceFeeds;
    
    // 事件
    event BidPlaced(address indexed bidder, uint256 amount, address tokenAddress);
    event AuctionEnded(address indexed winner, uint256 amount);
    event AuctionCancelled();
    event PriceFeedSet(address token, address priceFeed);

    // 初始化函数（只能由工厂调用一次）
    function initialize(
        uint256 _duration,
        uint256 _startPrice,
        address _nftAddress,
        uint256 _tokenId,
        address _seller
    ) external {

        require(auction.seller == address(0), "Already initialized");
        
        auction = AuctionInfo({
            seller: _seller,
            duration: _duration,
            startPrice: _startPrice,
            startTime: block.timestamp,
            ended: false,
            highestBidder: address(0),
            highestBid: 0,
            nftContract: _nftAddress,
            tokenId: _tokenId,
            tokenAddress: address(0)
        });
        
        // 将初始卖家设为所有者（用于设置价格预言机）
        _transferOwnership(_seller);
    }

    // 设置价格预言机（拍卖创建者可以设置）
    function setPriceFeed(address tokenAddress, address priceFeed) external onlyOwner {
        priceFeeds[tokenAddress] = AggregatorV3Interface(priceFeed);
        emit PriceFeedSet(tokenAddress, priceFeed);
    }

    function getPriceFeed(address tokenAddress) public view returns (bool) {
        return address(priceFeeds[tokenAddress]) != address(0);

    }

    // 紧急暂停/恢复拍卖
    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
    }

    

    function getChainlinkDataFeedLatestAnswer(address tokenAddress) public view returns (int) {
        AggregatorV3Interface priceFeed = priceFeeds[tokenAddress];
        require(address(priceFeed) != address(0), "Price feed not set");
        
        (, int256 answer, , , ) = priceFeed.latestRoundData();
        return answer;
    }

    function placeBid(uint256 amount, address _tokenAddress) 
        external 
        payable 
        nonReentrant 
    {
        require(!paused, "Auction paused");
        require(!auction.ended, "Auction ended");
        require(block.timestamp < auction.startTime + auction.duration, "Auction expired");

        uint256 payValue;
        if (_tokenAddress != address(0)) {
            payValue = amount * uint(getChainlinkDataFeedLatestAnswer(_tokenAddress));
        } else {
            amount = msg.value;
            payValue = amount * uint(getChainlinkDataFeedLatestAnswer(address(0)));
        }
        
        uint256 startPriceValue = auction.startPrice * uint(getChainlinkDataFeedLatestAnswer(auction.tokenAddress));
        uint256 highestBidValue = auction.highestBid * uint(getChainlinkDataFeedLatestAnswer(auction.tokenAddress));

        require(payValue >= startPriceValue, "Bid below start price");
        require(payValue > highestBidValue, "Bid not high enough");

        // 处理资金转移
        if (_tokenAddress != address(0)) {
            IERC20(_tokenAddress).transferFrom(msg.sender, address(this), amount);
        }

        // 退还前最高价
        if (auction.highestBid > 0) {
            _refundPreviousBidder();
        }
        
        // 更新拍卖状态
        auction.tokenAddress = _tokenAddress;
        auction.highestBid = amount;
        auction.highestBidder = msg.sender;

        emit BidPlaced(msg.sender, amount, _tokenAddress);
    }

    function _refundPreviousBidder() internal {
        if (auction.tokenAddress == address(0)) {
            payable(auction.highestBidder).transfer(auction.highestBid);
        } else {
            IERC20(auction.tokenAddress).transfer(auction.highestBidder, auction.highestBid);
        }
    }

    function endAuction() external nonReentrant {
        require(!auction.ended, "Already ended");
        require(block.timestamp >= auction.startTime + auction.duration, "Not ended yet");
        
        auction.ended = true;
        
        if (auction.highestBidder != address(0)) {
            // 有出价者，转移NFT和资金
            IERC721(auction.nftContract).safeTransferFrom(
                address(this),
                auction.highestBidder,
                auction.tokenId
            );
            
            if (auction.tokenAddress == address(0)) {
                payable(auction.seller).transfer(auction.highestBid);
            } else {
                IERC20(auction.tokenAddress).transfer(auction.seller, auction.highestBid);
            }
            
            emit AuctionEnded(auction.highestBidder, auction.highestBid);
        } else {
            // 无人出价，退回NFT给卖家
            IERC721(auction.nftContract).safeTransferFrom(
                address(this),
                auction.seller,
                auction.tokenId
            );
            emit AuctionCancelled();
        }
    }

    // 紧急取回NFT（仅限卖家）
    function emergencyWithdraw() external onlyOwner {
        require(!auction.ended, "Auction already ended");
        auction.ended = true;
        
        IERC721(auction.nftContract).safeTransferFrom(
            address(this),
            auction.seller,
            auction.tokenId
        );
        
        if (auction.highestBid > 0) {
            _refundPreviousBidder();
        }
        
        emit AuctionCancelled();
    }

    function onERC721Received(address, address, uint256, bytes calldata) external pure returns (bytes4) {
        return this.onERC721Received.selector;
    }

    // 获取拍卖信息
    function getAuctionInfo() external view returns (AuctionInfo memory) {
        return auction;
    }

    // 检查拍卖是否活跃
    function isActive() external view returns (bool) {
        return !auction.ended && block.timestamp < auction.startTime + auction.duration;
    }
}