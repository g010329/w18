require('@nomicfoundation/hardhat-toolbox');
require('dotenv').config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
    // defaultNetwork: 'goerli',
    solidity: {
        compilers: [
            {
                version: '0.5.16', // v2-core
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 200,
                    },
                },
            },
            {
                version: '0.6.6', // v2-periphery
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 1000,
                    },
                },
            },
            {
                version: '0.8.17',
            },
        ],
    },
    networks: {
        hardhat: {},
        // hardhat: { hardfork: 'london' },
        goerli: {
            url: `https://goerli.infura.io/v3/${process.env.INFURA_KEY}`,
            accounts: [process.env.PRIVATE_KEY],
            chainId: 5,
        },
    },
    etherscan: {
        apiKey: {
            goerli: process.env.ETHERSCAN_API_KEY,
        },
    },
};
