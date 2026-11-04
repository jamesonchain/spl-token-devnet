import { getMint } from "@solana/spl-token";
import {
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import {
  addressExplorerLink,
  checkDevnetAndBalance,
  getConnection,
  loadWallet,
  transactionExplorerLink,
  withRpcRetry,
} from "./lib.js";

const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s",
);
const TOKEN_NAME = "James token";

interface MintResult {
  mintAddress: string;
}

function isMintResult(value: unknown): value is MintResult {
  return (
    typeof value === "object" &&
    value !== null &&
    "mintAddress" in value &&
    typeof value.mintAddress === "string"
  );
}

function encodeMetadataData(name: string): Buffer {
  const nameBytes = Buffer.from(name, "utf8");
  const symbolBytes = Buffer.alloc(0);
  const uriBytes = Buffer.alloc(0);
  const data = Buffer.alloc(
    1 +
      4 +
      nameBytes.length +
      4 +
      symbolBytes.length +
      4 +
      uriBytes.length +
      2 +
      1 +
      1 +
      1 +
      1 +
      1,
  );
  let offset = 0;

  data.writeUInt8(33, offset);
  offset += 1;
  data.writeUInt32LE(nameBytes.length, offset);
  offset += 4;
  nameBytes.copy(data, offset);
  offset += nameBytes.length;
  data.writeUInt32LE(symbolBytes.length, offset);
  offset += 4;
  symbolBytes.copy(data, offset);
  offset += symbolBytes.length;
  data.writeUInt32LE(uriBytes.length, offset);
  offset += 4;
  uriBytes.copy(data, offset);
  offset += uriBytes.length;
  data.writeUInt16LE(0, offset);
  offset += 2;
  data.writeUInt8(0, offset);
  offset += 1;
  data.writeUInt8(0, offset);
  offset += 1;
  data.writeUInt8(0, offset);
  offset += 1;
  data.writeUInt8(1, offset);
  offset += 1;
  data.writeUInt8(0, offset);

  return data;
}

function readMintAddress(): PublicKey {
  if (!existsSync("results/mint.json")) {
    throw new Error("Run pnpm mint before setting token metadata.");
  }
  const result: unknown = JSON.parse(readFileSync("results/mint.json", "utf8"));
  if (!isMintResult(result)) {
    throw new Error("results/mint.json has an invalid format.");
  }
  return new PublicKey(result.mintAddress);
}

async function main(): Promise<void> {
  console.log("Step 1: Check the devnet connection and wallet balance.");
  const connection = getConnection();
  const wallet = loadWallet();
  console.log(`My wallet: ${addressExplorerLink(wallet.publicKey)}`);
  if (!(await checkDevnetAndBalance(connection, wallet))) {
    return;
  }

  console.log("Step 2: Check the mint authority and metadata account.");
  const mint = readMintAddress();
  const mintInfo = await withRpcRetry(() => getMint(connection, mint));
  if (!mintInfo.mintAuthority?.equals(wallet.publicKey)) {
    throw new Error("The configured wallet is not this mint's authority.");
  }

  const [metadataAddress] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("metadata"),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
    ],
    TOKEN_METADATA_PROGRAM_ID,
  );
  const existingMetadata = await withRpcRetry(() =>
    connection.getAccountInfo(metadataAddress),
  );
  if (existingMetadata !== null) {
    throw new Error(
      "This mint already has metadata. This script only creates metadata for a mint without it.",
    );
  }

  console.log("Step 3: Simulate adding the token name.");
  const instruction = new TransactionInstruction({
    programId: TOKEN_METADATA_PROGRAM_ID,
    keys: [
      { pubkey: metadataAddress, isSigner: false, isWritable: true },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: wallet.publicKey, isSigner: true, isWritable: false },
      { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
      { pubkey: wallet.publicKey, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: encodeMetadataData(TOKEN_NAME),
  });
  const transaction = new Transaction().add(instruction);
  const latestBlockhash = await withRpcRetry(() =>
    connection.getLatestBlockhash("confirmed"),
  );
  transaction.recentBlockhash = latestBlockhash.blockhash;
  transaction.feePayer = wallet.publicKey;

  const simulation = await withRpcRetry(() =>
    connection.simulateTransaction(transaction, [wallet]),
  );
  console.log(`Metadata simulation result: ${JSON.stringify(simulation.value.err)}.`);
  if (simulation.value.err !== null) {
    throw new Error("Metadata transaction simulation failed.");
  }
  if (process.argv.includes("--simulate-only")) {
    console.log("Simulation only. No transaction was sent.");
    return;
  }

  console.log("Step 4: Add the metadata on devnet.");
  transaction.sign(wallet);
  const rawTransaction = transaction.serialize();
  const signature = await withRpcRetry(() =>
    connection.sendRawTransaction(rawTransaction, {
      preflightCommitment: "confirmed",
    }),
  );
  const confirmation = await withRpcRetry(() =>
    connection.confirmTransaction(
      { signature, ...latestBlockhash },
      "confirmed",
    ),
  );
  if (confirmation.value.err !== null) {
    throw new Error("The metadata transaction failed to confirm.");
  }

  console.log(`Mint address: ${addressExplorerLink(mint)}`);
  console.log(`Metadata account: ${addressExplorerLink(metadataAddress)}`);
  console.log(`Metadata transaction: ${transactionExplorerLink(signature)}`);
  console.log(`Token name: ${TOKEN_NAME}`);

  console.log("Step 5: Save public metadata results.");
  mkdirSync("results", { recursive: true });
  writeFileSync(
    "results/metadata.json",
    `${JSON.stringify(
      {
        mintAddress: mint.toBase58(),
        metadataAddress: metadataAddress.toBase58(),
        name: TOKEN_NAME,
        signature,
      },
      null,
      2,
    )}\n`,
  );
  console.log("Public results saved to results/metadata.json.");
}

main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : "The metadata script failed.",
  );
  process.exitCode = 1;
});
