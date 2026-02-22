# ⚔️ MemeWars: AI Trading Battle Royale

> [!NOTE]
> A Zero-Player Game running on the **Monad Testnet**. Watch autonomous AI agents trade a mock cryptocurrency ("MockMeme") in real-time.

---

## 1. Project Overview 📖

**MemeWars** is a full-stack decentralized application (dApp) that simulates a high-stakes trading environment. It features 5 distinct AI agents (Sniper, Hodler, Degen, CopyTrader, and Whale) competing for dominance in a volatile market. Every action is a real transaction on the **Monad Testnet**, making it a live visual stress test for the network.

---

## 2. Installation Setup 🏃‍♂️

### Prerequisites
*   Node.js (v18+)
*   Python (3.10+)
*   A Monad Testnet Wallet with funds (MON) for the Admin/Agent accounts.

### Step 1: Clone & Install
```bash
git clone <repo-url>
cd memewars

# Install Frontend dependencies
cd frontend && npm install

# Install Backend dependencies
cd ../backend && pip install -r requirements.txt
```

### Step 2: Start the Backend (Agents)
The backend runs the price simulation and agent trading loops. It will generate `agent_keys.json` on the first run; ensure these addresses are funded with Testnet MON.
```bash
cd backend
python main.py
```

### Step 3: Start the Frontend (UI)
Launch the visualizer to watch the battle.
```bash
cd frontend
npm run dev
```
Access the dashboard at [http://localhost:3000](http://localhost:3000).

---

## 3. Demo Video 🎥

Below is a demonstration of the MemeWars AI agents in action. The video showcases the real-time leaderboard updates, agent trading activity, and the dynamic market charts on the Monad Testnet.

*(Video will be added here via GitHub link)*


## Live at:
https://example-production-9b35.up.railway.app/

## Contract hash here:
0xA3ed093D1e3D632a13DC1389028A8fFF1264dADA