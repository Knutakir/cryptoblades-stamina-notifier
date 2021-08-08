import {MessageEmbed, WebhookClient} from 'discord.js';
import Web3 from 'web3';
import ordinal from 'ordinal';
import config from './config.js';
import {
    characterABI,
    characterAddress,
    cryptoBladesABI,
    cryptoBladesAddress
} from './constants.js';

const {discordWebhookUrl, discordWebhookId, discordWebhookToken} = config;

// Check if either Discord Webhook URL or Discord Webhook ID and token is provided
if (!(discordWebhookUrl || (discordWebhookId !== '' && discordWebhookToken !== ''))) {
    throw new Error('You need to specify either Discord Webhook URL or both Discord Webhook ID and token!');
}

const webhookClient = discordWebhookUrl ? new WebhookClient({url: discordWebhookUrl}) : new WebhookClient({id: discordWebhookId, token: discordWebhookToken});
const web3 = new Web3(config.blockchainProvider);
const characterContract = new web3.eth.Contract(characterABI, characterAddress);
const cryptoBladesContract = new web3.eth.Contract(cryptoBladesABI, cryptoBladesAddress);

// Wait for a specified time (milliseconds)
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

async function initializeAccounts() {
    // Ensure Binance Smart Chain addresses are provided
    if (!config.addresses) {
        throw new Error('You need to specify an address!');
    }

    // Ensure account names are provided
    if (!config.accountNames) {
        throw new Error('You need to specify an account name!');
    }

    const addresses = config.addresses.split(',').map(address => address.trim()).filter(address => address !== '');

    // Ensure all addresses are valid
    for (let i = 0; i < addresses.length; i++) {
        const address = addresses[i];

        if (!web3.utils.isAddress(address)) {
            throw new Error(`'${address}' is not a valid address`);
        }
    }

    const accountNames = config.accountNames.split(',').map(accountName => accountName.trim()).filter(accountName => accountName !== '');

    if (addresses.length !== accountNames.length) {
        throw new Error('Length of addresses and account names needs to match!');
    }

    return Promise.all(addresses.map(async (address, i) => {
        const characterIds = await cryptoBladesContract.methods.getMyCharacters().call({from: address});

        return {
            address,
            name: accountNames[i],
            characterIds
        };
    }));
}

async function checkAndNotifyStamina(account) {
    // Check stamina for all accounts characters
    for (let i = 0; i < account.characterIds.length; i++) {
        const characterId = account.characterIds[i];

        // eslint-disable-next-line no-await-in-loop
        const stamina = await characterContract.methods.getStaminaPoints(characterId).call();

        if (stamina >= config.staminaThreshold) {
            const embedMessage = new MessageEmbed()
                .setColor('#74829d')
                .setDescription(`\`${account.name}\`'s ${ordinal(i + 1)} character reached ${config.staminaThreshold} stamina`);

            // eslint-disable-next-line no-await-in-loop
            await webhookClient.send({
                username: 'CryptoBlades Stamina Notifier',
                embeds: [embedMessage]
            });
        }
    }
}

(async () => {
    const accounts = await initializeAccounts();

    // Make it run forever
    while (true) {
        try {
            console.log('Checking for stamina at:', new Date());

            for (let i = 0; i < accounts.length; i++) {
                const account = accounts[i];
                // eslint-disable-next-line no-await-in-loop
                await checkAndNotifyStamina(account);
            }
        } catch (error) {
            console.log(error);
        } finally {
            // eslint-disable-next-line no-await-in-loop
            await wait(config.waitTimeout);
        }
    }
})();
