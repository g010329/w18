// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/utils/structs/EnumerableSet.sol';
import "abdk-libraries-solidity/ABDKMathQuad.sol";
import '@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol';
import 'hardhat/console.sol';
import "./core/interfaces/IUniswapV2Factory.sol";

struct OrderedReserves {
    uint256 a1; // base asset
    uint256 b1;
    uint256 a2;
    uint256 b2;
}

struct ArbitrageInfo {
    address baseToken;
    address quoteToken;
    bool baseTokenSmaller; // FIXME: 改變數名稱
    address lowerPool; // pool with lower price, denominated in quote asset
    address higherPool; // pool with higher price, denominated in quote asset
}

struct CallbackData {
    address debtPool;
    address targetPool;
    bool debtTokenSmaller;
    address borrowedToken;
    address debtToken;
    uint256 debtAmount;
    uint256 debtTokenOutAmount;
}

contract FlashSwapBot is Ownable {
    using ABDKMathQuad for uint256;
    using SafeERC20 for IERC20;

    // 權限控管 
    // 1. owner - 只有 owner 可以呼叫使用這個合約
    // 2. 收款 tokens - 寫一個列表指定要獲利的 token 有哪些(可能可以寫到script中？)
    
    // ACCESS CONTROL
    // 只有呼叫了 arbitrage 後才會把可以執行 callback 的pair address 存到這個變數中
    // TODO: address(0), address(1) 都可以嗎？
    address permissionedPairAddress = address(0);

    // 合約核心功能兩大部分：  
    // 1. 計算利潤: getProfit  
    // 2. 執行套利: flashArbitrage
    // 3. 提款: 一有錢就轉給 owner
    using EnumerableSet for EnumerableSet.AddressSet;

    // AVAILABLE BASE TOKENS
    EnumerableSet.AddressSet baseTokens;

    event Log(string message,uint val); // timestamp, from address, profit value

    function addBaseToken(address token) external onlyOwner {
        baseTokens.add(token);
    }

    function removeBaseToken(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            // 這邊要不要用 safeTransfer
            // do not use safe transfer to prevents revert by any shitty token
            IERC20(token).transfer(owner(), balance);
        }
        baseTokens.remove(token);
    }

    function getBaseTokens() external view returns (address[] memory tokens) {
        uint256 length = baseTokens.length();
        tokens = new address[](length);
        for (uint256 i = 0; i < length; i++) {
            tokens[i] = baseTokens.at(i);
        }
    }

    // 判斷傳入的 token 是否在 baseTokens 中 
    function baseTokensContains(address token) public view returns (bool) {
        return baseTokens.contains(token);
    }

    function isPool0Token0isBaseToken(address _pool0, address _pool1)internal view returns (bool isBaseToken, address baseToken, address quoteToken){
        require(_pool0 != _pool1, 'Should not be the same pool');
        (address pool0Token0, address pool0Token1) = (IUniswapV2Pair(_pool0).token0(), IUniswapV2Pair(_pool0).token1());
        (address pool1Token0, address pool1Token1) = (IUniswapV2Pair(_pool1).token0(), IUniswapV2Pair(_pool1).token1());
        require(pool0Token0 < pool0Token1 && pool1Token0 < pool1Token1, 'Non standard uniswap AMM pair');
        require(pool0Token0 == pool1Token0 && pool0Token1 == pool1Token1, 'Require same token pair');

        (isBaseToken, baseToken, quoteToken) = baseTokensContains(pool0Token0)
            ? (true, pool0Token0, pool0Token1)
            : (false, pool0Token1, pool0Token0);
    }


    function getOrderedReserves(address pool0, address pool1, bool baseTokenSmaller)internal view returns (address lowerPool, address higherPool, OrderedReserves memory orderedReserves) {
        (uint256 pool0Reserve0, uint256 pool0Reserve1, ) = IUniswapV2Pair(pool0).getReserves();
        (uint256 pool1Reserve0, uint256 pool1Reserve1, ) = IUniswapV2Pair(pool1).getReserves();

        // 負數：-1, 正數：1, 相等：0
        int8 cmpResult = ABDKMathQuad.cmp(
                ABDKMathQuad.div(ABDKMathQuad.fromUInt(pool0Reserve0),ABDKMathQuad.fromUInt(pool0Reserve1)),
                ABDKMathQuad.div(ABDKMathQuad.fromUInt(pool1Reserve0),ABDKMathQuad.fromUInt(pool1Reserve1))
            );
        
        require(cmpResult != 0, 'No profit to arbitrage');

        if (cmpResult > 0) {
            (lowerPool, higherPool) = (pool0, pool1);
            (orderedReserves.a1, orderedReserves.b1, orderedReserves.a2, orderedReserves.b2) = baseTokenSmaller
                ? (pool0Reserve0, pool0Reserve1, pool1Reserve0, pool1Reserve1)
                : (pool0Reserve1, pool0Reserve0, pool1Reserve1, pool1Reserve0);
        } else {
            (lowerPool, higherPool) = (pool1, pool0);
            (orderedReserves.a1, orderedReserves.b1, orderedReserves.a2, orderedReserves.b2) = baseTokenSmaller
                ? (pool1Reserve0, pool1Reserve1, pool0Reserve0, pool0Reserve1)
                : (pool1Reserve1, pool1Reserve0, pool0Reserve1, pool0Reserve0);
        }
    }
    
    // 計算可以在兩個池子間套利多少利潤
    // token 分成兩種：base token 和 quote token
    function getProfit(address pool0, address pool1) view external returns (uint256 profit, address baseToken){
        (bool pool0Token0isBaseToken, , ) = isPool0Token0isBaseToken(pool0, pool1);
        baseToken = pool0Token0isBaseToken ? IUniswapV2Pair(pool0).token0() : IUniswapV2Pair(pool0).token1();
        (, , OrderedReserves memory orderedReserves) = getOrderedReserves(pool0, pool1, pool0Token0isBaseToken);

        uint256 borrowAmount = calcBorrowAmount(orderedReserves);
        // 從價低的池子借出
        uint256 debtAmount = getAmountIn(borrowAmount, orderedReserves.a1, orderedReserves.b1);
        // 到價高的池子 swap 獲利
        uint256 baseTokenOutAmount = getAmountOut(borrowAmount, orderedReserves.b2, orderedReserves.a2);
        if (baseTokenOutAmount < debtAmount) {
            profit = 0;
        } else {
            profit = baseTokenOutAmount - debtAmount;
        }
    }


    // 在兩個 uniswap-like AMM pool 之間套利
    function flashArbitrage(address pool0, address pool1) external {
        ArbitrageInfo memory info;
        (info.baseTokenSmaller, info.baseToken, info.quoteToken) = isPool0Token0isBaseToken(pool0, pool1);

        OrderedReserves memory orderedReserves;
        (info.lowerPool, info.higherPool, orderedReserves) = getOrderedReserves(pool0, pool1, info.baseTokenSmaller);   

        // 只有呼叫了 flashArbitrage 時會去修改 callback address 對 pair address 授權，一旦完成交易就會取消授權
        permissionedPairAddress = info.lowerPool;

        uint256 balanceBefore = IERC20(info.baseToken).balanceOf(address(this));
        uint256 borrowAmount = calcBorrowAmount(orderedReserves);
        (uint256 amount0Out, uint256 amount1Out) =
            info.baseTokenSmaller ? (uint256(0), borrowAmount) : (borrowAmount, uint256(0));
        // borrow quote token on lower price pool, calculate how much debt we need to pay demoninated in base token
        uint256 debtAmount = getAmountIn(borrowAmount, orderedReserves.a1, orderedReserves.b1);
        // sell borrowed quote token on higher price pool, calculate how much base token we can get
        uint256 baseTokenOutAmount = getAmountOut(borrowAmount, orderedReserves.b2, orderedReserves.a2);
        require(baseTokenOutAmount > debtAmount, 'Arbitrage fail, no profit');
        
        CallbackData memory callbackData;
        callbackData.debtPool = info.lowerPool;
        callbackData.targetPool = info.higherPool;
        callbackData.debtTokenSmaller = info.baseTokenSmaller;
        callbackData.borrowedToken = info.quoteToken;
        callbackData.debtToken = info.baseToken;
        callbackData.debtAmount = debtAmount;
        callbackData.debtTokenOutAmount = baseTokenOutAmount;

        bytes memory data = abi.encode(callbackData);
        // 最後一個param判斷是flashswap還是普通的swap，如果為空值""就是普通的swap，如果有值就是flashswap
        // data 可以在 uniswapV2Call 解構出來
        IUniswapV2Pair(info.lowerPool).swap(amount0Out, amount1Out, address(this), data); 

        uint256 balanceAfter = IERC20(info.baseToken).balanceOf(address(this));
        require(balanceAfter > balanceBefore, 'Losing money');

        permissionedPairAddress = address(0);
    }

    // FIXME:
    /// @dev 計算套利利潤最大時的借款金額
    function calcBorrowAmount(OrderedReserves memory reserves) pure public returns (uint256 amount) {
        // we can't use a1,b1,a2,b2 directly, because it will result overflow/underflow on the intermediate result
        // so we:
        //    1. divide all the numbers by d to prevent from overflow/underflow
        //    2. calculate the result by using above numbers
        //    3. multiply d with the result to get the final result
        // Note: this workaround is only suitable for ERC20 token with 18 decimals, which I believe most tokens do

        uint256 min1 = reserves.a1 < reserves.b1 ? reserves.a1 : reserves.b1;
        uint256 min2 = reserves.a2 < reserves.b2 ? reserves.a2 : reserves.b2;
        uint256 min = min1 < min2 ? min1 : min2;

        // choose appropriate number to divide based on the minimum number
        uint256 d;
        if (min > 1e24) {
            d = 1e20;
        } else if (min > 1e23) {
            d = 1e19;
        } else if (min > 1e22) {
            d = 1e18;
        } else if (min > 1e21) {
            d = 1e17;
        } else if (min > 1e20) {
            d = 1e16;
        } else if (min > 1e19) {
            d = 1e15;
        } else if (min > 1e18) {
            d = 1e14;
        } else if (min > 1e17) {
            d = 1e13;
        } else if (min > 1e16) {
            d = 1e12;
        } else if (min > 1e15) {
            d = 1e11;
        } else {
            d = 1e10;
        }

        (int256 a1, int256 a2, int256 b1, int256 b2) =
            (int256(reserves.a1 / d), int256(reserves.a2 / d), int256(reserves.b1 / d), int256(reserves.b2 / d));

        int256 a = a1 * b1 - a2 * b2;
        int256 b = 2 * b1 * b2 * (a1 + a2);
        int256 c = b1 * b2 * (a1 * b2 - a2 * b1);

        (int256 x1, int256 x2) = calcSolutionForQuadratic(a, b, c);

        // 0 < x < b1 and 0 < x < b2
        require((x1 > 0 && x1 < b1 && x1 < b2) || (x2 > 0 && x2 < b1 && x2 < b2), 'Wrong input order');
        amount = (x1 > 0 && x1 < b1 && x1 < b2) ? uint256(x1) * d : uint256(x2) * d;
    }

    /// @dev find solution of quadratic equation: ax^2 + bx + c = 0, only return the positive solution
    function calcSolutionForQuadratic(
        int256 a,
        int256 b,
        int256 c
    ) internal pure returns (int256 x1, int256 x2) {
        int256 m = b**2 - 4 * a * c;
        // m < 0 leads to complex number
        require(m > 0, 'Complex number');

        int256 sqrtM = ABDKMathQuad.toInt(ABDKMathQuad.sqrt(ABDKMathQuad.fromUInt(uint256(m))));
        x1 = (-b + sqrtM) / (2 * a);
        x2 = (-b - sqrtM) / (2 * a);
    }

    function uniswapV2Call(
        address sender,
        uint256 amount0,
        uint256 amount1,
        bytes memory data
    ) public {
        // access control
        require(msg.sender == permissionedPairAddress, 'Non permissioned address call');
        require(sender == address(this), 'Not from this contract');

        uint256 borrowedAmount = amount0 > 0 ? amount0 : amount1;
        CallbackData memory info = abi.decode(data, (CallbackData));

        IERC20(info.borrowedToken).safeTransfer(info.targetPool, borrowedAmount);

        (uint256 amount0Out, uint256 amount1Out) =
            info.debtTokenSmaller ? (info.debtTokenOutAmount, uint256(0)) : (uint256(0), info.debtTokenOutAmount);
        IUniswapV2Pair(info.targetPool).swap(amount0Out, amount1Out, address(this), new bytes(0));

        IERC20(info.debtToken).safeTransfer(info.debtPool, info.debtAmount);
    }
    

    // copy from UniswapV2Library(compile版本不同，無法用import故直接複製)
    // given an output amount of an asset and pair reserves, returns a required input amount of the other asset
    function getAmountIn(
        uint256 amountOut,
        uint256 reserveIn,
        uint256 reserveOut
    ) internal pure returns (uint256 amountIn) {
        require(amountOut > 0, 'UniswapV2Library: INSUFFICIENT_OUTPUT_AMOUNT');
        require(reserveIn > 0 && reserveOut > 0, 'UniswapV2Library: INSUFFICIENT_LIQUIDITY');

        uint256 numerator = reserveIn * amountOut * (1000);
        uint256 denominator = (reserveOut - amountOut) * (997);
        amountIn = (numerator / denominator) + 1;
    }

    // copy from UniswapV2Library
    // given an input amount of an asset and pair reserves, returns the maximum output amount of the other asset
    function getAmountOut(
        uint256 amountIn,
        uint256 reserveIn,
        uint256 reserveOut
    ) internal pure returns (uint256 amountOut) {
        require(amountIn > 0, 'UniswapV2Library: INSUFFICIENT_INPUT_AMOUNT');
        require(reserveIn > 0 && reserveOut > 0, 'UniswapV2Library: INSUFFICIENT_LIQUIDITY');

        uint256 amountInWithFee = amountIn * (997);
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = reserveIn * (1000) + (amountInWithFee);

        amountOut = numerator / denominator;
    }

    receive () payable external{
        console.log('recevive');
    }
    fallback () payable external{
        console.log('fallback');
    }
} 