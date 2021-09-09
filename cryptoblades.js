import Web3 from 'web3';
import config from './config.js';
import {
    characterABI,
    characterAddress,
    cryptoBladesABI,
    cryptoBladesAddress,
    weaponABI,
    weaponAddress
} from './constants.js';

const web3 = new Web3(config.blockchainProvider);
const characterContract = new web3.eth.Contract(characterABI, characterAddress);
const cryptoBladesContract = new web3.eth.Contract(cryptoBladesABI, cryptoBladesAddress);
const weaponContract = new web3.eth.Contract(weaponABI, weaponAddress);

export async function getAccountCharacters(address) {
    return cryptoBladesContract.methods.getMyCharacters().call({from: address});
}

export async function getAccountWeapons(address) {
    return cryptoBladesContract.methods.getMyWeapons().call({from: address});
}

export async function getCharacterStamina(characterId) {
    return parseInt(await characterContract.methods.getStaminaPoints(characterId).call(), 10);
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

export async function calculateHighestFightWinPercentage(characterId, weaponId) {
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
