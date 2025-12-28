const { ethers } = require("hardhat");

const BACKEND_URL = "http://localhost:3001";
const TUSD_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

// Hardhat Account #2 (test payer)
const PAYER_PRIVATE_KEY = "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a";

async function main() {
  console.log("=".repeat(60));
  console.log("XStore 전체 결제 플로우 테스트");
  console.log("=".repeat(60));

  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
  const payerWallet = new ethers.Wallet(PAYER_PRIVATE_KEY, provider);

  console.log("\n📌 테스트 환경:");
  console.log(`  Payer: ${payerWallet.address}`);
  console.log(`  TUSD: ${TUSD_ADDRESS}`);

  // Step 1: Check payer's TUSD balance
  console.log("\n[1/8] 결제자 TUSD 잔액 확인...");
  const tusd = await ethers.getContractAt("TestUSD", TUSD_ADDRESS);
  const payerBalance = await tusd.balanceOf(payerWallet.address);
  console.log(`  잔액: ${ethers.formatUnits(payerBalance, 18)} TUSD`);

  // Step 2: Create a store
  console.log("\n[2/8] Store 생성...");
  const storeRes = await fetch(`${BACKEND_URL}/api/stores`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Test Restaurant Full Flow",
      owner: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
      walletAddress: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
    })
  });
  const store = await storeRes.json();
  console.log(`  Store ID: ${store.id}`);
  console.log(`  수신 지갑: ${store.walletAddress}`);

  // Step 3: Create a tab
  console.log("\n[3/8] Tab 생성...");
  const tabRes = await fetch(`${BACKEND_URL}/api/tabs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      storeId: store.id,
      tableNumber: 1
    })
  });
  const tab = await tabRes.json();
  console.log(`  Tab ID: ${tab.id}`);

  // Step 4: Add items to tab
  console.log("\n[4/8] 아이템 추가...");
  const items = [
    { name: "파스타", price: "15.00", quantity: 2 },
    { name: "스테이크", price: "35.00", quantity: 1 },
    { name: "와인", price: "25.00", quantity: 1 }
  ];

  for (const item of items) {
    await fetch(`${BACKEND_URL}/api/tabs/${tab.id}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item)
    });
    console.log(`  + ${item.name} x${item.quantity} = ${parseFloat(item.price) * item.quantity} TUSD`);
  }

  // Step 5: Close tab
  console.log("\n[5/8] Tab 닫기...");
  const closeRes = await fetch(`${BACKEND_URL}/api/tabs/${tab.id}/close`, {
    method: "PUT"
  });
  const closedTab = await closeRes.json();
  console.log(`  상태: ${closedTab.status}`);
  console.log(`  총액: ${closedTab.total} TUSD`);

  // Step 6: Initiate payment
  console.log("\n[6/8] 결제 초기화 (EIP-712 데이터 생성)...");
  const initiateRes = await fetch(`${BACKEND_URL}/api/payments/initiate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tabId: tab.id,
      payerAddress: payerWallet.address
    })
  });
  const paymentData = await initiateRes.json();
  console.log(`  Payment ID: ${paymentData.paymentId}`);
  console.log(`  Amount: ${paymentData.amount} TUSD`);
  console.log(`  Facilitator: ${paymentData.facilitatorAddress}`);
  console.log(`  Recipient: ${paymentData.recipient}`);

  // Step 7: Sign the permit
  console.log("\n[7/8] EIP-712 Permit 서명...");

  const domain = {
    name: paymentData.domain.name,
    version: paymentData.domain.version,
    chainId: parseInt(paymentData.domain.chainId),
    verifyingContract: paymentData.domain.verifyingContract
  };

  const types = {
    Permit: paymentData.types.Permit
  };

  const message = {
    owner: paymentData.message.owner,
    spender: paymentData.message.spender,
    value: BigInt(paymentData.message.value),
    nonce: BigInt(paymentData.message.nonce),
    deadline: BigInt(paymentData.message.deadline)
  };

  const signature = await payerWallet.signTypedData(domain, types, message);
  console.log(`  서명: ${signature.slice(0, 42)}...`);

  // Step 8: Submit payment
  console.log("\n[8/8] 결제 제출 (블록체인 트랜잭션)...");

  // Check balances before
  const recipientBalanceBefore = await tusd.balanceOf(paymentData.recipient);
  const payerBalanceBefore = await tusd.balanceOf(payerWallet.address);

  console.log(`  [Before] Payer 잔액: ${ethers.formatUnits(payerBalanceBefore, 18)} TUSD`);
  console.log(`  [Before] Recipient 잔액: ${ethers.formatUnits(recipientBalanceBefore, 18)} TUSD`);

  const submitRes = await fetch(`${BACKEND_URL}/api/payments/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      paymentId: paymentData.paymentId,
      signature: signature,
      deadline: paymentData.deadline
    })
  });
  const result = await submitRes.json();

  if (result.success) {
    console.log("\n✅ 결제 성공!");
    console.log(`  TX Hash: ${result.txHash}`);

    // Check balances after
    const recipientBalanceAfter = await tusd.balanceOf(paymentData.recipient);
    const payerBalanceAfter = await tusd.balanceOf(payerWallet.address);

    console.log(`\n  [After] Payer 잔액: ${ethers.formatUnits(payerBalanceAfter, 18)} TUSD`);
    console.log(`  [After] Recipient 잔액: ${ethers.formatUnits(recipientBalanceAfter, 18)} TUSD`);

    const amountTransferred = recipientBalanceAfter - recipientBalanceBefore;
    console.log(`\n  💰 전송된 금액: ${ethers.formatUnits(amountTransferred, 18)} TUSD`);

    // Verify transaction on chain
    console.log("\n🔍 트랜잭션 검증...");
    const tx = await provider.getTransaction(result.txHash);
    const receipt = await provider.getTransactionReceipt(result.txHash);

    console.log(`  Block: ${receipt.blockNumber}`);
    console.log(`  Gas Used: ${receipt.gasUsed.toString()}`);
    console.log(`  Status: ${receipt.status === 1 ? "✅ Success" : "❌ Failed"}`);

    // Check payment status in DB
    const paymentStatusRes = await fetch(`${BACKEND_URL}/api/payments/${paymentData.paymentId}`);
    const paymentStatus = await paymentStatusRes.json();
    console.log(`\n  DB Payment Status: ${paymentStatus.status}`);

  } else {
    console.log("\n❌ 결제 실패!");
    console.log(`  Error: ${result.error}`);
  }

  console.log("\n" + "=".repeat(60));
  console.log("테스트 완료");
  console.log("=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
