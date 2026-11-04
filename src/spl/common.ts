import { existsSync, readFileSync } from "node:fs";
import {
  address,
  appendTransactionMessageInstructions,
  assertIsTransactionWithBlockhashLifetime,
  createKeyPairSignerFromBytes,
  createSolanaRpc,
  createSolanaRpcSubscriptions,
  createTransactionMessage,
  getSignatureFromTransaction,
  pipe,
  sendAndConfirmTransactionFactory,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransactionMessageWithSigners,
  type Address,
  type Instruction,
  type KeyPairSigner,
} from "@solana/kit";

export const DEVNET_RPC_URL = "https://api.devnet.solana.com";
export const DEVNET_WS_URL = "wss://api.devnet.solana.com";
export const DEVNET_IRYS_URL = "https://devnet.irys.xyz/";
export const TOKEN_PROGRAM_ADDRESS =
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";

const rpc = createSolanaRpc(DEVNET_RPC_URL);
const rpcSubscriptions = createSolanaRpcSubscriptions(DEVNET_WS_URL);
const sendAndConfirm = sendAndConfirmTransactionFactory({
  rpc,
  rpcSubscriptions,
});

function isKeypairBytes(value: unknown): value is number[] {
  return (
    Array.isArray(value) &&
    value.length === 64 &&
    value.every(
      (byte: unknown) =>
        typeof byte === "number" &&
        Number.isInteger(byte) &&
        byte >= 0 &&
        byte <= 255,
    )
  );
}

export function loadSecretKeyBytes(): Uint8Array {
  if (!existsSync("./devnet-wallet.json")) {
    throw new Error(
      "Wallet file not found. Place your Solana keypair JSON at ./devnet-wallet.json.",
    );
  }

  const contents = readFileSync("./devnet-wallet.json", "utf8");
  const parsed: unknown = JSON.parse(contents);
  if (!isKeypairBytes(parsed)) {
    throw new Error(
      "devnet-wallet.json must contain a 64 number Solana keypair array.",
    );
  }
  return Uint8Array.from(parsed);
}

export async function loadPayer(): Promise<KeyPairSigner> {
  return createKeyPairSignerFromBytes(loadSecretKeyBytes());
}

export function requiredAddress(value: string, label: string): Address {
  if (value.startsWith("YOUR_")) {
    throw new Error(`Replace ${label} with the required wallet or mint address.`);
  }
  return address(value);
}

export function requiredText(
  value: string,
  placeholder: string,
  label: string,
): string {
  if (value === placeholder || value.length === 0) {
    throw new Error(`Replace ${label} with your chosen value.`);
  }
  return value;
}

export function validateMetadataFields(name: string, symbol: string): void {
  if (Buffer.byteLength(name, "utf8") > 32) {
    throw new Error("Token name must be 32 bytes or fewer.");
  }
  if (Buffer.byteLength(symbol, "utf8") > 10) {
    throw new Error("Token symbol must be 10 bytes or fewer.");
  }
}

export function parseTokenAmount(value: string, decimals: number): bigint {
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 255) {
    throw new Error("Token decimals must be an integer from 0 to 255.");
  }
  if (!/^\d+(\.\d+)?$/.test(value)) {
    throw new Error(`Enter a token amount as a decimal number, not ${value}.`);
  }

  const [wholeText, fractionText = ""] = value.split(".");
  if (fractionText.length > decimals) {
    throw new Error(`The amount has more than ${decimals} decimal places.`);
  }

  const scale = 10n ** BigInt(decimals);
  const fraction = BigInt(fractionText.padEnd(decimals, "0") || "0");
  return BigInt(wholeText) * scale + fraction;
}

export async function sendInstructions(
  payer: KeyPairSigner,
  instructions: Instruction[],
): Promise<string> {
  const latestBlockhash = await rpc.getLatestBlockhash().send();
  const blockhashLifetime = latestBlockhash.value;
  const message = pipe(
    createTransactionMessage({ version: 0 }),
    (transactionMessage) =>
      setTransactionMessageFeePayerSigner(payer, transactionMessage),
    (transactionMessage) =>
      setTransactionMessageLifetimeUsingBlockhash(
        blockhashLifetime,
        transactionMessage,
      ),
    (transactionMessage) =>
      appendTransactionMessageInstructions(instructions, transactionMessage),
  );
  const signedTransaction = await signTransactionMessageWithSigners(message);
  assertIsTransactionWithBlockhashLifetime(signedTransaction);
  const signature = getSignatureFromTransaction(signedTransaction);
  const transactionForConfirmation = {
    ...signedTransaction,
    lifetimeConstraint: {
      lastValidBlockHeight:
        signedTransaction.lifetimeConstraint.lastValidBlockHeight,
    },
  };
  await sendAndConfirm(transactionForConfirmation, {
    commitment: "confirmed",
  });
  return signature;
}

export function explorerAddress(addressValue: string): string {
  return `https://explorer.solana.com/address/${addressValue}?cluster=devnet`;
}

export function explorerTransaction(signature: string): string {
  return `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
}
