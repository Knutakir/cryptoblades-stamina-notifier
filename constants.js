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
    }
];

export const characterAddress = '0xc6f252c2CdD4087e30608A35c022ce490B58179b';
export const cryptoBladesAddress = '0x39Bea96e13453Ed52A734B6ACEeD4c41F57B2271';

export const staminaMinutesRegenerationTime = 5;
