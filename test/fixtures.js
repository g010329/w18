const { ethers } = require('hardhat');

async function deployAMMFixture() {
    // Contracts are deployed using the first signer/account by default
    const [owner, otherAccount] = await ethers.getSigners();

    const AMMFactory = await ethers.getContractFactory('w18UniswapV2Factory');
    const amm = await AMMFactory.deploy(owner.address);
    // const amm2 = await AMMFactory.deploy(owner.address);

    const ERC20Factory = await ethers.getContractFactory('ERC20Token');
    const erc20 = await ERC20Factory.deploy(ethers.utils.parseUnits('100000', 'ether'), 'my token', 'MTK');

    // FIXME:
    const FakeERC20WETHFactory = await ethers.getContractFactory('ERC20Token');
    const weth = await FakeERC20WETHFactory.deploy(
        ethers.utils.parseUnits('100000', 'ether'),
        'fake erc20 weth',
        'WETH'
    );

    const RouterFactory = await ethers.getContractFactory('w18UniswapV2Router02');
    const router = await RouterFactory.deploy(amm.address, weth.address);

    return {
        amm,
        // amm2,
        // router,
        router,
        erc20,
        weth,
        owner,
        otherAccount,
    };
}

module.exports = { deployAMMFixture };
