// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract SolverAuction is AccessControl, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant AUCTION_ROLE = keccak256("AUCTION_ROLE");
    bytes32 public constant GOVERNANCE_ROLE = keccak256("GOVERNANCE_ROLE");

    enum AuctionState { Created, Bidding, Closed, Settled, Cancelled }
    enum BidState { Submitted, Accepted, Rejected, Expired }

    struct Solver {
        address addr;
        uint256 stakedAmount;
        uint256 totalSolved;
        uint256 successRate;
        uint256 averageExecutionTime;
        bool isActive;
        uint256 registeredAt;
    }

    struct Auction {
        bytes32 id;
        bytes32 intentId;
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 startPrice;
        uint256 endPrice;
        uint256 currentPrice;
        uint256 deadline;
        uint256 settledAt;
        AuctionState state;
        address winner;
        uint256 finalPrice;
        uint256 solverFee;
    }

    struct Bid {
        bytes32 id;
        bytes32 auctionId;
        address solver;
        uint256 price;
        uint256 estimatedGas;
        uint256 executionTime;
        bytes32 routeId;
        BidState state;
        uint256 submittedAt;
    }

    uint256 public constant MIN_STAKE = 50 ether;
    uint256 public constant AUCTION_DURATION = 600;
    uint256 public constant FEE_BPS = 50;

    uint256 private _auctionCount;
    uint256 private _solverCount;

    mapping(address => Solver) public solvers;
    mapping(bytes32 => Auction) public auctions;
    mapping(bytes32 => Bid[]) public auctionBids;
    mapping(bytes32 => mapping(address => bool)) public hasBid;
    mapping(address => bytes32[]) public solverAuctions;

    event SolverRegistered(address indexed solver, uint256 stakeAmount);
    event SolverUnregistered(address indexed solver);
    event SolverStakeUpdated(address indexed solver, uint256 newStake);
    event AuctionCreated(bytes32 indexed id, bytes32 indexed intentId, uint256 startPrice, uint256 deadline);
    event BidSubmitted(bytes32 indexed auctionId, address indexed solver, uint256 price);
    event BidAccepted(bytes32 indexed auctionId, address indexed solver, uint256 price);
    event BidRejected(bytes32 indexed auctionId, address indexed solver);
    event AuctionSettled(bytes32 indexed auctionId, address indexed winner, uint256 finalPrice);
    event AuctionCancelled(bytes32 indexed auctionId);

    error InvalidStakeAmount();
    error SolverNotRegistered(address solver);
    error SolverAlreadyRegistered(address solver);
    error AuctionNotActive(bytes32 auctionId);
    error AuctionEnded(bytes32 auctionId);
    error AlreadyBid(bytes32 auctionId, address solver);
    error InvalidPrice();
    error NoBidsAvailable(bytes32 auctionId);
    error UnauthorizedSolver();
    error AuctionNotInState(bytes32 auctionId, AuctionState required);

    modifier onlyRegisteredSolver() {
        if (!solvers[msg.sender].isActive) revert SolverNotRegistered(msg.sender);
        _;
    }

    modifier onlyActiveAuction(bytes32 auctionId) {
        if (auctions[auctionId].state != AuctionState.Bidding) revert AuctionNotActive(auctionId);
        if (block.timestamp > auctions[auctionId].deadline) revert AuctionEnded(auctionId);
        _;
    }

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(GOVERNANCE_ROLE, msg.sender);
        _grantRole(AUCTION_ROLE, msg.sender);
    }

    function registerSolver(address solver, uint256 stakeAmount) external onlyRole(GOVERNANCE_ROLE) {
        if (stakeAmount < MIN_STAKE) revert InvalidStakeAmount();
        if (solvers[solver].isActive) revert SolverAlreadyRegistered(solver);

        IERC20(address(0)).safeTransferFrom(msg.sender, address(this), stakeAmount);

        solvers[solver] = Solver({
            addr: solver,
            stakedAmount: stakeAmount,
            totalSolved: 0,
            successRate: 0,
            averageExecutionTime: 0,
            isActive: true,
            registeredAt: block.timestamp
        });
        _solverCount++;

        emit SolverRegistered(solver, stakeAmount);
    }

    function unregisterSolver(address solver) external onlyRole(GOVERNANCE_ROLE) {
        if (!solvers[solver].isActive) revert SolverNotRegistered(solver);

        uint256 stake = solvers[solver].stakedAmount;
        solvers[solver].isActive = false;

        if (stake > 0) {
            IERC20(address(0)).safeTransfer(solver, stake);
        }

        emit SolverUnregistered(solver);
    }

    function createAuction(
        bytes32 intentId,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 startPrice
    ) external onlyRole(AUCTION_ROLE) whenNotPaused returns (bytes32) {
        if (startPrice == 0 || amountIn == 0) revert InvalidPrice();

        bytes32 id = keccak256(abi.encodePacked(intentId, block.timestamp, _auctionCount));
        _auctionCount++;

        uint256 endPrice = (startPrice * 80) / 100;
        uint256 deadline = block.timestamp + AUCTION_DURATION;

        auctions[id] = Auction({
            id: id,
            intentId: intentId,
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            amountIn: amountIn,
            startPrice: startPrice,
            endPrice: endPrice,
            currentPrice: startPrice,
            deadline: deadline,
            settledAt: 0,
            state: AuctionState.Bidding,
            winner: address(0),
            finalPrice: 0,
            solverFee: 0
        });

        emit AuctionCreated(id, intentId, startPrice, deadline);
        return id;
    }

    function submitBid(
        bytes32 auctionId,
        uint256 price,
        uint256 estimatedGas,
        uint256 executionTime,
        bytes32 routeId
    ) external onlyRegisteredSolver onlyActiveAuction(auctionId) {
        if (hasBid[auctionId][msg.sender]) revert AlreadyBid(auctionId, msg.sender);
        if (price == 0 || price > auctions[auctionId].currentPrice) revert InvalidPrice();

        hasBid[auctionId][msg.sender] = true;

        bytes32 bidId = keccak256(abi.encodePacked(auctionId, msg.sender, block.timestamp));
        
        auctionBids[auctionId].push(Bid({
            id: bidId,
            auctionId: auctionId,
            solver: msg.sender,
            price: price,
            estimatedGas: estimatedGas,
            executionTime: executionTime,
            routeId: routeId,
            state: BidState.Submitted,
            submittedAt: block.timestamp
        }));

        solverAuctions[msg.sender].push(auctionId);

        if (price < auctions[auctionId].currentPrice) {
            auctions[auctionId].currentPrice = price;
        }

        emit BidSubmitted(auctionId, msg.sender, price);
    }

    function acceptBid(bytes32 auctionId, bytes32 bidId) external onlyRole(AUCTION_ROLE) {
        Auction storage auction = auctions[auctionId];
        if (auction.state != AuctionState.Bidding) revert AuctionNotInState(auctionId, AuctionState.Bidding);

        Bid[] storage bids = auctionBids[auctionId];
        uint256 bidIndex = type(uint256).max;

        for (uint256 i = 0; i < bids.length; i++) {
            if (bids[i].id == bidId) {
                bidIndex = i;
                break;
            }
        }

        if (bidIndex == type(uint256).max) revert InvalidPrice();

        Bid storage acceptedBid = bids[bidIndex];
        address solverAddr = acceptedBid.solver;
        uint256 price = acceptedBid.price;

        acceptedBid.state = BidState.Accepted;
        auction.state = AuctionState.Settled;
        auction.winner = solverAddr;
        auction.finalPrice = price;
        auction.settledAt = block.timestamp;

        for (uint256 i = 0; i < bids.length; i++) {
            if (i != bidIndex) {
                bids[i].state = BidState.Rejected;
            }
        }

        if (solvers[solverAddr].isActive) {
            Solver storage solver = solvers[solverAddr];
            solver.totalSolved++;
            if (solver.totalSolved > 0) {
                solver.successRate = ((solver.successRate * (solver.totalSolved - 1)) + 10000) / solver.totalSolved;
            }
        }

        emit BidAccepted(auctionId, solverAddr, price);
        emit AuctionSettled(auctionId, solverAddr, price);
    }

    function settleAuctionDutch(bytes32 auctionId) external onlyRole(AUCTION_ROLE) {
        Auction storage auction = auctions[auctionId];
        if (auction.state != AuctionState.Bidding) revert AuctionNotInState(auctionId, AuctionState.Bidding);
        if (block.timestamp < auction.deadline) revert AuctionNotActive(auctionId);

        Bid[] storage bids = auctionBids[auctionId];
        if (bids.length == 0) {
            auction.state = AuctionState.Cancelled;
            emit AuctionCancelled(auctionId);
            return;
        }

        uint256 winningIndex = 0;
        for (uint256 i = 1; i < bids.length; i++) {
            if (bids[i].price < bids[winningIndex].price) {
                winningIndex = i;
            }
        }

        Bid storage winningBid = bids[winningIndex];
        address winnerAddr = winningBid.solver;
        uint256 winPrice = winningBid.price;

        winningBid.state = BidState.Accepted;
        auction.state = AuctionState.Settled;
        auction.winner = winnerAddr;
        auction.finalPrice = winPrice;
        auction.settledAt = block.timestamp;

        for (uint256 i = 0; i < bids.length; i++) {
            if (i != winningIndex) {
                bids[i].state = BidState.Rejected;
            }
        }

        if (solvers[winnerAddr].isActive) {
            Solver storage solver = solvers[winnerAddr];
            solver.totalSolved++;
        }

        emit BidAccepted(auctionId, winnerAddr, winPrice);
        emit AuctionSettled(auctionId, winnerAddr, winPrice);
    }

    function cancelAuction(bytes32 auctionId) external onlyRole(AUCTION_ROLE) {
        Auction storage auction = auctions[auctionId];
        if (auction.state != AuctionState.Bidding) revert AuctionNotInState(auctionId, AuctionState.Bidding);

        auction.state = AuctionState.Cancelled;
        emit AuctionCancelled(auctionId);
    }

    function getAuctionBids(bytes32 auctionId) external view returns (Bid[] memory) {
        return auctionBids[auctionId];
    }

    function getSolverAuctions(address solver) external view returns (bytes32[] memory) {
        return solverAuctions[solver];
    }

    function getActiveSolvers() external view returns (address[] memory) {
        address[] memory result = new address[](_solverCount);
        uint256 count = 0;
        
        for (uint256 i = 0; i < _solverCount; i++) {
            address solverAddr = address(uint160(i + 1));
            if (solvers[solverAddr].isActive) {
                result[count++] = solverAddr;
            }
        }
        
        address[] memory active = new address[](count);
        for (uint256 i = 0; i < count; i++) {
            active[i] = result[i];
        }
        return active;
    }

    function pause() external onlyRole(GOVERNANCE_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(GOVERNANCE_ROLE) {
        _unpause();
    }
}