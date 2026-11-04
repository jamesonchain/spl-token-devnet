import { getCreateAccountInstruction } from "@solana-program/system";
import {
  getInitializeMintInstruction,
  getMintSize,
  TOKEN_PROGRAM_ADDRESS,
} from "@solana-program/token";
import { createSolanaRpc, generateKeyPairSigner } from "@solana/kit";
import {
  DEVNET_RPC_URL,
  explorerAddress,
  explorerTransaction,
  loadPayer,
  sendInstructions,
} from "./common";

const TOKEN_DECIMALS = Number("10");

async function main(): Promise<void> {
  console.log("Step 1: Check the token decimal setting.");
  if (
    !Number.isInteger(TOKEN_DECIMALS) ||
    TOKEN_DECIMALS < 0 ||
    TOKEN_DECIMALS > 255
  ) {
    throw new Error(
      "Replace YOUR_TOKEN_DECIMALS with a whole number from 0 to 255.",
    );
  }

  console.log("Step 2: Load the payer and create a mint keypair.");
  const payer = await loadPayer();
  const mintSigner = await generateKeyPairSigner();
  const rpc = createSolanaRpc(DEVNET_RPC_URL);
  const rentLamports = await rpc
    .getMinimumBalanceForRentExemption(BigInt(getMintSize()))
    .send();

  console.log("Step 3: Create and initialize the SPL token mint on devnet.");
  const createMintAccount = getCreateAccountInstruction({
    payer,
    newAccount: mintSigner,
    lamports: rentLamports,
    space: BigInt(getMintSize()),
    programAddress: TOKEN_PROGRAM_ADDRESS,
  });
  const initializeMint = getInitializeMintInstruction({
    mint: mintSigner.address,
    decimals: TOKEN_DECIMALS,
    mintAuthority: payer.address,
    freezeAuthority: null,
  });
  const signature = await sendInstructions(payer, [
    createMintAccount,
    initializeMint,
  ]);

  console.log(`Mint address: ${mintSigner.address}`);
  console.log(`Mint explorer: ${explorerAddress(mintSigner.address)}`);
  console.log(`Initialization signature: ${signature}`);
  console.log(`Transaction explorer: ${explorerTransaction(signature)}`);
  console.log(
    "Copy the mint address into MINT_ADDRESS in spl_metadata.ts, spl_mint.ts, and spl_transfer.ts.",
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Mint setup failed.");
  process.exitCode = 1;
});
