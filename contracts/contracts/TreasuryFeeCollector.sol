// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract TreasuryFeeCollector is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant FEE_MANAGER_ROLE = keccak256("FEE_MANAGER_ROLE");
    bytes32 public constant GOVERNANCE_ROLE = keccak256("GOVERNANCE_ROLE");

    struct FeeTier {
        uint256 minAmount;
        uint256 maxAmount;
        uint256 feeBps;
    }

    struct FeeConfig {
        uint256 protocolFeeBps;
        uint256 relayerFeeBps;
        uint256 bridgeFeeBps;
        uint256 treasuryFeeBps;
        bool enabled;
    }

    struct FeeCollection {
        address token;
        uint256 totalCollected;
        uint256 distributedToRelayers;
        uint256 distributedToTreasury;
        uint256 lastCollection;
    }

    FeeTier[] public feeTiers;
    mapping(uint256 => FeeConfig) public chainFeeConfigs;
    mapping(address => FeeCollection) public tokenFees;
    mapping(bytes32 => uint256) public routeFees;

    uint256 public constant MAX_FEE_BPS = 1000;
    uint256 public constant BPS_DENOMINATOR = 10000;

    address public treasuryWallet;
    uint256 public minFeeTier = 1;

    event FeeCollected(bytes32 indexed routeId, address indexed token, uint256 amount, uint256 fee);
    event FeeDistributed(address indexed token, uint256 amount, address indexed recipient);
    event FeeConfigUpdated(uint256 indexed chainId, uint256 protocolFeeBps);
    event TreasuryWalletUpdated(address indexed oldWallet, address indexed newWallet);
    event FeeTierAdded(uint256 minAmount, uint256 maxAmount, uint256 feeBps);

    error FeeTooHigh();
    error InvalidFeeConfig();
    error TreasuryWalletNotSet();
    error InsufficientFees();

    constructor(address _treasuryWallet) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(GOVERNANCE_ROLE, msg.sender);
        _grantRole(FEE_MANAGER_ROLE, msg.sender);

        treasuryWallet = _treasuryWallet;

        feeTiers.push(FeeTier(0, 10000, 30));
        feeTiers.push(FeeTier(10000, 100000, 25));
        feeTiers.push(FeeTier(100000, 1000000, 20));
        feeTiers.push(FeeTier(1000000, type(uint256).max, 15));
    }

    function collectFee(
        bytes32 routeId,
        address token,
        uint256 amount,
        uint256 chainId
    ) external onlyRole(FEE_MANAGER_ROLE) returns (uint256) {
        FeeConfig storage config = chainFeeConfigs[chainId];
        uint256 feeBps = config.enabled ? config.protocolFeeBps : getFeeForAmount(amount);

        uint256 fee = (amount * feeBps) / BPS_DENOMINATOR;
        uint256 netAmount = amount - fee;

        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);

        routeFees[routeId] = fee;

        FeeCollection storage collection = tokenFees[token];
        collection.totalCollected += fee;
        collection.lastCollection = block.timestamp;

        emit FeeCollected(routeId, token, amount, fee);
        return fee;
    }

    function distributeToTreasury(address token, uint256 amount) external onlyRole(GOVERNANCE_ROLE) nonReentrant {
        if (treasuryWallet == address(0)) revert TreasuryWalletNotSet();

        FeeCollection storage collection = tokenFees[token];
        if (collection.totalCollected - collection.distributedToTreasury < amount) revert InsufficientFees();

        collection.distributedToTreasury += amount;
        IERC20(token).safeTransfer(treasuryWallet, amount);

        emit FeeDistributed(token, amount, treasuryWallet);
    }

    function setFeeConfig(uint256 chainId, uint256 protocolFeeBps, uint256 relayerFeeBps, uint256 bridgeFeeBps, uint256 treasuryFeeBps, bool enabled) external onlyRole(GOVERNANCE_ROLE) {
        if (protocolFeeBps > MAX_FEE_BPS || relayerFeeBps > MAX_FEE_BPS || bridgeFeeBps > MAX_FEE_BPS || treasuryFeeBps > MAX_FEE_BPS) revert FeeTooHigh();

        chainFeeConfigs[chainId] = FeeConfig({
            protocolFeeBps: protocolFeeBps,
            relayerFeeBps: relayerFeeBps,
            bridgeFeeBps: bridgeFeeBps,
            treasuryFeeBps: treasuryFeeBps,
            enabled: enabled
        });

        emit FeeConfigUpdated(chainId, protocolFeeBps);
    }

    function setTreasuryWallet(address _treasuryWallet) external onlyRole(GOVERNANCE_ROLE) {
        address old = treasuryWallet;
        treasuryWallet = _treasuryWallet;
        emit TreasuryWalletUpdated(old, _treasuryWallet);
    }

    function addFeeTier(uint256 minAmount, uint256 maxAmount, uint256 feeBps) external onlyRole(GOVERNANCE_ROLE) {
        if (feeBps > MAX_FEE_BPS) revert FeeTooHigh();
        feeTiers.push(FeeTier(minAmount, maxAmount, feeBps));
        emit FeeTierAdded(minAmount, maxAmount, feeBps);
    }

    function getFeeForAmount(uint256 amount) public view returns (uint256) {
        for (uint256 i = 0; i < feeTiers.length; i++) {
            if (amount >= feeTiers[i].minAmount && amount <= feeTiers[i].maxAmount) {
                return feeTiers[i].feeBps;
            }
        }
        return 30;
    }

    function getFee(bytes32 routeId) external view returns (uint256) {
        return routeFees[routeId];
    }

    function getTokenFees(address token) external view returns (FeeCollection memory) {
        return tokenFees[token];
    }
}
