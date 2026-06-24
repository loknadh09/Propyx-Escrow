// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Escrow {

    address public admin;
    address public buyer;
    address public seller;
    
    string public propertyDescription;
    uint256 public transactionAmount;
    uint256 public deadline;

    bool public isDeposited;
    bool public buyerConfirmed;
    bool public sellerConfirmed;
    
    enum State { AWAITING_DEPOSIT, AWAITING_CONFIRMATION, COMPLETED, REFUNDED }
    State public currentState;

    constructor(
        address _buyer,
        address _seller,
        string memory _propertyDescription,
        uint256 _transactionAmount,
        uint256 _deadlineDuration
    ) {
        admin = msg.sender;
        buyer = _buyer;
        seller = _seller;
        propertyDescription = _propertyDescription;
        transactionAmount = _transactionAmount;
        deadline = block.timestamp + _deadlineDuration;
        currentState = State.AWAITING_DEPOSIT;
    }

    function deposit() public payable {
        require(msg.sender == buyer, "Only buyer can deposit");
        require(currentState == State.AWAITING_DEPOSIT, "Already deposited or closed");
        require(msg.value == transactionAmount, "Incorrect deposit amount");

        isDeposited = true;
        currentState = State.AWAITING_CONFIRMATION;
    }

    function confirmBuyer() public {
        require(msg.sender == buyer, "Only buyer can confirm");
        require(currentState == State.AWAITING_CONFIRMATION, "Not in confirmation state");
        buyerConfirmed = true;
        
        if (buyerConfirmed && sellerConfirmed) {
            releaseFunds();
        }
    }

    function confirmSeller() public {
        require(msg.sender == seller, "Only seller can confirm");
        require(currentState == State.AWAITING_CONFIRMATION, "Not in confirmation state");
        sellerConfirmed = true;
        
        if (buyerConfirmed && sellerConfirmed) {
            releaseFunds();
        }
    }

    function releaseFunds() internal {
        require(currentState == State.AWAITING_CONFIRMATION, "Invalid state");
        require(isDeposited, "Funds not deposited");
        require(buyerConfirmed && sellerConfirmed, "Both must confirm");

        currentState = State.COMPLETED;
        payable(seller).transfer(address(this).balance);
    }

    function refundBuyer() public {
        require(currentState == State.AWAITING_CONFIRMATION, "Invalid state");
        // Can only refund if admin forces it (transaction fails) OR deadline has expired
        require(msg.sender == admin || block.timestamp > deadline, "Not authorized or deadline not met");
        
        currentState = State.REFUNDED;
        payable(buyer).transfer(address(this).balance);
    }
}