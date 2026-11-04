import { keypairIdentity } from "@metaplex-foundation/umi";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { irysUploader } from "@metaplex-foundation/umi-uploader-irys";
import {
  DEVNET_IRYS_URL,
  DEVNET_RPC_URL,
  loadSecretKeyBytes,
  requiredText,
  validateMetadataFields,
} from "./common";

const TOKEN_NAME = "james token";
const TOKEN_SYMBOL = "$j";
const TOKEN_DESCRIPTION = "This is a test token for the Solana Program Library (SPL) tutorial.";
const OPTIONAL_IMAGE_URI = "";

async function main(): Promise<void> {
  console.log("Step 1: Prepare the public token metadata.");
  const name = requiredText(TOKEN_NAME, "YOUR_TOKEN_NAME", "TOKEN_NAME");
  const symbol = requiredText(
    TOKEN_SYMBOL,
    "YOUR_TOKEN_SYMBOL",
    "TOKEN_SYMBOL",
  );
  const description = requiredText(
    TOKEN_DESCRIPTION,
    "YOUR_TOKEN_DESCRIPTION",
    "TOKEN_DESCRIPTION",
  );
  validateMetadataFields(name, symbol);
  const metadata = {
    name,
    symbol,
    description,
    ...(OPTIONAL_IMAGE_URI.length > 0 ? { image: OPTIONAL_IMAGE_URI } : {}),
    attributes: [],
  };
  console.log(JSON.stringify(metadata, null, 2));

  console.log("Step 2: Upload the JSON to devnet Irys.");
  const umi = createUmi(DEVNET_RPC_URL);
  const umiKeypair = umi.eddsa.createKeypairFromSecretKey(
    loadSecretKeyBytes(),
  );
  umi.use(keypairIdentity(umiKeypair));
  umi.use(irysUploader({ address: DEVNET_IRYS_URL }));

  const uri = await umi.uploader.uploadJson(metadata);
  console.log(`Metadata URI: ${uri}`);
  console.log("Copy this URI into METADATA_URI in spl_metadata.ts.");
}

main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : "Metadata upload failed.",
  );
  process.exitCode = 1;
});
