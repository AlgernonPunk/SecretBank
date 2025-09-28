import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { SecretBank, SecretBank__factory } from "../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";
import { time } from "@nomicfoundation/hardhat-network-helpers";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("SecretBank")) as SecretBank__factory;
  const secretBankContract = (await factory.deploy()) as SecretBank;
  const secretBankContractAddress = await secretBankContract.getAddress();

  return { secretBankContract, secretBankContractAddress };
}

describe("SecretBank - Sepolia Integration Tests", function () {
  let signers: Signers;
  let secretBankContract: SecretBank;
  let secretBankContractAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { deployer: ethSigners[0], alice: ethSigners[1], bob: ethSigners[2] };
  });

  beforeEach(async function () {
    const deployment = await deployFixture();
    secretBankContract = deployment.secretBankContract;
    secretBankContractAddress = deployment.secretBankContractAddress;
  });

  describe("Sepolia Network Integration", function () {
    it("Should deploy successfully on Sepolia", async function () {
      expect(await secretBankContract.owner()).to.equal(signers.deployer.address);
      expect(await secretBankContract.getTotalSecrets()).to.equal(0);
    });

    it("Should handle encrypted address inputs on Sepolia", async function () {
      const currentTime = await time.latest();
      const revealTime = currentTime + 7200; // 2 hours from now
      const encryptedString = "sepolia_test_secret_content";

      // Create encrypted input for Sepolia
      const input = fhevm.createEncryptedInput(secretBankContractAddress, signers.alice.address);
      input.addAddress(signers.bob.address);
      const encryptedInput = await input.encrypt();

      // Deposit secret on Sepolia
      const tx = await secretBankContract.connect(signers.alice).depositSecret(
        encryptedString,
        encryptedInput.handles[0],
        revealTime,
        encryptedInput.inputProof
      );

      await tx.wait();

      // Verify secret was stored
      const secret = await secretBankContract.getSecret(0);
      expect(secret.encryptedString).to.equal(encryptedString);
      expect(secret.depositor).to.equal(signers.alice.address);
      expect(secret.revealTime).to.equal(revealTime);
    });

    it("Should be able to decrypt encrypted addresses when authorized", async function () {
      const currentTime = await time.latest();
      const revealTime = currentTime + 100; // Short time for testing
      const encryptedString = "decryption_test_secret";

      // Create encrypted input
      const input = fhevm.createEncryptedInput(secretBankContractAddress, signers.alice.address);
      input.addAddress(signers.bob.address);
      const encryptedInput = await input.encrypt();

      // Deposit secret
      await secretBankContract.connect(signers.alice).depositSecret(
        encryptedString,
        encryptedInput.handles[0],
        revealTime,
        encryptedInput.inputProof
      );

      // Get the secret to verify encrypted address
      const secret = await secretBankContract.getSecret(0);

      // Verify that we can decrypt the encrypted address with proper permissions
      const decryptedAddress = await fhevm.userDecryptEaddress(
        FhevmType.eaddress,
        secret.encryptedAddress,
        secretBankContractAddress,
        signers.alice
      );

      expect(decryptedAddress).to.equal(signers.bob.address);
    });

    it("Should handle multiple secrets from different users", async function () {
      const currentTime = await time.latest();
      const revealTime = currentTime + 3600;

      // Alice deposits a secret
      const input1 = fhevm.createEncryptedInput(secretBankContractAddress, signers.alice.address);
      input1.addAddress(signers.bob.address);
      const encryptedInput1 = await input1.encrypt();

      await secretBankContract.connect(signers.alice).depositSecret(
        "alice_secret",
        encryptedInput1.handles[0],
        revealTime,
        encryptedInput1.inputProof
      );

      // Bob deposits a secret
      const input2 = fhevm.createEncryptedInput(secretBankContractAddress, signers.bob.address);
      input2.addAddress(signers.alice.address);
      const encryptedInput2 = await input2.encrypt();

      await secretBankContract.connect(signers.bob).depositSecret(
        "bob_secret",
        encryptedInput2.handles[0],
        revealTime + 1800,
        encryptedInput2.inputProof
      );

      // Verify both secrets exist
      expect(await secretBankContract.getTotalSecrets()).to.equal(2);

      const aliceSecrets = await secretBankContract.getUserSecrets(signers.alice.address);
      const bobSecrets = await secretBankContract.getUserSecrets(signers.bob.address);

      expect(aliceSecrets.length).to.equal(1);
      expect(bobSecrets.length).to.equal(1);
      expect(aliceSecrets[0]).to.equal(0);
      expect(bobSecrets[0]).to.equal(1);
    });

    it("Should maintain proper access control on Sepolia", async function () {
      const currentTime = await time.latest();
      const revealTime = currentTime + 3600;

      const input = fhevm.createEncryptedInput(secretBankContractAddress, signers.alice.address);
      input.addAddress(signers.bob.address);
      const encryptedInput = await input.encrypt();

      await secretBankContract.connect(signers.alice).depositSecret(
        "access_control_test",
        encryptedInput.handles[0],
        revealTime,
        encryptedInput.inputProof
      );

      // Fast forward time
      await time.increaseTo(revealTime + 1);

      // Only owner should be able to request decryption
      await expect(
        secretBankContract.connect(signers.alice).requestDecryption(0)
      ).to.be.revertedWith("Only owner can call this function");

      // Owner should be able to request decryption
      await expect(
        secretBankContract.connect(signers.deployer).requestDecryption(0)
      ).to.emit(secretBankContract, "DecryptionRequested");
    });

    it("Should handle edge cases for reveal times", async function () {
      const currentTime = await time.latest();

      // Test with reveal time exactly at current time + 1 second
      const minRevealTime = currentTime + 1;
      const input = fhevm.createEncryptedInput(secretBankContractAddress, signers.alice.address);
      input.addAddress(signers.bob.address);
      const encryptedInput = await input.encrypt();

      await secretBankContract.connect(signers.alice).depositSecret(
        "edge_case_secret",
        encryptedInput.handles[0],
        minRevealTime,
        encryptedInput.inputProof
      );

      // Should not be revealable yet
      expect(await secretBankContract.canSecretBeRevealed(0)).to.equal(false);

      // Fast forward to exactly the reveal time
      await time.increaseTo(minRevealTime);

      // Should now be revealable
      expect(await secretBankContract.canSecretBeRevealed(0)).to.equal(true);
    });

    it("Should handle gas estimation properly", async function () {
      const currentTime = await time.latest();
      const revealTime = currentTime + 3600;
      const encryptedString = "gas_estimation_test";

      const input = fhevm.createEncryptedInput(secretBankContractAddress, signers.alice.address);
      input.addAddress(signers.bob.address);
      const encryptedInput = await input.encrypt();

      // Estimate gas for depositSecret
      const gasEstimate = await secretBankContract.connect(signers.alice).depositSecret.estimateGas(
        encryptedString,
        encryptedInput.handles[0],
        revealTime,
        encryptedInput.inputProof
      );

      expect(gasEstimate).to.be.greaterThan(0);

      // Execute the transaction
      const tx = await secretBankContract.connect(signers.alice).depositSecret(
        encryptedString,
        encryptedInput.handles[0],
        revealTime,
        encryptedInput.inputProof,
        { gasLimit: gasEstimate.mul(120).div(100) } // 20% buffer
      );

      const receipt = await tx.wait();
      expect(receipt.status).to.equal(1);
    });
  });
});