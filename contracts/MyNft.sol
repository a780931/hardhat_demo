// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";



contract MyNft is  ERC721,Ownable,ERC721URIStorage{
     uint private next_id;
    // Chainlink VRF变量
    constructor() ERC721("MYNFT","MFT")
                Ownable(msg.sender)
    {
    }


     function safeMint(address to, string memory tokenURI) public onlyOwner returns (uint256) {
         uint id = next_id;
        _safeMint(to, id);
        _setTokenURI(id, tokenURI);
        next_id++;
        return id;
    }

    function tokenURI(uint tokenId) public view override (ERC721,ERC721URIStorage) returns (string memory){
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721,ERC721URIStorage) returns (bool) {
    return  super.supportsInterface(interfaceId);
    }

 
}