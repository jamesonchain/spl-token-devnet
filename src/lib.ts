import "dotenv/config";

import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";

const DEVNET_GENESIS_HASH = "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG";
const MINIMUM_BALANCE_LAMPORTS = 100_000_000;

export function getConnection(): Connection {
  const rpcUrl = process.env.RPC_URL ?? "https://api.devnet.solana.com";
  return new Connection(rpcUrl, "confirmed");
}

export function loadWallet(): Keypair {
  const configuredPath = process.env.KEYPAIR_PATH ?? "~/.config/solana/id.json";
  const expandedPath = configuredPath.startsWith("~/")
    ? resolve(homedir(), configuredPath.slice(2))
    : resolve(configuredPath);
  const parsed: unknown = JSON.parse(readFileSync(expandedPath, "utf8"));

  if (
    !Array.isArray(parsed) ||
    parsed.length !== 64 ||
    !parsed.every(
      (value: unknown) =>
        typeof value === "number" &&
        Number.isInteger(value) &&
        value >= 0 &&
        value <= 255,
    )
  ) {
    throw new Error("The wallet file must contain a 64 number keypair array.");
  }

  return Keypair.fromSecretKey(Uint8Array.from(parsed as number[]));
}

function isRateLimitError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const message =
    "message" in error && typeof error.message === "string"
      ? error.message.toLowerCase()
      : "";
  const status =
    "status" in error && typeof error.status === "number" ? error.status : 0;

  return (
    status === 429 ||
    message.includes("429") ||
    message.includes("rate limit") ||
    message.includes("too many requests")
  );
}

export async function withRpcRetry<T>(
  operation: () => Promise<T>,
): Promise<T> {
  try {
    return await operation();
  } catch (error: unknown) {
    if (!isRateLimitError(error)) {
      throw error;
    }

    await new Promise<void>((resolveDelay) => setTimeout(resolveDelay, 2_000));
    return operation();
  }
}

export async function checkDevnetAndBalance(
  connection: Connection,
  wallet: Keypair,
): Promise<boolean> {
  const genesisHash = await withRpcRetry(() => connection.getGenesisHash());
  if (genesisHash !== DEVNET_GENESIS_HASH) {
    throw new Error("The RPC endpoint is not Solana devnet.");
  }

  const balance = await withRpcRetry(() =>
    connection.getBalance(wallet.publicKey),
  );
  if (balance < MINIMUM_BALANCE_LAMPORTS) {
    console.log("The wallet has less than 0.1 SOL on devnet.");
    console.log("Get devnet SOL with solana airdrop 1 or at faucet.solana.com.");
    return false;
  }

  console.log(`Wallet balance: ${(balance / 1_000_000_000).toFixed(4)} SOL.`);
  return true;
}

export function addressExplorerLink(address: PublicKey | string): string {
  return `https://explorer.solana.com/address/${address.toString()}?cluster=devnet`;
}

export function transactionExplorerLink(signature: string): string {
  return `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
}

export function getRecipientPublicKey(): PublicKey {
  const configuredRecipient = process.env.RECIPIENT;
  if (configuredRecipient) {
    return new PublicKey(configuredRecipient);
  }

  const temporaryRecipient = Keypair.generate();
  console.log(
    `Temporary recipient address: ${addressExplorerLink(temporaryRecipient.publicKey)}`,
  );
  console.log("This address is not saved and cannot be recovered after this run.");
  return temporaryRecipient.publicKey;
}
