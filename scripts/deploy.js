const { ethers, artifacts } = require("hardhat");
const { JsonRpcProvider } = require("ethers");
require("dotenv").config();

async function main() {

    const privateKey = process.env.TEST_PRIVATE_KEY;
    const url = process.env.ALCHEMY_TESTNET_URL;
    const provider = new JsonRpcProvider(url);

    const wallet = new ethers.Wallet(privateKey, provider);

    const contractArtifacts = await artifacts.readArtifact("Escrow"); 

    const Escrow = new ethers.ContractFactory(contractArtifacts.abi, contractArtifacts.bytecode, wallet);
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

