// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

contract RouteRegistry is AccessControl, Pausable {
    bytes32 public constant ROUTE_MANAGER_ROLE = keccak256("ROUTE_MANAGER_ROLE");
    bytes32 public constant GOVERNANCE_ROLE = keccak256("GOVERNANCE_ROLE");

    enum RouteStatus { Active, Paused, Retired, Failed }

    struct Route {
        bytes32 id;
        string name;
        uint256 sourceChain;
        uint256 destChain;
        address[] bridges;
        address[] dexes;
        uint256 maxAmount;
        uint256 minAmount;
        uint256 avgLatency;
        uint256 successRate;
        uint256 totalVolume;
        uint256 totalExecutions;
        RouteStatus status;
        uint256 createdAt;
        uint256 updatedAt;
    }

    uint256 private _routeCount;
    mapping(bytes32 => Route) public routes;
    mapping(uint256 => bytes32[]) public chainRoutes;
    bytes32[] public allRoutes;

    event RouteRegistered(bytes32 indexed id, string name, uint256 sourceChain, uint256 destChain);
    event RouteUpdated(bytes32 indexed id, RouteStatus status);
    event RouteExecuted(bytes32 indexed id, uint256 amount, uint256 latency, bool success);
    event RouteRetired(bytes32 indexed id);

    error RouteNotFound(bytes32 id);
    error RouteNotActive(bytes32 id);
    error AmountOutOfRange();
    error InvalidRouteParameters();

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(GOVERNANCE_ROLE, msg.sender);
        _grantRole(ROUTE_MANAGER_ROLE, msg.sender);
    }

    function registerRoute(
        string calldata name,
        uint256 sourceChain,
        uint256 destChain,
        address[] calldata bridges,
        address[] calldata dexes,
        uint256 maxAmount,
        uint256 minAmount
    ) external onlyRole(ROUTE_MANAGER_ROLE) returns (bytes32) {
        if (bytes(name).length == 0) revert InvalidRouteParameters();
        if (sourceChain == 0 || destChain == 0) revert InvalidRouteParameters();
        if (bridges.length == 0 || dexes.length == 0) revert InvalidRouteParameters();

        bytes32 id = keccak256(abi.encodePacked(name, sourceChain, destChain, block.timestamp, _routeCount));
        _routeCount++;

        routes[id] = Route({
            id: id,
            name: name,
            sourceChain: sourceChain,
            destChain: destChain,
            bridges: bridges,
            dexes: dexes,
            maxAmount: maxAmount,
            minAmount: minAmount,
            avgLatency: 0,
            successRate: 10000,
            totalVolume: 0,
            totalExecutions: 0,
            status: RouteStatus.Active,
            createdAt: block.timestamp,
            updatedAt: block.timestamp
        });

        chainRoutes[sourceChain].push(id);
        chainRoutes[destChain].push(id);
        allRoutes.push(id);

        emit RouteRegistered(id, name, sourceChain, destChain);
        return id;
    }

    function updateRouteStatus(bytes32 routeId, RouteStatus status) external onlyRole(ROUTE_MANAGER_ROLE) {
        Route storage route = routes[routeId];
        if (route.id == bytes32(0)) revert RouteNotFound(routeId);

        route.status = status;
        route.updatedAt = block.timestamp;

        emit RouteUpdated(routeId, status);
    }

    function recordExecution(bytes32 routeId, uint256 amount, uint256 latency, bool success) external onlyRole(ROUTE_MANAGER_ROLE) {
        Route storage route = routes[routeId];
        if (route.id == bytes32(0)) revert RouteNotFound(routeId);

        route.totalVolume += amount;
        route.totalExecutions++;
        route.avgLatency = (route.avgLatency * (route.totalExecutions - 1) + latency) / route.totalExecutions;
        route.successRate = ((route.successRate * (route.totalExecutions - 1)) + (success ? 10000 : 0)) / route.totalExecutions;
        route.updatedAt = block.timestamp;

        emit RouteExecuted(routeId, amount, latency, success);
    }

    function getRoute(bytes32 id) external view returns (Route memory) {
        return routes[id];
    }

    function getChainRoutes(uint256 chainId) external view returns (bytes32[] memory) {
        return chainRoutes[chainId];
    }

    function getRouteCount() external view returns (uint256) {
        return _routeCount;
    }

    function getAllRoutes() external view returns (bytes32[] memory) {
        return allRoutes;
    }

    function pause() external onlyRole(GOVERNANCE_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(GOVERNANCE_ROLE) {
        _unpause();
    }
}
