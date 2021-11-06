import {Formatters, MessageEmbed, WebhookClient} from 'discord.js';
import Web3 from 'web3';
import ordinal from 'ordinal';
// eslint-disable-next-line import/no-unresolved
import {setTimeout} from 'timers/promises';
import config from './config.js';
import {
    calculateHighestFightWinPercentage,
    getAccountCharacters,
    getAccountWeapons,
    getCharacterStamina
} from './cryptoblades.js';
import {staminaMillisecondsRegenerationTime} from './constants.js';

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
const discordMessageDescriptionLimit = 4096;
const webhookUsername = 'CryptoBlades Stamina Notifier';

async function initializeAccounts() {
    // Ensure Binance Smart Chain addresses are provided
    if (!config.addresses) {
        throw new Error('You need to specify an address!');
    }

    const addresses = config.addresses.split(',').map(address => address.trim()).filter(address => address !== '');

    // Ensure all addresses are valid
    for (let i = 0; i < addresses.length; i++) {
        const address = addresses[i];

        if (!web3.utils.isAddress(address)) {
            throw new Error(`'${address}' is not a valid address`);
        }
    }

    let accountNames = [];

    // Use provided account names or create `1st`, `2nd`, `3rd`...
    if (config.accountNames) {
        accountNames = config.accountNames.split(',').map(accountName => accountName.trim()).filter(accountName => accountName !== '');
    } else {
        for (let i = 0; i < addresses.length; i++) {
            accountNames.push(ordinal(i + 1));
        }
    }

    if (addresses.length !== accountNames.length) {
        throw new Error('Length of addresses and account names needs to match!');
    }

    const weaponIds = config.weaponIds && config.weaponIds.split(',').map(address => address.trim()).filter(address => address !== '');

    if (config.weaponIds && addresses.length !== weaponIds.length) {
        throw new Error('Length of addresses and weapon IDs needs to match!');
    }

    return Promise.all(addresses.map(async (address, i) => {
        const characterIds = await getAccountCharacters(address);
        const characters = characterIds.map(characterId => ({id: characterId}));

        if (weaponIds) {
            const weapons = await getAccountWeapons(address);
            const weaponId = weaponIds[i];

            if (!weapons.includes(weaponId)) {
                throw new Error(`Account \`${accountNames[i]}\` does not own weapon ID \`${weaponId}\`!`);
            }
        }

        return {
            address,
            name: accountNames[i],
            characters,
            ...(weaponIds && {weaponId: weaponIds[i]})
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

function getDiscordEmojiFromTrait(trait) {
    switch (trait) {
        case 0:
            // Fire
            return ':fire:';
        case 1:
            // Earth
            return ':evergreen_tree:';
        case 2:
            // Lightning
            return ':zap:';
        case 3:
            // Water
            return ':droplet:';
        default:
            return ':question:';
    }
}

function createEnemyMessagePart(enemy) {
    const {
        winPercentage, trait, index, power
    } = enemy;
    return ` - ${winPercentage}% - ${getDiscordEmojiFromTrait(trait)} ${ordinal(index)} (${power})`;
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

        let baseMessage;

        // Check if stamina has already been reached
        if (!character.thresholdReachedAt) {
            baseMessage = `\`${account.name}\`'s ${ordinal(character.index)} character reached ${config.staminaThreshold} stamina (${character.stamina})`;
        } else {
            const dynamicTimestamp = Formatters.time(character.thresholdReachedAt, Formatters.TimestampStyles.RelativeTime);
            baseMessage = `\`${account.name}\`'s ${ordinal(character.index)} character reaches ${config.staminaThreshold} stamina (${character.stamina}) - ${dynamicTimestamp}`;
        }

        embedMessage.setDescription(
            `${baseMessage}${config.weaponIds ? createEnemyMessagePart(character.enemy) : ''}`
        );

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
                    const baseMessage = `• ${ordinal(character.index)} (${character.stamina})`;

                    if (!character.thresholdReachedAt) {
                        return `${baseMessage}${config.weaponIds ? createEnemyMessagePart(character.enemy) : ''}`;
                    }

                    const dynamicTimestamp = Formatters.time(character.thresholdReachedAt, Formatters.TimestampStyles.RelativeTime);
                    return `${baseMessage} - ${dynamicTimestamp}${config.weaponIds ? createEnemyMessagePart(character.enemy) : ''}`;
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
        const stamina = await getCharacterStamina(character.id);

        const startNextHour = new Date();
        startNextHour.setHours(new Date().getHours() + 1, 0, 0, 0);
        const remainingStaminaGainCurrentHour = Math.floor((startNextHour.getTime() - new Date().getTime()) / staminaMillisecondsRegenerationTime);

        // If stamina threshold has been reached => notify
        if (stamina >= config.staminaThreshold) {
            const characterToNotify = {index: i + 1, stamina};

            // Check if fight percentage should be checked
            if (config.weaponIds) {
                // eslint-disable-next-line no-await-in-loop
                const enemy = await calculateHighestFightWinPercentage(character.id, account.weaponId);

                if (enemy.winPercentage >= config.winPercentageThreshold) {
                    // Wait for next threshold before checking again
                    checkedAccount.characters[i].nextCheck = getDateFromNeededStamina(config.staminaThreshold);
                    characterToNotify.enemy = enemy;
                } else {
                    // eslint-disable-next-line no-continue
                    continue;
                }
            } else {
                // Wait for next threshold before checking again
                checkedAccount.characters[i].nextCheck = getDateFromNeededStamina(config.staminaThreshold);
            }

            // Save character that should be notified
            charactersToNotify.push(characterToNotify);
        } else if (stamina + remainingStaminaGainCurrentHour >= config.staminaThreshold) {
            // If stamina threshold will be reached current hour => notify
            const remainingStamina = config.staminaThreshold - stamina;
            const thresholdReachedAt = getDateFromNeededStamina(remainingStamina);
            const characterToNotify = {index: i + 1, stamina, thresholdReachedAt};

            // Check if fight percentage should be checked
            if (config.weaponIds) {
                // eslint-disable-next-line no-await-in-loop
                const enemy = await calculateHighestFightWinPercentage(character.id, account.weaponId);

                if (enemy.winPercentage >= config.winPercentageThreshold) {
                    // Wait for next threshold and time until threshold before checking again
                    checkedAccount.characters[i].nextCheck = getDateFromNeededStamina(remainingStamina + config.staminaThreshold);
                    characterToNotify.enemy = enemy;
                } else {
                    // eslint-disable-next-line no-continue
                    continue;
                }
            } else {
                // Wait for next threshold and time until threshold before checking again
                checkedAccount.characters[i].nextCheck = getDateFromNeededStamina(remainingStamina + config.staminaThreshold);
            }

            // Save character that should be notified
            charactersToNotify.push(characterToNotify);
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
