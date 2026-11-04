# James Token SPL Assignment

## What this project does

This project demonstrates creating and using an SPL token on Solana devnet. I created a mint, attached its name and symbol with Metaplex Token Metadata, minted tokens to my wallet, and transferred tokens to a second wallet.

The scripts use Solana Kit and the SPL Token program. Metadata is stored on Irys and linked to the mint through a Metaplex metadata account.

## Assignment result

| Setting | Result |
| --- | --- |
| Network | Solana devnet |
| Token name | james token |
| Symbol | $j |
| Decimals | 10 |
| Supply minted | 1,000 |
| Amount transferred | 100 |
| Sender balance after transfer | 900 |
| Recipient balance after transfer | 100 |

### Addresses and metadata

| Item | Address or URI |
| --- | --- |
| Mint | [C92dxhpvkuuQcyjtq1T4uymbGRVM1HLENrv8hP3NftCT](https://explorer.solana.com/address/C92dxhpvkuuQcyjtq1T4uymbGRVM1HLENrv8hP3NftCT?cluster=devnet) |
| Sender wallet | [8zMQYnzUoLppdgZKfP5dYrP8pwprd15wgo9EeKG8wzvZ](https://explorer.solana.com/address/8zMQYnzUoLppdgZKfP5dYrP8pwprd15wgo9EeKG8wzvZ?cluster=devnet) |
| Sender token account | [6n1TtQyLVPuHkCnRMRaiEQ3pKn1kN76nKaZxjMDr3j5q](https://explorer.solana.com/address/6n1TtQyLVPuHkCnRMRaiEQ3pKn1kN76nKaZxjMDr3j5q?cluster=devnet) |
| Recipient wallet | [DFk6RF1W5j5HnjHPvcj5EWBZ2vu2d2fB4thRh7T28KG](https://explorer.solana.com/address/DFk6RF1W5j5HnjHPvcj5EWBZ2vu2d2fB4thRh7T28KG?cluster=devnet) |
| Recipient token account | [BXBaoiDRJhXn4puNhNKwnKr4Se9BxrLJSh9G3xorwvJ](https://explorer.solana.com/address/BXBaoiDRJhXn4puNhNKwnKr4Se9BxrLJSh9G3xorwvJ?cluster=devnet) |
| Metaplex metadata account | [EMXhz7rP9C5Yyo7DxSsH5rzmgXLzrhirQ69pb2uXwy6j](https://explorer.solana.com/address/EMXhz7rP9C5Yyo7DxSsH5rzmgXLzrhirQ69pb2uXwy6j?cluster=devnet) |
| Metadata JSON | [Irys metadata URI](https://gateway.irys.xyz/4qCQ8dXjQx6ouhvGpKDZFu2rGE232xJCHWPEKpMFN5Ma) |

The uploaded metadata JSON currently refers to an image using a local filesystem path. That path is not publicly accessible, so the token name and symbol are attached but the artwork is not reliably available to wallets or explorers. No claim is made that the image was uploaded.

### Transactions

Each signature below was confirmed finalized on devnet with no transaction error.

| Action | Transaction |
| --- | --- |
| Create mint | [2Y8Lbu9uf6unoNiDiBdRoHZ1q4S2suLZHw6FSAkaXNXqVEdSFceUogojrny4RzFG2Nxj7s8QNtdmKXysSHdrmkA4](https://explorer.solana.com/tx/2Y8Lbu9uf6unoNiDiBdRoHZ1q4S2suLZHw6FSAkaXNXqVEdSFceUogojrny4RzFG2Nxj7s8QNtdmKXysSHdrmkA4?cluster=devnet) |
| Attach token metadata | [UxUFyB6vgGxSsrqWXaZB4yuFkqaKnotxMjcq6W7KcasJxbbepVJUSErJTpqCyT7y6sjQ7zd1KWfoYq1gQYWbyiZ](https://explorer.solana.com/tx/UxUFyB6vgGxSsrqWXaZB4yuFkqaKnotxMjcq6W7KcasJxbbepVJUSErJTpqCyT7y6sjQ7zd1KWfoYq1gQYWbyiZ?cluster=devnet) |
| Create sender token account | [4bvRvJDuYN7E6UBi5DGTpeAenNyxuzFpQjUrD4A5mscBbyAhPS5Yv4tLRU5TPikE7PT8cL8wRQXrzDpkNnZe2QW8](https://explorer.solana.com/tx/4bvRvJDuYN7E6UBi5DGTpeAenNyxuzFpQjUrD4A5mscBbyAhPS5Yv4tLRU5TPikE7PT8cL8wRQXrzDpkNnZe2QW8?cluster=devnet) |
| Mint 1,000 tokens | [oycS8dC7wejnHF1d3CQKhCyFswunnEvBqFrBcc4SshVibbNHxDHH1rKTaGkzhxZyjZusx1SWRV8w61diJwhVVMx](https://explorer.solana.com/tx/oycS8dC7wejnHF1d3CQKhCyFswunnEvBqFrBcc4SshVibbNHxDHH1rKTaGkzhxZyjZusx1SWRV8w61diJwhVVMx?cluster=devnet) |
| Transfer 100 tokens | [2Z8GCvvJGs2noMF9fpBMfCPynDQiDr8M5gCkvwhWCp5aUhJy4KAYxnEypG2Jzk819dQ93qimVrEmYVMCW75H6337](https://explorer.solana.com/tx/2Z8GCvvJGs2noMF9fpBMfCPynDQiDr8M5gCkvwhWCp5aUhJy4KAYxnEypG2Jzk819dQ93qimVrEmYVMCW75H6337?cluster=devnet) |

## What I learned

- A **mint address** identifies the token and stores its configuration, including its decimal precision and supply.
- A **token account** holds a wallet's balance of a particular mint. Each wallet needs its own associated token account for this token.
- **Decimals** determine how token amounts are represented in base units. With 10 decimals, one whole token is represented by 10,000,000,000 base units.
- The **mint authority** is the signer permitted to create more tokens. The minting workflow used the sender wallet as the authority.
- A **metadata account** links the mint to its name, symbol, and off-chain metadata URI.
- A **transaction signature** identifies a transaction and can be opened in Explorer to inspect its status and details.
- A **recipient wallet address** identifies the destination wallet. The transfer deposits tokens into that wallet's associated token account.

## How to verify

Open the address or transaction links above. Confirm the Explorer network is Devnet, and check that each transaction succeeded. The mint and token accounts can be inspected separately from the transaction history. The Irys link opens the uploaded metadata JSON.

## Run the scripts

The wallet keypair belongs at `./devnet-wallet.json`. It is read locally by the scripts and must never be committed or shared. The scripts use Solana devnet and devnet Irys.

Install dependencies and type-check:

```sh
npm install
npx tsc --noEmit
```

The scripts for uploading metadata, creating a mint, attaching metadata, minting, and transferring are:

```sh
npm run spl:metadata-upload
npm run spl:init
npm run spl:metadata
npm run spl:mint
npm run spl:transfer
```

The workflow uses values configured in `src/spl/`. Running the initialization, metadata, mint, or transfer scripts sends transactions and can spend devnet SOL. Review each script's configured addresses and amounts before running it. Do not rerun creation or minting scripts unless you intend to create another mint or issue more tokens.

## Security and network

- Never share or commit `devnet-wallet.json` or any other private key. The scripts do not print or save the secret key.
- Verify the mint and recipient addresses before running a transaction.
- Devnet SOL and tokens have no real-world value.
- This project is a course exercise, not a production token launch.
