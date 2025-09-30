import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm, deployments } from "hardhat";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

describe("SecretBank", function () {
  let alice: HardhatEthersSigner;
  let contractAddr: string;

  beforeEach(async () => {
    await deployments.fixture(["SecretBank"]);
    const dep = await deployments.get("SecretBank");
    contractAddr = dep.address;
    [alice] = await ethers.getSigners();
  });

  it("stores and allows user decryption of bytes", async () => {
    const text = "hello";
    const buf = fhevm.createEncryptedInput(contractAddr, alice.address);
    buf.addAddress(alice.address);
    const bytes = new TextEncoder().encode(text);
    for (const b of bytes) buf.add8(b);
    const encrypted = await buf.encrypt();

    const contract = await ethers.getContractAt("SecretBank", contractAddr);
    const tx = await contract
      .connect(alice)
      .submitSecret(encrypted.handles[0], encrypted.handles.slice(1), encrypted.inputProof, Math.floor(Date.now() / 1000) + 2);
    const receipt = await tx.wait();
    expect(receipt?.status).to.eq(1);

    const id = 1; // first id
    const len = await contract.getLength(id);
    expect(len).to.eq(bytes.length);

    // Decrypt each byte via user decryption to verify content
    const out: number[] = [];
    for (let i = 0; i < bytes.length; i++) {
      const encByte = await contract.getByte(id, i);
      const clear = await fhevm.userDecryptEuint(
        FhevmType.euint8,
        encByte,
        contractAddr,
        alice,
      );
      out.push(Number(clear));
    }
    const decoded = new TextDecoder().decode(Uint8Array.from(out));
    expect(decoded).to.eq(text);
  });
});

