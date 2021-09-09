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
    }
];
export const cryptoBladesABI = [
    {
        inputs: [],
        name: 'getMyCharacters',
        outputs: [
            {
                internalType: 'uint256[]',
                name: '',
                type: 'uint256[]'
            }
        ],
        stateMutability: 'view',
        type: 'function'
    },
    {
        inputs: [],
        name: 'getMyWeapons',
        outputs: [
            {
                internalType: 'uint256[]',
                name: '',
                type: 'uint256[]'
            }
        ],
        stateMutability: 'view',
        type: 'function'
    },
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
    }
];

export const characterAddress = '0xc6f252c2CdD4087e30608A35c022ce490B58179b';
export const cryptoBladesAddress = '0x39Bea96e13453Ed52A734B6ACEeD4c41F57B2271';
export const weaponAddress = '0x7E091b0a220356B157131c831258A9C98aC8031A';

export const staminaMillisecondsRegenerationTime = 5 * 60000;
