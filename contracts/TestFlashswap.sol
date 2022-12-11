// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import '@uniswap/v2-core/contracts/interfaces/IUniswapV2Callee.sol';
import "./core/interfaces/IUniswapV2Factory.sol";
import "./core/interfaces/IUniswapV2Pair.sol";
import "hardhat/console.sol";

// interface IUniswapV2Callee {
//   function uniswapV2Call(address sender, uint amount0, uint amount1, bytes calldata data) external;
// }

contract TestFlashSwap is IUniswapV2Callee{
    // address private WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2; // mainnet WETH
    address private immutable WETH; // mainnet WETH
    address private immutable FACTORY; // uniswap v2 factory

    constructor(address _factoryAddress,address _weth){
        FACTORY = _factoryAddress;
        WETH = _weth;
    }

    event Log(string message,uint val);

    // A function to call flashloan to call flashloan on uniswap
    function testSwap(address _tokenBorrow, uint _amount) external{
        console.log('testSwap',_tokenBorrow,_amount);
        address pair = IUniswapV2Factory(FACTORY).getPair(_tokenBorrow, WETH);
        require(pair != address(0), "!pair");

        address token0 = IUniswapV2Pair(pair).token0();
        address token1 = IUniswapV2Pair(pair).token1();
        uint amount0Out = _tokenBorrow == token0 ? _amount : 0;
        uint amount1Out = _tokenBorrow == token1 ? _amount : 0;

        // need to pass some data to trigger uniswapV2Call
        bytes memory data = abi.encode(_tokenBorrow, _amount);

        // 最後一個param判斷是flashswap還是普通的swap，如果為空值""就是普通的swap，如果有值就是flashswap
        // data 可以在 uniswapV2Call 解構出來
        IUniswapV2Pair(pair).swap(amount0Out, amount1Out, address(this), data); 
    }
    
    // in return uniswap will call this uniswapV2Call function, giving us the token that we request to borrow and the amount that we request to borrow
    // and inside this function we'll have to repay th amount that we borrowed plus some fee
    function uniswapV2Call(address _sender, uint _amount0, uint _amount1, bytes calldata _data) external override {
        console.log('uniswapV2Call');
        address token0 = IUniswapV2Pair(msg.sender).token0();
        address token1 = IUniswapV2Pair(msg.sender).token1();
        address pair = IUniswapV2Factory(FACTORY).getPair(token0, token1);
        // 要再檢查 FACTORY 是否合法
        require(msg.sender == pair, "!pair");
        require(_sender == address(this), "!sender");

        (address tokenBorrow, uint amount) = abi.decode(_data, (address, uint));


        // about 0.3%
        uint fee = ((amount * 3) / 997) + 1;
        uint amountToRepay = amount + fee;
        console.log('================================================================');
        console.log('tokenBorrow: ',pair,tokenBorrow, amountToRepay);
        // do stuff here
        // emit Log("amount", amount);
        // emit Log("amount0", _amount0);
        emit Log("amount1", _amount1);
        emit Log("fee", fee);
        emit Log("amount to repay", amountToRepay);

        IERC20(tokenBorrow).transfer(pair, amountToRepay); // 還款是還 borrow token
    }
}


