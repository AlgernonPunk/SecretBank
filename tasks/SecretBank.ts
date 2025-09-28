import { FhevmType } from "@fhevm/hardhat-plugin";
import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

/**
 * Tutorial: Deploy and Interact Locally (--network localhost)
 * ===========================================================
 *
 * 1. From a separate terminal window:
 *
 *   npx hardhat node
 *
 * 2. Deploy the SecretBank contract
 *
 *   npx hardhat --network localhost deploy
 *
 * 3. Interact with the SecretBank contract
 *
 *   npx hardhat --network localhost secretbank:address
 *   npx hardhat --network localhost secretbank:deposit --secret "my_secret_content" --address "0x742d35Cc6634C0532925a3b8D56B0C62d8a5C1b2" --hours 24
 *   npx hardhat --network localhost secretbank:get-secret --id 0
 *   npx hardhat --network localhost secretbank:list-user-secrets
 *   npx hardhat --network localhost secretbank:request-decryption --id 0
 *
 *
 * Tutorial: Deploy and Interact on Sepolia (--network sepolia)
 * ===========================================================
 *
 * 1. Deploy the SecretBank contract
 *
 *   npx hardhat --network sepolia deploy
 *
 * 2. Interact with the SecretBank contract
 *
 *   npx hardhat --network sepolia secretbank:address
 *   npx hardhat --network sepolia secretbank:deposit --secret "my_secret_content" --address "0x742d35Cc6634C0532925a3b8D56B0C62d8a5C1b2" --hours 24
 *   npx hardhat --network sepolia secretbank:get-secret --id 0
 *   npx hardhat --network sepolia secretbank:list-user-secrets
 *   npx hardhat --network sepolia secretbank:request-decryption --id 0
 *
 */

/**
 * Example:
 *   - npx hardhat --network localhost secretbank:address
 *   - npx hardhat --network sepolia secretbank:address
 */
task("secretbank:address", "Prints the SecretBank contract address").setAction(async function (_taskArguments: TaskArguments, hre) {
  const { deployments } = hre;

  const secretBank = await deployments.get("SecretBank");
  console.log("SecretBank address is " + secretBank.address);
});

/**
 * Example:
 *   - npx hardhat --network localhost secretbank:deposit --secret "my_secret_data" --address "0x742d35Cc6634C0532925a3b8D56B0C62d8a5C1b2" --hours 24
 *   - npx hardhat --network sepolia secretbank:deposit --secret "my_secret_data" --address "0x742d35Cc6634C0532925a3b8D56B0C62d8a5C1b2" --hours 24
 */
task("secretbank:deposit", "Deposit a secret with encrypted address and reveal time")
  .addOptionalParam("contract", "Optionally specify the SecretBank contract address")
  .addParam("secret", "The secret string content to encrypt and store")
  .addParam("address", "The address to encrypt and associate with the secret")
  .addParam("hours", "Number of hours from now when the secret can be revealed")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;

    const secretContent = taskArguments.secret;
    const targetAddress = taskArguments.address;
    const hoursFromNow = parseInt(taskArguments.hours);

    if (!ethers.isAddress(targetAddress)) {
      throw new Error(`Invalid address: ${targetAddress}`);
    }

    if (!Number.isInteger(hoursFromNow) || hoursFromNow <= 0) {
      throw new Error(`Hours must be a positive integer`);
    }

    await fhevm.initializeCLIApi();

    const SecretBankDeployment = taskArguments.contract
      ? { address: taskArguments.contract }
      : await deployments.get("SecretBank");
    console.log(`SecretBank: ${SecretBankDeployment.address}`);

    const signers = await ethers.getSigners();
    const secretBankContract = await ethers.getContractAt("SecretBank", SecretBankDeployment.address);

    // Calculate reveal time
    const currentTime = Math.floor(Date.now() / 1000);
    const revealTime = currentTime + (hoursFromNow * 3600);

    console.log(`Current time: ${new Date(currentTime * 1000).toISOString()}`);
    console.log(`Reveal time: ${new Date(revealTime * 1000).toISOString()}`);

    // Encrypt the address
    const encryptedAddressInput = await fhevm
      .createEncryptedInput(SecretBankDeployment.address, signers[0].address)
      .addAddress(targetAddress)
      .encrypt();

    console.log(`Depositing secret from: ${signers[0].address}`);
    console.log(`Secret content: "${secretContent}"`);
    console.log(`Target address: ${targetAddress}`);
    console.log(`Reveal in ${hoursFromNow} hours`);

    const tx = await secretBankContract
      .connect(signers[0])
      .depositSecret(
        secretContent,
        encryptedAddressInput.handles[0],
        revealTime,
        encryptedAddressInput.inputProof
      );

    console.log(`Wait for tx: ${tx.hash}...`);
    const receipt = await tx.wait();
    console.log(`tx: ${tx.hash} status=${receipt?.status}`);

    if (receipt?.status === 1) {
      const totalSecrets = await secretBankContract.getTotalSecrets();
      const secretId = totalSecrets - 1n;
      console.log(`Secret deposited successfully! Secret ID: ${secretId}`);
    }
  });

/**
 * Example:
 *   - npx hardhat --network localhost secretbank:get-secret --id 0
 *   - npx hardhat --network sepolia secretbank:get-secret --id 0
 */
task("secretbank:get-secret", "Get information about a specific secret")
  .addOptionalParam("contract", "Optionally specify the SecretBank contract address")
  .addParam("id", "The secret ID to retrieve")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;

    const secretId = parseInt(taskArguments.id);
    if (!Number.isInteger(secretId) || secretId < 0) {
      throw new Error(`Secret ID must be a non-negative integer`);
    }

    await fhevm.initializeCLIApi();

    const SecretBankDeployment = taskArguments.contract
      ? { address: taskArguments.contract }
      : await deployments.get("SecretBank");
    console.log(`SecretBank: ${SecretBankDeployment.address}`);

    const signers = await ethers.getSigners();
    const secretBankContract = await ethers.getContractAt("SecretBank", SecretBankDeployment.address);

    try {
      const secret = await secretBankContract.getSecret(secretId);
      const decryptionStatus = await secretBankContract.getDecryptionStatus(secretId);
      const canBeRevealed = await secretBankContract.canSecretBeRevealed(secretId);

      console.log(`\n=== Secret ID: ${secretId} ===`);
      console.log(`Encrypted String: "${secret.encryptedString}"`);
      console.log(`Depositor: ${secret.depositor}`);
      console.log(`Reveal Time: ${new Date(Number(secret.revealTime) * 1000).toISOString()}`);
      console.log(`Is Revealed: ${secret.isRevealed}`);
      console.log(`Can Be Revealed Now: ${canBeRevealed}`);
      console.log(`Decryption Requested: ${decryptionStatus.requested}`);
      console.log(`Decryption Pending: ${decryptionStatus.pending}`);

      // Try to decrypt the encrypted address if user has access
      if (secret.encryptedAddress && secret.encryptedAddress !== ethers.ZeroHash) {
        try {
          const decryptedAddress = await fhevm.userDecryptEaddress(
            FhevmType.eaddress,
            secret.encryptedAddress,
            SecretBankDeployment.address,
            signers[0]
          );
          console.log(`Decrypted Address: ${decryptedAddress}`);
        } catch (error) {
          console.log(`Encrypted Address: ${secret.encryptedAddress} (access denied for decryption)`);
        }
      }

    } catch (error) {
      console.error(`Error retrieving secret: ${error}`);
    }
  });

/**
 * Example:
 *   - npx hardhat --network localhost secretbank:list-user-secrets
 *   - npx hardhat --network sepolia secretbank:list-user-secrets
 */
task("secretbank:list-user-secrets", "List all secrets for the current user")
  .addOptionalParam("contract", "Optionally specify the SecretBank contract address")
  .addOptionalParam("user", "Optionally specify user address (defaults to first signer)")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments } = hre;

    const SecretBankDeployment = taskArguments.contract
      ? { address: taskArguments.contract }
      : await deployments.get("SecretBank");
    console.log(`SecretBank: ${SecretBankDeployment.address}`);

    const signers = await ethers.getSigners();
    const userAddress = taskArguments.user || signers[0].address;
    const secretBankContract = await ethers.getContractAt("SecretBank", SecretBankDeployment.address);

    console.log(`\nSecrets for user: ${userAddress}`);

    try {
      const userSecrets = await secretBankContract.getUserSecrets(userAddress);

      if (userSecrets.length === 0) {
        console.log("No secrets found for this user.");
        return;
      }

      console.log(`Total secrets: ${userSecrets.length}\n`);

      for (let i = 0; i < userSecrets.length; i++) {
        const secretId = userSecrets[i];
        const secret = await secretBankContract.getSecret(secretId);
        const canBeRevealed = await secretBankContract.canSecretBeRevealed(secretId);

        console.log(`--- Secret ${i + 1} (ID: ${secretId}) ---`);
        console.log(`  Content: "${secret.encryptedString}"`);
        console.log(`  Reveal Time: ${new Date(Number(secret.revealTime) * 1000).toISOString()}`);
        console.log(`  Is Revealed: ${secret.isRevealed}`);
        console.log(`  Can Be Revealed: ${canBeRevealed}`);
        console.log("");
      }

    } catch (error) {
      console.error(`Error retrieving user secrets: ${error}`);
    }
  });

/**
 * Example:
 *   - npx hardhat --network localhost secretbank:request-decryption --id 0
 *   - npx hardhat --network sepolia secretbank:request-decryption --id 0
 */
task("secretbank:request-decryption", "Request decryption of a secret (owner only)")
  .addOptionalParam("contract", "Optionally specify the SecretBank contract address")
  .addParam("id", "The secret ID to decrypt")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments } = hre;

    const secretId = parseInt(taskArguments.id);
    if (!Number.isInteger(secretId) || secretId < 0) {
      throw new Error(`Secret ID must be a non-negative integer`);
    }

    const SecretBankDeployment = taskArguments.contract
      ? { address: taskArguments.contract }
      : await deployments.get("SecretBank");
    console.log(`SecretBank: ${SecretBankDeployment.address}`);

    const signers = await ethers.getSigners();
    const secretBankContract = await ethers.getContractAt("SecretBank", SecretBankDeployment.address);

    // Check if caller is owner
    const owner = await secretBankContract.owner();
    if (signers[0].address.toLowerCase() !== owner.toLowerCase()) {
      throw new Error(`Only owner can request decryption. Owner: ${owner}, Caller: ${signers[0].address}`);
    }

    try {
      // Check if secret can be revealed
      const canBeRevealed = await secretBankContract.canSecretBeRevealed(secretId);
      if (!canBeRevealed) {
        const secret = await secretBankContract.getSecret(secretId);
        console.log(`Secret cannot be revealed yet. Reveal time: ${new Date(Number(secret.revealTime) * 1000).toISOString()}`);
        return;
      }

      console.log(`Requesting decryption for secret ID: ${secretId}`);

      const tx = await secretBankContract
        .connect(signers[0])
        .requestDecryption(secretId);

      console.log(`Wait for tx: ${tx.hash}...`);
      const receipt = await tx.wait();
      console.log(`tx: ${tx.hash} status=${receipt?.status}`);

      if (receipt?.status === 1) {
        console.log(`Decryption request submitted successfully!`);
        console.log(`The decryption callback will be triggered once the decryption is complete.`);
      }

    } catch (error) {
      console.error(`Error requesting decryption: ${error}`);
    }
  });

/**
 * Example:
 *   - npx hardhat --network localhost secretbank:stats
 *   - npx hardhat --network sepolia secretbank:stats
 */
task("secretbank:stats", "Show general statistics about the SecretBank contract")
  .addOptionalParam("contract", "Optionally specify the SecretBank contract address")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments } = hre;

    const SecretBankDeployment = taskArguments.contract
      ? { address: taskArguments.contract }
      : await deployments.get("SecretBank");
    console.log(`SecretBank: ${SecretBankDeployment.address}`);

    const secretBankContract = await ethers.getContractAt("SecretBank", SecretBankDeployment.address);

    try {
      const totalSecrets = await secretBankContract.getTotalSecrets();
      const owner = await secretBankContract.owner();

      console.log(`\n=== SecretBank Statistics ===`);
      console.log(`Contract Address: ${SecretBankDeployment.address}`);
      console.log(`Owner: ${owner}`);
      console.log(`Total Secrets: ${totalSecrets}`);

      if (totalSecrets > 0) {
        let revealedCount = 0;
        let revealableCount = 0;

        for (let i = 0; i < totalSecrets; i++) {
          const secret = await secretBankContract.getSecret(i);
          const canBeRevealed = await secretBankContract.canSecretBeRevealed(i);

          if (secret.isRevealed) {
            revealedCount++;
          }
          if (canBeRevealed) {
            revealableCount++;
          }
        }

        console.log(`Revealed Secrets: ${revealedCount}`);
        console.log(`Secrets Ready for Reveal: ${revealableCount}`);
        console.log(`Secrets Still Locked: ${Number(totalSecrets) - revealableCount}`);
      }

    } catch (error) {
      console.error(`Error retrieving statistics: ${error}`);
    }
  });