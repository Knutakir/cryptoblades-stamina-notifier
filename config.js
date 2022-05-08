import dotenv from 'dotenv';

// Load the stored variables from `.env` file into process.env
dotenv.config();

// Default is 60 minutes for the wait timeout
const HOUR_IN_MILLISECONDS = 3600000;

const chains = {
    bsc: {
        blockchainProvider: 'https://bsc-dataseed1.binance.org:443'
    },
    heco: {
        blockchainProvider: 'https://http-mainnet.hecochain.com'
    },
    okex: {
        blockchainProvider: 'https://exchainrpc.okex.org'
    }
};

function getDefaultBlockchainProvider(network) {
    if (Object.keys(chains).includes(network)) {
        return chains[network].blockchainProvider;
    }

    // Default to BSC network
    return chains.bsc.blockchainProvider;
}

export default {
    discordWebhookUrl: process.env.DISCORD_WEBHOOK_URL || '',
    discordWebhookId: process.env.DISCORD_WEBHOOK_ID || '',
    discordWebhookToken: process.env.DISCORD_WEBHOOK_TOKEN || '',
    waitTimeout: process.env.WAIT_TIMEOUT || HOUR_IN_MILLISECONDS,
    staminaThreshold: parseInt(process.env.STAMINA_THRESHOLD, 10) || 160,
    network: (Object.keys(chains).includes(process.env.NETWORK) && process.env.NETWORK) || 'bsc',
    blockchainProvider: process.env.BLOCKCHAIN_PROVIDER || getDefaultBlockchainProvider(process.env.NETWORK),
    addresses: process.env.ADDRESSES,
    accountNames: process.env.ACCOUNT_NAMES,
    winPercentageThreshold: parseFloat(process.env.WIN_PERCENTAGE_THRESHOLD) || 98,
    weaponIds: process.env.WEAPON_IDS
};
