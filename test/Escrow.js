const { ethers, defaultAbiCoder, network } = require("hardhat");
const { expect } = require("chai");
const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');

describe("Escrow", function () {

    async function deployEscrowFixture() {

        const itemId = 1;
        const itemIdAttack = 2; // itemID for the reentrancy attack
        const price = ethers.parseEther("0.5"); // price of item offered by the seller (used for both normal & attack usecases)

        const [buyer, seller, arbiter, other, attacker] = await ethers.getSigners();

        // deployment of Escrow contract :

        // contract with state update after external calls, without nonReentrant:
        const Escrow = await ethers.getContractFactory("EscrowCompromised");
        
        // contract with state update before external calls & nonReentrant:
        //const Escrow = await ethers.getContractFactory("Escrow");
        const escrow = await Escrow.deploy();
        await escrow.waitForDeployment();

        console.log(`Escrow deployed to address: ${await escrow.target}`);

        const abiCoder = new ethers.AbiCoder();
        const purchaseId = ethers.keccak256(abiCoder.encode(
            ["address", "uint256"], 
            [buyer.address, itemId]
        ));
        console.log("Purchase ID:", purchaseId);

        // deployment of Attack contract:
        const Attack = await ethers.getContractFactory("Attack");
        const attack = await Attack.deploy(
            escrow.target,
            itemIdAttack,
            { value: ethers.parseEther("1") } // transfer 1 ETH to the Attack contract
        );

        const purchaseIdAttack = ethers.keccak256(abiCoder.encode(
            ["address", "uint256"], 
            [attacker.address, itemIdAttack]
        ));
        console.log("Attacker's Purchase ID:", purchaseIdAttack);

        return { escrow, attack, buyer, seller, arbiter, other, attacker, itemId, purchaseId, purchaseIdAttack, price };
    }

    async function initializeNewEscrow() {
        const { escrow, attack, buyer, seller, arbiter, other, attacker, itemId, purchaseId, purchaseIdAttack, price } = await loadFixture(deployEscrowFixture);

        const tx = await escrow.connect(buyer).newEscrow(
            buyer.address,
            seller.address,
            arbiter.address,
            itemId,
            price
        );

        await tx.wait();

        return { escrow, attack, buyer, seller, arbiter, other, attacker, itemId, purchaseId, purchaseIdAttack, price };
    }

    async function initializeNewEscrowAndDeposit() {
        const { escrow, attack, buyer, seller, arbiter, other, attacker, itemId, purchaseId, purchaseIdAttack, price } = await loadFixture(initializeNewEscrow);

        const txDeposit = await escrow.connect(buyer).deposit(itemId, { value: price });
        await txDeposit.wait();

        return { escrow, attack, buyer, seller, arbiter, other, attacker, itemId, purchaseId, purchaseIdAttack, price };
    }

    async function initializeNewEscrowAndDepositAndComplete() {
        const { escrow, attack, buyer, seller, arbiter, other, attacker, itemId, purchaseId, purchaseIdAttack, price } = await loadFixture(initializeNewEscrowAndDeposit);

        const txComplete = await escrow.connect(arbiter).completePurchase(buyer, itemId);
        await txComplete.wait();
        
        return { escrow, attack, buyer, seller, arbiter, other, attacker, itemId, purchaseId, purchaseIdAttack, price };
    }


    it(`newEscrow() test: 
        Buyer can create new escrow in the purchases mapping`, async function () {
        const { escrow, attack, buyer, seller, arbiter, other, attacker, itemId, purchaseId, purchaseIdAttack, price } = await loadFixture(deployEscrowFixture);
        
        const tx = await escrow.connect(buyer).newEscrow(
            buyer.address,
            seller.address,
            arbiter.address,
            itemId,
            price
        );

        await tx.wait();

        const purchase = await escrow.purchases(purchaseId);
        console.log("test 1", purchase);

        expect(purchase.buyer).to.equal(buyer.address);
        expect(purchase.seller).to.equal(seller.address);
        expect(purchase.arbiter).to.equal(arbiter.address);
        expect(purchase.itemId).to.equal(itemId);
        expect(purchase.price).to.equal(price);
        expect(purchase.status).to.equal(1); 
    
    });

    it(`newEscrow() test: 
        Arbiter can create new escrow in the purchases mapping. 
        Purchase mapping is correctly updated.
        Event is emitted`, async function () {
        
        const { escrow, buyer, seller, arbiter, other, itemId, purchaseId, price } = await loadFixture(deployEscrowFixture);
        
        await expect(escrow.connect(arbiter).newEscrow(
            buyer.address,
            seller.address,
            arbiter.address,
            itemId,
            price
        )).to.emit(escrow, "NewEscrow")
        .withArgs(buyer.address, seller.address, itemId, price);
        
        const purchase = await escrow.purchases(purchaseId);
        
        expect(purchase.status).to.equal(1);
        expect(purchase.buyer).to.equal(buyer.address);
        expect(purchase.seller).to.equal(seller.address);
        expect(purchase.arbiter).to.equal(arbiter.address);
        expect(purchase.itemId).to.equal(itemId);
        expect(purchase.price).to.equal(price);
    });

    it(`newEscrow() test: 
        Cannot go into escrow for an itemID already in escrow`, async function () {
        const { escrow, buyer, seller, arbiter, other, itemId, purchaseId, price } = await loadFixture(initializeNewEscrow);
        
        await expect(escrow.connect(other).newEscrow(
            other.address,
            seller.address,
            arbiter.address,
            itemId,
            price
        )).to.be.revertedWith("Item already in escrow");

    });

    it(`deposit() test: 
        Buyer deposits 1 ETH into escrow. 
        Escrow status, escrowBalance and depositedAt are correctly updated. 
        Event is emitted.`, async function () {

        const { escrow, buyer, seller, arbiter, other, itemId, purchaseId, price } = await loadFixture(initializeNewEscrow);

        await expect(escrow.connect(buyer).deposit(itemId, { value: price }))
            .to.emit(escrow, "Deposit")
            .withArgs(buyer.address, itemId, price, "complete");
        
        const purchase = await escrow.purchases(purchaseId);

        expect(purchase.status).to.equal(3); 
        expect(purchase.escrowBalance).to.equal(price);
        expect(purchase.depositedAt).to.be.greaterThan(0);

    });

    it(`deposit() test: 
        Buyer makes a partial deposit of 0.5 ETH into escrow. 
        Escrow status, escrowBalance and depositedAt are correctly updated. 
        Event is emitted.`, async function () {

        const { escrow, buyer, seller, arbiter, other, itemId, purchaseId, price } = await loadFixture(initializeNewEscrow);
        
        await expect(escrow.connect(buyer).deposit(itemId, { value: price/2n }))
            .to.emit(escrow, "Deposit")
            .withArgs(buyer.address, itemId, price/2n, "partial");
        
        const purchase = await escrow.purchases(purchaseId);

        expect(purchase.status).to.equal(2); 
        expect(purchase.escrowBalance).to.equal(price/2n);
        expect(purchase.depositedAt).to.be.greaterThan(0);

    });

    it(`deposit() test: 
        Buyer makes two partial deposits of 0.5 ETH into escrow. 
        Escrow status, escrowBalance and depositedAt are correctly updated`, async function () {

        const { escrow, buyer, seller, arbiter, other, itemId, purchaseId, price } = await loadFixture(initializeNewEscrow);
        
        const firstDeposit = await escrow.connect(buyer).deposit(itemId, { value: price/2n });
        await firstDeposit.wait();
        const curMapping = await escrow.purchases(purchaseId);

        expect(curMapping.status).to.equal(2); 
        expect(curMapping.escrowBalance).to.equal(price/2n);
        expect(curMapping.depositedAt).to.be.greaterThan(0);

        const secondDeposit = await escrow.connect(buyer).deposit(itemId, { value: price/2n });
        await secondDeposit.wait();
        const newMapping = await escrow.purchases(purchaseId);

        expect(newMapping.status).to.equal(3); 
        expect(newMapping.escrowBalance).to.equal(price);
        expect(newMapping.depositedAt).to.be.greaterThan(curMapping.depositedAt);

    });

    it(`deposit() test: 
        Buyer is not allowed to deposit funds greater than the item price`, async function () {

        const { escrow, buyer, seller, arbiter, other, itemId, purchaseId, price } = await loadFixture(initializeNewEscrow);
        
        await expect(escrow.connect(buyer).deposit(itemId, { value: price * 2n })).to.be.revertedWith("Deposit exceeds price"); 

    });

    it(`deposit() test: 
        Buyer is not allowed to make a second deposit that would result 
        in the escrowBalance being larger than the item price`, async function () {

        const { escrow, buyer, seller, arbiter, other, itemId, purchaseId, price } = await loadFixture(initializeNewEscrow);
        
        const firstDeposit = await escrow.connect(buyer).deposit(itemId, { value: price/2n });
        await firstDeposit.wait();
        const curMapping = await escrow.purchases(purchaseId);

        expect(curMapping.status).to.equal(2); 
        expect(curMapping.escrowBalance).to.equal(price/2n);
        expect(curMapping.depositedAt).to.be.greaterThan(0);

        await expect(escrow.connect(buyer).deposit(itemId, { value: price })).to.be.revertedWith("Deposit exceeds price");
    
    });

    it(`deposit() test: 
        Only the buyer can deposit`, async function () {

        const { escrow, buyer, seller, arbiter, other, itemId, purchaseId, price } = await loadFixture(initializeNewEscrow);
        
        await expect(escrow.connect(other).deposit(itemId, { value: price/2n })).to.be.revertedWith("Only the buyer can deposit");
    
    });

    it(`completePurchase() test: 
        The arbiter completes the purchase. 
        The purchase status is correctly updated and the event is emitted.`, async function () {

        const { escrow, buyer, seller, arbiter, other, itemId, purchaseId, price } = await loadFixture(initializeNewEscrowAndDeposit);

        await expect(escrow.connect(arbiter).completePurchase(buyer, itemId)).to.emit(escrow, "Complete").withArgs(buyer.address, itemId);
       
        const purchase = await escrow.purchases(purchaseId);
        
        expect(purchase.status).to.equal(4);
        expect(purchase.completedAt).to.be.greaterThan(0);
        expect(purchase.escrowBalance).to.equal(0);
    });

    it(`completePurchase() test: 
        Seller is not allowed to call the function`, async function () {

        const { escrow, buyer, seller, arbiter, other, itemId, purchaseId, price } = await loadFixture(initializeNewEscrowAndDeposit);

        await expect(escrow.connect(seller).completePurchase(buyer, itemId)).to.be.revertedWith("Only arbiter can complete the purchase");

    });

    it(`cancel() test: 
        Buyer cannot cancel escrow if 24 hours have not passed since the deposit`, async function () {

        const { escrow, buyer, seller, arbiter, other, itemId, purchaseId, price } = await loadFixture(initializeNewEscrowAndDeposit);

        await expect(escrow.connect(buyer).cancel(itemId)).to.be.revertedWith("Cancellation not allowed within 24 hours of deposit");

    });

    it(`cancel() test: 
        Buyer can cancel escrow if 24 hours have passed since the deposit. 
        Check status, escrowBalance and emitted event.`, async function () {

        const { escrow, buyer, seller, arbiter, other, itemId, purchaseId, price } = await loadFixture(initializeNewEscrowAndDeposit);

        await network.provider.send("evm_increaseTime", [86400]); // 24 hours in seconds
        await network.provider.send("evm_mine"); // mine a new block

        await expect(escrow.connect(buyer).cancel(itemId)).to.emit(escrow, "Cancel").withArgs(buyer.address, itemId);
        
        const purchase = await escrow.purchases(purchaseId);

        expect(purchase.status).to.equal(5);
        expect(purchase.escrowBalance).to.equal(0);
        expect(purchase.cancelledAt).to.be.greaterThan(0);
        
    });

    it(`cancel() test: 
        Buyer cannot cancel escrow if the purchase has been completed`, async function () {

        const { escrow, buyer, itemId } = await loadFixture(initializeNewEscrowAndDepositAndComplete);

        await expect(escrow.connect(buyer).cancel(itemId)).to.be.revertedWith("Escrow not in correct state");

    });

    it(`REENTRANCY ATTACK on cancel(): 
        Attacker starts with 1 ETH balance.
        Attacker deposits 0.1 ETH into escrow. 
        Escrow contract already has a balance of 0.5 ETH. 
        Attacker cancels the escrow and withdraws their deposit plus the contract balance. 
        Attacker's balance is now 1.5 ETH.`, async function () {
        
        const { escrow, attack, seller, arbiter, attacker, price } = await loadFixture(initializeNewEscrowAndDeposit);

        // add a delay of 24 hours after the deposit
        await network.provider.send("evm_increaseTime", [86400]); // 24 hours in seconds
        await network.provider.send("evm_mine"); // mine a new block

        const attackNewEscrow = await attack.connect(attacker).initializeEscrow(
            seller.address,
            arbiter.address,
            price,
            ethers.parseEther("0.1") // depositAmount
        );

        await attackNewEscrow.wait();
        console.log("Attacker created new escrow and deposited 0.1 ETH");

        await network.provider.send("evm_increaseTime", [86400]); // 24 hours in seconds
        await network.provider.send("evm_mine"); // mine a new block

        const escrowBalanceBefore = await ethers.provider.getBalance(escrow.target);
        console.log(`Balance of the escrow contract before cancel call: ${ethers.formatEther(escrowBalanceBefore)} ETH`);

        const attackerBalanceBefore = await ethers.provider.getBalance(attack.target);
        console.log(`Balance of the attack contract before cancel call: ${ethers.formatEther(attackerBalanceBefore)} ETH`);

        const withdrawFunds = await attack.connect(attacker).attack();
        await withdrawFunds.wait();
        console.log("Attack completed.");

        const escrowBalanceAfter = await ethers.provider.getBalance(escrow.target);
        console.log(`Balance of the escrow contract after cancel call: ${ethers.formatEther(escrowBalanceAfter)} ETH`);

        const attackerBalanceAfter = await ethers.provider.getBalance(attack.target);
        console.log(`Balance of the attack contract after cancel call: ${ethers.formatEther(attackerBalanceAfter)} ETH`);

        expect(attackerBalanceAfter).to.equal(ethers.parseEther("1.5"));
        expect(escrowBalanceAfter).to.equal(0);
    });

    


});