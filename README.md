# Decentralised Escrow Project

This project implements a **decentralised escrow service** designed for use in a **real estate marketplace**. The system allows buyers and sellers to interact in a secure environment, using smart contracts to ensure the safe handling of funds throughout the transaction process.

## Features

### Escrow Smart Contract

- **Secure Fund Handling**: The contract allows a buyer to deposit funds into escrow for a purchase. The funds are securely held in the contract until the arbiter confirms the transaction as complete.
- **Arbiter Role**: An arbiter is designated to oversee the transaction, ensuring fairness between the buyer and seller.
- **Partial Deposits**: The system supports partial deposits, giving flexibility to both parties during the transaction.
- **Escrow Expiry**: If 24 hours pass after the deposit, the escrow can be cancelled, as long as the purchase has not been completed. 
- **Unique Purchase ID**: Each purchase is assigned a unique ID based on the buyer's address and the item ID, ensuring the integrity of each transaction.
- **Single Item in Escrow**: The contract ensures that an item cannot be in multiple escrows at the same time, preventing double transactions.
- **Event Emissions**: The contract emits events for key actions, including:
  - **Escrow Creation**: For new escrow transactions.
  - **Deposit**: When a deposit is made by the buyer.
  - **Completion**: When the arbiter confirms the transaction as complete.
  - **Cancellation**: When the escrow is cancelled after the 24-hour period.
