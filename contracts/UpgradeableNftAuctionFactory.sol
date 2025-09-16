// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "./NftAuction.sol";

contract UpgradeableNftAuctionFactory is Initializable, OwnableUpgradeable, UUPSUpgradeable {
    // 所有拍卖合约地址
    address[] public allAuctions;
    
    // 映射：NFT合约 => tokenId => 拍卖合约
    mapping(address => mapping(uint256 => address)) public getAuction;
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address initialOwner) initializer public {
        __Ownable_init(initialOwner);
        __UUPSUpgradeable_init();
    }

    // 事件
    event AuctionCreated(
        address indexed nftContract,
        uint256 indexed tokenId,
        address auction,
        address indexed seller,
        uint256 duration,
        uint256 startPrice
    );

    // 创建新的拍卖
    function createAuction(
        uint256 _duration,
        uint256 _startPrice,
        address _nftAddress,
        uint256 _tokenId
    ) external returns (address auction) {
        require(_nftAddress != address(0), "Invalid NFT address");
        require(getAuction[_nftAddress][_tokenId] == address(0), "Auction already exists");
        require(_duration >= 10, "Duration too short");
        require(_startPrice > 0, "Invalid start price");

        // 检查NFT所有权和授权
        require(
            IERC721(_nftAddress).ownerOf(_tokenId) == msg.sender,
            "Not NFT owner"
        );
        require(
            IERC721(_nftAddress).getApproved(_tokenId) == address(this) ||
            IERC721(_nftAddress).isApprovedForAll(msg.sender, address(this)),
            "Factory not approved"
        );

        // 创建新的拍卖合约
        bytes memory bytecode = type(NftAuction).creationCode;
        bytes32 salt = keccak256(abi.encodePacked(_nftAddress, _tokenId, block.timestamp));
        
        assembly {
            auction := create2(0, add(bytecode, 32), mload(bytecode), salt)
        }
        
        // 初始化拍卖合约
        NftAuction(auction).initialize(
            _duration,
            _startPrice,
            _nftAddress,
            _tokenId,
            msg.sender
        );

        // 记录拍卖合约
        getAuction[_nftAddress][_tokenId] = auction;
        allAuctions.push(auction);

        // 转移NFT到拍卖合约
        IERC721(_nftAddress).safeTransferFrom(msg.sender, auction, _tokenId);

        emit AuctionCreated(
            _nftAddress,
            _tokenId,
            auction,
            msg.sender,
            _duration,
            _startPrice
        );
    }

    // 获取所有拍卖数量
    function allAuctionsLength() external view returns (uint) {
        return allAuctions.length;
    }

    // 根据NFT信息获取拍卖地址
    function getAuctionByNFT(address nftContract, uint256 tokenId) external view returns (address) {
        return getAuction[nftContract][tokenId];
    }

    // 紧急停止所有拍卖（仅管理员）
    function emergencyPauseAll(bool pause) external onlyOwner {
        for (uint i = 0; i < allAuctions.length; i++) {
            NftAuction(allAuctions[i]).setPaused(pause);
        }
    }

    // 重写UUPS升级授权
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}