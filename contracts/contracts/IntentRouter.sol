// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract IntentRouter is AccessControl, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant ROUTER_ROLE = keccak256("ROUTER_ROLE");
    bytes32 public constant GOVERNANCE_ROLE = keccak256("GOVERNANCE_ROLE");

    enum IntentState { Created, Fragmented, Routed, Settled, Failed }
    enum PrivacyLevel { Standard, Medium, High, Stealth }

    struct Intent {
        bytes32 id;
        address user;
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 minAmountOut;
        uint256 sourceChain;
        uint256 destChain;
        PrivacyLevel privacy;
        bool fragmented;
        IntentState state;
        uint256 timestamp;
        bytes32 routeId;
    }

    uint256 private _intentCount;
    mapping(bytes32 => Intent) public intents;
    mapping(address => bytes32[]) public userIntents;
    mapping(bytes32 => bytes32[]) public intentFragments;

    event IntentCreated(bytes32 indexed id, address indexed user, address tokenIn, address tokenOut, uint256 amountIn, uint256 sourceChain, uint256 destChain);
    event IntentFragmented(bytes32 indexed id, uint256 fragmentCount);
    event IntentRouted(bytes32 indexed id, bytes32 routeId);
    event IntentSettled(bytes32 indexed id, uint256 amountOut, uint256 fee);
    event IntentFailed(bytes32 indexed id, string reason);

    error InvalidIntentParameters();
    error IntentNotActive(bytes32 id);
    error InsufficientAmount();
    error InvalidChain();
    error UnauthorizedCaller();

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(GOVERNANCE_ROLE, msg.sender);
        _grantRole(ROUTER_ROLE, msg.sender);
    }

    function createIntent(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        uint256 sourceChain,
        uint256 destChain,
        PrivacyLevel privacy,
        bool fragmented
    ) external whenNotPaused returns (bytes32) {
        if (tokenIn == address(0) || tokenOut == address(0)) revert InvalidIntentParameters();
        if (amountIn == 0) revert InsufficientAmount();
        if (sourceChain == 0 || destChain == 0) revert InvalidChain();

        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);

        bytes32 id = keccak256(abi.encodePacked(msg.sender, tokenIn, amountIn, block.timestamp, _intentCount));
        _intentCount++;

        intents[id] = Intent({
            id: id,
            user: msg.sender,
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            amountIn: amountIn,
            minAmountOut: minAmountOut,
            sourceChain: sourceChain,
            destChain: destChain,
            privacy: privacy,
            fragmented: fragmented,
            state: IntentState.Created,
            timestamp: block.timestamp,
            routeId: bytes32(0)
        });

        userIntents[msg.sender].push(id);

        emit IntentCreated(id, msg.sender, tokenIn, tokenOut, amountIn, sourceChain, destChain);
        return id;
    }

    function fragmentIntent(bytes32 intentId, bytes32[] calldata fragmentIds) external onlyRole(ROUTER_ROLE) {
        Intent storage intent = intents[intentId];
        if (intent.state != IntentState.Created) revert IntentNotActive(intentId);
        if (!intent.fragmented) revert InvalidIntentParameters();

        intent.state = IntentState.Fragmented;
        for (uint256 i = 0; i < fragmentIds.length; i++) {
            intentFragments[intentId].push(fragmentIds[i]);
        }

        emit IntentFragmented(intentId, fragmentIds.length);
    }

    function routeIntent(bytes32 intentId, bytes32 routeId) external onlyRole(ROUTER_ROLE) {
        Intent storage intent = intents[intentId];
        if (intent.state != IntentState.Fragmented && intent.state != IntentState.Created) revert IntentNotActive(intentId);

        intent.state = IntentState.Routed;
        intent.routeId = routeId;

        emit IntentRouted(intentId, routeId);
    }

    function settleIntent(bytes32 intentId, uint256 amountOut, uint256 fee) external onlyRole(ROUTER_ROLE) nonReentrant {
        Intent storage intent = intents[intentId];
        if (intent.state != IntentState.Routed) revert IntentNotActive(intentId);

        if (amountOut < intent.minAmountOut) {
            intent.state = IntentState.Failed;
            emit IntentFailed(intentId, "Slippage tolerance exceeded");
            return;
        }

        intent.state = IntentState.Settled;
        uint256 netAmount = amountOut - fee;

        IERC20(intent.tokenOut).safeTransfer(intent.user, netAmount);

        emit IntentSettled(intentId, amountOut, fee);
    }

    function failIntent(bytes32 intentId, string calldata reason) external onlyRole(ROUTER_ROLE) {
        Intent storage intent = intents[intentId];
        if (intent.state == IntentState.Settled) revert IntentNotActive(intentId);

        intent.state = IntentState.Failed;
        IERC20(intent.tokenIn).safeTransfer(intent.user, intent.amountIn);

        emit IntentFailed(intentId, reason);
    }

    function getUserIntents(address user) external view returns (bytes32[] memory) {
        return userIntents[user];
    }

    function getIntent(bytes32 id) external view returns (Intent memory) {
        return intents[id];
    }

    function getIntentFragments(bytes32 intentId) external view returns (bytes32[] memory) {
        return intentFragments[intentId];
    }

    function pause() external onlyRole(GOVERNANCE_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(GOVERNANCE_ROLE) {
        _unpause();
    }
}
