// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

contract PrivacyScoreOracle is AccessControl, Pausable {
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");
    bytes32 public constant GOVERNANCE_ROLE = keccak256("GOVERNANCE_ROLE");

    struct PrivacyScore {
        uint256 chainId;
        uint256 score;
        uint256 mevResistance;
        uint256 anonymitySet;
        uint256 frontrunningRisk;
        uint256 sandwhichRisk;
        uint256 timestamp;
        string metadata;
    }

    struct ChainPrivacyConfig {
        bool hasPrivacyRPC;
        bool supportsFlashbots;
        bool hasTornadoCash;
        bool hasRailgun;
        uint256 mevBlockspace;
        uint256 privateMempoolSize;
    }

    uint256 private constant MAX_SCORE = 100;
    uint256 private constant MIN_SCORE = 0;

    mapping(uint256 => PrivacyScore) public scores;
    mapping(uint256 => ChainPrivacyConfig) public chainConfigs;
    uint256[] public trackedChains;

    event ScoreUpdated(uint256 indexed chainId, uint256 score, uint256 mevResistance);
    event ChainAdded(uint256 indexed chainId, ChainPrivacyConfig config);
    event ChainRemoved(uint256 indexed chainId);
    event ScoreRequested(uint256 indexed chainId, address indexed requester);

    error ChainNotTracked(uint256 chainId);
    error InvalidScore(uint256 score);
    error UnauthorizedOracle();

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(GOVERNANCE_ROLE, msg.sender);
        _grantRole(ORACLE_ROLE, msg.sender);
    }

    function updateScore(
        uint256 chainId,
        uint256 score,
        uint256 mevResistance,
        uint256 anonymitySet,
        uint256 frontrunningRisk,
        uint256 sandwhichRisk,
        string calldata metadata
    ) external onlyRole(ORACLE_ROLE) {
        if (score > MAX_SCORE) revert InvalidScore(score);
        if (mevResistance > MAX_SCORE) revert InvalidScore(mevResistance);

        scores[chainId] = PrivacyScore({
            chainId: chainId,
            score: score,
            mevResistance: mevResistance,
            anonymitySet: anonymitySet,
            frontrunningRisk: frontrunningRisk,
            sandwhichRisk: sandwhichRisk,
            timestamp: block.timestamp,
            metadata: metadata
        });

        emit ScoreUpdated(chainId, score, mevResistance);
    }

    function addChain(uint256 chainId, ChainPrivacyConfig calldata config) external onlyRole(GOVERNANCE_ROLE) {
        chainConfigs[chainId] = config;
        trackedChains.push(chainId);

        emit ChainAdded(chainId, config);
    }

    function removeChain(uint256 chainId) external onlyRole(GOVERNANCE_ROLE) {
        delete chainConfigs[chainId];
        delete scores[chainId];

        for (uint256 i = 0; i < trackedChains.length; i++) {
            if (trackedChains[i] == chainId) {
                trackedChains[i] = trackedChains[trackedChains.length - 1];
                trackedChains.pop();
                break;
            }
        }

        emit ChainRemoved(chainId);
    }

    function getScore(uint256 chainId) external view returns (PrivacyScore memory) {
        if (scores[chainId].timestamp == 0 && chainConfigs[chainId].hasPrivacyRPC == false) {
            revert ChainNotTracked(chainId);
        }
        return scores[chainId];
    }

    function requestScore(uint256 chainId) external {
        emit ScoreRequested(chainId, msg.sender);
    }

    function getTrackedChains() external view returns (uint256[] memory) {
        return trackedChains;
    }

    function pause() external onlyRole(GOVERNANCE_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(GOVERNANCE_ROLE) {
        _unpause();
    }
}
