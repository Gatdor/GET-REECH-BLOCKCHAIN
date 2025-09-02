// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract CatchTraceability {
    struct Catch {
        string batchId;
        string fishermanID;
        string species;
        uint256 weight; // in grams
        string location;
        string timestamp;
        string dryingMethod;
        uint256 batchSize; // in grams
        uint256 shelfLife; // in days
        uint256 price; // in cents
        string[] imageUrls;
    }

    mapping(string => Catch) public catches;

    event CatchCreated(string batchId, string fishermanID, string species, uint256 weight, string location, string timestamp);

    function createCatch(
        string memory batchId,
        string memory fishermanID,
        string memory species,
        uint256 weight,
        string memory location,
        string memory timestamp,
        string memory dryingMethod,
        uint256 batchSize,
        uint256 shelfLife,
        uint256 price,
        string[] memory imageUrls
    ) public {
        catches[batchId] = Catch(
            batchId,
            fishermanID,
            species,
            weight,
            location,
            timestamp,
            dryingMethod,
            batchSize,
            shelfLife,
            price,
            imageUrls
        );
        emit CatchCreated(batchId, fishermanID, species, weight, location, timestamp);
    }

    function getCatch(string memory batchId) public view returns (Catch memory) {
        return catches[batchId];
    }
}
