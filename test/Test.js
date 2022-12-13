const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');
const { expect } = require('chai');
const { ethers } = require('hardhat');
const { deployAMMFixture, deployArbitrageFixture } = require('./fixtures');
const pairJSON = require('../artifacts/contracts/core/UniswapV2Pair.sol/UniswapV2Pair.json');

describe('Test FlashSwap Arbitrage', function () {
    let owner;
    let otherAccount;
    let factoryA; // 0x5FbDB2315678afecb367f032d93F642f64180aa3
    let routerA; // 0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9
    // pairA 0x65F17E1F16D8b2fB778F1Cfa30f1F263e8459f56
    let factoryB; // 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
    let routerB; // 0x5FC8d32690cc91D4c39d9d3abcBD16989F875707
    // pairB 0x0Bd7f727b5DA47Cf78048F443563e0A150391B6f
    let erc20; // 0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
    let weth; // 0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9

    beforeEach(async () => {
        ({ factoryA, factoryB, routerA, routerB, erc20, weth, owner, otherAccount } =
            await loadFixture(deployAMMFixture));

        ({ arbitrage } = await loadFixture(deployArbitrageFixture));
        await arbitrage.addBaseToken(weth.address);
    });

    describe('Test Arbitrage', async function () {
        beforeEach(async () => {
            await erc20.approve(routerA.address, ethers.utils.parseEther('12000000000'));
            await weth.approve(routerA.address, ethers.utils.parseEther('12000000000'));
            await erc20.approve(routerB.address, ethers.utils.parseEther('12000000000'));
            await weth.approve(routerB.address, ethers.utils.parseEther('12000000000'));
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

            await expect(arbitrage.getProfit(pairAAddress, pairBAddress)).to.be.revertedWith(
                'No profit to arbitrage'
            );
        });

        it('Should execute arbitrage', async function () {
            await routerA.addLiquidity(
                erc20.address,
                weth.address,
                ethers.utils.parseEther('300000'),
                ethers.utils.parseEther('1000000000'),
                0, // for simplicity
                0,
                owner.address,
                Date.now()
                // Math.floor(Date.now() / 1000) + 60 * 10
            );

            await routerB.addLiquidity(
                erc20.address,
                weth.address,
                ethers.utils.parseEther('600000'),
                ethers.utils.parseEther('1200000000'),
                0,
                0,
                otherAccount.address,
                Date.now()
            );

            const pairAAddress = await factoryA.getPair(erc20.address, weth.address);
            const pairA = new ethers.Contract(pairAAddress, pairJSON.abi, ethers.provider);

            const pairBAddress = await factoryB.getPair(erc20.address, weth.address);
            const pairB = new ethers.Contract(pairBAddress, pairJSON.abi, ethers.provider);

            // await weth.transfer(pairAAddress, ethers.utils.parseEther('100000'));
            // await weth.transfer(pairBAddress, ethers.utils.parseEther('100000'));

            // // await erc20.transfer(arbitrage.address, ethers.utils.parseEther('6200000000'));
            // // await weth.transfer(arbitrage.address, ethers.utils.parseEther('6200000000'));
            await arbitrage.flashArbitrage(pairAAddress, pairBAddress);
        });
    });
});

// https://docs.uniswap.org/sdk/v3/guides/liquidity/swap-and-add
