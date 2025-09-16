// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// 导入 Chainlink 的 AggregatorV3Interface 接口
import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";


contract EthPriceConsumerV3 {
    // 声明一个 AggregatorV3Interface 类型的状态变量
    AggregatorV3Interface internal priceFeed;

    constructor(address _priceFeedAddress) {
        priceFeed = AggregatorV3Interface(_priceFeedAddress);
    }

    function getLatestPrice() public view returns (int) {
        // 调用 latestRoundData 函数获取最新价格数据[2,6](@ref)
        // 使用逗号跳过不需要的返回值[1](@ref)
        (
            /*uint80 roundID*/,
            int price,
            /*uint startedAt*/,
            /*uint timeStamp*/,
            /*uint80 answeredInRound*/
        ) = priceFeed.latestRoundData();
        // 返回价格，注意此价格可能包含多位小数，实际使用时常需精度转换[6](@ref)
        return price;
    }


    function getDecimals() public view returns (uint8) {
        return priceFeed.decimals();
    }

    function getDescription() public view returns (string memory) {
        return priceFeed.description();
    }
}