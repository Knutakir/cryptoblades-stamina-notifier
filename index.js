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
    staminaMillisecondsRegenerationTime,
    weaponABI,
    weaponAddress
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
const weaponContract = new web3.eth.Contract(weaponABI, weaponAddress);
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
        const characterIds = await cryptoBladesContract.methods.getMyCharacters().call({from: address});
        const characters = characterIds.map(characterId => ({id: characterId}));

        if (weaponIds) {
            const weapons = await cryptoBladesContract.methods.getMyWeapons().call({from: address});
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

function createDynamicDiscordTimestamp(date) {
    const unixTime = Math.round(date.getTime() / 1000);
    return `<t:${unixTime}:R>`;
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
            const dynamicTimestamp = createDynamicDiscordTimestamp(character.thresholdReachedAt);
            baseMessage = `\`${account.name}\`'s ${ordinal(character.index)} character reaches ${config.staminaThreshold} stamina (${character.stamina}) - ${dynamicTimestamp}`;
        }

        embedMessage.setDescription(
            `${baseMessage}${config.weaponIds && createEnemyMessagePart(character.enemy)}`
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
                        return `${baseMessage}${config.weaponIds && createEnemyMessagePart(character.enemy)}`;
                    }

                    return `${baseMessage} - ${createDynamicDiscordTimestamp(character.thresholdReachedAt)}${config.weaponIds && createEnemyMessagePart(character.enemy)}`;
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

async function fetchEnemies(characterId, weaponId) {
    const enemies = await cryptoBladesContract.methods.getTargets(characterId, weaponId).call();
    return enemies.map(enemy => {
        const parsedData = parseInt(enemy, 10);

        return {
            // eslint-disable-next-line no-bitwise
            power: parsedData & 0b11111111_11111111_11111111,
            // eslint-disable-next-line no-bitwise
            trait: parsedData >> 24
        };
    });
}

function calculateCharacterPower(level) {
    return (1000 + 10 * level) * (Math.floor(level / 10) + 1);
}

const numberOfTraits = 4;

function getTraitEffectiveness(firstTrait, secondTrait) {
    if ((firstTrait + 1) % numberOfTraits === secondTrait) {
        return 1;
    }

    if ((secondTrait + 1) % numberOfTraits === firstTrait) {
        return -1;
    }

    return 0;
}

function calculateTraitBonus(characterTrait, weaponTrait, enemyTrait) {
    let traitBonus = 1;

    if (characterTrait === weaponTrait) {
        traitBonus += 0.075;
    }

    traitBonus += 0.075 * getTraitEffectiveness(characterTrait, enemyTrait);

    return traitBonus;
}

function calculateFightWinPercentage(characterPower, characterTrait, weaponTrait, enemy) {
    const traitBonus = calculateTraitBonus(characterTrait, weaponTrait, enemy.trait);
    const minCharacterRoll = Math.floor(characterPower * traitBonus * 0.9);
    const maxCharacterRoll = Math.floor(characterPower * traitBonus * 1.1);
    const minEnemyRoll = Math.floor(enemy.power * 0.9);
    const maxEnemyRoll = Math.floor(enemy.power * 1.1);

    // TODO: currently using same method as cbtracker for calculating win percentage
    // TODO: find a way of doing this without nested loops
    let winRolls = 0;
    let loseRolls = 0;

    for (let characterRoll = minCharacterRoll; characterRoll <= maxCharacterRoll; characterRoll++) {
        for (let enemyRoll = minEnemyRoll; enemyRoll <= maxEnemyRoll; enemyRoll++) {
            if (characterRoll >= enemyRoll) {
                winRolls++;
            } else {
                loseRolls++;
            }
        }
    }

    const winPercentage = (winRolls / (winRolls + loseRolls)) * 100;

    // Only show two decimal places
    return Math.floor(winPercentage * 100) / 100;
}

async function fetchCharacter(characterId) {
    const {1: level, 2: trait} = await characterContract.methods.get(characterId).call();
    return {
        level: parseInt(level, 10),
        trait: parseInt(trait, 10)
    };
}

function getWeaponStatTypes(weaponProperties) {
    // eslint-disable-next-line no-bitwise
    const pattern = (weaponProperties >> 5) & 0x7f;
    return [
        pattern % 5,
        Math.floor(pattern / 5) % 5,
        Math.floor(Math.floor(pattern / 5) / 5) % 5
    ];
}

const powerTrait = 4;

function calculateWeaponStat(type, value, characterTrait) {
    let statValue = value;

    if (type !== characterTrait) {
        statValue *= 0.0025;
    } else if (type === characterTrait) {
        statValue *= 0.002675;
    }

    if (type === powerTrait) {
        statValue *= 0.002575;
    }

    return statValue;
}

function calculateTotalWeaponStats(stats, properties, characterTrait) {
    const statTypes = getWeaponStatTypes(properties);
    return statTypes
        .map((statType, i) => calculateWeaponStat(statType, stats[i], characterTrait))
        .reduce((previous, current) => previous + current, 0);
}

async function fetchWeapon(weaponId, characterTrait) {
    const {
        _properties,
        _stat1: stat1,
        _stat2: stat2,
        _stat3: stat3,
        _bonusPower
    } = await weaponContract.methods.get(weaponId).call();
    const bonusPower = parseInt(_bonusPower, 10);
    const properties = parseInt(_properties, 10);

    // eslint-disable-next-line no-bitwise
    const trait = (properties >> 3) & 0x3;

    const stats = [stat1, stat2, stat3].map(stat => parseInt(stat, 10));
    const totalStats = calculateTotalWeaponStats(stats, properties, characterTrait);

    return {
        trait,
        bonusPower,
        totalStats
    };
}

async function calculateHighestFightWinPercentage(characterId, weaponId) {
    const enemies = await fetchEnemies(characterId, weaponId);
    const character = await fetchCharacter(characterId);
    const characterPower = calculateCharacterPower(character.level);
    const weapon = await fetchWeapon(weaponId, character.trait);
    const alignedCharacterPower = ((weapon.totalStats + 1) * characterPower) + weapon.bonusPower;
    const enemiesWithWinFightPercentages = enemies.map((enemy, i) => ({...enemy, index: i + 1, winPercentage: calculateFightWinPercentage(alignedCharacterPower, character.trait, weapon.trait, enemy)}));
    let highestPercentageEnemy;

    for (let i = 0; i < enemiesWithWinFightPercentages.length; i++) {
        if (!highestPercentageEnemy || enemiesWithWinFightPercentages[i].winPercentage > highestPercentageEnemy.winPercentage) {
            highestPercentageEnemy = enemiesWithWinFightPercentages[i];
        }
    }

    return highestPercentageEnemy;
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
