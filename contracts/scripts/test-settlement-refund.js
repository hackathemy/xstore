const { ethers } = require("hardhat");

const BACKEND_URL = "http://localhost:3001";
const TUSD_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const PAYER_PRIVATE_KEY = "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a";
// Store owner (Account #0) private key for signing refund permits
const STORE_OWNER_PRIVATE_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

async function createPayment() {
  console.log("\n📦 새로운 결제 생성 중...");

  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
  const payerWallet = new ethers.Wallet(PAYER_PRIVATE_KEY, provider);

  // 1. Create store
  const storeRes = await fetch(`${BACKEND_URL}/api/stores`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Settlement Test Store",
      owner: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
      walletAddress: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
    })
  });
  const store = await storeRes.json();
  console.log(`  Store: ${store.id}`);

  // 2. Create tab
  const tabRes = await fetch(`${BACKEND_URL}/api/tabs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ storeId: store.id, tableNumber: 1 })
  });
  const tab = await tabRes.json();
  console.log(`  Tab: ${tab.id}`);

  // 3. Add items
  await fetch(`${BACKEND_URL}/api/tabs/${tab.id}/items`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "테스트 메뉴", price: "50.00", quantity: 1 })
  });
  console.log(`  Item: 테스트 메뉴 50 TUSD`);

  // 4. Close tab
  await fetch(`${BACKEND_URL}/api/tabs/${tab.id}/close`, { method: "PUT" });

  // 5. Initiate payment
  const initiateRes = await fetch(`${BACKEND_URL}/api/payments/initiate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tabId: tab.id,
      payerAddress: payerWallet.address
    })
  });
  const paymentData = await initiateRes.json();
  console.log(`  Payment: ${paymentData.paymentId}`);

  // 6. Sign permit
  const domain = {
    name: paymentData.domain.name,
    version: paymentData.domain.version,
    chainId: parseInt(paymentData.domain.chainId),
    verifyingContract: paymentData.domain.verifyingContract
  };
  const types = { Permit: paymentData.types.Permit };
  const message = {
    owner: paymentData.message.owner,
    spender: paymentData.message.spender,
    value: BigInt(paymentData.message.value),
    nonce: BigInt(paymentData.message.nonce),
    deadline: BigInt(paymentData.message.deadline)
  };
  const signature = await payerWallet.signTypedData(domain, types, message);

  // 7. Submit payment
  const submitRes = await fetch(`${BACKEND_URL}/api/payments/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      paymentId: paymentData.paymentId,
      signature,
      deadline: paymentData.deadline
    })
  });
  const result = await submitRes.json();

  if (result.success) {
    console.log(`  ✅ 결제 성공: ${result.txHash}`);
  } else {
    console.log(`  ❌ 결제 실패: ${result.error}`);
    return null;
  }

  return { store, tab, paymentId: paymentData.paymentId, payerAddress: payerWallet.address };
}

async function testSettlement(storeId) {
  console.log("\n" + "=".repeat(60));
  console.log("💰 정산(Settlement) 테스트");
  console.log("=".repeat(60));

  // 1. Check settlement summary before
  console.log("\n[1/4] 정산 현황 확인...");
  const summaryBefore = await fetch(`${BACKEND_URL}/api/settlements/store/${storeId}/summary`);
  const summaryBeforeData = await summaryBefore.json();
  console.log(`  미정산 결제: ${summaryBeforeData.unsettled.count}건, ${summaryBeforeData.unsettled.amount} TUSD`);
  console.log(`  대기중 정산: ${summaryBeforeData.pending.count}건`);
  console.log(`  완료된 정산: ${summaryBeforeData.completed.count}건`);

  // 2. Create settlement
  console.log("\n[2/4] 정산 요청 생성...");
  const createRes = await fetch(`${BACKEND_URL}/api/settlements`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ storeId })
  });
  const settlement = await createRes.json();

  if (settlement.error) {
    console.log(`  ❌ 정산 생성 실패: ${settlement.message}`);
    return null;
  }

  console.log(`  Settlement ID: ${settlement.id}`);
  console.log(`  금액: ${settlement.amount} TUSD`);
  console.log(`  상태: ${settlement.status}`);
  console.log(`  포함된 결제 수: ${settlement.paymentIds.length}`);

  // 3. Get settlement details
  console.log("\n[3/4] 정산 상세 조회...");
  const detailRes = await fetch(`${BACKEND_URL}/api/settlements/${settlement.id}`);
  const detail = await detailRes.json();
  console.log(`  Store: ${detail.store.name}`);
  console.log(`  결제 목록:`);
  detail.payments.forEach((p, i) => {
    console.log(`    ${i+1}. ${p.id} - ${p.amount} TUSD`);
  });

  // 4. Process settlement
  console.log("\n[4/4] 정산 처리...");
  const processRes = await fetch(`${BACKEND_URL}/api/settlements/${settlement.id}/process`, {
    method: "POST"
  });
  const processed = await processRes.json();
  console.log(`  상태: ${processed.status}`);
  console.log(`  TX Hash: ${processed.txHash}`);
  console.log(`  처리 시간: ${processed.processedAt}`);

  // Final summary
  console.log("\n[결과] 정산 완료 후 현황...");
  const summaryAfter = await fetch(`${BACKEND_URL}/api/settlements/store/${storeId}/summary`);
  const summaryAfterData = await summaryAfter.json();
  console.log(`  미정산 결제: ${summaryAfterData.unsettled.count}건`);
  console.log(`  대기중 정산: ${summaryAfterData.pending.count}건`);
  console.log(`  완료된 정산: ${summaryAfterData.completed.count}건, ${summaryAfterData.completed.amount} TUSD`);

  return settlement;
}

async function testRefund(paymentId, payerAddress) {
  console.log("\n" + "=".repeat(60));
  console.log("🔄 환불(Refund) 테스트 - 온체인 트랜잭션");
  console.log("=".repeat(60));

  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
  const storeOwnerWallet = new ethers.Wallet(STORE_OWNER_PRIVATE_KEY, provider);
  const tusd = await ethers.getContractAt("TestUSD", TUSD_ADDRESS);

  // Check store balance before refund
  const storeBalanceBefore = await tusd.balanceOf(storeOwnerWallet.address);
  const payerBalanceBefore = await tusd.balanceOf(payerAddress);
  console.log(`\n📊 환불 전 잔액:`);
  console.log(`  Store: ${ethers.formatEther(storeBalanceBefore)} TUSD`);
  console.log(`  Payer: ${ethers.formatEther(payerBalanceBefore)} TUSD`);

  // 1. Create refund request
  console.log("\n[1/6] 환불 요청 생성...");
  const createRes = await fetch(`${BACKEND_URL}/api/refunds`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      paymentId,
      reason: "테스트 환불 요청",
      requestedBy: payerAddress
    })
  });
  const refund = await createRes.json();

  if (refund.error) {
    console.log(`  ❌ 환불 요청 실패: ${refund.message}`);
    return null;
  }

  console.log(`  Refund ID: ${refund.id}`);
  console.log(`  금액: ${refund.amount} TUSD`);
  console.log(`  상태: ${refund.status}`);
  console.log(`  사유: ${refund.reason}`);

  // 2. Get refund details
  console.log("\n[2/6] 환불 상세 조회...");
  const detailRes = await fetch(`${BACKEND_URL}/api/refunds/${refund.id}`);
  const detail = await detailRes.json();
  console.log(`  원본 결제: ${detail.payment.id}`);
  console.log(`  Store: ${detail.payment.tab.store.name}`);

  // 3. Approve refund (as store owner)
  console.log("\n[3/6] 환불 승인 (가게 주인)...");
  const approveRes = await fetch(`${BACKEND_URL}/api/refunds/${refund.id}/approve`, {
    method: "PUT"
  });
  const approved = await approveRes.json();
  console.log(`  상태: ${approved.status}`);
  console.log(`  승인 시간: ${approved.approvedAt}`);

  // 4. Get refund permit data for signing
  console.log("\n[4/6] 환불 Permit 데이터 조회...");
  const permitRes = await fetch(`${BACKEND_URL}/api/refunds/${refund.id}/permit`);
  const permitData = await permitRes.json();
  console.log(`  Facilitator: ${permitData.facilitatorAddress}`);
  console.log(`  Recipient: ${permitData.recipient}`);
  console.log(`  Amount: ${ethers.formatEther(permitData.amountWei)} TUSD`);

  // 5. Store owner signs the permit
  console.log("\n[5/6] Store Owner가 Permit 서명...");
  const domain = {
    name: permitData.domain.name,
    version: permitData.domain.version,
    chainId: parseInt(permitData.domain.chainId),
    verifyingContract: permitData.domain.verifyingContract
  };
  const types = { Permit: permitData.types.Permit };
  const message = {
    owner: permitData.message.owner,
    spender: permitData.message.spender,
    value: BigInt(permitData.message.value),
    nonce: BigInt(permitData.message.nonce),
    deadline: BigInt(permitData.message.deadline)
  };
  const signature = await storeOwnerWallet.signTypedData(domain, types, message);
  console.log(`  서명 완료: ${signature.slice(0, 42)}...`);

  // 6. Process refund with signature
  console.log("\n[6/6] 환불 처리 (온체인 트랜잭션)...");
  const processRes = await fetch(`${BACKEND_URL}/api/refunds/${refund.id}/process`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      signature,
      deadline: permitData.deadline
    })
  });
  const processed = await processRes.json();

  if (processed.status === 'COMPLETED') {
    console.log(`  ✅ 환불 성공!`);
    console.log(`  TX Hash: ${processed.txHash}`);
    console.log(`  처리 시간: ${processed.processedAt}`);

    // Verify on-chain
    const tx = await provider.getTransaction(processed.txHash);
    const receipt = await provider.getTransactionReceipt(processed.txHash);
    console.log(`  Block: ${receipt.blockNumber}`);
    console.log(`  Gas Used: ${receipt.gasUsed.toString()}`);

    // Check balances after
    const storeBalanceAfter = await tusd.balanceOf(storeOwnerWallet.address);
    const payerBalanceAfter = await tusd.balanceOf(payerAddress);
    console.log(`\n📊 환불 후 잔액:`);
    console.log(`  Store: ${ethers.formatEther(storeBalanceAfter)} TUSD (변화: ${ethers.formatEther(storeBalanceAfter - storeBalanceBefore)})`);
    console.log(`  Payer: ${ethers.formatEther(payerBalanceAfter)} TUSD (변화: +${ethers.formatEther(payerBalanceAfter - payerBalanceBefore)})`);
  } else {
    console.log(`  ❌ 환불 실패: ${processed.error || processed.message}`);
  }

  // Check refunds for this payment
  console.log("\n[결과] 결제별 환불 내역 조회...");
  const refundsRes = await fetch(`${BACKEND_URL}/api/refunds/payment/${paymentId}`);
  const refunds = await refundsRes.json();
  console.log(`  총 환불 건수: ${refunds.length}`);
  refunds.forEach((r, i) => {
    console.log(`    ${i+1}. ${r.id} - ${r.amount} TUSD (${r.status})`);
  });

  return refund;
}

async function testRefundRejection() {
  console.log("\n" + "=".repeat(60));
  console.log("❌ 환불 거절 테스트");
  console.log("=".repeat(60));

  // Create a new payment first
  const paymentData = await createPayment();
  if (!paymentData) return;

  // Create refund request
  console.log("\n[1/3] 환불 요청 생성...");
  const createRes = await fetch(`${BACKEND_URL}/api/refunds`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      paymentId: paymentData.paymentId,
      reason: "거절될 환불 요청",
      requestedBy: paymentData.payerAddress
    })
  });
  const refund = await createRes.json();
  console.log(`  Refund ID: ${refund.id}`);
  console.log(`  상태: ${refund.status}`);

  // Reject refund
  console.log("\n[2/3] 환불 거절 (가게 주인)...");
  const rejectRes = await fetch(`${BACKEND_URL}/api/refunds/${refund.id}/reject`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason: "테스트 거절 사유" })
  });
  const rejected = await rejectRes.json();
  console.log(`  상태: ${rejected.status}`);
  console.log(`  거절 사유: ${rejected.rejectionReason}`);

  // Verify final state
  console.log("\n[3/3] 최종 상태 확인...");
  const finalRes = await fetch(`${BACKEND_URL}/api/refunds/${refund.id}`);
  const final = await finalRes.json();
  console.log(`  상태: ${final.status}`);
}

async function main() {
  console.log("=".repeat(60));
  console.log("XStore 정산/환불 테스트");
  console.log("=".repeat(60));

  try {
    // Create a payment for testing
    const paymentData = await createPayment();
    if (!paymentData) {
      console.log("결제 생성 실패, 테스트 중단");
      return;
    }

    // Test Settlement
    await testSettlement(paymentData.store.id);

    // Create another payment for refund test
    const paymentData2 = await createPayment();
    if (!paymentData2) {
      console.log("두번째 결제 생성 실패, 환불 테스트 건너뜀");
      return;
    }

    // Test Refund (approval flow)
    await testRefund(paymentData2.paymentId, paymentData2.payerAddress);

    // Test Refund Rejection
    await testRefundRejection();

    console.log("\n" + "=".repeat(60));
    console.log("✅ 모든 테스트 완료!");
    console.log("=".repeat(60));

  } catch (error) {
    console.error("테스트 실패:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
