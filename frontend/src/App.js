import { ethers } from "ethers";
import React, { useEffect, useState } from "react";
import { ESCROW_CONTRACT_ADDRESS } from "./contracts/config";
import EscrowArtifact from "./contracts//Escrow.json";

import logo from './logo.svg';
import './App.css';

const itemsForSale = [
  {
    id: 1,
    name: "Vintage Camera",
    price: "0.05",
    seller: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", 
    arbiter: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
  },
  {
    id: 2,
    name: "Digital Art Piece",
    price: "0.1",
    seller: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    arbiter: " 0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc",
  },
  {
    id: 3,
    name: "Gaming Console",
    price: "0.2",
    seller: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
    arbiter: "0x976EA74026E726554dB657fA54763abd0C3a0aa9"
  },
];


function App() {

  const [contract, setContract] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [seller, setSeller] = useState("");
  const [arbiter, setArbiter] = useState("");
  const [itemId, setItemId] = useState("");
  const [price, setPrice] = useState("");
  const [selectedItem, setSelectedItem] = useState(null);

  const connectContract = async () => {

    try {

      if (!window.ethereum) {
        alert("Please install MetaMask to use this app.");
        return;
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      provider.getNetwork().then(console.log);

      const signer = await provider.getSigner();
      const account = await signer.getAddress();
      const escrow = new ethers.Contract(
        ESCROW_CONTRACT_ADDRESS,
        EscrowArtifact.abi,
        signer
      );

      console.log("Contract connected:", escrow);
      console.log("Contract address:", escrow.target);

      setContract(escrow);
      setProvider(provider);
      setSigner(signer);
      setAccount(account);
      setIsConnected(true);

    } catch (error) {
      console.error("Error connecting to contract:", error);
    }

  }

  useEffect(() => {
    if (selectedItem) {
      setSeller(selectedItem.seller);
      setPrice(selectedItem.price);
      setItemId(selectedItem.id);
      setArbiter(selectedItem.arbiter);
    }
  }, [selectedItem]);

  const [purchaseId, setPurchaseId] = useState(null);

  useEffect(() => {
    if (account && itemId) {
      const abiCoder = new ethers.AbiCoder();
      const encoded = abiCoder.encode(["address", "uint256"], [account, parseInt(itemId)]);
      const id = ethers.keccak256(encoded);
      setPurchaseId(id);
      console.log("Purchase ID:", id);
    }
  }, [account, itemId]);




  return (
    <>

    <div className="App">
      <h1> Escrow DApp </h1>
      {!isConnected ? ( 
        <button onClick={connectContract}> Connect Wallet </button>
      ) : (
        <div> 
          <p> Connected: {account}  </p> 
          <p> Contract address: {ESCROW_CONTRACT_ADDRESS}  </p>
        </div>
      )}
    </div>

    <div>
      <h2>Marketplace</h2>
      <ul>
        {itemsForSale.map((item) => (
          <li key={item.id} style={{ marginBottom: "1rem" }}>
            <strong>{item.name}</strong> – {item.price} ETH<br />
            <button onClick={() => {
              setSelectedItem(item);
              setSeller(item.seller);
              setPrice(item.price);
              setItemId(item.id.toString());
              setArbiter(item.arbiter); 
              alert(`Selected item: ${item.name}`);
            }}>
              Select Item
            </button>
          </li>
        ))}
      </ul>
    </div>


    {isConnected && (
      <div style={{ marginTop: "2rem" }}>
        <h2>Create Escrow</h2>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              const tx = await contract.newEscrow(
                account,
                seller,
                arbiter,
                parseInt(itemId),
                ethers.parseEther(price)
              );
              await tx.wait();
              const purchase = await contract.purchases(purchaseId);
              console.log("Purchase created:", purchase);
              alert("Escrow created successfully with status", purchase.status);

            } catch (err) {
              console.error(err);
              alert("Transaction failed");
            }
          }}
        >
          <div>
            <label>Seller Address:</label>
            <input
              type="text"
              value={seller}
              readOnly
            />
          </div>
          <div>
            <label>Arbiter Address:</label>
            <input
              type="text"
              value={arbiter}
              readOnly
            />
          </div>
          <div>
            <label>Item ID:</label>
            <input
              type="number"
              value={itemId}
              readOnly
            />
          </div>
          <div>
            <label>Price (ETH):</label>
            <input
              type="text"
              value={price}
              readOnly
            />
          </div>
          <button type="submit">Create Escrow</button>
        </form>
      </div>
    )}

    </>



  );
}

export default App;
