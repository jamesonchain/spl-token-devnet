import {
  createMetadataAccountV3,
  findMetadataPda,
  mplTokenMetadata,
} from "@metaplex-foundation/mpl-token-metadata";
import {
  keypairIdentity,
  publicKey as umiPublicKey,
} from "@metaplex-foundation/umi";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import bs58 from "bs58";
import {
  DEVNET_RPC_URL,
  explorerAddress,
  explorerTransaction,
  loadSecretKeyBytes,
  requiredAddress,
  requiredText,
  validateMetadataFields,
} from "./common";

const MINT_ADDRESS = "C92dxhpvkuuQcyjtq1T4uymbGRVM1HLENrv8hP3NftCT";
const TOKEN_NAME = "james token";
const TOKEN_SYMBOL = "$j";
const METADATA_URI = "https://gateway.irys.xyz/4qCQ8dXjQx6ouhvGpKDZFu2rGE232xJCHWPEKpMFN5Ma";

async function main(): Promise<void> {
  console.log("Step 1: Check the mint and metadata settings.");
  const mintAddress = requiredAddress(MINT_ADDRESS, "MINT_ADDRESS");
  const name = requiredText(TOKEN_NAME, "YOUR_TOKEN_NAME", "TOKEN_NAME");
  const symbol = requiredText(
    TOKEN_SYMBOL,
    "YOUR_TOKEN_SYMBOL",
    "TOKEN_SYMBOL",
  );
  const uri = requiredText(
    METADATA_URI,
    "YOUR_METADATA_URI",
    "METADATA_URI",
  );
  validateMetadataFields(name, symbol);
  if (Buffer.byteLength(uri, "utf8") > 200) {
    throw new Error("Metadata URI must be 200 bytes or fewer.");
  }

  console.log("Step 2: Connect the wallet to Metaplex on devnet.");
  const umi = createUmi(DEVNET_RPC_URL);
  const umiKeypair = umi.eddsa.createKeypairFromSecretKey(
    loadSecretKeyBytes(),
  );
  umi.use(keypairIdentity(umiKeypair));
  umi.use(mplTokenMetadata());

  console.log("Step 3: Attach the token name, symbol, and URI.");
  const mint = umiPublicKey(mintAddress);
  const metadataAddress = findMetadataPda(umi, { mint });
  const result = await createMetadataAccountV3(umi, {
    metadata: metadataAddress,
    mint,
    mintAuthority: umi.identity,
    payer: umi.payer,
    updateAuthority: umi.identity,
    data: {
      name,
      symbol,
      uri,
      sellerFeeBasisPoints: 0,
      creators: null,
      collection: null,
      uses: null,
    },
    isMutable: true,
    collectionDetails: null,
  }).sendAndConfirm(umi);
  const signature = bs58.encode(result.signature);
  const metadataAddressText = metadataAddress.toString();

  console.log(`Mint address: ${mintAddress}`);
  console.log(`Mint explorer: ${explorerAddress(mintAddress)}`);
  console.log(`Metadata account: ${metadataAddressText}`);
  console.log(`Metadata explorer: ${explorerAddress(metadataAddressText)}`);
  console.log(`Metadata URI: ${uri}`);
  console.log(`Metadata transaction signature: ${signature}`);
  console.log(`Transaction explorer: ${explorerTransaction(signature)}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Metadata setup failed.");
  process.exitCode = 1;
});
