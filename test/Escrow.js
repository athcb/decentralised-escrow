const { ethers, defaultAbiCoder, network } = require("hardhat");
const { expect } = require("chai");
const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');

describe("Escrow", function () {

    async function deployEscrowFixture() {

        const Escrow = await ethers.getContractFactory("Escrow");
        const escrow = await Escrow.deploy();
        await escrow.waitForDeployment();

        console.log(`Escrow deployed to address: ${await escrow.target}`);

        const [buyer, seller, arbiter, other] = await ethers.getSigners();

        console.log("Buyer address:", buyer.address);
        console.log("Seller address:", seller.address);
        console.log("Arbiter address:", arbiter.address);
        console.log("Other address:", other.address);   

        const itemId = 1;

        const abiCoder = new ethers.AbiCoder();
        const purchaseId = ethers.keccak256(abiCoder.encode(
            ["address", "uint256"], 
            [buyer.address, itemId]
        ));
        console.log("Purchase ID:", purchaseId);


        const price = ethers.parseEther("0.1");

        return { escrow, buyer, seller, arbiter, other, itemId, purchaseId, price };
    }

    async function initializeNewEscrow() {
        const { escrow, buyer, seller, arbiter, other, itemId, purchaseId, price } = await loadFixture(deployEscrowFixture);

        const tx = await escrow.connect(buyer).newEscrow(
            buyer.address,
            seller.address,
            arbiter.address,
            itemId,
            price
        );

        await tx.wait();

        return { escrow, buyer, seller, arbiter, other, itemId, purchaseId, price };
    }

    async function initializeNewEscrowAndDeposit() {
        const { escrow, buyer, seller, arbiter, other, itemId, purchaseId, price } = await loadFixture(initializeNewEscrow);

        const txDeposit = await escrow.connect(buyer).deposit(itemId, { value: price });
        await txDeposit.wait();

        return { escrow, buyer, seller, arbiter, other, itemId, purchaseId, price };
    }

    async function initializeNewEscrowAndDepositAndComplete() {
        const { escrow, buyer, seller, arbiter, other, itemId, purchaseId, price } = await loadFixture(initializeNewEscrowAndDeposit);

        const txComplete = await escrow.connect(arbiter).completePurchase(buyer, itemId);
        await txComplete.wait();
        
        return { escrow, buyer, seller, arbiter, other, itemId, purchaseId, price };
    }


    it("newEscrow Function: Buyer can create new escrow in the purchases mapping", async function () {
        const { escrow, buyer, seller, arbiter, other, itemId, purchaseId, price } = await loadFixture(deployEscrowFixture);
        
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

    it("newEscrow Function: arbiter can create new escrow in the purchases mapping. Purchase mapping is correctly updated and event is emitted", async function () {
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

    it("deposit Function: Buyer deposits 1 ETH into escrow. Escrow status, escrowBalance and depositedAt are correctly updated. Event is emitted.", async function () {

        const { escrow, buyer, seller, arbiter, other, itemId, purchaseId, price } = await loadFixture(initializeNewEscrow);

        await expect(escrow.connect(buyer).deposit(itemId, { value: price }))
            .to.emit(escrow, "Deposit")
            .withArgs(buyer.address, itemId, price, "complete");
        
        const purchase = await escrow.purchases(purchaseId);

        expect(purchase.status).to.equal(3); 
        expect(purchase.escrowBalance).to.equal(price);
        expect(purchase.depositedAt).to.be.greaterThan(0);

    });

    it("deposit Function: Buyer makes a partial deposit of 0.5 ETH into escrow. Escrow status, escrowBalance and depositedAt are correctly updated. Event is emitted.", async function () {

        const { escrow, buyer, seller, arbiter, other, itemId, purchaseId, price } = await loadFixture(initializeNewEscrow);
        
        await expect(escrow.connect(buyer).deposit(itemId, { value: price/2n }))
            .to.emit(escrow, "Deposit")
            .withArgs(buyer.address, itemId, price/2n, "partial");
        
        const purchase = await escrow.purchases(purchaseId);

        expect(purchase.status).to.equal(2); 
        expect(purchase.escrowBalance).to.equal(price/2n);
        expect(purchase.depositedAt).to.be.greaterThan(0);

    });

    it("deposit Function: Buyer makes two partial deposits of 0.5 ETH into escrow and escrow status, escrowBalance and depositedAt are correctly updated", async function () {

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

    it("deposit Function: Buyer is not allowed to deposit funds greater than the item price", async function () {

        const { escrow, buyer, seller, arbiter, other, itemId, purchaseId, price } = await loadFixture(initializeNewEscrow);
        
        await expect(escrow.connect(buyer).deposit(itemId, { value: price * 2n })).to.be.revertedWith("Deposit exceeds price"); 

    });

    it("deposit Function: Buyer is not allowed to make a second deposit that would result in the escrowBalance being larger than the item price", async function () {

        const { escrow, buyer, seller, arbiter, other, itemId, purchaseId, price } = await loadFixture(initializeNewEscrow);
        
        const firstDeposit = await escrow.connect(buyer).deposit(itemId, { value: price/2n });
        await firstDeposit.wait();
        const curMapping = await escrow.purchases(purchaseId);

        expect(curMapping.status).to.equal(2); 
        expect(curMapping.escrowBalance).to.equal(price/2n);
        expect(curMapping.depositedAt).to.be.greaterThan(0);

        await expect(escrow.connect(buyer).deposit(itemId, { value: price })).to.be.revertedWith("Deposit exceeds price");
    
    });

    it("deposit Function: Only the buyer can deposit", async function () {

        const { escrow, buyer, seller, arbiter, other, itemId, purchaseId, price } = await loadFixture(initializeNewEscrow);
        
        await expect(escrow.connect(other).deposit(itemId, { value: price/2n })).to.be.revertedWith("Only the buyer can deposit");
    
    });

    it("completePurchase Function: The arbiter completes the purchase. The purchase status is correctly updated and the event is emitted.", async function () {

        const { escrow, buyer, seller, arbiter, other, itemId, purchaseId, price } = await loadFixture(initializeNewEscrowAndDeposit);

        await expect(escrow.connect(arbiter).completePurchase(buyer, itemId)).to.emit(escrow, "Complete").withArgs(buyer.address, itemId);
       
        const purchase = await escrow.purchases(purchaseId);
        
        expect(purchase.status).to.equal(4);
        expect(purchase.completedAt).to.be.greaterThan(0);
        expect(purchase.escrowBalance).to.equal(0);
    });

    it("completePurchase Function: Seller is not allowed to call the function", async function () {

        const { escrow, buyer, seller, arbiter, other, itemId, purchaseId, price } = await loadFixture(initializeNewEscrowAndDeposit);

        await expect(escrow.connect(seller).completePurchase(buyer, itemId)).to.be.revertedWith("Only arbiter can complete the purchase");

    });

    it("cancel Function: Buyer cannot cancel escrow if 24 hours have not passed since the deposit", async function () {

        const { escrow, buyer, seller, arbiter, other, itemId, purchaseId, price } = await loadFixture(initializeNewEscrowAndDeposit);

        await expect(escrow.connect(buyer).cancel(itemId)).to.be.revertedWith("Cancellation not allowed within 24 hours of deposit");

    });

    it("cancel Function: Buyer can cancel escrow if 24 hours have passed since the deposit. Check status, escrowBalance and emitted event.", async function () {

        const { escrow, buyer, seller, arbiter, other, itemId, purchaseId, price } = await loadFixture(initializeNewEscrowAndDeposit);

        await network.provider.send("evm_increaseTime", [86400]); // 24 hours in seconds
        await network.provider.send("evm_mine"); // mine a new block

        await expect(escrow.connect(buyer).cancel(itemId)).to.emit(escrow, "Cancel").withArgs(buyer.address, itemId);
        
        const purchase = await escrow.purchases(purchaseId);

        expect(purchase.status).to.equal(5);
        expect(purchase.escrowBalance).to.equal(0);
        expect(purchase.cancelledAt).to.be.greaterThan(0);
        
    });

    it("cancel Function: Buyer cannot cancel escrow if the purchase has been completed", async function () {

        const { escrow, buyer, seller, arbiter, other, itemId, purchaseId, price } = await loadFixture(initializeNewEscrowAndDepositAndComplete);

        await expect(escrow.connect(buyer).cancel(itemId)).to.be.revertedWith("Escrow not in correct state");

    });

    


});