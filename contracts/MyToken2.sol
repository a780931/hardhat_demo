pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MyToken2 is ERC20, Ownable {

    constructor() ERC20("MyToken2", "MTK2") Ownable(msg.sender) {
        _mint(msg.sender, 1000);
    }   

        function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }

}