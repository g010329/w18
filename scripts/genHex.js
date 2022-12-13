const UniswapV2Pair = require('../artifacts/contracts/core/UniswapV2Pair.sol/UniswapV2Pair.json');

let data = UniswapV2Pair.bytecode;

console.log('hex: ', ethers.utils.keccak256(data));

// 假設拿到：
// 0x112b49e1304186a00e5ebd1e36c2608bc3534fb402c86bac2553cae78976acad
// 去掉 0x => 112b49e1304186a00e5ebd1e36c2608bc3534fb402c86bac2553cae78976acad
// 貼在 /contracts/periphery/libraries/UniswapV2Library.sol 的 27 行
