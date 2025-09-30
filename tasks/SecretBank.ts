import { task } from "hardhat/config";

task("secretbank:submit", "Submit a new encrypted secret")
  .addParam("text", "Plaintext string to encrypt")
  .addOptionalParam("addr", "EVM address used to encrypt the string (defaults to signer)")
  .addOptionalParam("publicat", "UNIX timestamp when the data becomes public", undefined, undefined, true)
  .setAction(async (args, hre) => {
    const { text } = args as { text: string };
    const publicAt: number | undefined = args.publicat ? Number(args.publicat) : undefined;
    const [signer] = await hre.ethers.getSigners();

    const dep = await hre.deployments.get("SecretBank");
    const contract = await hre.ethers.getContractAt("SecretBank", dep.address);

    const encryptAddr = args.addr ? (args.addr as string) : signer.address;

    const buffer = hre.fhevm.createEncryptedInput(dep.address, signer.address);
    buffer.addAddress(encryptAddr);
    const bytes = new TextEncoder().encode(text);
    for (const b of bytes) buffer.add8(b);
    const encrypted = await buffer.encrypt();

    const handles = encrypted.handles;
    const addrHandle = handles[0];
    const byteHandles = handles.slice(1);

    const pubAt = publicAt ?? Math.floor(Date.now() / 1000) + 30; // default +30s

    const tx = await contract
      .connect(signer)
      .submitSecret(addrHandle, byteHandles, encrypted.inputProof, pubAt);
    const receipt = await tx.wait();

    console.log("Submitted. Tx:", receipt?.hash);
  });

task("secretbank:makePublic", "Mark a record publicly decryptable")
  .addParam("id", "Record id")
  .setAction(async (args, hre) => {
    const id = Number(args.id);
    const dep = await hre.deployments.get("SecretBank");
    const contract = await hre.ethers.getContractAt("SecretBank", dep.address);
    const [signer] = await hre.ethers.getSigners();
    const tx = await contract.connect(signer).makePublic(id);
    console.log("makePublic tx:", (await tx.wait())?.hash);
  });

task("secretbank:reqDecrypt", "Request on-chain oracle decryption")
  .addParam("id", "Record id")
  .setAction(async (args, hre) => {
    const id = Number(args.id);
    const dep = await hre.deployments.get("SecretBank");
    const contract = await hre.ethers.getContractAt("SecretBank", dep.address);
    const [signer] = await hre.ethers.getSigners();
    const tx = await contract.connect(signer).requestDecryption(id);
    console.log("requestDecryption tx:", (await tx.wait())?.hash);
  });
