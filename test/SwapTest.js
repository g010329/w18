// const { time, loadFixture } = require('@nomicfoundation/hardhat-network-helpers');
// const { anyValue } = require('@nomicfoundation/hardhat-chai-matchers/withArgs');
// const { expect } = require('chai');

// describe('SwapTest', function () {
//     let weth;
//     let flashBot;

//     // const WETH = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c';
//     const WETH = '0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6'; // WETH on goerli
//     const USDT = '0x55d398326f99059ff775485246999027b3197955';

//     beforeEach(async () => {
//         const wethFactory = await ethers.getContractAt('IWETH', WETH);
//         weth = wethFactory.attach(WETH);

//         const fbFactory = await ethers.getContractFactory('FlashBot');
//         flashBot = await fbFactory.deploy(WETH);
//     });

//     it('Setup', async () => {});
// });

// goerli 上部署兩組 uniswap-like DEX
// flashSwap 合約部署在 goerli 上
// goerli:'0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6'

// 工廠合約
// https://etherscan.io/address/0x5c69bee701ef814a2b6a3edd4b1652cb9cc5aa6f
