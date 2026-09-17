

const API_URL = 'https://script.google.com/macros/s/AKfycbzC0IkHcg7Q7BzJ1dhd_VPkGGNeN1uJBDNLAYMUv8ODq-6iiz6B20HndoF034BGKF9eZw/exec';

let authToken = localStorage.getItem('leo_auth_token');

// Global variables
window.totalSavingsAmount = 0;
window.outstandingPrincipalAmount = 0;

/* ==================================================
   API WRAPPER
================================================== */
async function apiCall(action, payload = {}, method = 'GET') {
  if (!API_URL || API_URL === 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL') {
    throw new Error('Please set the API_URL in main.js to your deployed Google Apps Script Web App URL.');
  }

  let url = `${API_URL}?action=${action}`;
  let options = {
    method: method
  };

  if (method === 'POST') {
    options.body = JSON.stringify({ action, ...payload });
    options.headers = {
      'Content-Type': 'text/plain'
    };
  }

  const response = await fetch(url, options);
  const json = await response.json();
  if (json.status === 'error') {
    throw new Error(json.message);
  }
  return json.data;
}

/* ==================================================
   LOGIN LOGIC
================================================== */
document.getElementById('loginButton').addEventListener('click', async () => {
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const errorEl = document.getElementById('loginError');
  const btn = document.getElementById('loginButton');

  errorEl.textContent = '';
  if (!username || !password) {
    errorEl.textContent = 'Please enter username and password.';
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Logging in...';

  try {
    const data = await apiCall('login', { username, password }, 'POST');
    localStorage.setItem('leo_auth_token', data.token);
    authToken = data.token;
    showApp();
  } catch (error) {
    errorEl.textContent = error.message;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Login';
  }
});

function checkAuth() {
  if (authToken) {
    showApp();
  } else {
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('app').style.display = 'none';
  }
}

function showApp() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('app').style.display = 'block';
  loadSavings();
  loadCredit();
  loadFinancialSummary();
}

/* ==================================================
   LOAD SAVINGS
================================================== */
async function loadSavings() {
  const table = document.getElementById("savingsTable");
  try {
    const data = await apiCall('getSavings');
    renderSavings(data);
  } catch (error) {
    table.innerHTML = `<tr><td colspan="4"><div class="empty-state"><div class="empty-icon">⚠️</div><h3>Unable to load records</h3><p>${escapeHtml(error.message)}</p></div></td></tr>`;
  }
}

function renderSavings(data) {
  const table = document.getElementById("savingsTable");

  if (!Array.isArray(data) || data.length === 0) {
    table.innerHTML = `<tr><td colspan="4"><div class="empty-state"><div class="empty-icon">💰</div><h3>No savings yet</h3><p>Add your first deposit to get started.</p></div></td></tr>`;
    window.totalSavingsAmount = 0;
    return;
  }

  let html = "";
  let total = 0;

  data.forEach(function (row, index) {
    const number = row[0] !== undefined && row[0] !== "" ? row[0] : index + 1;
    const date = row[1] || "";
    const depositor = row[2] || "";
    const amount = Number(row[3]) || 0;
    total += amount;

    html += `<tr>
      <td>${escapeHtml(number)}</td>
      <td>${formatDate(date)}</td>
      <td>${escapeHtml(depositor)}</td>
      <td class="amount">₱${formatMoney(amount)}</td>
    </tr>`;
  });

  table.innerHTML = html;
  window.totalSavingsAmount = total;
}

/* ==================================================
   LOAD FINANCIAL SUMMARY
================================================== */
async function loadFinancialSummary() {
  try {
    const summary = await apiCall('getFinancialSummary');
    document.getElementById("totalSavings").textContent = "₱" + formatMoney(summary.totalSavings);
    document.getElementById("interestEarned").textContent = "₱" + formatMoney(summary.interestEarned);
    document.getElementById("expectedProfit").textContent = "₱" + formatMoney(summary.outstandingInterest);
    document.getElementById("cashOnHand").textContent = "₱" + formatMoney(summary.cashOnHand);
    window.outstandingPrincipalAmount = Number(summary.outstandingPrincipal) || 0;
  } catch (error) {
    console.error(error);
  }
}

/* ==================================================
   LOAD CREDIT
================================================== */
async function loadCredit() {
  const list = document.getElementById("creditList");
  list.innerHTML = `<div class="loading"><div class="spinner"></div>Loading credit records...</div>`;

  try {
    const data = await apiCall('getCredit');
    renderCredit(data);
  } catch (error) {
    list.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><h3>Unable to load credits</h3><p>${escapeHtml(error.message)}</p></div>`;
  }
}

function renderCredit(data) {
  const list = document.getElementById("creditList");

  if (!Array.isArray(data) || data.length === 0) {
    list.innerHTML = `<div class="empty-state"><div class="empty-icon">📋</div><h3>No outstanding credit</h3><p>No billed credit transactions found.</p></div>`;
    document.getElementById("totalCredit").textContent = "₱0.00";
    document.getElementById("creditPrincipal").textContent = "₱0.00";
    document.getElementById("creditInterest").textContent = "₱0.00";
    document.getElementById("creditPenalty").textContent = "₱0.00";
    return;
  }

  let principalTotal = 0, interestTotal = 0, penaltyTotal = 0, outstandingTotal = 0;
  let html = "";

  data.forEach(function (credit) {
    const principal = Number(credit.amount) || 0;
    const interest = Number(credit.expectedProfit) || 0;
    const penalty = Number(credit.latePenalty) || 0;
    const total = Number(credit.totalOutstanding) || 0;
    const lateDays = Number(credit.lateDays) || 0;

    principalTotal += principal;
    interestTotal += interest;
    penaltyTotal += penalty;
    outstandingTotal += total;

    html += `<div class="credit-item">
      <div class="credit-item-top">
        <div class="credit-name">${escapeHtml(credit.borrower || "")}</div>
        <div class="credit-amount">₱${formatMoney(total)}</div>
      </div>
      <div class="credit-date">Credit: ${formatDate(credit.creditDate)}</div>
      <div class="credit-status">${escapeHtml(credit.status || "Billed")}</div>
      <div class="credit-details">
        <div class="credit-detail">Principal: <strong>₱${formatMoney(principal)}</strong></div>
        <div class="credit-detail">Expected Profit: <strong>₱${formatMoney(interest)}</strong></div>
        <div class="credit-detail">Due: <strong>${formatDate(credit.dueDate)}</strong></div>
        <div class="credit-detail">Penalty: <strong>₱${formatMoney(penalty)}</strong></div>
      </div>
      ${lateDays > 0 ? `<div class="credit-status overdue">${lateDays} day(s) overdue</div>` : ""}
    </div>`;
  });

  list.innerHTML = html;
  document.getElementById("totalCredit").textContent = "₱" + formatMoney(outstandingTotal);
  document.getElementById("creditPrincipal").textContent = "₱" + formatMoney(principalTotal);
  document.getElementById("creditInterest").textContent = "₱" + formatMoney(interestTotal);
  document.getElementById("creditPenalty").textContent = "₱" + formatMoney(penaltyTotal);
}

/* ==================================================
   OPEN/CLOSE MODAL
================================================== */
window.openDepositModal = function () {
  document.getElementById("depositModal").style.display = "flex";
  document.getElementById("depositor").focus();
}

window.closeDepositModal = function () {
  document.getElementById("depositModal").style.display = "none";
  document.getElementById("depositor").value = "";
  document.getElementById("amount").value = "";
}

/* ==================================================
   SAVE DEPOSIT
================================================== */
window.saveDeposit = async function () {
  const depositor = document.getElementById("depositor").value.trim();
  const amount = Number(document.getElementById("amount").value);

  if (!depositor) return alert("Please enter the depositor name.");
  if (!amount || amount <= 0) return alert("Please enter a valid amount.");

  const button = document.getElementById("saveDepositButton");
  button.disabled = true;
  button.textContent = "Saving...";

  try {
    await apiCall('addDeposit', { depositor, amount }, 'POST');
    closeDepositModal();
    loadSavings(); // Refresh
  } catch (error) {
    alert(error.message || "Unable to save deposit.");
  } finally {
    button.disabled = false;
    button.textContent = "Save Deposit";
  }
}

/* ==================================================
   UTILITIES
================================================== */
function formatMoney(value) {
  return (Number(value) || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(value) {
  if (value === null || value === undefined || value === "") return "";
  const date = new Date(value);
  if (isNaN(date.getTime())) return escapeHtml(String(value));
  return date.toLocaleDateString("en-PH", { day: "2-digit", month: "short", year: "numeric" });
}

function escapeHtml(value) {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

/* ==================================================
   INITIAL LOAD
================================================== */
window.addEventListener("load", checkAuth);