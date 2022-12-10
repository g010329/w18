const { ethers } = require('hardhat');

async function deployAMMFixture() {
    const [owner, otherAccount] = await ethers.getSigners();

    const AMMFactory = await ethers.getContractFactory('w18UniswapV2Factory');
    const factoryA = await AMMFactory.deploy(owner.address);
    const factoryB = await AMMFactory.deploy(owner.address);

    const ERC20Factory = await ethers.getContractFactory('ERC20Token');
    const erc20 = await ERC20Factory.deploy(
        ethers.utils.parseUnits('100000', 'ether'),
        'my token',
        'MTK'
    );

    /// @notice: Not weth interface
    // FIXME: 不確定用一般ERC20代替weth的合約是否會有問題
    const FakeERC20WETHFactory = await ethers.getContractFactory('ERC20Token');
    const weth = await FakeERC20WETHFactory.deploy(
        ethers.utils.parseUnits('100000', 'ether'),
        'fake erc20 weth',
        'WETH'
    );

    const RouterFactory = await ethers.getContractFactory('w18UniswapV2Router02');
    const routerA = await RouterFactory.deploy(factoryA.address, weth.address);
    const routerB = await RouterFactory.deploy(factoryB.address, weth.address);

    return {
        factoryA,
        routerA,
        factoryB,
        routerB,
        erc20,
        weth,
        owner,
        otherAccount,
    };
}

async function deployArbitrageFixture() {
    const ArbitrageFactory = await ethers.getContractFactory('FlashSwapBot');
    const arbitrage = await ArbitrageFactory.deploy();

    return { arbitrage };
}

module.exports = { deployAMMFixture, deployArbitrageFixture };
