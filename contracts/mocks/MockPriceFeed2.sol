// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

contract MockPriceFeed2 is AggregatorV3Interface {
    int256 private _answer = 88;
    uint8 private _decimals = 8;
    string private _description = "Mock Price Feed";
    uint256 private _version = 1;
    
    // 最新轮次ID
    uint80 private _roundId = 1;
    
    // 最新更新时间
    uint256 private _updatedAt;
    
    constructor() {
        _updatedAt = block.timestamp;
    }
    
    function setLatestAnswer(int256 answer) external {
        _answer = answer;
        _updatedAt = block.timestamp;
        _roundId++;
    }

    function decimals() external view override returns (uint8) {
        return _decimals;
    }

    function description() external view override returns (string memory) {
        return _description;
    }

    function version() external view override returns (uint256) {
        return _version;
    }

    function getRoundData(uint80 roundId) external view override returns (
        uint80 roundId_,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    ) {
        require(roundId <= _roundId, "Round not complete");
        return (
            roundId,
            _answer,
            _updatedAt,
            _updatedAt,
            roundId
        );
    }

    function latestRoundData() external view override returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    ) {
        return (
            _roundId,
            _answer,
            _updatedAt,
            _updatedAt,
            _roundId
        );
    }
}