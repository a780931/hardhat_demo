// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract MyTokenUpgradeableV2 is Initializable, ERC20Upgradeable, OwnableUpgradeable, UUPSUpgradeable {
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize() initializer public {
        __ERC20_init("MyToken", "MTK"); // 保持原始名称和符号
        __Ownable_init(msg.sender);
        _mint(msg.sender, 1000); // 保持原始供应量
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    // 新增功能：仅所有者可以调用的增发函数
    function mintMore(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }
}