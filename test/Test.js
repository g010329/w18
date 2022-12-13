// const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');
// const { expect } = require('chai');
// const { ethers } = require('hardhat');
// const { deployAMMFixture, deployArbitrageFixture } = require('./fixtures');
// const pairJSON = require('../artifacts/contracts/core/UniswapV2Pair.sol/UniswapV2Pair.json');

// const UniswapV2Pair = require('../artifacts/contracts/core/UniswapV2Pair.sol/UniswapV2Pair.json');

// // 1. test 部署兩個 uniswap-like 的 AMM 合約，
// // 2. 創建同樣的pair流動池，設定成沒有價差的情境 => 測試不會有套利機會
// // 3. 創建同樣的pair流動池，設定成有價差的情境 => 測試會成功套利並運算正確利潤
// // 4. 寫成 script

// describe('Test FlashSwap Arbitrage', function () {
//     let owner;
//     let otherAccount;
//     let factoryA; // 0x5FbDB2315678afecb367f032d93F642f64180aa3
//     let routerA; // 0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9
//     // pairA 0x65F17E1F16D8b2fB778F1Cfa30f1F263e8459f56
//     let factoryB; // 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
//     let routerB; // 0x5FC8d32690cc91D4c39d9d3abcBD16989F875707
//     // pairB 0x0Bd7f727b5DA47Cf78048F443563e0A150391B6f
//     let erc20; // 0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
//     let weth; // 0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9

//     beforeEach(async () => {
//         ({ factoryA, factoryB, routerA, routerB, erc20, weth, owner, otherAccount } =
//             await loadFixture(deployAMMFixture));

//         ({ arbitrage } = await loadFixture(deployArbitrageFixture));
//         await arbitrage.addBaseToken(weth.address);
//     });

//     // describe('Math function', async function () {
//     //     it('returns right amount with small liquidity pairs', async () => {
//     //         const reserves = {
//     //             a1: ethers.utils.parseEther('5000'),
//     //             b1: ethers.utils.parseEther('10'),
//     //             a2: ethers.utils.parseEther('6000'),
//     //             b2: ethers.utils.parseEther('10'),
//     //         };

//     //         const res = await arbitrage.calcBorrowAmount(reserves);
//     //         // @ts-ignore
//     //         expect(res).to.be.closeTo(
//     //             ethers.utils.parseEther('0.45'),
//     //             ethers.utils.parseEther('0.01')
//     //         );
//     //     });
//     //     it('returns right amount with large liquidity pairs', async () => {
//     //         const reserves = {
//     //             a1: ethers.utils.parseEther('1200000000'),
//     //             b1: ethers.utils.parseEther('600000'),
//     //             a2: ethers.utils.parseEther('1000000000'),
//     //             b2: ethers.utils.parseEther('300000'),
//     //         };

//     //         const res = await arbitrage.calcBorrowAmount(reserves);

//     //         // @ts-ignore
//     //         expect(res).to.be.closeTo(
//     //             ethers.utils.parseEther('53052.8604'),
//     //             ethers.utils.parseEther('1500')
//     //         );
//     //     });
//     //     it('returns right amount with big difference between liquidity pairs', async () => {
//     //         // const reserves = { a1: '1200000000', b1: '600000', a2: '100000', b2: '30' };
//     //         const reserves = {
//     //             a1: ethers.utils.parseEther('1200000000'),
//     //             b1: ethers.utils.parseEther('600000'),
//     //             a2: ethers.utils.parseEther('100000'),
//     //             b2: ethers.utils.parseEther('30'),
//     //         };

//     //         const res = await arbitrage.calcBorrowAmount(reserves);
//     //         // @ts-ignore
//     //         expect(res).to.be.closeTo(
//     //             ethers.utils.parseEther('8.729'),
//     //             ethers.utils.parseEther('0.01')
//     //         );
//     //     });
//     // });

//     describe('Test Arbitrage', async function () {
//         beforeEach(async () => {
//             await erc20.approve(routerA.address, ethers.utils.parseEther('12000000000'));
//             await weth.approve(routerA.address, ethers.utils.parseEther('12000000000'));
//             await erc20.approve(routerB.address, ethers.utils.parseEther('12000000000'));
//             await weth.approve(routerB.address, ethers.utils.parseEther('12000000000'));
//         });

//         // it('Should not execute arbitrage', async function () {
//         //     await routerA.addLiquidity(
//         //         erc20.address,
//         //         weth.address,
//         //         ethers.utils.parseEther('50'),
//         //         ethers.utils.parseEther('1'),
//         //         0, // for simplicity
//         //         0,
//         //         owner.address,
//         //         Date.now()
//         //         // Math.floor(Date.now() / 1000) + 60 * 10
//         //     );
//         //     await routerB.addLiquidity(
//         //         erc20.address,
//         //         weth.address,
//         //         ethers.utils.parseEther('50'),
//         //         ethers.utils.parseEther('1'),
//         //         0,
//         //         0,
//         //         owner.address,
//         //         Date.now()
//         //     );

//         //     const pairAAddress = await factoryA.getPair(erc20.address, weth.address);
//         //     const pairA = new ethers.Contract(pairAAddress, pairJSON.abi, ethers.provider);
//         //     // const [reserveA0, reserveA1] = await pairA.getReserves();

//         //     const pairBAddress = await factoryB.getPair(erc20.address, weth.address);
//         //     const pairB = new ethers.Contract(pairBAddress, pairJSON.abi, ethers.provider);
//         //     // const [reserveB0, reserveB1] = await pairB.getReserves();

//         //     await expect(arbitrage.getProfit(pairAAddress, pairBAddress)).to.be.revertedWith(
//         //         'No profit to arbitrage'
//         //     );
//         // });
//         it('Should execute arbitrage', async function () {
//             await routerA.addLiquidity(
//                 erc20.address,
//                 weth.address,
//                 // ethers.utils.parseEther('30'),
//                 // ethers.utils.parseEther('100000'),
//                 ethers.utils.parseEther('300000'),
//                 ethers.utils.parseEther('1000000000'),
//                 0, // for simplicity
//                 0,
//                 owner.address,
//                 Date.now()
//                 // Math.floor(Date.now() / 1000) + 60 * 10
//             );
//             await routerB.addLiquidity(
//                 erc20.address,
//                 weth.address,
//                 ethers.utils.parseEther('600000'),
//                 ethers.utils.parseEther('1200000000'),
//                 0,
//                 0,
//                 otherAccount.address,
//                 Date.now()
//             );

//             const pairAAddress = await factoryA.getPair(erc20.address, weth.address);
//             const pairA = new ethers.Contract(pairAAddress, pairJSON.abi, ethers.provider);

//             const pairBAddress = await factoryB.getPair(erc20.address, weth.address);
//             const pairB = new ethers.Contract(pairBAddress, pairJSON.abi, ethers.provider);

//             await weth.transfer(pairAAddress, ethers.utils.parseEther('100000'));
//             await pairA.connect(owner).sync();

//             await weth.transfer(pairBAddress, ethers.utils.parseEther('100000'));
//             await pairB.connect(owner).sync();

//             let res = await arbitrage.getProfit(pairAAddress, pairBAddress); // 149878779.798342745355962875;
//             // 53050,000000000000000000
//             expect(res.profit).to.be.gt(ethers.utils.parseEther('0')); // 設定最低獲利門檻
//             expect(res.baseToken).to.be.eq(weth.address);

//             await erc20.transfer(arbitrage.address, ethers.utils.parseEther('6200000000'));
//             await weth.transfer(arbitrage.address, ethers.utils.parseEther('6200000000'));

//             await arbitrage.flashArbitrage(pairAAddress, pairBAddress);
//         });
//     });
//     // 2. 創建流動池 pair/pool
//     // 3. 添加兩個AMM合約的流動性，並製造出價差
//     // it('Add liquidity & test flashSwap', async function () {
//     //     const { owner, factoryA, factoryB, routerA, routerB, erc20, weth } = await loadFixture(
//     //         deployAMMFixture
//     //     );
//     //     // const DAPPUAmount = web3.utils.toWei('250', 'ether');
//     //     // const WETHAmount = web3.utils.toWei('1', 'ether');
//     //     const AMOUNT_10000 = ethers.utils.parseUnits('10000', 'ether');
//     //     const TOKEN_AMOUNT = ethers.utils.parseUnits('50', 'ether');
//     //     const AMOUNT_20 = ethers.utils.parseUnits('20', 'ether');
//     //     const AMOUNT_80 = ethers.utils.parseUnits('80', 'ether');
//     //     const AMOUNT_100 = ethers.utils.parseUnits('100', 'ether');
//     //     const WETH_AMOUNT = ethers.utils.parseUnits('1', 'ether');
//     //     const AMOUNT_2 = ethers.utils.parseUnits('2', 'ether');

//     //     await erc20.approve(routerA.address, AMOUNT_10000);
//     //     await weth.approve(routerA.address, AMOUNT_10000);

//     //     // 使用合約添加流動性
//     //     // const TestFactory = await ethers.getContractFactory('TestUniswapLiquidity');
//     //     // const test = await TestFactory.deploy(router.address);
//     //     // await erc20.approve(test.address, TOKEN_AMOUNT);
//     //     // await weth.approve(test.address, WETH_AMOUNT);
//     //     // let tx = await test.addLiquidity(erc20.address, weth.address, TOKEN_AMOUNT, WETH_AMOUNT);
//     //     // console.log('tx', tx);

//     //     // console.log('after: ', await erc20.allowance(owner.address, router.address));
//     //     // console.log('after: ', await weth.allowance(owner.address, router.address));

//     //     // 第一次添加流動性，創建流動池
//     //     const res = await routerA.addLiquidity(
//     //         erc20.address,
//     //         weth.address,
//     //         ethers.utils.parseUnits('10000', 'ether'),
//     //         ethers.utils.parseUnits('10000', 'ether'),
//     //         0, // for simplicity
//     //         0,
//     //         owner.address,
//     //         Date.now()
//     //         // Math.floor(Date.now() / 1000) + 60 * 10
//     //     );
//     //     const pairAddress = await factoryA.getPair(erc20.address, weth.address);
//     //     // console.log('pairAddress', pairAddress);
//     //     const testPair = new ethers.Contract(pairAddress, pairJSON.abi, ethers.provider);
//     //     const [reserveA, reserveB] = await testPair.getReserves();
//     //     // console.log(reserveA);
//     //     // console.log(reserveB);

//     //     // 第二次添加流動性，按比例添加
//     //     // const res2 = await routerA.addLiquidity(
//     //     //     erc20.address,
//     //     //     weth.address,
//     //     //     ethers.utils.parseUnits('60', 'ether'),
//     //     //     ethers.utils.parseUnits('1', 'ether'),
//     //     //     0, // for simplicity
//     //     //     0,
//     //     //     owner.address,
//     //     //     Math.floor(Date.now() / 1000) + 60 * 10
//     //     // );

//     //     // const [reserveA2, reserveB2] = await testPair.getReserves();
//     //     // console.log(reserveA2);
//     //     // console.log(reserveB2);

//     //     // TODO: 測試 flashSwap

//     //     const TestFlashSwapFactory = await ethers.getContractFactory('TestFlashSwap');
//     //     const testFlashSwapContract = await TestFlashSwapFactory.deploy(
//     //         factoryA.address,
//     //         weth.address
//     //     );

//     //     // 先給 flashswap 錢來支付還款＋手續費
//     //     await erc20.transfer(testFlashSwapContract.address, ethers.utils.parseEther('100'));

//     //     const txRes = await testFlashSwapContract.testSwap(
//     //         erc20.address,
//     //         ethers.utils.parseEther('100')
//     //     );
//     //     const result = await txRes.wait(); // 取得 event logs

//     //     for (const event of result.events) {
//     //         console.log(`Event ${event.event} with args ${event.args}`); // FIXME: 很多個log? https://ethereum.stackexchange.com/questions/93757/listening-to-events-using-ethers-js-on-a-hardhat-test-network
//     //     }
//     // });

//     let data = UniswapV2Pair.bytecode;
//     console.log('hahahha: ', ethers.utils.keccak256(data));
// });

// // https://docs.uniswap.org/sdk/v3/guides/liquidity/swap-and-add
