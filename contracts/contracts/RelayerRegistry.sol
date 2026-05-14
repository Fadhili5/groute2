// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract RelayerRegistry is AccessControl, Pausable, ReentrancyGuard {
    bytes32 public constant REGISTRY_MANAGER_ROLE = keccak256("REGISTRY_MANAGER_ROLE");
    bytes32 public constant GOVERNANCE_ROLE = keccak256("GOVERNANCE_ROLE");

    enum RelayerStatus { Inactive, Active, Slashed, Banned }

    struct Relayer {
        address relayerAddress;
        string endpoint;
        uint256 stake;
        uint256 totalRoutes;
        uint256 successfulRoutes;
        uint256 failedRoutes;
        uint256 totalEarnings;
        uint256 uptime;
        uint256 lastHeartbeat;
        RelayerStatus status;
        uint256 registeredAt;
        uint256[] supportedChains;
    }

    struct Heartbeat {
        address relayer;
        uint256 timestamp;
        uint256 blockNumber;
        bytes32 signature;
    }

    uint256 public constant MIN_STAKE = 10 ether;
    uint256 public constant SLASH_THRESHOLD = 5;
    uint256 public constant HEARTBEAT_TIMEOUT = 1 hours;

    mapping(address => Relayer) public relayers;
    address[] public relayerList;
    mapping(uint256 => address[]) public chainRelayers;

    uint256 public totalRelayers;
    uint256 public activeRelayers;

    event RelayerRegistered(address indexed relayer, uint256 stake, string endpoint);
    event RelayerActivated(address indexed relayer);
    event RelayerSlashed(address indexed relayer, uint256 amount, string reason);
    event RelayerBanned(address indexed relayer, string reason);
    event RelayerHeartbeat(address indexed relayer, uint256 timestamp, uint256 blockNumber, bytes32 signature);
    event RouteAssigned(address indexed relayer, uint256 indexed chainId, bytes32 routeId);
    event RouteCompleted(address indexed relayer, bytes32 indexed routeId, bool success);
    event StakeWithdrawn(address indexed relayer, uint256 amount);
    event StakeIncreased(address indexed relayer, uint256 newTotal);

    error RelayerNotFound(address relayer);
    error RelayerNotActive(address relayer);
    error InsufficientStake();
    error HeartbeatTimeout();
    error UnauthorizedRelayer();
    error NoActiveRelayers();

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(GOVERNANCE_ROLE, msg.sender);
        _grantRole(REGISTRY_MANAGER_ROLE, msg.sender);
    }

    function registerRelayer(string calldata endpoint, uint256[] calldata supportedChains) external payable whenNotPaused {
        if (msg.value < MIN_STAKE) revert InsufficientStake();

        if (relayers[msg.sender].relayerAddress != address(0)) {
            relayers[msg.sender].stake += msg.value;
            relayers[msg.sender].endpoint = endpoint;
            relayers[msg.sender].status = RelayerStatus.Active;
            relayers[msg.sender].lastHeartbeat = block.timestamp;
            emit StakeIncreased(msg.sender, relayers[msg.sender].stake);
            return;
        }

        relayers[msg.sender] = Relayer({
            relayerAddress: msg.sender,
            endpoint: endpoint,
            stake: msg.value,
            totalRoutes: 0,
            successfulRoutes: 0,
            failedRoutes: 0,
            totalEarnings: 0,
            uptime: 10000,
            lastHeartbeat: block.timestamp,
            status: RelayerStatus.Active,
            registeredAt: block.timestamp,
            supportedChains: supportedChains
        });

        relayerList.push(msg.sender);
        totalRelayers++;
        activeRelayers++;

        for (uint256 i = 0; i < supportedChains.length; i++) {
            chainRelayers[supportedChains[i]].push(msg.sender);
        }

        emit RelayerRegistered(msg.sender, msg.value, endpoint);
        emit RelayerActivated(msg.sender);
    }

    function heartbeat(bytes32 signature) external {
        Relayer storage relayer = relayers[msg.sender];
        if (relayer.relayerAddress == address(0)) revert RelayerNotFound(msg.sender);

        relayer.lastHeartbeat = block.timestamp;

        emit RelayerHeartbeat(msg.sender, block.timestamp, block.number, signature);
    }

    function recordRouteResult(address relayerAddress, bytes32 routeId, bool success) external onlyRole(REGISTRY_MANAGER_ROLE) {
        Relayer storage relayer = relayers[relayerAddress];
        if (relayer.relayerAddress == address(0)) revert RelayerNotFound(relayerAddress);

        relayer.totalRoutes++;
        if (success) {
            relayer.successfulRoutes++;
        } else {
            relayer.failedRoutes++;
            if (relayer.failedRoutes >= SLASH_THRESHOLD && relayer.status == RelayerStatus.Active) {
                _slash(relayerAddress, "Exceeded failure threshold");
            }
        }

        emit RouteCompleted(relayerAddress, routeId, success);
    }

    function _slash(address relayerAddress, string memory reason) internal {
        Relayer storage relayer = relayers[relayerAddress];
        if (relayer.status != RelayerStatus.Active) return;

        uint256 slashAmount = relayer.stake / 10;
        relayer.stake -= slashAmount;
        relayer.status = RelayerStatus.Slashed;

        if (activeRelayers > 0) {
            activeRelayers--;
        }

        emit RelayerSlashed(relayerAddress, slashAmount, reason);
    }

    function slashRelayer(address relayerAddress, string calldata reason) external onlyRole(REGISTRY_MANAGER_ROLE) {
        _slash(relayerAddress, reason);
    }

    function banRelayer(address relayerAddress, string calldata reason) external onlyRole(GOVERNANCE_ROLE) {
        Relayer storage relayer = relayers[relayerAddress];
        if (relayer.relayerAddress == address(0)) revert RelayerNotFound(relayerAddress);
        if (relayer.status == RelayerStatus.Banned) return;

        if (relayer.status == RelayerStatus.Active && activeRelayers > 0) {
            activeRelayers--;
        }

        relayer.status = RelayerStatus.Banned;

        emit RelayerBanned(relayerAddress, reason);
    }

    function withdrawStake() external nonReentrant {
        Relayer storage relayer = relayers[msg.sender];
        if (relayer.relayerAddress == address(0)) revert RelayerNotFound(msg.sender);
        if (relayer.status == RelayerStatus.Active) revert RelayerNotActive(msg.sender);

        uint256 amount = relayer.stake;
        relayer.stake = 0;

        (bool sent,) = payable(msg.sender).call{value: amount}("");
        require(sent, "ETH transfer failed");

        emit StakeWithdrawn(msg.sender, amount);
    }

    function checkHeartbeats() external onlyRole(REGISTRY_MANAGER_ROLE) {
        for (uint256 i = 0; i < relayerList.length; i++) {
            address relayerAddr = relayerList[i];
            Relayer storage relayer = relayers[relayerAddr];
            if (relayer.status == RelayerStatus.Active) {
                if (block.timestamp > relayer.lastHeartbeat + HEARTBEAT_TIMEOUT) {
                    relayer.status = RelayerStatus.Inactive;
                    if (activeRelayers > 0) {
                        activeRelayers--;
                    }
                }
            }
        }
    }

    function getRelayer(address relayerAddress) external view returns (Relayer memory) {
        return relayers[relayerAddress];
    }

    function getActiveRelayers() external view returns (address[] memory) {
        uint256 count = activeRelayers;
        address[] memory active = new address[](count);
        uint256 idx = 0;
        for (uint256 i = 0; i < relayerList.length && idx < count; i++) {
            if (relayers[relayerList[i]].status == RelayerStatus.Active) {
                active[idx] = relayerList[i];
                idx++;
            }
        }
        return active;
    }

    function getChainRelayers(uint256 chainId) external view returns (address[] memory) {
        return chainRelayers[chainId];
    }

    function getRelayerCount() external view returns (uint256 total, uint256 active) {
        return (totalRelayers, activeRelayers);
    }

    function pause() external onlyRole(GOVERNANCE_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(GOVERNANCE_ROLE) {
        _unpause();
    }
}
