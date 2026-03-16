// ============================================================
// PAYMENT.JS — Payment Processing Helpers
// Supplementary to member.js payment section
// ============================================================

// Payment method toggle (show/hide UPI field)
document.addEventListener('change', (e) => {
  if (e.target.name === 'pm') {
    const upiField = document.getElementById('upi-field');
    if (!upiField) return;
    upiField.style.display = e.target.value === 'UPI' ? 'block' : 'none';
  }
});

// ── Utility: Generate receipt HTML ──────────────────────────
function generateReceiptHTML(payment, planName, memberName) {
  return `
    <div style="font-family:monospace;background:#1a1a1a;padding:24px;border-radius:12px;border:1px solid #333;max-width:400px;margin:0 auto">
      <div style="text-align:center;margin-bottom:20px">
        <div style="font-size:40px">🏋️</div>
        <div style="color:#E8003D;font-size:20px;font-weight:bold;letter-spacing:2px">IRONFORGE GYM</div>
        <div style="color:#666;font-size:12px">Payment Receipt</div>
      </div>
      <div style="border-top:1px dashed #333;border-bottom:1px dashed #333;padding:16px 0;margin:16px 0">
        <div style="display:flex;justify-content:space-between;margin-bottom:8px">
          <span style="color:#888">Member</span><span style="color:#fff">${memberName}</span>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:8px">
          <span style="color:#888">Plan</span><span style="color:#fff">${planName}</span>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:8px">
          <span style="color:#888">Amount</span><span style="color:#E8003D;font-weight:bold">${formatINR(payment.amount)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:8px">
          <span style="color:#888">Method</span><span style="color:#fff">${payment.method}</span>
        </div>
        <div style="display:flex;justify-content:space-between">
          <span style="color:#888">Txn ID</span><span style="color:#fff;font-size:12px">${payment.txnId||'—'}</span>
        </div>
      </div>
      <div style="text-align:center;color:#00C9A7;font-weight:bold">✓ PAYMENT SUCCESSFUL</div>
      <div style="text-align:center;color:#666;font-size:11px;margin-top:8px">${formatDate(payment.date)}</div>
    </div>
  `;
}

// ── Admin: Create payment record manually ────────────────────
async function adminCreatePayment(memberId, planId, amount, method) {
  const planDoc  = await db.collection('plans').doc(planId).get();
  const planName = planDoc.data()?.name || 'Unknown';
  const days     = planDoc.data()?.durationDays || 30;

  const expiry = new Date();
  expiry.setDate(expiry.getDate() + days);

  const batch = db.batch();

  const payRef = db.collection('payments').doc();
  batch.set(payRef, {
    memberId, planId, amount, method,
    status:  'completed',
    date:    firebase.firestore.FieldValue.serverTimestamp(),
    txnId:   'ADM' + Math.random().toString(36).slice(2,8).toUpperCase()
  });

  batch.update(db.collection('members').doc(memberId), {
    planId, status: 'active',
    expiryDate: firebase.firestore.Timestamp.fromDate(expiry)
  });

  await batch.commit();
  return { success: true };
}

// ── Validate UPI format ──────────────────────────────────────
function validateUPI(upiId) {
  const pattern = /^[a-zA-Z0-9._-]+@[a-zA-Z]{3,}$/;
  return pattern.test(upiId);
}
