import {MessageEmbed, WebhookClient} from 'discord.js';
import Web3 from 'web3';
import ordinal from 'ordinal';
// eslint-disable-next-line import/no-unresolved
import {setTimeout} from 'timers/promises';
import config from './config.js';
import {
    characterABI,
    characterAddress,
    cryptoBladesABI,
    cryptoBladesAddress,
    staminaMillisecondsRegenerationTime
} from './constants.js';

const {discordWebhookUrl, discordWebhookId, discordWebhookToken} = config;

// Check if either Discord Webhook URL or Discord Webhook ID and token is provided
if (!(discordWebhookUrl || (discordWebhookId !== '' && discordWebhookToken !== ''))) {
    throw new Error('You need to specify either Discord Webhook URL or both Discord Webhook ID and token!');
}

// Ensure stamina threshold has a legal value
if (config.staminaThreshold < 0 || config.staminaThreshold > 200) {
    throw new Error('Stamina threshold needs to be between 0 and 200!');
}

const webhookClient = discordWebhookUrl ? new WebhookClient({url: discordWebhookUrl}) : new WebhookClient({id: discordWebhookId, token: discordWebhookToken});
const web3 = new Web3(config.blockchainProvider);
const characterContract = new web3.eth.Contract(characterABI, characterAddress);
const cryptoBladesContract = new web3.eth.Contract(cryptoBladesABI, cryptoBladesAddress);
const discordMessageDescriptionLimit = 4096;
const webhookUsername = 'CryptoBlades Stamina Notifier';

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
        const characters = characterIds.map(characterId => ({id: characterId}));

        return {
            address,
            name: accountNames[i],
            characters
        };
    }));
}

function getDateFromNeededStamina(staminaNeeded) {
    return new Date(new Date().getTime() + staminaMillisecondsRegenerationTime * staminaNeeded);
}

function splitCharacterMessageDescriptions(accountStaminas) {
    const messageDescriptions = [];
    let messageDescription = '';

    for (let i = 0; i < accountStaminas.length; i++) {
        if (messageDescription.length + accountStaminas[i].length > discordMessageDescriptionLimit) {
            messageDescriptions.push(messageDescription);
            messageDescription = '';
        }

        messageDescription += `${accountStaminas[i]}\n\n`;
    }

    if (messageDescription !== '') {
        messageDescriptions.push(messageDescription);
    }

    return messageDescriptions;
}

function createDynamicDiscordTimestamp(date) {
    const unixTime = Math.round(date.getTime() / 1000);
    return `<t:${unixTime}:R>`;
}

async function notifyStamina(accounts) {
    const nonEmptyAccounts = accounts.filter(account => account.charactersToNotify.length > 0);

    if (nonEmptyAccounts.length === 0) {
        return;
    }

    const embedMessage = new MessageEmbed()
        .setColor('#74829d');

    // Send shorter message if only one character reached threshold
    if (nonEmptyAccounts.length === 1 && nonEmptyAccounts[0].charactersToNotify.length === 1) {
        const [account] = nonEmptyAccounts;
        const [character] = account.charactersToNotify;

        // Check if stamina has already been reached
        if (!character.thresholdReachedAt) {
            embedMessage.setDescription(
                `\`${account.name}\`'s ${ordinal(character.index)} character reached ${config.staminaThreshold} stamina (${character.stamina})`
            );
        } else {
            const dynamicTimestamp = createDynamicDiscordTimestamp(character.thresholdReachedAt);
            embedMessage.setDescription(
                `\`${account.name}\`'s ${ordinal(character.index)} character reaches ${config.staminaThreshold} stamina (${character.stamina}) - ${dynamicTimestamp}`
            );
        }

        await webhookClient.send({
            username: webhookUsername,
            embeds: [embedMessage]
        });

        return;
    }

    embedMessage.setTitle(`Characters reached ${config.staminaThreshold} stamina`);
    const accountStaminas = nonEmptyAccounts
        .map(account => {
            const startMessage = `\`${account.name}\`\n`;
            const characterStaminas = account.charactersToNotify
                .map(character => {
                    if (!character.thresholdReachedAt) {
                        return `• ${ordinal(character.index)} (${character.stamina})`;
                    }

                    return `• ${ordinal(character.index)} (${character.stamina}) - ${createDynamicDiscordTimestamp(character.thresholdReachedAt)}`;
                })
                .join('\n');

            return `${startMessage}${characterStaminas}`;
        });
    const messageDescriptions = splitCharacterMessageDescriptions(accountStaminas);

    for (let i = 0; i < messageDescriptions.length; i++) {
        embedMessage.setDescription(messageDescriptions[i]);

        // eslint-disable-next-line no-await-in-loop
        await webhookClient.send({
            username: webhookUsername,
            embeds: [embedMessage]
        });
    }
}

async function checkStamina(account) {
    const checkedAccount = {...account};
    const charactersToNotify = [];

    // Check stamina for all accounts characters
    for (let i = 0; i < account.characters.length; i++) {
        const character = account.characters[i];

        // Skip checking stamina if not needed
        if (character.nextCheck > new Date()) {
            // eslint-disable-next-line no-continue
            continue;
        }

        // eslint-disable-next-line no-await-in-loop
        const stamina = parseInt(await characterContract.methods.getStaminaPoints(character.id).call(), 10);

        const startNextHour = new Date();
        startNextHour.setHours(new Date().getHours() + 1, 0, 0, 0);
        const remainingStaminaGainCurrentHour = Math.floor((startNextHour.getTime() - new Date().getTime()) / staminaMillisecondsRegenerationTime);

        // If stamina threshold has been reached => notify
        if (stamina >= config.staminaThreshold) {
            // Save character that should be notified
            charactersToNotify.push({index: i + 1, stamina});

            // Wait for next threshold before checking again
            checkedAccount.characters[i].nextCheck = getDateFromNeededStamina(config.staminaThreshold);
        } else if (stamina + remainingStaminaGainCurrentHour >= config.staminaThreshold) {
            // If stamina threshold will be reached current hour => notify
            const remainingStamina = config.staminaThreshold - stamina;
            const thresholdReachedAt = getDateFromNeededStamina(remainingStamina);

            // Wait for next threshold and time until threshold before checking again
            checkedAccount.characters[i].nextCheck = getDateFromNeededStamina(remainingStamina + config.staminaThreshold);

            // Save character that should be notified
            charactersToNotify.push({index: i + 1, stamina, thresholdReachedAt});
        } else {
            const staminaNeeded = config.staminaThreshold - stamina;
            checkedAccount.characters[i].nextCheck = getDateFromNeededStamina(staminaNeeded);
        }
    }

    return {checkedAccount, charactersToNotify};
}

(async () => {
    const accounts = await initializeAccounts();

    // Make it run forever
    while (true) {
        try {
            console.log('Checking for stamina at:', new Date());
            const notifyingAccounts = [];

            for (let i = 0; i < accounts.length; i++) {
                const account = accounts[i];
                // eslint-disable-next-line no-await-in-loop
                const result = await checkStamina(account);
                accounts[i] = result.checkedAccount;
                notifyingAccounts.push({name: account.name, charactersToNotify: result.charactersToNotify});
            }

            // eslint-disable-next-line no-await-in-loop
            await notifyStamina(notifyingAccounts);
        } catch (error) {
            console.log(error);
        } finally {
            // eslint-disable-next-line no-await-in-loop
            await setTimeout(config.waitTimeout);
        }
    }
})();
