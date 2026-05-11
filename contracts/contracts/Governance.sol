// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

contract Governance is AccessControl, Pausable, EIP712 {
    bytes32 public constant PROPOSAL_ROLE = keccak256("PROPOSAL_ROLE");
    bytes32 public constant EXECUTOR_ROLE = keccak256("EXECUTOR_ROLE");
    bytes32 public constant GOVERNANCE_ROLE = keccak256("GOVERNANCE_ROLE");

    bytes32 public constant PROPOSAL_TYPEHASH = keccak256("Proposal(address proposer,bytes32 targetContract,bytes data,uint256 value,uint256 nonce,uint256 deadline)");

    enum ProposalState { Pending, Active, Succeeded, Defeated, Executed, Cancelled }

    struct Proposal {
        bytes32 id;
        address proposer;
        bytes32 targetContract;
        bytes data;
        uint256 value;
        uint256 forVotes;
        uint256 againstVotes;
        uint256 startBlock;
        uint256 endBlock;
        ProposalState state;
        bool executed;
        string description;
        uint256 createdAt;
    }

    struct Vote {
        address voter;
        bool support;
        uint256 weight;
        string reason;
    }

    uint256 public votingPeriod = 50400;
    uint256 public quorum = 4;
    uint256 public proposalCount;

    mapping(bytes32 => Proposal) public proposals;
    mapping(bytes32 => mapping(address => Vote)) public votes;
    mapping(bytes32 => address[]) public proposalVoters;
    mapping(address => uint256) public votingPower;

    event ProposalCreated(bytes32 indexed id, address indexed proposer, string description, uint256 startBlock, uint256 endBlock);
    event VoteCast(bytes32 indexed proposalId, address indexed voter, bool support, uint256 weight);
    event ProposalExecuted(bytes32 indexed id);
    event ProposalCancelled(bytes32 indexed id);
    event VotingPowerUpdated(address indexed voter, uint256 newPower);
    event QuorumUpdated(uint256 newQuorum);
    event VotingPeriodUpdated(uint256 newPeriod);

    error ProposalNotFound(bytes32 id);
    error ProposalNotActive(bytes32 id);
    error ProposalAlreadyExecuted(bytes32 id);
    error AlreadyVoted(bytes32 proposalId, address voter);
    error VotingPeriodEnded();
    error QuorumNotMet();
    error InvalidProposal();
    error NotProposer();

    constructor() EIP712("GhostRoute Governance", "1") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(PROPOSAL_ROLE, msg.sender);
        _grantRole(EXECUTOR_ROLE, msg.sender);
    }

    function createProposal(
        bytes32 targetContract,
        bytes calldata data,
        uint256 value,
        string calldata description
    ) external onlyRole(PROPOSAL_ROLE) returns (bytes32) {
        if (targetContract == bytes32(0)) revert InvalidProposal();

        bytes32 id = keccak256(abi.encodePacked(targetContract, data, value, proposalCount, block.timestamp));
        proposalCount++;

        proposals[id] = Proposal({
            id: id,
            proposer: msg.sender,
            targetContract: targetContract,
            data: data,
            value: value,
            forVotes: 0,
            againstVotes: 0,
            startBlock: block.number,
            endBlock: block.number + votingPeriod,
            state: ProposalState.Active,
            executed: false,
            description: description,
            createdAt: block.timestamp
        });

        emit ProposalCreated(id, msg.sender, description, block.number, block.number + votingPeriod);
        return id;
    }

    function castVote(bytes32 proposalId, bool support, string calldata reason) external {
        Proposal storage proposal = proposals[proposalId];
        if (proposal.id == bytes32(0)) revert ProposalNotFound(proposalId);
        if (proposal.state != ProposalState.Active) revert ProposalNotActive(proposalId);
        if (block.number > proposal.endBlock) revert VotingPeriodEnded();
        if (votes[proposalId][msg.sender].voter != address(0)) revert AlreadyVoted(proposalId, msg.sender);

        uint256 weight = votingPower[msg.sender];
        if (weight == 0) weight = 1;

        votes[proposalId][msg.sender] = Vote({
            voter: msg.sender,
            support: support,
            weight: weight,
            reason: reason
        });

        proposalVoters[proposalId].push(msg.sender);

        if (support) {
            proposal.forVotes += weight;
        } else {
            proposal.againstVotes += weight;
        }

        emit VoteCast(proposalId, msg.sender, support, weight);
    }

    function executeProposal(bytes32 proposalId) external onlyRole(EXECUTOR_ROLE) {
        Proposal storage proposal = proposals[proposalId];
        if (proposal.id == bytes32(0)) revert ProposalNotFound(proposalId);
        if (proposal.state != ProposalState.Active) revert ProposalNotActive(proposalId);
        if (block.number <= proposal.endBlock) revert VotingPeriodEnded();
        if (proposal.executed) revert ProposalAlreadyExecuted(proposalId);

        if (proposal.forVotes <= proposal.againstVotes) {
            proposal.state = ProposalState.Defeated;
            return;
        }

        if (proposalVoters[proposalId].length < quorum) revert QuorumNotMet();

        proposal.state = ProposalState.Executed;
        proposal.executed = true;

        emit ProposalExecuted(proposalId);
    }

    function cancelProposal(bytes32 proposalId) external onlyRole(DEFAULT_ADMIN_ROLE) {
        Proposal storage proposal = proposals[proposalId];
        if (proposal.id == bytes32(0)) revert ProposalNotFound(proposalId);
        if (proposal.executed) revert ProposalAlreadyExecuted(proposalId);

        proposal.state = ProposalState.Cancelled;
        emit ProposalCancelled(proposalId);
    }

    function setVotingPower(address voter, uint256 power) external onlyRole(DEFAULT_ADMIN_ROLE) {
        votingPower[voter] = power;
        emit VotingPowerUpdated(voter, power);
    }

    function setQuorum(uint256 newQuorum) external onlyRole(DEFAULT_ADMIN_ROLE) {
        quorum = newQuorum;
        emit QuorumUpdated(newQuorum);
    }

    function setVotingPeriod(uint256 newPeriod) external onlyRole(DEFAULT_ADMIN_ROLE) {
        votingPeriod = newPeriod;
        emit VotingPeriodUpdated(newPeriod);
    }

    function getProposal(bytes32 id) external view returns (Proposal memory) {
        return proposals[id];
    }

    function getVotes(bytes32 proposalId) external view returns (address[] memory voters, uint256[] memory weights, bool[] memory inSupport) {
        address[] memory votersList = proposalVoters[proposalId];
        voters = new address[](votersList.length);
        weights = new uint256[](votersList.length);
        inSupport = new bool[](votersList.length);

        for (uint256 i = 0; i < votersList.length; i++) {
            Vote storage v = votes[proposalId][votersList[i]];
            voters[i] = v.voter;
            weights[i] = v.weight;
            inSupport[i] = v.support;
        }
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
}
