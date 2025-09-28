// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, eaddress, externalEaddress, euint32, externalEuint32} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title SecretBank - A confidential storage system for encrypted secrets
/// @notice This contract allows users to store encrypted strings with encrypted addresses and reveal times
/// @dev Uses Zama FHE for confidential operations
contract SecretBank is SepoliaConfig {
    struct Secret {
        string encryptedString;     // The encrypted string content
        eaddress encryptedAddress;  // The encrypted EVM address
        uint256 revealTime;         // Timestamp when the secret can be revealed
        address depositor;          // Address of the user who deposited the secret
        bool isRevealed;           // Whether the secret has been revealed
        uint256 secretId;          // Unique identifier for the secret
    }

    // State variables
    mapping(uint256 => Secret) public secrets;
    mapping(address => uint256[]) public userSecrets;
    uint256 public nextSecretId;
    address public owner;

    // Decryption related variables
    mapping(uint256 => bool) public decryptionRequested;
    mapping(uint256 => uint256) private decryptionRequestIds;
    mapping(uint256 => bool) public isDecryptionPending;

    // Events
    event SecretDeposited(
        uint256 indexed secretId,
        address indexed depositor,
        uint256 revealTime
    );

    event DecryptionRequested(
        uint256 indexed secretId,
        uint256 requestId
    );

    event SecretRevealed(
        uint256 indexed secretId,
        address revealedAddress
    );

    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    modifier validSecretId(uint256 secretId) {
        require(secretId < nextSecretId, "Invalid secret ID");
        _;
    }

    modifier canReveal(uint256 secretId) {
        require(block.timestamp >= secrets[secretId].revealTime, "Reveal time not reached");
        require(!secrets[secretId].isRevealed, "Secret already revealed");
        _;
    }

    constructor() {
        owner = msg.sender;
        nextSecretId = 0;
    }

    /// @notice Deposit a new secret with encrypted string and address
    /// @param encryptedString The encrypted string content to store
    /// @param inputEncryptedAddress The encrypted address associated with the secret
    /// @param revealTime The timestamp when the secret can be revealed
    /// @param inputProof The proof for the encrypted inputs
    function depositSecret(
        string calldata encryptedString,
        externalEaddress inputEncryptedAddress,
        uint256 revealTime,
        bytes calldata inputProof
    ) external {
        require(revealTime > block.timestamp, "Reveal time must be in the future");
        require(bytes(encryptedString).length > 0, "Encrypted string cannot be empty");

        // Validate and convert the encrypted address
        eaddress encryptedAddress = FHE.fromExternal(inputEncryptedAddress, inputProof);

        // Create the secret
        Secret storage newSecret = secrets[nextSecretId];
        newSecret.encryptedString = encryptedString;
        newSecret.encryptedAddress = encryptedAddress;
        newSecret.revealTime = revealTime;
        newSecret.depositor = msg.sender;
        newSecret.isRevealed = false;
        newSecret.secretId = nextSecretId;

        // Set ACL permissions
        FHE.allowThis(encryptedAddress);
        FHE.allow(encryptedAddress, msg.sender);
        FHE.allow(encryptedAddress, owner);

        // Add to user's secrets list
        userSecrets[msg.sender].push(nextSecretId);

        emit SecretDeposited(nextSecretId, msg.sender, revealTime);

        nextSecretId++;
    }

    /// @notice Request decryption of a secret's encrypted address (only owner)
    /// @param secretId The ID of the secret to decrypt
    function requestDecryption(uint256 secretId)
        external
        onlyOwner
        validSecretId(secretId)
        canReveal(secretId)
    {
        require(!decryptionRequested[secretId], "Decryption already requested");
        require(!isDecryptionPending[secretId], "Decryption already pending");

        // Prepare ciphertext for decryption
        bytes32[] memory cts = new bytes32[](1);
        cts[0] = FHE.toBytes32(secrets[secretId].encryptedAddress);

        // Request decryption
        uint256 requestId = FHE.requestDecryption(cts, this.decryptionCallback.selector);

        decryptionRequestIds[secretId] = requestId;
        decryptionRequested[secretId] = true;
        isDecryptionPending[secretId] = true;

        emit DecryptionRequested(secretId, requestId);
    }

    /// @notice Callback function for decryption results
    /// @param requestId The decryption request ID
    /// @param cleartexts The decrypted data
    /// @param decryptionProof The proof of decryption
    function decryptionCallback(
        uint256 requestId,
        bytes memory cleartexts,
        bytes memory decryptionProof
    ) external returns (bool) {
        // Find the secret associated with this request
        uint256 secretId = type(uint256).max;
        for (uint256 i = 0; i < nextSecretId; i++) {
            if (decryptionRequestIds[i] == requestId) {
                secretId = i;
                break;
            }
        }

        require(secretId != type(uint256).max, "Invalid request ID");
        require(isDecryptionPending[secretId], "No pending decryption for this secret");

        // Verify the decryption proof
        FHE.checkSignatures(requestId, cleartexts, decryptionProof);

        // Decode the decrypted address
        (address decryptedAddress) = abi.decode(cleartexts, (address));

        // Mark secret as revealed
        secrets[secretId].isRevealed = true;
        isDecryptionPending[secretId] = false;

        emit SecretRevealed(secretId, decryptedAddress);

        return true;
    }

    /// @notice Get secret information (view function)
    /// @param secretId The ID of the secret to retrieve
    /// @return encryptedString The encrypted string content
    /// @return encryptedAddress The encrypted address (only accessible with proper ACL)
    /// @return revealTime The reveal timestamp
    /// @return depositor The address of the depositor
    /// @return isRevealed Whether the secret has been revealed
    function getSecret(uint256 secretId)
        external
        view
        validSecretId(secretId)
        returns (
            string memory encryptedString,
            eaddress encryptedAddress,
            uint256 revealTime,
            address depositor,
            bool isRevealed
        )
    {
        Secret storage secret = secrets[secretId];
        return (
            secret.encryptedString,
            secret.encryptedAddress,
            secret.revealTime,
            secret.depositor,
            secret.isRevealed
        );
    }

    /// @notice Get all secret IDs for a user
    /// @param user The user address
    /// @return Array of secret IDs belonging to the user
    function getUserSecrets(address user) external view returns (uint256[] memory) {
        return userSecrets[user];
    }

    /// @notice Get the total number of secrets
    /// @return The total number of secrets stored
    function getTotalSecrets() external view returns (uint256) {
        return nextSecretId;
    }

    /// @notice Check if a secret can be revealed
    /// @param secretId The ID of the secret
    /// @return Whether the secret can be revealed
    function canSecretBeRevealed(uint256 secretId)
        external
        view
        validSecretId(secretId)
        returns (bool)
    {
        return block.timestamp >= secrets[secretId].revealTime && !secrets[secretId].isRevealed;
    }

    /// @notice Get decryption status for a secret
    /// @param secretId The ID of the secret
    /// @return requested Whether decryption has been requested
    /// @return pending Whether decryption is currently pending
    function getDecryptionStatus(uint256 secretId)
        external
        view
        validSecretId(secretId)
        returns (bool requested, bool pending)
    {
        return (decryptionRequested[secretId], isDecryptionPending[secretId]);
    }

    /// @notice Transfer ownership of the contract
    /// @param newOwner The new owner address
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "New owner cannot be zero address");
        owner = newOwner;
    }
}