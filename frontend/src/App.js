import { ethers } from "ethers";
import React, { useEffect, useState } from "react";
import { ESCROW_CONTRACT_ADDRESS_LOCALHOST } from "./contracts/config";
import EscrowArtifact from "./contracts//Escrow.json";

import logo from './logo.svg';
import './App.css';

// each item has a designated, independent arbiter
const itemsForSale = [
  {
    id: 1,
    name: "Winter Cottage",
    price: "100",
    seller: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", 
    arbiter: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
  },
  {
    id: 2,
    name: "City Apartment",
    price: "150",
    seller: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    arbiter: " 0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc",
  },
  {
    id: 3,
    name: "Beach House",
    price: "250",
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
  const [notification, setNotification] = useState(null);
  const [createdEscrows, setCreatedEscrows] = useState([]);



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
        ESCROW_CONTRACT_ADDRESS_LOCALHOST,
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
    <div className="min-h-screen bg-[#1E1E1E] text-gray-300 font-sans p-6">
      <header className="mb-10">
        <h1 className="text-3xl font-bold text-center mb-4">🏠 Escrow DApp</h1>
        {!isConnected ? (
          <div className="text-center">
            <button
              onClick={connectContract}
              className="bg-black border border-gray-700 text-gray-200 px-4 py-2 rounded-md hover:bg-gray-900 transition"
            >
              Connect Wallet
            </button>
          </div>
        ) : (
          <div className="text-center">
            <p>🔗 Connected: {account}</p>
            <p className="text-sm text-gray-500">
              Contract: {ESCROW_CONTRACT_ADDRESS_LOCALHOST}
            </p>
          </div>
        )}
      </header>
  
      <section>
        <h2 className="text-2xl font-semibold mb-4">Marketplace</h2>
        <div className="grid md:grid-cols-3 sm:grid-cols-2 gap-6">
          {itemsForSale.map((item) => (
            <div
            key={item.id}
            className="bg-black p-6 rounded-xl border border-gray-800 shadow-md transition-all duration-200 hover:bg-gray-900 hover:scale-[1.02] cursor-pointer"
          >
            <h3 className="text-lg font-semibold mb-2">{item.name}</h3>
            <p className="mb-1">💰 {item.price} ETH</p>
            <button
              onClick={() => {
                setSelectedItem(item);
                setSeller(item.seller);
                setPrice(item.price);
                setItemId(item.id.toString());
                setArbiter(item.arbiter);
              }}
              className="mt-4 w-full bg-black border border-gray-700 text-gray-200 py-2 rounded-md hover:bg-gray-800 transition"
            >
              Select Item
            </button>
          </div>
          ))}
        </div>
      </section>
  
      {isConnected && (
        <section className="mt-12 max-w-xl mx-auto">
          <div className="bg-black p-6 rounded-xl border border-gray-800 text-gray-300">
            <h2 className="text-xl font-bold mb-4">Create Escrow</h2>
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
          
                  setCreatedEscrows(prev => [...prev, { id: purchaseId, data: purchase }]);

                  console.log("Purchase created:", purchase);
                  setNotification({ type: "success", message: "Escrow created successfully." });

                  // Auto-dismiss after 4 seconds
                  setTimeout(() => setNotification(null), 4000);
                } catch (err) {
                  console.error(err);
                  alert("Transaction failed");
                }
              }}
            >
              <div className="mb-4">
                <label className="block mb-1">Seller Address</label>
                <input
                  className="w-full p-2 bg-[#2a2a2a] text-gray-200 border border-gray-700 rounded-md"
                  value={seller}
                  readOnly
                />
              </div>
              <div className="mb-4">
                <label className="block mb-1">Arbiter Address</label>
                <input
                  className="w-full p-2 bg-[#2a2a2a] text-gray-200 border border-gray-700 rounded-md"
                  value={arbiter}
                  readOnly
                />
              </div>
              <div className="mb-4">
                <label className="block mb-1">Item ID</label>
                <input
                  className="w-full p-2 bg-[#2a2a2a] text-gray-200 border border-gray-700 rounded-md"
                  value={itemId}
                  readOnly
                />
              </div>
              <div className="mb-6">
                <label className="block mb-1">Price (ETH)</label>
                <input
                  className="w-full p-2 bg-[#2a2a2a] text-gray-200 border border-gray-700 rounded-md"
                  value={price}
                  readOnly
                />
              </div>
              <button
                type="submit"
                className="w-full bg-black border border-gray-700 py-2 rounded-md text-gray-200 hover:bg-gray-900 transition"
              >
                Create Escrow
              </button>
            </form>
          </div>
        </section>
      )}

    {createdEscrows.length > 0 && (
      <section className="mt-12 max-w-2xl mx-auto text-gray-300">
        <h2 className="text-xl font-semibold mb-4">Your Created Escrows</h2>

        <div className="space-y-4">
          {createdEscrows.map((escrow, idx) => (
            <div
              key={escrow.id}
              className="bg-black border border-gray-800 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-gray-900 transition"
            >
              <div>
                <p className="text-sm text-gray-400">Escrow #{idx + 1}</p>
                <p className="text-sm">ID: {escrow.id.slice(0, 10)}...</p>
                {/* Optional: <p>Status: {escrow.data.status}</p> */}
              </div>

              <div className="flex flex-col md:flex-row items-center gap-2">
                <input
                  type="text"
                  placeholder="Amount (ETH)"
                  className="bg-gray-800 border border-gray-700 text-white px-2 py-1 rounded"
                  onChange={(e) => {
                    const amount = e.target.value;
                    const updated = [...createdEscrows];
                    updated[idx].amount = amount;
                    setCreatedEscrows(updated);
                  }}
                />
                <button
                  className="bg-green-700 hover:bg-green-600 px-4 py-1 rounded text-sm"
                  onClick={async () => {
                    try {
                      const tx = await contract.deposit(
                        account,
                        escrow.data.itemId,
                        {
                          value: ethers.parseEther(escrow.amount || "0"),
                        }
                      );
                      await tx.wait();
                      setNotification({ type: "success", message: "Deposit successful!" });
                      setTimeout(() => setNotification(null), 4000);
                    } catch (err) {
                      console.error(err);
                      setNotification({ type: "error", message: "Deposit failed." });
                      setTimeout(() => setNotification(null), 4000);
                    }
                  }}
                >
                  Deposit
                </button>
                <button
                  className="bg-red-700 hover:bg-red-600 px-4 py-1 rounded text-sm"
                  onClick={async () => {
                    try {
                      const tx = await contract.cancelPurchase(account, escrow.data.itemId);
                      await tx.wait();
                      setNotification({ type: "success", message: "Purchase cancelled." });
                      setTimeout(() => setNotification(null), 4000);
                    } catch (err) {
                      console.error(err);
                      setNotification({ type: "error", message: "Cancel failed." });
                      setTimeout(() => setNotification(null), 4000);
                    }
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    )}

    </div>
  );
  
  
}

export default App;
