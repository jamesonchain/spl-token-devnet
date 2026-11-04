import {
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  getAccount,
  getAssociatedTokenAddressSync,
  getMint,
  getOrCreateAssociatedTokenAccount,
  transfer,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { PublicKey, Transaction } from "@solana/web3.js";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import {
  addressExplorerLink,
  checkDevnetAndBalance,
  getConnection,
  getRecipientPublicKey,
  loadWallet,
  transactionExplorerLink,
  withRpcRetry,
} from "./lib.js";

interface MintResult {
  mintAddress: string;
  ownerTokenAccount: string;
  decimals: number;
}

interface RecipientAccountResult {
  recipientAddress: string;
  recipientTokenAccount: string;
  signature: string | null;
}

function readMintResult(): MintResult {
  if (!existsSync("results/mint.json")) {
    throw new Error("Run pnpm mint before running the transfer script.");
  }

  const result: unknown = JSON.parse(readFileSync("results/mint.json", "utf8"));
  if (
    typeof result !== "object" ||
    result === null ||
    !("mintAddress" in result) ||
    typeof result.mintAddress !== "string" ||
    !("ownerTokenAccount" in result) ||
    typeof result.ownerTokenAccount !== "string" ||
    !("decimals" in result) ||
    typeof result.decimals !== "number"
  ) {
    throw new Error("results/mint.json has an invalid format.");
  }
  return {
    mintAddress: result.mintAddress,
    ownerTokenAccount: result.ownerTokenAccount,
    decimals: result.decimals,
  };
}

function readRecipientAccountResult(): RecipientAccountResult | null {
  if (!existsSync("results/recipient-account.json")) {
    return null;
  }

  const result: unknown = JSON.parse(
    readFileSync("results/recipient-account.json", "utf8"),
  );
  if (
    typeof result !== "object" ||
    result === null ||
    !("recipientAddress" in result) ||
    typeof result.recipientAddress !== "string" ||
    !("recipientTokenAccount" in result) ||
    typeof result.recipientTokenAccount !== "string" ||
    !("signature" in result) ||
    (typeof result.signature !== "string" && result.signature !== null)
  ) {
    throw new Error("results/recipient-account.json has an invalid format.");
  }

  return {
    recipientAddress: result.recipientAddress,
    recipientTokenAccount: result.recipientTokenAccount,
    signature: result.signature,
  };
}

async function main(): Promise<void> {
  console.log("Step 1: Check the devnet connection and wallet balance.");
  const connection = getConnection();
  const wallet = loadWallet();
  console.log(`My wallet: ${addressExplorerLink(wallet.publicKey)}`);
  if (!(await checkDevnetAndBalance(connection, wallet))) {
    return;
  }

  console.log("Step 2: Read the mint and choose the recipient.");
  const mintResult = readMintResult();
  const mintAddress = new PublicKey(mintResult.mintAddress);
  const sourceTokenAccount = new PublicKey(mintResult.ownerTokenAccount);
  const recipient = getRecipientPublicKey();
  const destinationTokenAddress = getAssociatedTokenAddressSync(
    mintAddress,
    recipient,
  );
  const mintInfo = await withRpcRetry(() => getMint(connection, mintAddress));
  const amount = 100n * 10n ** BigInt(mintInfo.decimals);

  console.log("Step 3: Create or find the recipient token account.");
  const destinationBefore = await withRpcRetry(() =>
    connection.getAccountInfo(destinationTokenAddress),
  );
  const accountOnly = process.argv.includes("--account-only");
  if (destinationBefore === null) {
    const createAccountTransaction = new Transaction().add(
      createAssociatedTokenAccountInstruction(
        wallet.publicKey,
        destinationTokenAddress,
        recipient,
        mintAddress,
        TOKEN_PROGRAM_ID,
      ),
    );
    const { blockhash } = await withRpcRetry(() =>
      connection.getLatestBlockhash("confirmed"),
    );
    createAccountTransaction.recentBlockhash = blockhash;
    createAccountTransaction.feePayer = wallet.publicKey;
    const simulation = await withRpcRetry(() =>
      connection.simulateTransaction(createAccountTransaction, [wallet]),
    );
    console.log(
      `Recipient account simulation result: ${JSON.stringify(simulation.value.err)}.`,
    );
    if (simulation.value.err !== null) {
      throw new Error("Recipient token account simulation failed.");
    }
    if (process.argv.includes("--simulate-only")) {
      console.log("Simulation only. No transaction was sent.");
      return;
    }
  } else if (process.argv.includes("--simulate-only")) {
    const transferTransaction = new Transaction().add(
      createTransferInstruction(
        sourceTokenAccount,
        destinationTokenAddress,
        wallet.publicKey,
        amount,
        [],
        TOKEN_PROGRAM_ID,
      ),
    );
    const { blockhash } = await withRpcRetry(() =>
      connection.getLatestBlockhash("confirmed"),
    );
    transferTransaction.recentBlockhash = blockhash;
    transferTransaction.feePayer = wallet.publicKey;
    const simulation = await withRpcRetry(() =>
      connection.simulateTransaction(transferTransaction, [wallet]),
    );
    console.log(`Transfer simulation result: ${JSON.stringify(simulation.value.err)}.`);
    if (simulation.value.err !== null) {
      throw new Error("Token transfer simulation failed.");
    }
    console.log("Simulation only. No transaction was sent.");
    return;
  }

  const destinationAccount = await withRpcRetry(() =>
    getOrCreateAssociatedTokenAccount(
      connection,
      wallet,
      mintAddress,
      recipient,
      false,
      "confirmed",
      { commitment: "confirmed" },
    ),
  );
  const savedAccountResult = readRecipientAccountResult();
  const accountCreationSignature =
    destinationBefore === null
      ? (
          await withRpcRetry(() =>
            connection.getSignaturesForAddress(destinationAccount.address, {
              limit: 1,
            }),
          )
        )[0]?.signature ?? null
      : savedAccountResult?.recipientAddress === recipient.toBase58() &&
          savedAccountResult.recipientTokenAccount ===
            destinationAccount.address.toBase58()
        ? savedAccountResult.signature
        : null;
  console.log(`Recipient: ${addressExplorerLink(recipient)}`);
  console.log(
    `Recipient token account: ${addressExplorerLink(destinationAccount.address)}`,
  );
  if (accountCreationSignature) {
    console.log(
      `Recipient account transaction: ${transactionExplorerLink(accountCreationSignature)}`,
    );
  } else {
    console.log("The recipient token account already existed.");
  }

  if (accountOnly) {
    mkdirSync("results", { recursive: true });
    writeFileSync(
      "results/recipient-account.json",
      `${JSON.stringify(
        {
          recipientAddress: recipient.toBase58(),
          recipientTokenAccount: destinationAccount.address.toBase58(),
          signature: accountCreationSignature,
        },
        null,
        2,
      )}\n`,
    );
    console.log("Recipient account results saved to results/recipient-account.json.");
    console.log("Account only mode. No token transfer was sent.");
    return;
  }

  console.log("Step 4: Simulate and transfer 100 tokens.");
  const transferTransaction = new Transaction().add(
    createTransferInstruction(
      sourceTokenAccount,
      destinationAccount.address,
      wallet.publicKey,
      amount,
      [],
      TOKEN_PROGRAM_ID,
    ),
  );
  const { blockhash } = await withRpcRetry(() =>
    connection.getLatestBlockhash("confirmed"),
  );
  transferTransaction.recentBlockhash = blockhash;
  transferTransaction.feePayer = wallet.publicKey;
  const simulation = await withRpcRetry(() =>
    connection.simulateTransaction(transferTransaction, [wallet]),
  );
  console.log(`Transfer simulation result: ${JSON.stringify(simulation.value.err)}.`);
  if (simulation.value.err !== null) {
    throw new Error("Token transfer simulation failed.");
  }

  const transferSignature = await withRpcRetry(() =>
    transfer(
      connection,
      wallet,
      sourceTokenAccount,
      destinationAccount.address,
      wallet,
      amount,
      [],
      { commitment: "confirmed" },
      TOKEN_PROGRAM_ID,
    ),
  );
  console.log(`Transfer transaction: ${transactionExplorerLink(transferSignature)}`);

  console.log("Step 5: Check both token balances and save public results.");
  const [sourceInfo, destinationInfo] = await Promise.all([
    withRpcRetry(() => getAccount(connection, sourceTokenAccount)),
    withRpcRetry(() => getAccount(connection, destinationAccount.address)),
  ]);
  console.log(`My balance in base units: ${sourceInfo.amount.toString()}`);
  console.log(
    `Recipient balance in base units: ${destinationInfo.amount.toString()}`,
  );

  mkdirSync("results", { recursive: true });
  writeFileSync(
    "results/transfer.json",
    `${JSON.stringify(
      {
        mintAddress: mintAddress.toBase58(),
        ownerTokenAccount: sourceTokenAccount.toBase58(),
        recipientAddress: recipient.toBase58(),
        recipientTokenAccount: destinationAccount.address.toBase58(),
        amount: amount.toString(),
        signatures: {
          recipientTokenAccountCreation: accountCreationSignature,
          transfer: transferSignature,
        },
      },
      null,
      2,
    )}\n`,
  );
  console.log("Public results saved to results/transfer.json.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "The transfer script failed.");
  process.exitCode = 1;
});
