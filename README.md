# What this project does

I created an SPL token on Solana devnet, named it James token, minted 1000 tokens, and transferred 100 to a recipient token account. The scripts use my local wallet to pay transaction fees. The mint has 9 decimals and no freeze authority.

# What I learned

A mint is the on chain record that defines a token and tracks its total supply. My wallet is the mint authority, which means it can create more tokens.

A token name is stored separately from the mint in a Metaplex metadata account. I added the name James token. I did not set a symbol or image.

A token account holds a balance for one token and one owner. A wallet can have a separate associated token account for each token. The recipient needs its own token account because token balances are stored there, not directly in the wallet address.

Decimals set how amounts are represented. With 9 decimals, one token equals 1000000000 base units. The scripts use bigint for those amounts so the values stay exact.

# How to run it

I used Node.js and pnpm. Clone the project, install dependencies, and copy the example environment file:

```sh
git clone https://github.com/jamesonchain/spl-token-devnet.git
cd spl-token-devnet
pnpm install
cp .env.example .env
```

Set up `.env` with these values:

```dotenv
RPC_URL=https://api.devnet.solana.com
KEYPAIR_PATH=~/.config/solana/id.json
RECIPIENT=
```

`RPC_URL` can point to another devnet RPC service. `KEYPAIR_PATH` points to a Solana keypair JSON array. The scripts never copy that file into this project. Set `RECIPIENT` to a public wallet address you control before transferring if you want to control the received tokens.

My wallet needs at least 0.1 devnet SOL before a transaction. I can request it with `solana airdrop 1` or use faucet.solana.com.

Run the scripts in this order:

```sh
pnpm typecheck
pnpm mint
pnpm metadata
pnpm transfer
pnpm check
```

The scripts check that the RPC is connected to devnet. They retry one rate limited RPC call after waiting two seconds. Results contain public addresses and signatures in the `results` folder.

I only need to run `pnpm metadata` once for a mint that does not already have metadata. It adds the name James token on devnet.

For a preview of mint creation without sending it, I can run:

```sh
pnpm mint -- --simulate-only
```

# Results

The mint supply is 1000 tokens. My balance is 900 tokens and the recipient balance is 100 tokens.

| Result | Devnet explorer |
| --- | --- |
| Token name | James token |
| Mint address | [6RKH3azQw6gaAQv8aYpeXfM2PruirTgFzHfgtpqUSEhp](https://explorer.solana.com/address/6RKH3azQw6gaAQv8aYpeXfM2PruirTgFzHfgtpqUSEhp?cluster=devnet) |
| Metadata account | [FGhcnPuwhGA3estmAQLrDKhLm7C4KpMzdFFXiP3b1ogt](https://explorer.solana.com/address/FGhcnPuwhGA3estmAQLrDKhLm7C4KpMzdFFXiP3b1ogt?cluster=devnet) |
| My token account | [DQ6AUohvLynUS1sN2r8hHe354G4LWr8Ec5w5HL9ArdEp](https://explorer.solana.com/address/DQ6AUohvLynUS1sN2r8hHe354G4LWr8Ec5w5HL9ArdEp?cluster=devnet) |
| Recipient wallet address | [9fmB1f6R2fYRG3pf4r94DzgijcRZYEqNMhExnDy4Ei5L](https://explorer.solana.com/address/9fmB1f6R2fYRG3pf4r94DzgijcRZYEqNMhExnDy4Ei5L?cluster=devnet) |
| Recipient token account | [FkWNv3vi3ssMgf8sLVN5gC6RAvJfCjRW49kqkTcGhCcQ](https://explorer.solana.com/address/FkWNv3vi3ssMgf8sLVN5gC6RAvJfCjRW49kqkTcGhCcQ?cluster=devnet) |
| Mint creation transaction | [3Z6ZSop4G7vRsoRvyJuQLUXUCQTLdqG3kfzPjGnro4Z6yqpPveKakbpG2e4o8yYRfejGuHRv8P2FgzSZ6gY8m3bQ](https://explorer.solana.com/tx/3Z6ZSop4G7vRsoRvyJuQLUXUCQTLdqG3kfzPjGnro4Z6yqpPveKakbpG2e4o8yYRfejGuHRv8P2FgzSZ6gY8m3bQ?cluster=devnet) |
| My token account transaction | [2pD3avC5ANtVWUKtTgMZBPZ5aHEFz3wrBjZVhZLEXongds14fdEJU36WfvDSo94K5m3g7ka8hawk4CpYrX63acaz](https://explorer.solana.com/tx/2pD3avC5ANtVWUKtTgMZBPZ5aHEFz3wrBjZVhZLEXongds14fdEJU36WfvDSo94K5m3g7ka8hawk4CpYrX63acaz?cluster=devnet) |
| Mint tokens transaction | [2j8AynvMKSA9GFjTZ43Ty6uzBaPSkvUzfyWKKXEDHsvKxPa4WARLmUTT7bCc7DpfH36CcPquhUnvtyKAz1Z14smQ](https://explorer.solana.com/tx/2j8AynvMKSA9GFjTZ43Ty6uzBaPSkvUzfyWKKXEDHsvKxPa4WARLmUTT7bCc7DpfH36CcPquhUnvtyKAz1Z14smQ?cluster=devnet) |
| Add James token name transaction | [3cwFNQbrMvAjps5zrhypCx9ivHs8yFibcMcGk74m9Qax8nRggetYtkro8n2eXTPhac7JgkV3eJWMaUmGHsLw9Qpf](https://explorer.solana.com/tx/3cwFNQbrMvAjps5zrhypCx9ivHs8yFibcMcGk74m9Qax8nRggetYtkro8n2eXTPhac7JgkV3eJWMaUmGHsLw9Qpf?cluster=devnet) |
| Recipient token account transaction | [3w9gG4UtWyuRYHS3oYDUCTrFdrdtKW97DKzkqPbFuaDb8VfxQSwCs19EU4CscErfx1iC5fKaW5K6bjkF6kH4eZ2K](https://explorer.solana.com/tx/3w9gG4UtWyuRYHS3oYDUCTrFdrdtKW97DKzkqPbFuaDb8VfxQSwCs19EU4CscErfx1iC5fKaW5K6bjkF6kH4eZ2K?cluster=devnet) |
| Transfer transaction | [nYmaJzrBmSrdcJi7YTmPiZE1gFs9GtDqUCxzFWZRfYAccbZ4NgB8vGMnZp3R9ZmrmYAyaQx3sUxGuwSn1MfGv4u](https://explorer.solana.com/tx/nYmaJzrBmSrdcJi7YTmPiZE1gFs9GtDqUCxzFWZRfYAccbZ4NgB8vGMnZp3R9ZmrmYAyaQx3sUxGuwSn1MfGv4u?cluster=devnet) |

In this run I left `RECIPIENT` empty. The script generated a recipient address and saved only its public address. It did not save the private key, so I cannot control that recipient wallet. For a recipient I can use, I should set `RECIPIENT` to a wallet address I control before running the transfer script.

# Why it is interesting

I could see that creating a token is several separate actions. The mint, my token account, the supply change, the recipient token account, and the transfer each have their own transaction.

# How it can be applied

I can use the same flow to issue a test token for a class project, game, or prototype. Before using a recipient address, I need to make sure I control its wallet and have created the matching token account.
