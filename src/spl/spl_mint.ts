import {
  fetchMint,
  findAssociatedTokenPda,
  getCreateAssociatedTokenIdempotentInstruction,
  getMintToCheckedInstruction,
  TOKEN_PROGRAM_ADDRESS,
} from "@solana-program/token";
import { address, createSolanaRpc } from "@solana/kit";
import {
  DEVNET_RPC_URL,
  explorerAddress,
  explorerTransaction,
  loadPayer,
  parseTokenAmount,
  requiredAddress,
  requiredText,
  sendInstructions,
} from "./common";

const MINT_ADDRESS = "C92dxhpvkuuQcyjtq1T4uymbGRVM1HLENrv8hP3NftCT";
const TOKEN_SUPPLY = "1000";

async function main(): Promise<void> {
  console.log("Step 1: Load the payer and verify the mint supply setting.");
  const payer = await loadPayer();
  const mintAddress = requiredAddress(MINT_ADDRESS, "MINT_ADDRESS");
  const supply = requiredText(
    TOKEN_SUPPLY,
    "YOUR_TOKEN_SUPPLY",
    "TOKEN_SUPPLY",
  );
  const mint = await fetchMint(createSolanaRpc(DEVNET_RPC_URL), mintAddress);
  const amount = parseTokenAmount(supply, mint.data.decimals);
  if (amount <= 0n) {
    throw new Error("Token supply must be greater than zero.");
  }

  console.log("Step 2: Create the sender associated token account if needed.");
  const [senderTokenAccount] = await findAssociatedTokenPda({
    owner: payer.address,
    tokenProgram: address(TOKEN_PROGRAM_ADDRESS),
    mint: mintAddress,
  });
  const createAta = getCreateAssociatedTokenIdempotentInstruction({
    payer,
    ata: senderTokenAccount,
    owner: payer.address,
    mint: mintAddress,
  });
  const createAtaSignature = await sendInstructions(payer, [createAta]);
  console.log(`Sender wallet: ${payer.address}`);
  console.log(`Sender token account: ${senderTokenAccount}`);
  console.log(
    `Sender token account explorer: ${explorerAddress(senderTokenAccount)}`,
  );
  console.log(`Associated account transaction: ${createAtaSignature}`);
  console.log(`Transaction explorer: ${explorerTransaction(createAtaSignature)}`);

  console.log("Step 3: Mint the requested supply to the sender.");
  const mintInstruction = getMintToCheckedInstruction({
    mint: mintAddress,
    token: senderTokenAccount,
    mintAuthority: payer,
    amount,
    decimals: mint.data.decimals,
  });
  const mintSignature = await sendInstructions(payer, [mintInstruction]);
  console.log(`Mint address: ${mintAddress}`);
  console.log(`Mint explorer: ${explorerAddress(mintAddress)}`);
  console.log(`Supply minted: ${supply}`);
  console.log(`Mint transaction signature: ${mintSignature}`);
  console.log(`Transaction explorer: ${explorerTransaction(mintSignature)}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Token mint failed.");
  process.exitCode = 1;
});
