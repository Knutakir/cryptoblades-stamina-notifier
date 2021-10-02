import config from './config.js';

export const characterABI = [
    {
        inputs: [
            {
                internalType: 'uint256',
                name: 'id',
                type: 'uint256'
            }
        ],
        name: 'getStaminaPoints',
        outputs: [
            {
                internalType: 'uint8',
                name: '',
                type: 'uint8'
            }
        ],
        stateMutability: 'view',
        type: 'function'
    },
    {
        inputs: [
            {
                internalType: 'uint256',
                name: 'id',
                type: 'uint256'
            }
        ],
        name: 'get',
        outputs: [
            {
                internalType: 'uint16',
                name: '',
                type: 'uint16'
            },
            {
                internalType: 'uint8',
                name: '',
                type: 'uint8'
            },
            {
                internalType: 'uint8',
                name: '',
                type: 'uint8'
            },
            {
                internalType: 'uint64',
                name: '',
                type: 'uint64'
            },
            {
                internalType: 'uint16',
                name: '',
                type: 'uint16'
            },
            {
                internalType: 'uint16',
                name: '',
                type: 'uint16'
            },
            {
                internalType: 'uint16',
                name: '',
                type: 'uint16'
            },
            {
                internalType: 'uint16',
                name: '',
                type: 'uint16'
            },
            {
                internalType: 'uint16',
                name: '',
                type: 'uint16'
            },
            {
                internalType: 'uint16',
                name: '',
                type: 'uint16'
            }
        ],
        stateMutability: 'view',
        type: 'function'
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'owner',
                type: 'address'
            }
        ],
        name: 'balanceOf',
        outputs: [
            {
                internalType: 'uint256',
                name: '',
                type: 'uint256'
            }
        ],
        stateMutability: 'view',
        type: 'function'
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'owner',
                type: 'address'
            },
            {
                internalType: 'uint256',
                name: 'index',
                type: 'uint256'
            }
        ],
        name: 'tokenOfOwnerByIndex',
        outputs: [
            {
                internalType: 'uint256',
                name: '',
                type: 'uint256'
            }
        ],
        stateMutability: 'view',
        type: 'function'
    }
];
export const cryptoBladesABI = [
    {
        inputs: [
            {
                internalType: 'uint256',
                name: 'char',
                type: 'uint256'
            },
            {
                internalType: 'uint256',
                name: 'wep',
                type: 'uint256'
            }
        ],
        name: 'getTargets',
        outputs: [
            {
                internalType: 'uint32[4]',
                name: '',
                type: 'uint32[4]'
            }
        ],
        stateMutability: 'view',
        type: 'function'
    }
];

export const weaponABI = [
    {
        inputs: [
            {
                internalType: 'uint256',
                name: 'id',
                type: 'uint256'
            }
        ],
        name: 'get',
        outputs: [
            {
                internalType: 'uint16',
                name: '_properties',
                type: 'uint16'
            },
            {
                internalType: 'uint16',
                name: '_stat1',
                type: 'uint16'
            },
            {
                internalType: 'uint16',
                name: '_stat2',
                type: 'uint16'
            },
            {
                internalType: 'uint16',
                name: '_stat3',
                type: 'uint16'
            },
            {
                internalType: 'uint8',
                name: '_level',
                type: 'uint8'
            },
            {
                internalType: 'uint8',
                name: '_blade',
                type: 'uint8'
            },
            {
                internalType: 'uint8',
                name: '_crossguard',
                type: 'uint8'
            },
            {
                internalType: 'uint8',
                name: '_grip',
                type: 'uint8'
            },
            {
                internalType: 'uint8',
                name: '_pommel',
                type: 'uint8'
            },
            {
                internalType: 'uint24',
                name: '_burnPoints',
                type: 'uint24'
            },
            {
                internalType: 'uint24',
                name: '_bonusPower',
                type: 'uint24'
            }
        ],
        stateMutability: 'view',
        type: 'function'
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'owner',
                type: 'address'
            }
        ],
        name: 'balanceOf',
        outputs: [
            {
                internalType: 'uint256',
                name: '',
                type: 'uint256'
            }
        ],
        stateMutability: 'view',
        type: 'function'
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'owner',
                type: 'address'
            },
            {
                internalType: 'uint256',
                name: 'index',
                type: 'uint256'
            }
        ],
        name: 'tokenOfOwnerByIndex',
        outputs: [
            {
                internalType: 'uint256',
                name: '',
                type: 'uint256'
            }
        ],
        stateMutability: 'view',
        type: 'function'
    }
];

export const chains = {
    bsc: {
        characterAddress: '0xc6f252c2CdD4087e30608A35c022ce490B58179b',
        cryptoBladesAddress: '0x39Bea96e13453Ed52A734B6ACEeD4c41F57B2271',
        weaponAddress: '0x7E091b0a220356B157131c831258A9C98aC8031A'
    },
    heco: {
        characterAddress: '0xF6092CDEaabd02069cB56E2b770367AAcf49dfba',
        cryptoBladesAddress: '0x29869EDb088466a49f75654d8F04edd16Bf60e75',
        weaponAddress: '0xa0f254436E43239D2B3947A9D590C495738B6A4C'
    },
    okex: {
        characterAddress: '0x6A1d1803d4EDF5CF27EDb64ae95A22F81707eA38',
        cryptoBladesAddress: '0x98145a2fEBac238280bbdEDc2757dC162318b16e',
        weaponAddress: '0x364759180A6484e57ECD73C042264A6Da75770e8'
    }
};

export const {characterAddress} = chains[config.network];
export const {cryptoBladesAddress} = chains[config.network];
export const {weaponAddress} = chains[config.network];

export const staminaMillisecondsRegenerationTime = 5 * 60000;
