// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

// Mock Meme Token for the Arena
contract MockMeme is ERC20 {
    constructor() ERC20("MockMeme", "MEME") {
        _mint(msg.sender, 1000000000 * 10 ** decimals());
    }
}

contract Arena is Ownable {
    MockMeme public token;
    mapping(address => bool) public isAgent;
    mapping(address => uint256) public balances;
    
    // --- Betting State (Multi-Round) ---
    uint256 public currentRoundId = 1;
    
    struct Bet {
        uint256 amount;
        address agent;
    }
    
    // roundId => user => Bet
    mapping(uint256 => mapping(address => Bet)) public bets;
    
    // roundId => agent => totalAmount
    mapping(uint256 => mapping(address => uint256)) public roundBetsOnAgent;
    
    // roundId => totalPot
    mapping(uint256 => uint256) public roundPot;
    
    // roundId => winner
    mapping(uint256 => address) public roundWinners;
    
    // roundId => isOver
    mapping(uint256 => bool) public roundIsOver;
    
    // roundId => list of bettors (for auto-payout)
    mapping(uint256 => address[]) internal roundBettors;
    
    bool public bettingActive = false;

    // Events
    event AgentRegistered(address indexed agent);
    event Trade(address indexed agent, string action, uint256 amount, uint256 newBalance);
    event BetPlaced(uint256 indexed roundId, address indexed user, address indexed agent, uint256 amount);
    event PrizePaid(uint256 indexed roundId, address indexed user, uint256 amount);
    event LostFundsSwept(uint256 indexed roundId, address indexed admin, uint256 amount);
    event RoundEnded(uint256 indexed roundId, address indexed winner, uint256 totalPot);

    constructor() Ownable(msg.sender) {
        token = new MockMeme();
    }

    modifier onlyAgent() {
        require(isAgent[msg.sender], "Not a registered agent");
        _;
    }

    function registerAgent(address _agent) external onlyOwner {
        isAgent[_agent] = true;
        emit AgentRegistered(_agent);
    }

    // --- Trading Functions ---
    function buy(uint256 amount) external onlyAgent {
        balances[msg.sender] += amount;
        emit Trade(msg.sender, "BUY", amount, balances[msg.sender]);
    }

    function sell(uint256 amount) external onlyAgent {
        require(balances[msg.sender] >= amount, "Insufficient balance");
        balances[msg.sender] -= amount;
        emit Trade(msg.sender, "SELL", amount, balances[msg.sender]);
    }

    // --- Betting Functions ---

    function placeBet(address _agent) external payable {
        require(bettingActive, "Betting is closed");
        require(isAgent[_agent], "Invalid agent");
        require(msg.value > 0, "Bet amount must be > 0");
        require(bets[currentRoundId][msg.sender].amount == 0, "Already placed a bet this round");

        bets[currentRoundId][msg.sender] = Bet({
            amount: msg.value,
            agent: _agent
        });

        // Track bettor for auto-payout
        roundBettors[currentRoundId].push(msg.sender);

        roundBetsOnAgent[currentRoundId][_agent] += msg.value;
        roundPot[currentRoundId] += msg.value;

        emit BetPlaced(currentRoundId, msg.sender, _agent, msg.value);
    }
    
    function setBettingActive(bool _active) external onlyOwner {
        bettingActive = _active;
    }

    function endRound(address _winner) external onlyOwner {
        require(isAgent[_winner], "Invalid winner");
        require(!roundIsOver[currentRoundId], "Round already ended");

        uint256 roundId = currentRoundId;
        roundWinners[roundId] = _winner;
        roundIsOver[roundId] = true;
        
        uint256 pot = roundPot[roundId];
        uint256 totalPaid = 0;

        // Auto-distribute winnings to all bettors who bet on the winner
        if (pot > 0) {
            uint256 totalBetsOnWinner = roundBetsOnAgent[roundId][_winner];
            address[] storage bettors = roundBettors[roundId];
            
            for (uint256 i = 0; i < bettors.length; i++) {
                Bet storage bet = bets[roundId][bettors[i]];
                
                if (bet.agent == _winner && totalBetsOnWinner > 0) {
                    // Winner gets proportional share of entire pot
                    uint256 share = (bet.amount * pot) / totalBetsOnWinner;
                    totalPaid += share;
                    (bool sent, ) = bettors[i].call{value: share}("");
                    if (sent) {
                        emit PrizePaid(roundId, bettors[i], share);
                    }
                }
            }

            // Send remaining (losers' bets) to admin wallet
            uint256 remaining = pot - totalPaid;
            if (remaining > 0) {
                (bool sent, ) = owner().call{value: remaining}("");
                if (sent) {
                    emit LostFundsSwept(roundId, owner(), remaining);
                }
            }
        }

        emit RoundEnded(roundId, _winner, pot);
        
        // Start next round
        currentRoundId++;
    }

    // View helper: get number of bettors in a round
    function getRoundBettorCount(uint256 _roundId) external view returns (uint256) {
        return roundBettors[_roundId].length;
    }
}
