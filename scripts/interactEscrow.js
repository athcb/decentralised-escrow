const { ethers, artifacts } = require("hardhat");
const { JsonRpcProvider } = require("ethers");
require("dotenv").config();



async function main() {

    const url = process.env.LOCALHOST_URL;
    const provider = new ethers.JsonRpcProvider(url);
    const contractAddress = process.env.ESCROW_CONTRACT_ADDRESS_LOCALHOST;	
    console.log("Contract Address: ", contractAddress);
    const contractArtifacts = await artifacts.readArtifact("Escrow");
    //console.log(contractArtifacts.abi);
    
    const signers = await ethers.getSigners();
    const deployer = signers[0];
    console.log("Signers: ", deployer);
    const escrow = new ethers.Contract(contractAddress, contractArtifacts.abi, deployer);

    const code = await provider.getCode(contractAddress);
    //console.log(`ByteCode: ${code }`);
    if (code === "0x") {
        throw new Error("Contract not deployed");
    }

    const itemList = [
        {
            itemId: 1, 
            price: ethers.parseEther("0.1"),
            seller: signers[1].address,
            sellerSigner: signers[1],
            arbiter: signers[2].address,
            arbiterSigner: signers[2]
        },
        {
            itemId: 2, 
            price: ethers.parseEther("0.2"),
            seller: signers[3].address,
            sellerSigner: signers[3],
            arbiter: signers[4].address,
            arbiterSigner: signers[4]
        },
    ]

    // create new escrow
    //function newEscrow(address buyer, address seller, address arbiter, uint itemId, uint price) external {

    /*
    const newEscrow1 = await escrow.newEscrow(
        deployer.address, 
        itemList[0].seller,
        itemList[0].arbiter,
        itemList[0].itemId,
        itemList[0].price
    );
    await newEscrow1.wait();
    console.log("Escrow created for itemId 1");
    */

    const abiCoder = new ethers.AbiCoder();
    const purchaseId = ethers.keccak256(abiCoder.encode(["address", "uint256"], [deployer.address, itemList[0].itemId]));
    console.log("Purchase ID: ", purchaseId);

    //const viewEscrow1 = await escrow.purchases(purchaseId)
    //console.log("Escrow 1 details: ", viewEscrow1);
    //console.log("Escrow 1 Status after new escrow creation:", viewEscrow1.status);

    //const depositEscrow1 = await escrow.deposit(itemList[0].itemId,  { value: itemList[0].price });
    //await depositEscrow1.wait();
    //console.log("Escrow 1 deposit made");

    //const uodatedEscrow1 = await escrow.purchases(purchaseId)
    //console.log("Escrow 1 Status after deposit:", uodatedEscrow1.status);

    // completePurchase(address buyer, uint itemId) external 
    const completePurchase1 = await escrow.connect(itemList[0].arbiterSigner).completePurchase(deployer.address, itemList[0].itemId);
    await completePurchase1.wait();
    console.log("Escrow 1 completed");

    const viewFinalEntry = await escrow.purchases(purchaseId)
    console.log("Escrow 1 Status after completion:", viewFinalEntry.status);



}


main()
    .then( () => process.exit(0))
    .catch( (error) => {
        console.error(error);
        process.exit(1);
    })