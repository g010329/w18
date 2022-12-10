const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');
const { expect } = require('chai');
const { ethers } = require('hardhat');
const { deployAMMFixture } = require('./fixtures');
const pairJSON = require('../artifacts/contracts/core/UniswapV2Pair.sol/UniswapV2Pair.json');

const UniswapV2Pair = require('../artifacts/contracts/core/UniswapV2Pair.sol/UniswapV2Pair.json');

describe('Test', function () {
    // We define a fixture to reuse the same setup in every test.
    // We use loadFixture to run this setup once, snapshot that state,
    // and reset Hardhat Network to that snapshot in every test.

    // 1. 先部署兩個AMM合約
    it('Deploy', async function () {
        const { amm, router } = await loadFixture(deployAMMFixture);
    });
    // 2. 創建流動池 pair/pool
    // 3. 添加兩個AMM合約的流動性，並製造出價差
    it('Add liquidity & test flashSwap', async function () {
        const { owner, router, amm: factory, erc20, weth } = await loadFixture(deployAMMFixture);
        // const DAPPUAmount = web3.utils.toWei('250', 'ether');
        // const WETHAmount = web3.utils.toWei('1', 'ether');
        const AMOUNT_10000 = ethers.utils.parseUnits('10000', 'ether');
        const TOKEN_AMOUNT = ethers.utils.parseUnits('50', 'ether');
        const AMOUNT_20 = ethers.utils.parseUnits('20', 'ether');
        const AMOUNT_80 = ethers.utils.parseUnits('80', 'ether');
        const AMOUNT_100 = ethers.utils.parseUnits('100', 'ether');
        const WETH_AMOUNT = ethers.utils.parseUnits('1', 'ether');
        const AMOUNT_2 = ethers.utils.parseUnits('2', 'ether');

        console.log('erc20 address: ', erc20.address);
        console.log('weth address: ', weth.address);
        // console.log('allowance', await erc20.allowance(owner.address, router.address));
        // console.log('allowance', await weth.allowance(owner.address, router.address));

        await erc20.approve(router.address, AMOUNT_10000);
        await weth.approve(router.address, AMOUNT_10000);

        // console.log('test: ', erc20.address, weth.address);
        // console.log('balance', await erc20.balanceOf(owner.address));
        // console.log('balance', await weth.balanceOf(owner.address));
        // console.log('123', TOKEN_AMOUNT);

        // 使用合約添加流動性
        // const TestFactory = await ethers.getContractFactory('TestUniswapLiquidity');
        // const test = await TestFactory.deploy(router.address);
        // await erc20.approve(test.address, TOKEN_AMOUNT);
        // await weth.approve(test.address, WETH_AMOUNT);
        // let tx = await test.addLiquidity(erc20.address, weth.address, TOKEN_AMOUNT, WETH_AMOUNT);
        // console.log('tx', tx);

        // console.log('after: ', await erc20.allowance(owner.address, router.address));
        // console.log('after: ', await weth.allowance(owner.address, router.address));

        // 第一次添加流動性，創建流動池
        const res = await router.addLiquidity(
            erc20.address,
            weth.address,
            TOKEN_AMOUNT,
            WETH_AMOUNT,
            0, // for simplicity
            0,
            owner.address,
            Date.now()
            // Math.floor(Date.now() / 1000) + 60 * 10
        );
        const pairAddress = await factory.getPair(erc20.address, weth.address);
        console.log('pairAddress', pairAddress);
        const testPair = new ethers.Contract(pairAddress, pairJSON.abi, ethers.provider);
        const [reserveA, reserveB] = await testPair.getReserves();
        console.log(reserveA);
        console.log(reserveB);

        // 第二次添加流動性，按比例添加
        // const res2 = await router.addLiquidity(
        //     erc20.address,
        //     weth.address,
        //     ethers.utils.parseUnits('60', 'ether'),
        //     ethers.utils.parseUnits('1', 'ether'),
        //     0, // for simplicity
        //     0,
        //     owner.address,
        //     Math.floor(Date.now() / 1000) + 60 * 10
        // );

        // const [reserveA2, reserveB2] = await testPair.getReserves();
        // console.log(reserveA2);
        // console.log(reserveB2);

        // 測試 flashSwap
        // const TestFlashSwapFactory = await ethers.getContractFactory('TestFlashSwap');
        // const testFlashSwapContract = await TestFlashSwapFactory.deploy(
        //     factory.address,
        //     weth.address
        // );

        // // 先給 flashswap 錢來支付還款＋手續費
        // await erc20.transfer(
        //     testFlashSwapContract.address,
        //     ethers.utils.parseUnits('100', 'ether')
        // );

        // const txRes = await testFlashSwapContract.testSwap(
        //     erc20.address,
        //     ethers.utils.parseUnits('5', 'ether')
        // );
        // const result = await txRes.wait(); // 取得 event logs

        // for (const event of result.events) {
        //     console.log(`Event ${event.event} with args ${event.args}`); // FIXME: 很多個log? https://ethereum.stackexchange.com/questions/93757/listening-to-events-using-ethers-js-on-a-hardhat-test-network
        // }
    });

    it('Test arbitrage', async function () {});

    // let data = UniswapV2Pair.bytecode;
    // console.log('hahahha: ', ethers.utils.keccak256(data));

    // 4. 價低處買進，價高處賣掉。使用 flashloan（沒利潤 revert)
});

// https://docs.uniswap.org/sdk/v3/guides/liquidity/swap-and-add
