// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

struct VotingInfo {
    uint256 id;
    string title;
    uint256 startTime;
    uint256 endTime;
    bytes32[] propositions;
    VotingType votingType;
}

enum VotingType { Public, Private }

contract VotingSystem {
    struct VotingStats {
        uint256 totalVoters;
        uint256 votesCast;
        mapping(uint256 => uint256) propositionVotes;
    }

    struct Voting {
        uint256 id;
        string title;
        uint256 startTime;
        uint256 endTime;
        VotingType votingType;
        bytes32[] propositions;
        mapping(address => bool) hasVoted;
        mapping(address => uint256) votes;
        bool exists;
    }

    // 1. Zmienne stanu
    address public chairman;
    mapping(address => bool) public admins;
    mapping(address => bool) public voters;
    mapping(uint256 => VotingStats) private votingStats;
    uint256 public votingCount;

    mapping(uint256 => Voting) public votings;

    // 3. Eventy
    event VotingCreated(uint256 indexed votingId, string title, VotingType votingType);
    event VoteCast(address indexed voter, uint256 indexed votingId, uint256 propositionIndex);

    // 4. Modifikatory
    modifier onlyChairman() {
        require(msg.sender == chairman, "Not chairman");
        _;
    }

    modifier onlyAdmin() {
        require(admins[msg.sender] || msg.sender == chairman, "Not admin");
        _;
    }

    // 5. Konstruktor
    constructor() {
        chairman = msg.sender;
        admins[chairman] = true;
    }

    // 6. Funkcje zarządzania adminami
    function addAdmin(address _admin) external onlyChairman {
        admins[_admin] = true;
    }

    function removeAdmin(address _admin) external onlyChairman {
        admins[_admin] = false;
    }

    // 7. Tworzenie głosowania
    function createVoting(
        string memory _title,
        uint256 _startTime,
        uint256 _endTime,
        VotingType _votingType,
        bytes32[] memory _propositions
    ) external onlyAdmin {
        require(_startTime > block.timestamp, "Invalid start time");
        require(_endTime > _startTime, "Invalid end time");
        
        Voting storage newVoting = votings[votingCount];

        newVoting.id = votingCount;
        newVoting.title = _title;
        newVoting.startTime = _startTime;
        newVoting.endTime = _endTime;
        newVoting.votingType = _votingType;
        newVoting.exists = true;

        votingCount++;
        for(uint256 i = 0; i < _propositions.length; i++) {
            newVoting.propositions.push(_propositions[i]);
        }

        emit VotingCreated(votingCount, _title, _votingType);
    }

    error VotingNotStarted(uint256 startTime, uint256 currentTime, uint256 timeRemaining);

    // 8. Głosowanie
    function vote(uint256 _votingId, uint256 _propositionIndex) external {
        require(voters[msg.sender], "Not authorized");
        Voting storage voting = votings[_votingId];
        require(voting.exists, "Invalid voting");

        if(block.timestamp < voting.startTime) {
            uint256 timeRemaining = voting.startTime - block.timestamp;
            revert VotingNotStarted({
                startTime: voting.startTime,
                currentTime: block.timestamp,
                timeRemaining: timeRemaining
            });
        }

        require(block.timestamp >= voting.startTime, "Voting not started");
        require(block.timestamp <= voting.endTime, "Voting ended");
        require(!voting.hasVoted[msg.sender], "Already voted");
        require(_propositionIndex < voting.propositions.length, "Invalid proposition");

        voting.hasVoted[msg.sender] = true;
        voting.votes[msg.sender] = _propositionIndex;
        
        emit VoteCast(msg.sender, _votingId, _propositionIndex);
    }

    // 9. Funkcje pomocnicze
    function addVoter(address _voter) external onlyAdmin {
        require(!voters[_voter], "Voter already exists");
        voters[_voter] = true;
    }

    function removeVoter(address _voter) external onlyAdmin {
        voters[_voter] = false;
    }

    // 10. Gettery
    function getVotingStatus(uint256 _votingId) public view returns (string memory) {
        Voting storage voting = votings[_votingId];
        if(!voting.exists) return "Not Exist";
        if(block.timestamp < voting.startTime) return "Pending";
        if(block.timestamp <= voting.endTime) return "Active";
        return "Completed";
    }

    function getVoting(uint256 id) public view returns (VotingInfo memory) {
        Voting storage v = votings[id];
        require(v.exists, "Voting does not exist");

        VotingInfo memory info = VotingInfo({
            id: v.id,
            title: v.title,
            startTime: v.startTime,
            endTime: v.endTime,
            propositions: v.propositions,
            votingType: v.votingType
        });

        return info;
    }

    function getPropositions(uint256 votingId) public view returns (bytes32[] memory) {
        Voting storage voting = votings[votingId];
        require(voting.exists, "Voting does not exist");
        uint256 count = voting.propositions.length;
        bytes32[] memory cids = new bytes32[](count);
        for (uint256 i = 0; i < count; i++) {
            cids[i] = voting.propositions[i];
        }
        return cids;
    }

    function getVotingBatch(uint256[] calldata ids) public view returns (
        string[] memory titles,
        bytes32[][] memory cids
    ) {
        titles = new string[](ids.length);
        cids = new bytes32[][](ids.length);
        
        for(uint256 i = 0; i < ids.length; i++) {
            titles[i] = votings[ids[i]].title;
            cids[i] = getPropositions(ids[i]);
        }
    }

    //
    //
    // STATYSTYKI
    //
    //

    function getVotingStats(uint256 _votingId) public view returns (
        uint256 totalVoters,
        uint256 votesCast,
        uint256[] memory propositionVotes
    ) {
        Voting storage voting = votings[_votingId];
        require(voting.exists, "Voting does not exist");
        
        if(voting.votingType == VotingType.Private) {
            if(block.timestamp <= voting.endTime) {
                revert("Private voting in progress. Results available after completion");
            }
            require(block.timestamp > voting.endTime + 1 hours, "Results undergoing final verification");
        }
        
        VotingStats storage stats = votingStats[_votingId];
        propositionVotes = new uint256[](voting.propositions.length);
        
        for(uint256 i = 0; i < propositionVotes.length; i++) {
            propositionVotes[i] = stats.propositionVotes[i];
        }
        
        return (stats.totalVoters, stats.votesCast, propositionVotes);
    }

    //
    //
    // KONIEC STATYSTYK
    //
    //

    // pobierz liste aktywnych głosowań
    function getActiveVotings(
        uint256 page, 
        uint256 perPage
    ) public view returns (
        VotingInfo[] memory votingsInfo,
        uint256 totalActive
    ) {
        require(page >= 0, "Page must be at least 0");
        require(perPage > 0, "perPage must be at least 1");

        // 1. Zbieranie aktywnych głosowań
        uint256[] memory allActive = new uint256[](votingCount);
        uint256 counter;
        
        for(uint256 i = 0; i < votingCount; i++) {
            if(votings[i].exists && 
            block.timestamp >= votings[i].startTime && 
            block.timestamp <= votings[i].endTime) 
            {
                allActive[counter] = i;
                counter++;
            }
        }
        
        // 2. Sortowanie po dacie startu (rosnąco)
        for(uint256 i = 0; i < counter; i++) {
            for(uint256 j = i+1; j < counter; j++) {
                if(votings[allActive[i]].startTime > votings[allActive[j]].startTime) {
                    (allActive[i], allActive[j]) = (allActive[j], allActive[i]);
                }
            }
        }
        
        // 3. Logika paginacji
        uint256 start = page * perPage;
        if(start >= counter) return (new VotingInfo[](0), counter);
        
        uint256 end = (start + perPage > counter) ? counter : start + perPage;
        votingsInfo = new VotingInfo[](end - start);

        for(uint256 k = 0; k < end - start; k++) {
            uint256 votingId = allActive[start + k];
            votingsInfo[k] = VotingInfo({
                id: votingId,
                title: votings[votingId].title,
                startTime: votings[votingId].startTime,
                endTime: votings[votingId].endTime,
                propositions: votings[votingId].propositions,
                votingType: votings[votingId].votingType
            });
        }
        
        totalActive = counter;
    }


    // pobierz liste nadchodzących głosowań
    function getIncomingVotings(uint256 page, uint256 perPage) public view returns (
        VotingInfo[] memory votingsInfo,
        uint256 totalIncoming
    ) {
        require(page >= 0, "Page must be at least 0");
        require(perPage > 0, "perPage must be at least 1");

        // 1. Zbieranie nadchodzących głosowań
        uint256[] memory allIncoming = new uint256[](votingCount);
        uint256 counter;
        
        for(uint256 i = 0; i < votingCount; i++) {
            if(votings[i].exists && block.timestamp < votings[i].startTime) {
                allIncoming[counter] = i;
                counter++;
            }
        }
        
        // 2. Sortowanie po dacie startu
        for(uint256 i = 0; i < counter; i++) {
            for(uint256 j = i+1; j < counter; j++) {
                if(votings[allIncoming[i]].startTime > votings[allIncoming[j]].startTime) {
                    (allIncoming[i], allIncoming[j]) = (allIncoming[j], allIncoming[i]);
                }
            }
        }
        
        // 3. Logika paginacji
        uint256 start = page * perPage;
        if(start >= counter) return (new VotingInfo[](0), counter);
        
        uint256 end = (start + perPage > counter) ? counter : start + perPage;
        votingsInfo = new VotingInfo[](end - start);
    
        for(uint256 k = 0; k < end - start; k++) {
            uint256 votingId = allIncoming[start + k];
            votingsInfo[k] = VotingInfo({
                id: votingId,
                title: votings[votingId].title,
                startTime: votings[votingId].startTime,
                endTime: votings[votingId].endTime,
                propositions: votings[votingId].propositions,
                votingType: votings[votingId].votingType
            });
        }
        
        totalIncoming = counter;
    }


    // pobierz liste zakończonych głosowań
    function getCompletedVotings(
        uint256 page, 
        uint256 perPage
    ) public view returns (
        VotingInfo[] memory votingsInfo,
        uint256 totalCompleted
    ) {
        require(page >= 0, "Page must be at least 0");
        require(perPage > 0, "perPage must be at least 1");

        // 1. Zbieranie zakończonych głosowań
        uint256[] memory allCompleted = new uint256[](votingCount);
        uint256 counter;
        
        for(uint256 i = 0; i < votingCount; i++) {
            if(votings[i].exists && block.timestamp > votings[i].endTime) {
                allCompleted[counter] = i;
                counter++;
            }
        }
        
        // 2. Sortowanie po dacie zakończenia (najnowsze pierwsze)
        for(uint256 i = 0; i < counter; i++) {
            for(uint256 j = i+1; j < counter; j++) {
                if(votings[allCompleted[i]].endTime < votings[allCompleted[j]].endTime) {
                    (allCompleted[i], allCompleted[j]) = (allCompleted[j], allCompleted[i]);
                }
            }
        }
        
        // 3. Logika paginacji
        uint256 start = page * perPage;
        if(start >= counter) return (new VotingInfo[](0), counter);
        
        uint256 end = (start + perPage > counter) ? counter : start + perPage;
        votingsInfo = new VotingInfo[](end - start);
        
        for(uint256 k = 0; k < end - start; k++) {
            uint256 votingId = allCompleted[start + k];
            votingsInfo[k] = VotingInfo({
                id: votingId,
                title: votings[votingId].title,
                startTime: votings[votingId].startTime,
                endTime: votings[votingId].endTime,
                propositions: votings[votingId].propositions,
                votingType: votings[votingId].votingType
            });
        }
        
        totalCompleted = counter;
    }
}