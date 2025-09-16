// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./UpgradeableNftAuctionFactory.sol";

contract UpgradeableNftAuctionFactoryV2 is UpgradeableNftAuctionFactory {
    // 新增功能：获取合约版本
    function version() public pure returns (string memory) {
        return "V2";
    }

    // 保持原有存储布局不变
    // 可以添加新功能但不要修改或删除原有变量
}