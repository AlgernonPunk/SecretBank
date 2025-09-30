// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint8, eaddress, externalEuint8, externalEaddress} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title SecretBank
/// @notice Store encrypted bytes (string) with an encrypted address and a public timestamp.
///         After the timestamp, the contract owner can either make the ciphertext publicly
///         decryptable or request decryption via the oracle and persist the cleartext on-chain.
contract SecretBank is SepoliaConfig {
    struct Record {
        address submitter;
        eaddress encOwner; // Zama encrypted address
        euint8[] encBytes; // Zama encrypted bytes, one byte per euint8
        uint64 publicAt;   // UNIX timestamp when the data can be revealed
        bool isPublic;     // Whether ciphertexts are marked publicly decryptable
        bool isDecrypted;  // Whether on-chain plaintext is available
        string cleartext;  // Plaintext after oracle decryption callback
        uint256 requestId; // Last oracle request id
        bool decryptionPending; // True when a decryption has been requested
    }

    address public owner;
    uint256 public nextId;

    mapping(uint256 => Record) private records;
    mapping(uint256 => uint256) private requestToId; // requestId -> recordId

    event Submitted(uint256 indexed id, address indexed submitter, uint64 publicAt);
    event MadePublic(uint256 indexed id);
    event DecryptionRequested(uint256 indexed id, uint256 indexed requestId);
    event Decrypted(uint256 indexed id);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
        nextId = 1;
    }

    /// @notice Submit a new secret entry
    /// @param encAddr Zama encrypted address
    /// @param encData Zama encrypted bytes (each item is one byte as externalEuint8)
    /// @param inputProof Relayer input proof for both address and bytes
    /// @param publicAt UNIX timestamp when reveal is allowed
    /// @return id Newly created record id
    function submitSecret(
        externalEaddress encAddr,
        externalEuint8[] calldata encData,
        bytes calldata inputProof,
        uint64 publicAt
    ) external returns (uint256 id) {
        require(encData.length > 0, "Empty data");

        id = nextId++;

        Record storage r = records[id];
        r.submitter = msg.sender;
        r.publicAt = publicAt;

        // Import and store encrypted address
        r.encOwner = FHE.fromExternal(encAddr, inputProof);
        FHE.allowThis(r.encOwner);
        FHE.allow(r.encOwner, msg.sender);

        // Import and store encrypted bytes
        r.encBytes = new euint8[](encData.length);
        for (uint256 i = 0; i < encData.length; i++) {
            euint8 b = FHE.fromExternal(encData[i], inputProof);
            r.encBytes[i] = b;
            // Grant access: contract + submitter can decrypt
            FHE.allowThis(b);
            FHE.allow(b, msg.sender);
        }

        emit Submitted(id, msg.sender, publicAt);
    }

    /// @notice Mark ciphertexts as publicly decryptable after the time threshold.
    function makePublic(uint256 id) external onlyOwner {
        Record storage r = records[id];
        require(r.encBytes.length > 0, "No record");
        require(block.timestamp >= r.publicAt, "Too early");
        require(!r.isPublic, "Already public");

        // Mark address and all bytes as publicly decryptable
        FHE.makePubliclyDecryptable(r.encOwner);
        for (uint256 i = 0; i < r.encBytes.length; i++) {
            FHE.makePubliclyDecryptable(r.encBytes[i]);
        }
        r.isPublic = true;
        emit MadePublic(id);
    }

    /// @notice Request on-chain oracle decryption after the time threshold.
    ///         The decrypted cleartext will be saved in `cleartext`.
    function requestDecryption(uint256 id) external onlyOwner {
        Record storage r = records[id];
        require(r.encBytes.length > 0, "No record");
        require(block.timestamp >= r.publicAt, "Too early");
        require(!r.decryptionPending, "Pending");
        require(!r.isDecrypted, "Already decrypted");

        bytes32[] memory cts = new bytes32[](r.encBytes.length);
        for (uint256 i = 0; i < r.encBytes.length; i++) {
            cts[i] = FHE.toBytes32(r.encBytes[i]);
        }

        uint256 reqId = FHE.requestDecryption(cts, this.decryptionCallback.selector);
        r.decryptionPending = true;
        r.requestId = reqId;
        requestToId[reqId] = id;
        emit DecryptionRequested(id, reqId);
    }

    /// @notice Oracle callback. Verifies signatures and stores the plaintext.
    /// @dev MUST be called by the relayer; signatures are verified by FHE.checkSignatures.
    function decryptionCallback(
        uint256 requestId,
        bytes memory cleartexts,
        bytes memory decryptionProof
    ) public returns (bool) {
        uint256 id = requestToId[requestId];
        require(id != 0, "Unknown request");

        // Verify KMS signatures and emit FHE.DecryptionFulfilled
        FHE.checkSignatures(requestId, cleartexts, decryptionProof);

        Record storage r = records[id];
        // cleartexts is a concatenation of n uint256 values (left-padded); each contains an 8-bit value
        uint256 n = cleartexts.length / 32;
        bytes memory out = new bytes(n);
        for (uint256 i = 0; i < n; i++) {
            uint256 word;
            // Read the i-th 32-byte word from `cleartexts`
            assembly {
                word := mload(add(add(cleartexts, 0x20), mul(i, 0x20)))
            }
            out[i] = bytes1(uint8(word));
        }

        r.cleartext = string(out);
        r.isDecrypted = true;
        r.decryptionPending = false;
        emit Decrypted(id);
        return true;
    }

    // -------- Views (no msg.sender usage in views) --------

    function getRecordMeta(uint256 id) external view returns (address submitter, uint64 publicAt, bool isPublic, bool isDecrypted) {
        Record storage r = records[id];
        require(r.encBytes.length > 0, "No record");
        return (r.submitter, r.publicAt, r.isPublic, r.isDecrypted);
    }

    function getEncryptedOwner(uint256 id) external view returns (eaddress) {
        Record storage r = records[id];
        require(r.encBytes.length > 0, "No record");
        return r.encOwner;
    }

    function getLength(uint256 id) external view returns (uint256) {
        Record storage r = records[id];
        require(r.encBytes.length > 0, "No record");
        return r.encBytes.length;
    }

    function getByte(uint256 id, uint256 index) external view returns (euint8) {
        Record storage r = records[id];
        require(index < r.encBytes.length, "Index out of bounds");
        return r.encBytes[index];
    }

    function getCleartext(uint256 id) external view returns (string memory) {
        Record storage r = records[id];
        require(r.isDecrypted, "Not decrypted");
        return r.cleartext;
    }
}

