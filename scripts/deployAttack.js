const { ethers, artifacts } = require("hardhat");
const { JsonRpcProvider } = require("ethers");
require("dotenv").config();

async function main() {

    console.log("Escrow contract address: ", process.env.ESCROW_CONTRACT_ADDRESS_LOCALHOST);

    const [signer] = await ethers.getSigners();
    console.log("Signer address: ", signer.address);
    console.log("Signer: ", signer);

    const balance = await signer.provider.getBalance(signer.address);
    console.log("Signer balance: ", ethers.formatEther(balance));
    console.log(`Signer nonce:  ${await signer.getNonce()}`)

    const contractArtifacts = await artifacts.readArtifact("Attack");

    const Attack = new ethers.ContractFactory(
        contractArtifacts.abi, 
        contractArtifacts.bytecode, 
        signer
    );

    const attack = await Attack.deploy(
        process.env.ESCROW_CONTRACT_ADDRESS_LOCALHOST,
        parseInt(1), //itemId
        { value: ethers.parseEther("0.2") }
    );

    await attack.waitForDeployment();

    console.log(`Attack contract deployed to: ${attack.target}`);
    const attackBalance = await ethers.provider.getBalance(attack.target);
    console.log(`Contract's balance: ${ethers.formatEther(attackBalance)} ETH`);

}


main()
    .then( () => process.exit(0))
    .catch( (error) => {
        console.error(error);
        process.exit(1);
    })