# cryptoblades-stamina-notifier
> 🏃 Get notified when stamina thresholds are reached for [CryptoBlades](https://www.cryptoblades.io) characters

[![Docker Pulls](https://img.shields.io/docker/pulls/knutkirkhorn/cryptoblades-stamina-notifier)](https://hub.docker.com/r/knutkirkhorn/cryptoblades-stamina-notifier) [![Docker Image Size](https://badgen.net/docker/size/knutkirkhorn/cryptoblades-stamina-notifier)](https://hub.docker.com/r/knutkirkhorn/cryptoblades-stamina-notifier)

Notifies on Discord if stamina thresholds are reached for given [CryptoBlades](https://www.cryptoblades.io) characters. Fetches stamina and character information from smart contracts on the [Binance Smart Chain](https://www.binance.org/en/smartChain). It notifies to a Discord channel using [Discord Webhooks](https://discord.com/developers/docs/resources/webhook).

## Usage
### Within a Docker container
#### From Docker Hub Image
This will pull the image from [Docker Hub](https://hub.docker.com/) and run the image with the provided configuration for web hooks as below. It's required to provide account addresses, names and the Webhook URL or both the Webhook ID and token.

```sh
# Providing a Discord Webhook URL and a single account
$ docker run -d -e DISCORD_WEBHOOK_URL=<URL_HERE> \
    -e ADDRESSES=<single_address> \
    -e ACCOUNT_NAMES="Main" \
    knutkirkhorn/cryptoblades-stamina-notifier

# Providing a Discord Webhook URL and multiple accounts
$ docker run -d -e DISCORD_WEBHOOK_URL=<URL_HERE> \
    -e ADDRESSES=<first_address>,<second_address> \
    -e ACCOUNT_NAMES="First, Second"
    knutkirkhorn/cryptoblades-stamina-notifier
```

#### From source code
```sh
# Build container from source
$ docker build -t cryptoblades-stamina-notifier .

# Providing a single show
$ docker run -d -e DISCORD_WEBHOOK_URL=<URL_HERE> \
    -e ADDRESSES=<single_address> \
    -e ACCOUNT_NAMES="Main" \
    cryptoblades-stamina-notifier

# Providing multiple shows
$ docker run -d -e DISCORD_WEBHOOK_URL=<URL_HERE> \
    -e ADDRESSES=<first_address>,<second_address> \
    -e ACCOUNT_NAMES="First, Second" \
    cryptoblades-stamina-notifier
```

### Outside of a Docker container
```sh
# Install
$ npm install

# Run
$ npm start
```

### Environment variables
Provide these with the docker run command or store these in a `.env` file.

- `DISCORD_WEBHOOK_URL`
    - URL to the Discord Webhook containing both the ID and the token
    - Format: `DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/<ID_HERE>/<TOKEN_HERE>`
- `DISCORD_WEBHOOK_ID`
    - ID for the Discord Webhook
- `DISCORD_WEBHOOK_TOKEN`
    - Token for the Discord Webhook
- `WAIT_TIMEOUT` ***(optional)***
    - The time interval in milliseconds between each check of character staminas.
    - Default: `3600000` (60 minutes)
- `STAMINA_THRESHOLD` ***(optional)***
    - The stamina threshold for when to notify.
    - Default: `160`
- `BLOCKCHAIN_PROVIDER` ***(optional)***
    - The URI for the blockchain provider user for smart contract interaction.
    - Default: `https://bsc-dataseed1.binance.org:443`
- `ADDRESSES`
    - The blockchain address(es) used for checking character staminas.
- `ACCOUNT_NAMES`
    - Names for the account(s) used for better knowing for which account the stamina threshold was reached. This can be anything and are just used in the Discord message.

## License
MIT © [Knut Kirkhorn](https://github.com/Knutakir/cryptoblades-stamina-notifier/blob/main/LICENSE)
