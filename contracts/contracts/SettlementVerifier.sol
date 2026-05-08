// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract SettlementVerifier is AccessControl, ReentrancyGuard {
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");
    bytes32 public constant GOVERNANCE_ROLE = keccak256("GOVERNANCE_ROLE");

    enum SettlementState { Pending, Confirmed, Finalized, Disputed, Failed }

    struct SettlementProof {
        bytes32 txHash;
        bytes32 routeId;
        bytes32 proofHash;
        bytes32 sourceChainBlockHash;
        bytes32 destChainBlockHash;
        address relayer;
        uint256 amount;
        uint256 fee;
        uint256 sourceConfirmations;
        uint256 destConfirmations;
        SettlementState state;
        uint256 timestamp;
        uint256 finalizedAt;
    }

    struct VerificationRequest {
        bytes32 id;
        bytes32 txHash;
        bytes32 routeId;
        address requester;
        uint256 timestamp;
        bool verified;
    }

    uint256 private _proofCount;
    mapping(bytes32 => SettlementProof) public proofs;
    mapping(bytes32 => VerificationRequest) public verificationRequests;
    mapping(bytes32 => bool) public verifiedTxHashes;

    uint256 public constant MIN_CONFIRMATIONS = 12;
    uint256 public constant FINALIZATION_PERIOD = 64;

    event ProofSubmitted(bytes32 indexed txHash, bytes32 indexed routeId, bytes32 proofHash, address relayer);
    event ProofConfirmed(bytes32 indexed txHash, uint256 confirmations);
    event ProofFinalized(bytes32 indexed txHash);
    event ProofDisputed(bytes32 indexed txHash, string reason);
    event VerificationRequested(bytes32 indexed id, bytes32 indexed txHash, address indexed requester);
    event VerificationCompleted(bytes32 indexed id, bool verified);

    error ProofNotFound(bytes32 txHash);
    error ProofAlreadyFinalized(bytes32 txHash);
    error InsufficientConfirmations();
    error InvalidProof();
    error UnauthorizedVerifier();

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(GOVERNANCE_ROLE, msg.sender);
        _grantRole(VERIFIER_ROLE, msg.sender);
    }

    function submitProof(
        bytes32 txHash,
        bytes32 routeId,
        bytes32 proofHash,
        bytes32 sourceChainBlockHash,
        bytes32 destChainBlockHash,
        uint256 amount,
        uint256 fee
    ) external onlyRole(VERIFIER_ROLE) returns (bytes32) {
        if (txHash == bytes32(0) || proofHash == bytes32(0)) revert InvalidProof();

        _proofCount++;

        proofs[txHash] = SettlementProof({
            txHash: txHash,
            routeId: routeId,
            proofHash: proofHash,
            sourceChainBlockHash: sourceChainBlockHash,
            destChainBlockHash: destChainBlockHash,
            relayer: msg.sender,
            amount: amount,
            fee: fee,
            sourceConfirmations: 0,
            destConfirmations: 0,
            state: SettlementState.Pending,
            timestamp: block.timestamp,
            finalizedAt: 0
        });

        emit ProofSubmitted(txHash, routeId, proofHash, msg.sender);
        return txHash;
    }

    function confirmProof(bytes32 txHash, uint256 sourceConfs, uint256 destConfs) external onlyRole(VERIFIER_ROLE) {
        SettlementProof storage proof = proofs[txHash];
        if (proof.txHash == bytes32(0)) revert ProofNotFound(txHash);
        if (proof.state == SettlementState.Finalized) revert ProofAlreadyFinalized(txHash);

        proof.sourceConfirmations = sourceConfs;
        proof.destConfirmations = destConfs;

        if (sourceConfs >= MIN_CONFIRMATIONS && destConfs >= MIN_CONFIRMATIONS) {
            proof.state = SettlementState.Confirmed;
        }

        emit ProofConfirmed(txHash, sourceConfs);
    }

    function finalizeProof(bytes32 txHash) external onlyRole(VERIFIER_ROLE) {
        SettlementProof storage proof = proofs[txHash];
        if (proof.txHash == bytes32(0)) revert ProofNotFound(txHash);
        if (proof.state != SettlementState.Confirmed) revert InsufficientConfirmations();

        if (block.timestamp < proof.timestamp + FINALIZATION_PERIOD) revert InsufficientConfirmations();

        proof.state = SettlementState.Finalized;
        proof.finalizedAt = block.timestamp;
        verifiedTxHashes[txHash] = true;

        emit ProofFinalized(txHash);
    }

    function disputeProof(bytes32 txHash, string calldata reason) external onlyRole(VERIFIER_ROLE) {
        SettlementProof storage proof = proofs[txHash];
        if (proof.txHash == bytes32(0)) revert ProofNotFound(txHash);
        if (proof.state == SettlementState.Finalized) revert ProofAlreadyFinalized(txHash);

        proof.state = SettlementState.Disputed;
        emit ProofDisputed(txHash, reason);
    }

    function requestVerification(bytes32 txHash) external returns (bytes32) {
        bytes32 id = keccak256(abi.encodePacked(txHash, msg.sender, block.timestamp));

        verificationRequests[id] = VerificationRequest({
            id: id,
            txHash: txHash,
            routeId: proofs[txHash].routeId,
            requester: msg.sender,
            timestamp: block.timestamp,
            verified: false
        });

        emit VerificationRequested(id, txHash, msg.sender);
        return id;
    }

    function completeVerification(bytes32 requestId, bool verified) external onlyRole(VERIFIER_ROLE) {
        VerificationRequest storage request = verificationRequests[requestId];
        request.verified = verified;

        emit VerificationCompleted(requestId, verified);
    }

    function getProof(bytes32 txHash) external view returns (SettlementProof memory) {
        return proofs[txHash];
    }

    function isTxVerified(bytes32 txHash) external view returns (bool) {
        return verifiedTxHashes[txHash];
    }
}
