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

describe("SecretBank", function () {
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

  describe("Deployment", function () {
    it("Should set the correct owner", async function () {
      expect(await secretBankContract.owner()).to.equal(signers.deployer.address);
    });

    it("Should initialize with zero secrets", async function () {
      expect(await secretBankContract.getTotalSecrets()).to.equal(0);
      expect(await secretBankContract.nextSecretId()).to.equal(0);
    });
  });

  describe("Deposit Secret", function () {
    it("Should allow users to deposit secrets with encrypted addresses", async function () {
      const currentTime = await time.latest();
      const revealTime = currentTime + 3600; // 1 hour from now
      const encryptedString = "encrypted_secret_content_123";

      // Create encrypted address input
      const input = fhevm.createEncryptedInput(secretBankContractAddress, signers.alice.address);
      input.addAddress(signers.bob.address);
      const encryptedInput = await input.encrypt();

      // Deposit secret
      await expect(
        secretBankContract.connect(signers.alice).depositSecret(
          encryptedString,
          encryptedInput.handles[0],
          revealTime,
          encryptedInput.inputProof
        )
      ).to.emit(secretBankContract, "SecretDeposited")
        .withArgs(0, signers.alice.address, revealTime);

      // Verify the secret was stored
      expect(await secretBankContract.getTotalSecrets()).to.equal(1);

      const secret = await secretBankContract.getSecret(0);
      expect(secret.encryptedString).to.equal(encryptedString);
      expect(secret.revealTime).to.equal(revealTime);
      expect(secret.depositor).to.equal(signers.alice.address);
      expect(secret.isRevealed).to.equal(false);
    });

    it("Should fail when reveal time is in the past", async function () {
      const currentTime = await time.latest();
      const pastTime = currentTime - 3600; // 1 hour ago
      const encryptedString = "encrypted_secret_content_123";

      const input = fhevm.createEncryptedInput(secretBankContractAddress, signers.alice.address);
      input.addAddress(signers.bob.address);
      const encryptedInput = await input.encrypt();

      await expect(
        secretBankContract.connect(signers.alice).depositSecret(
          encryptedString,
          encryptedInput.handles[0],
          pastTime,
          encryptedInput.inputProof
        )
      ).to.be.revertedWith("Reveal time must be in the future");
    });

    it("Should fail when encrypted string is empty", async function () {
      const currentTime = await time.latest();
      const revealTime = currentTime + 3600;

      const input = fhevm.createEncryptedInput(secretBankContractAddress, signers.alice.address);
      input.addAddress(signers.bob.address);
      const encryptedInput = await input.encrypt();

      await expect(
        secretBankContract.connect(signers.alice).depositSecret(
          "",
          encryptedInput.handles[0],
          revealTime,
          encryptedInput.inputProof
        )
      ).to.be.revertedWith("Encrypted string cannot be empty");
    });

    it("Should track user secrets correctly", async function () {
      const currentTime = await time.latest();
      const revealTime = currentTime + 3600;
      const encryptedString = "encrypted_secret_content_123";

      const input = fhevm.createEncryptedInput(secretBankContractAddress, signers.alice.address);
      input.addAddress(signers.bob.address);
      const encryptedInput = await input.encrypt();

      // Deposit first secret
      await secretBankContract.connect(signers.alice).depositSecret(
        encryptedString,
        encryptedInput.handles[0],
        revealTime,
        encryptedInput.inputProof
      );

      // Deposit second secret
      const input2 = fhevm.createEncryptedInput(secretBankContractAddress, signers.alice.address);
      input2.addAddress(signers.deployer.address);
      const encryptedInput2 = await input2.encrypt();

      await secretBankContract.connect(signers.alice).depositSecret(
        "second_secret",
        encryptedInput2.handles[0],
        revealTime + 1800,
        encryptedInput2.inputProof
      );

      // Check user secrets
      const userSecrets = await secretBankContract.getUserSecrets(signers.alice.address);
      expect(userSecrets.length).to.equal(2);
      expect(userSecrets[0]).to.equal(0);
      expect(userSecrets[1]).to.equal(1);
    });
  });

  describe("Reveal Time Checking", function () {
    it("Should correctly identify when secrets can be revealed", async function () {
      const currentTime = await time.latest();
      const revealTime = currentTime + 3600;
      const encryptedString = "encrypted_secret_content_123";

      const input = fhevm.createEncryptedInput(secretBankContractAddress, signers.alice.address);
      input.addAddress(signers.bob.address);
      const encryptedInput = await input.encrypt();

      await secretBankContract.connect(signers.alice).depositSecret(
        encryptedString,
        encryptedInput.handles[0],
        revealTime,
        encryptedInput.inputProof
      );

      // Should not be revealable yet
      expect(await secretBankContract.canSecretBeRevealed(0)).to.equal(false);

      // Fast forward time
      await time.increaseTo(revealTime + 1);

      // Should now be revealable
      expect(await secretBankContract.canSecretBeRevealed(0)).to.equal(true);
    });
  });

  describe("Decryption Request", function () {
    beforeEach(async function () {
      const currentTime = await time.latest();
      const revealTime = currentTime + 3600;
      const encryptedString = "encrypted_secret_content_123";

      const input = fhevm.createEncryptedInput(secretBankContractAddress, signers.alice.address);
      input.addAddress(signers.bob.address);
      const encryptedInput = await input.encrypt();

      await secretBankContract.connect(signers.alice).depositSecret(
        encryptedString,
        encryptedInput.handles[0],
        revealTime,
        encryptedInput.inputProof
      );

      // Fast forward time to make it revealable
      await time.increaseTo(revealTime + 1);
    });

    it("Should allow owner to request decryption after reveal time", async function () {
      await expect(
        secretBankContract.connect(signers.deployer).requestDecryption(0)
      ).to.emit(secretBankContract, "DecryptionRequested");

      const status = await secretBankContract.getDecryptionStatus(0);
      expect(status.requested).to.equal(true);
      expect(status.pending).to.equal(true);
    });

    it("Should fail when non-owner tries to request decryption", async function () {
      await expect(
        secretBankContract.connect(signers.alice).requestDecryption(0)
      ).to.be.revertedWith("Only owner can call this function");
    });

    it("Should fail when reveal time has not been reached", async function () {
      const currentTime = await time.latest();
      const futureRevealTime = currentTime + 7200;
      const encryptedString = "future_secret";

      const input = fhevm.createEncryptedInput(secretBankContractAddress, signers.alice.address);
      input.addAddress(signers.bob.address);
      const encryptedInput = await input.encrypt();

      await secretBankContract.connect(signers.alice).depositSecret(
        encryptedString,
        encryptedInput.handles[0],
        futureRevealTime,
        encryptedInput.inputProof
      );

      await expect(
        secretBankContract.connect(signers.deployer).requestDecryption(1)
      ).to.be.revertedWith("Reveal time not reached");
    });

    it("Should fail when decryption is already requested", async function () {
      await secretBankContract.connect(signers.deployer).requestDecryption(0);

      await expect(
        secretBankContract.connect(signers.deployer).requestDecryption(0)
      ).to.be.revertedWith("Decryption already requested");
    });
  });

  describe("Access Control", function () {
    it("Should allow owner to transfer ownership", async function () {
      await secretBankContract.connect(signers.deployer).transferOwnership(signers.alice.address);
      expect(await secretBankContract.owner()).to.equal(signers.alice.address);
    });

    it("Should fail when non-owner tries to transfer ownership", async function () {
      await expect(
        secretBankContract.connect(signers.alice).transferOwnership(signers.bob.address)
      ).to.be.revertedWith("Only owner can call this function");
    });

    it("Should fail when transferring ownership to zero address", async function () {
      await expect(
        secretBankContract.connect(signers.deployer).transferOwnership(ethers.ZeroAddress)
      ).to.be.revertedWith("New owner cannot be zero address");
    });
  });

  describe("View Functions", function () {
    beforeEach(async function () {
      const currentTime = await time.latest();
      const revealTime = currentTime + 3600;
      const encryptedString = "encrypted_secret_content_123";

      const input = fhevm.createEncryptedInput(secretBankContractAddress, signers.alice.address);
      input.addAddress(signers.bob.address);
      const encryptedInput = await input.encrypt();

      await secretBankContract.connect(signers.alice).depositSecret(
        encryptedString,
        encryptedInput.handles[0],
        revealTime,
        encryptedInput.inputProof
      );
    });

    it("Should return correct secret information", async function () {
      const secret = await secretBankContract.getSecret(0);
      expect(secret.encryptedString).to.equal("encrypted_secret_content_123");
      expect(secret.depositor).to.equal(signers.alice.address);
      expect(secret.isRevealed).to.equal(false);
    });

    it("Should fail when accessing invalid secret ID", async function () {
      await expect(
        secretBankContract.getSecret(999)
      ).to.be.revertedWith("Invalid secret ID");
    });

    it("Should return empty array for users with no secrets", async function () {
      const userSecrets = await secretBankContract.getUserSecrets(signers.bob.address);
      expect(userSecrets.length).to.equal(0);
    });
  });
});