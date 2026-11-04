import {
  createInitializeMintInstruction,
  createMint,
  createMintToInstruction,
  getAccount,
  getAssociatedTokenAddressSync,
  getMint,
  getMintLen,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  type Signer,
} from "@solana/web3.js";
import { mkdirSync, writeFileSync } from "node:fs";
import {
  addressExplorerLink,
  checkDevnetAndBalance,
  formatTokenAmount,
  getConnection,
  loadWallet,
  transactionExplorerLink,
  withRpcRetry,
} from "./lib.js";

const DECIMALS = 9;
const TOKEN_AMOUNT = 1_000n;

async function simulate(
  connection: ReturnType<typeof getConnection>,
  transaction: Transaction,
  signers: Signer[],
  step: string,
): Promise<void> {
  const { blockhash } = await withRpcRetry(() =>
    connection.getLatestBlockhash("confirmed"),
  );
  transaction.recentBlockhash = blockhash;
  const result = await withRpcRetry(() =>
    connection.simulateTransaction(transaction, signers),
  );
  console.log(`${step} simulation result: ${JSON.stringify(result.value.err)}.`);
  if (result.value.err !== null) {
    throw new Error(`${step} simulation failed.`);
  }
}

async function latestSignature(
  connection: ReturnType<typeof getConnection>,
  address: PublicKey,
): Promise<string> {
  const signatures = await withRpcRetry(() =>
    connection.getSignaturesForAddress(address, { limit: 1 }),
  );
  const signature = signatures[0]?.signature;
  if (!signature) {
    throw new Error("Could not find the transaction signature.");
  }
  return signature;
}

async function main(): Promise<void> {
  console.log("Step 1: Check the devnet connection and wallet balance.");
  const connection = getConnection();
  const wallet = loadWallet();
  console.log(`My wallet: ${addressExplorerLink(wallet.publicKey)}`);
  if (!(await checkDevnetAndBalance(connection, wallet))) {
    return;
  }

  console.log("Step 2: Simulate creating the mint.");
  const mintSigner = Keypair.generate();
  const mintAddress = mintSigner.publicKey;
  const mintSpace = getMintLen([]);
  const mintRent = await withRpcRetry(() =>
    connection.getMinimumBalanceForRentExemption(mintSpace),
  );
  const mintTransaction = new Transaction().add(
    SystemProgram.createAccount({
      fromPubkey: wallet.publicKey,
      newAccountPubkey: mintAddress,
      lamports: mintRent,
      space: mintSpace,
      programId: TOKEN_PROGRAM_ID,
    }),
    createInitializeMintInstruction(
      mintAddress,
      DECIMALS,
      wallet.publicKey,
      null,
      TOKEN_PROGRAM_ID,
    ),
  );
  await simulate(connection, mintTransaction, [wallet, mintSigner], "Mint creation");

  if (process.argv.includes("--simulate-only")) {
    console.log("Simulation only. No transaction was sent.");
    return;
  }

  console.log("Step 3: Create the mint with my wallet as authority.");
  const createdMint = await withRpcRetry(() =>
    createMint(
      connection,
      wallet,
      wallet.publicKey,
      null,
      DECIMALS,
      mintSigner,
      { commitment: "confirmed" },
    ),
  );
  const mintCreationSignature = await latestSignature(connection, createdMint);
  console.log(`Mint address: ${addressExplorerLink(createdMint)}`);
  console.log(
    `Mint creation transaction: ${transactionExplorerLink(mintCreationSignature)}`,
  );

  console.log("Step 4: Create or find my associated token account.");
  const expectedTokenAccount = getAssociatedTokenAddressSync(
    createdMint,
    wallet.publicKey,
  );
  const tokenAccountBefore = await withRpcRetry(() =>
    connection.getAccountInfo(expectedTokenAccount),
  );
  const associatedTokenAccount = await withRpcRetry(() =>
    getOrCreateAssociatedTokenAccount(
      connection,
      wallet,
      createdMint,
      wallet.publicKey,
      false,
      "confirmed",
      { commitment: "confirmed" },
    ),
  );
  const tokenAccountCreationSignature =
    tokenAccountBefore === null
      ? await latestSignature(connection, associatedTokenAccount.address)
      : null;
  console.log(
    `My token account: ${addressExplorerLink(associatedTokenAccount.address)}`,
  );
  if (tokenAccountCreationSignature) {
    console.log(
      `Token account creation transaction: ${transactionExplorerLink(tokenAccountCreationSignature)}`,
    );
  } else {
    console.log("My token account already existed, so no creation transaction ran.");
  }

  console.log("Step 5: Simulate and mint 1000 tokens.");
  const baseUnitAmount = TOKEN_AMOUNT * 10n ** BigInt(DECIMALS);
  const mintToTransaction = new Transaction().add(
    createMintToInstruction(
      createdMint,
      associatedTokenAccount.address,
      wallet.publicKey,
      baseUnitAmount,
      [],
      TOKEN_PROGRAM_ID,
    ),
  );
  await simulate(connection, mintToTransaction, [wallet], "Minting tokens");

  const mintSignature = await withRpcRetry(() =>
    mintTo(
      connection,
      wallet,
      createdMint,
      associatedTokenAccount.address,
      wallet,
      baseUnitAmount,
      [],
      { commitment: "confirmed" },
      TOKEN_PROGRAM_ID,
    ),
  );
  console.log(`Mint transaction: ${transactionExplorerLink(mintSignature)}`);

  console.log("Step 6: Verify the mint and token account.");
  const [mintInfo, tokenAccountInfo] = await Promise.all([
    withRpcRetry(() => getMint(connection, createdMint)),
    withRpcRetry(() => getAccount(connection, associatedTokenAccount.address)),
  ]);
  console.log(
    `Mint supply: ${formatTokenAmount(mintInfo.supply, mintInfo.decimals)} tokens (${mintInfo.supply.toString()} base units).`,
  );
  console.log(
    `My token balance: ${formatTokenAmount(tokenAccountInfo.amount, mintInfo.decimals)} tokens (${tokenAccountInfo.amount.toString()} base units).`,
  );

  mkdirSync("results", { recursive: true });
  writeFileSync(
    "results/mint.json",
    `${JSON.stringify(
      {
        mintAddress: createdMint.toBase58(),
        ownerTokenAccount: associatedTokenAccount.address.toBase58(),
        decimals: mintInfo.decimals,
        supply: mintInfo.supply.toString(),
        signatures: {
          mintCreation: mintCreationSignature,
          tokenAccountCreation: tokenAccountCreationSignature,
          mintTo: mintSignature,
        },
      },
      null,
      2,
    )}\n`,
  );
  console.log("Public results saved to results/mint.json.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "The mint script failed.");
  process.exitCode = 1;
});
