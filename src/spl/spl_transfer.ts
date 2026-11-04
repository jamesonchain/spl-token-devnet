import {
  fetchMint,
  findAssociatedTokenPda,
  getCreateAssociatedTokenIdempotentInstruction,
  getTransferCheckedInstruction,
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
const RECIPIENT_WALLET = "DFk6RF1W5j5HnjHPvcj5EWBZ2vu2d2fB4thRh7T28KG";
const TRANSFER_AMOUNT = "100";

async function main(): Promise<void> {
  console.log("Step 1: Load the sender and validate the transfer settings.");
  const payer = await loadPayer();
  const mintAddress = requiredAddress(MINT_ADDRESS, "MINT_ADDRESS");
  const recipient = requiredAddress(
    RECIPIENT_WALLET,
    "RECIPIENT_WALLET",
  );
  if (recipient === payer.address) {
    throw new Error("Recipient wallet must differ from the sender wallet.");
  }
  const amountText = requiredText(
    TRANSFER_AMOUNT,
    "YOUR_TRANSFER_AMOUNT",
    "TRANSFER_AMOUNT",
  );
  const mint = await fetchMint(createSolanaRpc(DEVNET_RPC_URL), mintAddress);
  const amount = parseTokenAmount(amountText, mint.data.decimals);
  if (amount <= 0n) {
    throw new Error("Transfer amount must be greater than zero.");
  }

  console.log("Step 2: Derive the sender and recipient token accounts.");
  const [senderTokenAccount] = await findAssociatedTokenPda({
    owner: payer.address,
    tokenProgram: address(TOKEN_PROGRAM_ADDRESS),
    mint: mintAddress,
  });
  const [recipientTokenAccount] = await findAssociatedTokenPda({
    owner: recipient,
    tokenProgram: address(TOKEN_PROGRAM_ADDRESS),
    mint: mintAddress,
  });
  console.log(`Mint address: ${mintAddress}`);
  console.log(`Sender token account: ${senderTokenAccount}`);
  console.log(`Recipient wallet: ${recipient}`);
  console.log(`Recipient token account: ${recipientTokenAccount}`);

  console.log("Step 3: Create the recipient token account if needed and transfer.");
  const createRecipientAta = getCreateAssociatedTokenIdempotentInstruction({
    payer,
    ata: recipientTokenAccount,
    owner: recipient,
    mint: mintAddress,
  });
  const transferInstruction = getTransferCheckedInstruction({
    source: senderTokenAccount,
    mint: mintAddress,
    destination: recipientTokenAccount,
    authority: payer,
    amount,
    decimals: mint.data.decimals,
  });
  const signature = await sendInstructions(payer, [
    createRecipientAta,
    transferInstruction,
  ]);

  console.log(`Mint explorer: ${explorerAddress(mintAddress)}`);
  console.log(`Sender account explorer: ${explorerAddress(senderTokenAccount)}`);
  console.log(
    `Recipient account explorer: ${explorerAddress(recipientTokenAccount)}`,
  );
  console.log(`Transfer amount: ${amountText}`);
  console.log(`Transfer transaction signature: ${signature}`);
  console.log(`Transaction explorer: ${explorerTransaction(signature)}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Token transfer failed.");
  process.exitCode = 1;
});
