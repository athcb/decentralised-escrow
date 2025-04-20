const { ethers, artifacts } = require("hardhat");
const { JsonRpcProvider } = require("ethers");
require("dotenv").config();

async function main() {

    const [deployer] = await ethers.getSigners()

    //const contractArtifacts = await artifacts.readArtifact("Escrow"); 
    const contractArtifacts = await artifacts.readArtifact("EscrowCompromised"); 

    const Escrow = new ethers.ContractFactory(contractArtifacts.abi, contractArtifacts.bytecode, deployer);
    const escrow = await Escrow.deploy();
    await escrow.waitForDeployment();

    console.log(`Escrow deployed to address: ${await escrow.getAddress()}`);
}

main()
    .then( () => process.exit(0))
    .catch( (error) => {
        console.error(error);
        process.exit(1);    
    })

