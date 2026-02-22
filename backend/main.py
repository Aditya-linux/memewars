import asyncio
import time
import json
import os
import random
from web3 import Web3
from dotenv import load_dotenv
from aiohttp import web
import aiohttp_cors
from agents import MemeAgent

# Load environment variables (local .env for dev, Railway env vars in production)
load_dotenv()

# Configuration
RPC_URL = os.getenv("RPC_URL", "https://testnet-rpc.monad.xyz/")
ARENA_ADDRESS = os.getenv("ARENA_ADDRESS", "0xa970eb753d93217Fc12687225889121494EFd41A")
API_PORT = int(os.getenv("PORT", "8080"))

# Read ABI from local file (self-contained, no relative path dependency)
try:
    with open(os.path.join(os.path.dirname(__file__), "arena_abi.json"), "r") as f:
        contract_json = json.load(f)
        ARENA_ABI = contract_json["abi"]
except FileNotFoundError:
    print("Error: arena_abi.json not found in backend folder.")
    exit(1)

# Initialize Web3
w3 = Web3(Web3.HTTPProvider(RPC_URL))
if not w3.is_connected():
    print("Error: Could not connect to Monad Testnet")
    exit(1)

arena_contract = w3.eth.contract(address=ARENA_ADDRESS, abi=ARENA_ABI)

# Strategy Definitions
STRATEGIES = ["Sniper", "Hodler", "Degen", "CopyTrader", "Whale"]

# --- Shared In-Memory State (replaces file-based history.json) ---
shared_state = {
    "phase": "ROUND",
    "roundEndTime": 0,
    "history": []
}

ADMIN_PRIVATE_KEY = os.getenv("PRIVATE_KEY")
if not ADMIN_PRIVATE_KEY:
    print("Error: PRIVATE_KEY not found in env")
    exit(1)

admin_account = w3.eth.account.from_key(ADMIN_PRIVATE_KEY)

# ==================== HTTP API ====================

async def handle_history(request):
    """Serve the current game state as JSON"""
    return web.json_response(shared_state)

async def handle_health(request):
    """Health check endpoint"""
    return web.json_response({"status": "ok", "phase": shared_state.get("phase", "unknown")})

async def handle_debug(request):
    """Debug endpoint to check admin vs contract owner"""
    try:
        contract_owner = arena_contract.functions.owner().call()
        betting_active = arena_contract.functions.bettingActive().call()
        current_round = arena_contract.functions.currentRoundId().call()
        return web.json_response({
            "admin_address": admin_account.address,
            "contract_owner": contract_owner,
            "owner_match": admin_account.address.lower() == contract_owner.lower(),
            "betting_active_onchain": betting_active,
            "current_round_id": current_round,
            "rpc_url": RPC_URL,
            "arena_address": ARENA_ADDRESS
        })
    except Exception as e:
        return web.json_response({"error": str(e)})

async def start_api_server():
    """Start aiohttp server to serve history data"""
    app = web.Application()
    
    # Setup CORS
    cors = aiohttp_cors.setup(app, defaults={
        "*": aiohttp_cors.ResourceOptions(
            allow_credentials=True,
            expose_headers="*",
            allow_headers="*",
            allow_methods="*"
        )
    })
    
    # Add routes
    history_resource = cors.add(app.router.add_resource("/api/history"))
    cors.add(history_resource.add_route("GET", handle_history))
    
    health_resource = cors.add(app.router.add_resource("/api/health"))
    cors.add(health_resource.add_route("GET", handle_health))
    
    debug_resource = cors.add(app.router.add_resource("/api/debug"))
    cors.add(debug_resource.add_route("GET", handle_debug))
    
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, "0.0.0.0", API_PORT)
    await site.start()
    print(f"API Server running on http://0.0.0.0:{API_PORT}")

# ==================== Agent Logic ====================

async def register_agents(agents):
    print("Registering agents...")
    nonce = w3.eth.get_transaction_count(admin_account.address)
    for agent in agents:
        is_registered = arena_contract.functions.isAgent(agent.address).call()
        if is_registered:
            print(f"Agent {agent.name} already registered.")
            continue

        print(f"Registering {agent.name}...")
        txn = arena_contract.functions.registerAgent(agent.address).build_transaction({
            'chainId': 10143,
            'gas': 150000,
            'gasPrice': int(w3.eth.gas_price * 1.2),
            'nonce': nonce
        })
        signed_txn = w3.eth.account.sign_transaction(txn, private_key=ADMIN_PRIVATE_KEY)
        tx_hash = w3.eth.send_raw_transaction(signed_txn.raw_transaction)
        print(f"Registration tx sent for {agent.name}: {w3.to_hex(tx_hash)}")
        nonce += 1
        await asyncio.sleep(1)

    print("Registration complete.")

def create_agents():
    agents = []
    print("Creating agents...")
    for i, strategy in enumerate(STRATEGIES):
        agent_name = f"Agent_{strategy}"
        
        keys_file = os.path.join(os.path.dirname(__file__), "agent_keys.json")
        if os.path.exists(keys_file):
            with open(keys_file, 'r') as f:
                keys = json.load(f)
        else:
            keys = {}

        if agent_name in keys:
            private_key = keys[agent_name]
        else:
            acc = w3.eth.account.create()
            private_key = acc.key.hex()
            keys[agent_name] = private_key
            with open(keys_file, 'w') as f:
                json.dump(keys, f)
        
        agent = MemeAgent(agent_name, private_key, strategy, w3, arena_contract)
        agents.append(agent)
    return agents

async def send_tx_with_retry(func_call, label="tx", max_retries=5):
    """Send a transaction with retry logic for rate limiting"""
    for attempt in range(max_retries):
        try:
            nonce = w3.eth.get_transaction_count(admin_account.address)
            tx = func_call.build_transaction({
                'chainId': 10143,
                'gas': 100000,
                'gasPrice': int(w3.eth.gas_price * 1.5),
                'nonce': nonce
            })
            signed_tx = w3.eth.account.sign_transaction(tx, ADMIN_PRIVATE_KEY)
            tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
            # Wait for confirmation
            receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=30)
            if receipt.status == 1:
                print(f"{label} SUCCESS (attempt {attempt+1}). Tx: {w3.to_hex(tx_hash)}")
                return True
            else:
                print(f"{label} REVERTED (attempt {attempt+1})")
        except Exception as e:
            print(f"{label} FAILED (attempt {attempt+1}/{max_retries}): {e}")
            await asyncio.sleep(2 * (attempt + 1))  # Exponential backoff
    print(f"{label} FAILED after {max_retries} attempts")
    return False

async def market_loop(agents):
    global shared_state
    print("Starting Market Loop...")
    history = []
    start_time = time.time()

    while True: # Outer Loop for Rounds
        print("--- STARTING NEW ROUND ---")
        
        await fund_agents(agents)
        
        # 1. Open Betting Phase
        print(">>> BETTING PHASE (60s) <<<")
        success = await send_tx_with_retry(
            arena_contract.functions.setBettingActive(True),
            label="setBettingActive(True)"
        )
        if success:
            print("Betting Opened on-chain!")
        else:
            print("WARNING: Could not open betting on-chain, continuing anyway...")

        # Betting Phase Loop (60s window for users to bet)
        betting_end = time.time() + 60
        while time.time() < betting_end:
            # Update shared state (in-memory, served via API)
            shared_state = {
                "phase": "BETTING",
                "roundEndTime": betting_end,
                "history": history 
            }
            await asyncio.sleep(1)

        # 2. Close Betting & Start Game Phase
        print(">>> GAME PHASE (90s) <<<")
        success = await send_tx_with_retry(
            arena_contract.functions.setBettingActive(False),
            label="setBettingActive(False)"
        )
        if success:
            print("Betting Closed on-chain!")
        else:
            print("WARNING: Could not close betting on-chain, continuing anyway...")

        start_time = time.time()
        round_duration = 90
        
        # Per-round balance tracking (reset each round)
        round_balances = {agent.name: 0 for agent in agents}
        
        while True: # Inner Market Loop
            mock_price = random.uniform(0.1, 10.0)
            print(f"\n--- Market Price: ${mock_price:.2f} ---")

            tasks = []
            for agent in agents:
                decision, amount = agent.execute_strategy(mock_price)
                tasks.append(agent.trade(decision, amount))
                if decision == "buy":
                    round_balances[agent.name] += amount
                elif decision == "sell":
                    round_balances[agent.name] = max(0, round_balances[agent.name] - amount)

            await asyncio.gather(*tasks)

            timestamp = int(time.time())
            agent_data = {name: bal for name, bal in round_balances.items()}
            entry = {
                "time": timestamp,
                "price": mock_price,
                "balances": agent_data
            }
            history.append(entry)
            if len(history) > 50:
                history.pop(0)
            
            # Update shared state (in-memory, served via API)
            shared_state = {
                "phase": "ROUND",
                "roundEndTime": start_time + round_duration,
                "history": history
            }

            elapsed_time = time.time() - start_time
            if elapsed_time > round_duration:
                print("\n--- ROUND OVER ---")
                highest_balance = 0
                winner_agent = None
                for agent in agents:
                    bal = round_balances[agent.name]
                    print(f"  {agent.name}: {bal} MEME")
                    if bal > highest_balance:
                        highest_balance = bal
                        winner_agent = agent
                
                if winner_agent:
                    print(f"Winner is {winner_agent.name} with {highest_balance} MEME")
                    try:
                        nonce = w3.eth.get_transaction_count(admin_account.address)
                        tx = arena_contract.functions.endRound(winner_agent.address).build_transaction({
                            'chainId': 10143,
                            'gas': 500000,
                            'gasPrice': int(w3.eth.gas_price * 1.2),
                            'nonce': nonce
                        })
                        signed_tx = w3.eth.account.sign_transaction(tx, ADMIN_PRIVATE_KEY)
                        tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
                        print(f"Ended Round! Winners auto-paid. Tx: {w3.to_hex(tx_hash)}")
                    except Exception as e:
                        print(f"Failed to end round: {e}")
                
                break

            await asyncio.sleep(2)


async def fund_agents(agents):
    print("Checking agent balances...")
    nonce = w3.eth.get_transaction_count(admin_account.address)
    funded_count = 0
    for agent in agents:
        balance = w3.eth.get_balance(agent.address)
        bal_mon = w3.from_wei(balance, 'ether')
        
        if balance < w3.to_wei(0.005, 'ether'):
            print(f"Agent {agent.name} low ({bal_mon} MON) - topping up with 0.02 MON...")
            tx = {
                'nonce': nonce,
                'to': agent.address,
                'value': w3.to_wei(0.02, 'ether'),
                'gas': 21000,
                'gasPrice': int(w3.eth.gas_price * 1.2),
                'chainId': 10143
            }
            signed_tx = w3.eth.account.sign_transaction(tx, ADMIN_PRIVATE_KEY)
            tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
            print(f"Sent 0.02 MON to {agent.name}: {w3.to_hex(tx_hash)}")
            nonce += 1
            funded_count += 1
            await asyncio.sleep(1)
        else:
            print(f"Agent {agent.name}: {bal_mon} MON (OK)")
    if funded_count > 0:
        print(f"Funded {funded_count} agents.")
    else:
        print("All agents have sufficient balance.")

async def main():
    agents = create_agents()
    
    await fund_agents(agents)
    await register_agents(agents)
    
    # Start API server and market loop concurrently
    await start_api_server()
    print("API server started. Now starting market loop...")
    await market_loop(agents)

if __name__ == "__main__":
    asyncio.run(main())
