import { getAccount, getMint } from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import { existsSync, readFileSync } from "node:fs";
import {
  addressExplorerLink,
  checkDevnet,
  formatTokenAmount,
  getConnection,
  loadWallet,
  withRpcRetry,
} from "./lib.js";

interface MintResult {
  mintAddress: string;
  ownerTokenAccount: string;
}

interface TransferResult {
  recipientAddress: string;
  recipientTokenAccount: string;
}

function readResultFile<T extends object>(
  filePath: string,
  fields: (value: Record<string, unknown>) => value is Record<string, unknown> & T,
): T {
  if (!existsSync(filePath)) {
    throw new Error(`Missing ${filePath}. Run the earlier scripts first.`);
  }
  const result: unknown = JSON.parse(readFileSync(filePath, "utf8"));
  if (!isRecord(result) || !fields(result)) {
    throw new Error(`${filePath} has an invalid format.`);
  }
  return result;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isMintResult(
  value: Record<string, unknown>,
): value is Record<string, unknown> & MintResult {
  return (
    typeof value.mintAddress === "string" &&
    typeof value.ownerTokenAccount === "string"
  );
}

function isTransferResult(
  value: Record<string, unknown>,
): value is Record<string, unknown> & TransferResult {
  return (
    typeof value.recipientAddress === "string" &&
    typeof value.recipientTokenAccount === "string"
  );
}

async function main(): Promise<void> {
  console.log("Step 1: Check the devnet connection.");
  const connection = getConnection();
  const wallet = loadWallet();
  await checkDevnet(connection);
  console.log(`My wallet: ${addressExplorerLink(wallet.publicKey)}`);

  console.log("Step 2: Read the saved public addresses.");
  const mintResult = readResultFile<MintResult>(
    "results/mint.json",
    isMintResult,
  );
  const transferResult = readResultFile<TransferResult>(
    "results/transfer.json",
    isTransferResult,
  );
  const mintAddress = new PublicKey(mintResult.mintAddress);
  const ownerTokenAccount = new PublicKey(mintResult.ownerTokenAccount);
  const recipientTokenAccount = new PublicKey(
    transferResult.recipientTokenAccount,
  );

  console.log("Step 3: Read the supply and both token balances.");
  const [mintInfo, ownerInfo, recipientInfo] = await Promise.all([
    withRpcRetry(() => getMint(connection, mintAddress)),
    withRpcRetry(() => getAccount(connection, ownerTokenAccount)),
    withRpcRetry(() => getAccount(connection, recipientTokenAccount)),
  ]);
  console.log(`Mint address: ${addressExplorerLink(mintAddress)}`);
  console.log(
    `Supply: ${formatTokenAmount(mintInfo.supply, mintInfo.decimals)} tokens (${mintInfo.supply.toString()} base units).`,
  );
  console.log(`My token account: ${addressExplorerLink(ownerTokenAccount)}`);
  console.log(
    `My balance: ${formatTokenAmount(ownerInfo.amount, mintInfo.decimals)} tokens (${ownerInfo.amount.toString()} base units).`,
  );
  console.log(
    `Recipient: ${addressExplorerLink(transferResult.recipientAddress)}`,
  );
  console.log(
    `Recipient token account: ${addressExplorerLink(recipientTokenAccount)}`,
  );
  console.log(
    `Recipient balance: ${formatTokenAmount(recipientInfo.amount, mintInfo.decimals)} tokens (${recipientInfo.amount.toString()} base units).`,
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "The check script failed.");
  process.exitCode = 1;
});
