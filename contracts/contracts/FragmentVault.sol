// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract FragmentVault is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant FRAGMENTER_ROLE = keccak256("FRAGMENTER_ROLE");
    bytes32 public constant SETTLER_ROLE = keccak256("SETTLER_ROLE");

    struct Fragment {
        bytes32 id;
        bytes32 intentId;
        address token;
        uint256 amount;
        uint256 targetChain;
        address targetDex;
        bytes routeData;
        bool settled;
        uint256 timestamp;
    }

    struct VaultBalance {
        address token;
        uint256 locked;
        uint256 available;
    }

    uint256 private _fragmentCount;
    mapping(bytes32 => Fragment) public fragments;
    mapping(address => VaultBalance) public balances;
    mapping(bytes32 => bytes32[]) public intentFragments;

    event FragmentCreated(bytes32 indexed id, bytes32 indexed intentId, address token, uint256 amount, uint256 targetChain);
    event FragmentSettled(bytes32 indexed id, uint256 amountOut);
    event FragmentFailed(bytes32 indexed id, string reason);
    event FundsDeposited(address indexed token, uint256 amount);
    event FundsWithdrawn(address indexed token, uint256 amount, address indexed to);

    error FragmentNotFound(bytes32 id);
    error FragmentAlreadySettled(bytes32 id);
    error InsufficientVaultBalance();
    error InvalidFragmentParameters();

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(FRAGMENTER_ROLE, msg.sender);
        _grantRole(SETTLER_ROLE, msg.sender);
    }

    function createFragment(
        bytes32 intentId,
        address token,
        uint256 amount,
        uint256 targetChain,
        address targetDex,
        bytes calldata routeData
    ) external onlyRole(FRAGMENTER_ROLE) returns (bytes32) {
        if (token == address(0) || amount == 0) revert InvalidFragmentParameters();
        if (targetDex == address(0)) revert InvalidFragmentParameters();

        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);

        bytes32 id = keccak256(abi.encodePacked(intentId, token, amount, block.timestamp, _fragmentCount));
        _fragmentCount++;

        fragments[id] = Fragment({
            id: id,
            intentId: intentId,
            token: token,
            amount: amount,
            targetChain: targetChain,
            targetDex: targetDex,
            routeData: routeData,
            settled: false,
            timestamp: block.timestamp
        });

        intentFragments[intentId].push(id);

        VaultBalance storage bal = balances[token];
        bal.locked += amount;

        emit FragmentCreated(id, intentId, token, amount, targetChain);
        return id;
    }

    function settleFragment(bytes32 fragmentId, uint256 amountOut) external onlyRole(SETTLER_ROLE) nonReentrant {
        Fragment storage fragment = fragments[fragmentId];
        if (fragment.id == bytes32(0)) revert FragmentNotFound(fragmentId);
        if (fragment.settled) revert FragmentAlreadySettled(fragmentId);

        fragment.settled = true;

        VaultBalance storage bal = balances[fragment.token];
        bal.locked -= fragment.amount;
        bal.available += amountOut;

        emit FragmentSettled(fragmentId, amountOut);
    }

    function withdrawFunds(address token, uint256 amount, address to) external onlyRole(SETTLER_ROLE) nonReentrant {
        VaultBalance storage bal = balances[token];
        if (bal.available < amount) revert InsufficientVaultBalance();

        bal.available -= amount;
        IERC20(token).safeTransfer(to, amount);

        emit FundsWithdrawn(token, amount, to);
    }

    function getFragment(bytes32 id) external view returns (Fragment memory) {
        return fragments[id];
    }

    function getIntentFragments(bytes32 intentId) external view returns (bytes32[] memory) {
        return intentFragments[intentId];
    }

    function getVaultBalance(address token) external view returns (uint256 locked, uint256 available) {
        VaultBalance storage bal = balances[token];
        return (bal.locked, bal.available);
    }
}
