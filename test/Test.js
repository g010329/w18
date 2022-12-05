const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');
const { expect } = require('chai');

describe('Test', function () {
    // We define a fixture to reuse the same setup in every test.
    // We use loadFixture to run this setup once, snapshot that state,
    // and reset Hardhat Network to that snapshot in every test.
    async function deployAMMFixture() {
        // Contracts are deployed using the first signer/account by default
        const [owner, otherAccount] = await ethers.getSigners();

        const AMMFactory = await ethers.getContractFactory('w18UniswapV2Factory');
        const amm = await AMMFactory.deploy(owner.address);
        const amm2 = await AMMFactory.deploy(owner.address);

        return { amm, owner, otherAccount };
    }
});
