const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');
const { expect } = require('chai');
const { ethers } = require('hardhat');
const { deployAMMFixture, deployArbitrageFixture } = require('./fixtures');
const pairJSON = require('../artifacts/contracts/core/UniswapV2Pair.sol/UniswapV2Pair.json');

const UniswapV2Pair = require('../artifacts/contracts/core/UniswapV2Pair.sol/UniswapV2Pair.json');

// 1. test 部署兩個 uniswap-like 的 AMM 合約，
// 2. 創建同樣的pair流動池，設定成沒有價差的情境 => 測試不會有套利機會
// 3. 創建同樣的pair流動池，設定成有價差的情境 => 測試會成功套利並運算正確利潤
// 4. 寫成 script

describe('Test FlashSwap Arbitrage', function () {
    let owner;
    let factoryA;
    let factoryB;
    let routerA;
    let routerB;
    let erc20;
    let weth; // 0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9
    let x;

    beforeEach(async () => {
        ({ factoryA, factoryB, routerA, routerB, erc20, weth, owner } = await loadFixture(
            deployAMMFixture
        ));

        ({ arbitrage } = await loadFixture(deployArbitrageFixture));
        await arbitrage.addBaseToken(weth.address);
    });

    describe('Test Arbitrage', async function () {
        beforeEach(async () => {
            await erc20.approve(routerA.address, ethers.utils.parseEther('1000'));
            await weth.approve(routerA.address, ethers.utils.parseEther('1000'));
            await erc20.approve(routerB.address, ethers.utils.parseEther('1000'));
            await weth.approve(routerB.address, ethers.utils.parseEther('1000'));
        });
        it('Should not execute arbitrage', async function () {
            await routerA.addLiquidity(
                erc20.address,
                weth.address,
                ethers.utils.parseEther('50'),
                ethers.utils.parseEther('1'),
                0, // for simplicity
                0,
                owner.address,
                Date.now()
                // Math.floor(Date.now() / 1000) + 60 * 10
            );
            await routerB.addLiquidity(
                erc20.address,
                weth.address,
                ethers.utils.parseEther('50'),
                ethers.utils.parseEther('1'),
                0,
                0,
                owner.address,
                Date.now()
            );

            const pairAAddress = await factoryA.getPair(erc20.address, weth.address);
            const pairA = new ethers.Contract(pairAAddress, pairJSON.abi, ethers.provider);
            // const [reserveA0, reserveA1] = await pairA.getReserves();

            const pairBAddress = await factoryB.getPair(erc20.address, weth.address);
            const pairB = new ethers.Contract(pairBAddress, pairJSON.abi, ethers.provider);
            // const [reserveB0, reserveB1] = await pairB.getReserves();

            await expect(arbitrage.getProfit(pairAAddress, pairBAddress)).to.be.revertedWith(
                'No profit to arbitrage'
            );
        });
        it('Should execute arbitrage', async function () {
            await routerA.addLiquidity(
                erc20.address,
                weth.address,
                ethers.utils.parseEther('60'),
                ethers.utils.parseEther('1'),
                0, // for simplicity
                0,
                owner.address,
                Date.now()
                // Math.floor(Date.now() / 1000) + 60 * 10
            );
            await routerB.addLiquidity(
                erc20.address,
                weth.address,
                ethers.utils.parseEther('50'),
                ethers.utils.parseEther('1'),
                0,
                0,
                owner.address,
                Date.now()
            );

            const pairAAddress = await factoryA.getPair(erc20.address, weth.address);
            const pairA = new ethers.Contract(pairAAddress, pairJSON.abi, ethers.provider);

            const pairBAddress = await factoryB.getPair(erc20.address, weth.address);
            const pairB = new ethers.Contract(pairBAddress, pairJSON.abi, ethers.provider);

            // console.log('here: ', await arbitrage.getProfit(pairAAddress, pairBAddress));
            // await expect(arbitrage.getProfit(pairAAddress, pairBAddress)).to.be.gt(0);
            // await expect(arbitrage.getProfit(pairAAddress, pairBAddress)).to.be.revertedWith(
            //     'No profit to arbitrage'
            // );
        });
    });
});
