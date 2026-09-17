// Supabase Config
const SUPABASE_URL = 'https://toumsirfqtvdzdrnhncw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvdW1zaXJmcXR2ZHpkcm5obmN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk2NDQyMjksImV4cCI6MjEwNTIyMDIyOX0.7lcrL4AOVR4MeWJjybb-5wmzGoey3qHHfvc1_or9pG4';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let loggedInUser = null;
let currentRole = 'user';

async function getUserRole() {
  if (!loggedInUser) return 'user';
  
  // Try to get role from user_roles table
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', loggedInUser.id)
    .single();
    
  if (data && data.role) {
    return data.role;
  }
  
  // Fallback if not found (e.g. just registered)
  return 'user';
}

async function applyRoleUI() {
  currentRole = await getUserRole();
  const adminCashCard = document.getElementById('adminCashCard');
  const adminProfitCard = document.getElementById('adminProfitCard');
  const creditLimitCard = document.getElementById('creditLimitCard');
  const adminCreditPanel = document.getElementById('adminCreditPanel');
  const addDepositBtn = document.getElementById('addDepositBtn');
  const addCreditBtn = document.getElementById('addCreditBtn');
  const requestLoanBtn = document.getElementById('requestLoanBtn');
  const adminCreditTotals = document.getElementById('adminCreditTotals');
  const adminCreditBreakdown = document.getElementById('adminCreditBreakdown');
  const creditPanelSubtitle = document.getElementById('creditPanelSubtitle');
  
  // Everyone sees the credit panel now, but with different content
  if (adminCreditPanel) adminCreditPanel.style.display = 'block';
  
  if (currentRole === 'admin') {
    if (adminCashCard) adminCashCard.style.display = 'block';
    if (adminProfitCard) adminProfitCard.style.display = 'block';
    if (creditLimitCard) creditLimitCard.style.display = 'none'; // Hide for admin
    if (addDepositBtn) addDepositBtn.style.display = 'inline-block';
    if (addCreditBtn) addCreditBtn.style.display = 'inline-block';
    if (requestLoanBtn) requestLoanBtn.style.display = 'none';
    if (adminCreditTotals) adminCreditTotals.style.display = 'flex';
    if (adminCreditBreakdown) adminCreditBreakdown.style.display = 'block';
    if (creditPanelSubtitle) creditPanelSubtitle.textContent = 'Billed credits only';
  } else {
    if (adminCashCard) adminCashCard.style.display = 'none';
    if (adminProfitCard) adminProfitCard.style.display = 'none';
    if (creditLimitCard) creditLimitCard.style.display = 'flex'; // Show for user
    if (addDepositBtn) addDepositBtn.style.display = 'none';
    if (addCreditBtn) addCreditBtn.style.display = 'none';
    if (requestLoanBtn) requestLoanBtn.style.display = 'inline-block';
    if (adminCreditTotals) adminCreditTotals.style.display = 'none';
    if (adminCreditBreakdown) adminCreditBreakdown.style.display = 'none';
    if (creditPanelSubtitle) creditPanelSubtitle.textContent = 'Your credit history';
  }
}

// Global variables
window.totalSavingsAmount = 0;
window.outstandingPrincipalAmount = 0;

/* ==================================================
   LOGIN LOGIC
================================================== */
document.getElementById('loginButton').addEventListener('click', async () => {
  const email = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const errorEl = document.getElementById('loginError');
  const btn = document.getElementById('loginButton');

  errorEl.textContent = '';
  if (!email || !password) {
    errorEl.textContent = 'Please enter email and password.';
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Logging in...';

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email,
    password: password,
  });

  btn.disabled = false;
  btn.textContent = 'Login';

  if (error) {
    errorEl.textContent = error.message;
  } else {
    checkAuth();
  }
});

// Toggle between Login and Register
document.getElementById('showRegisterLink').addEventListener('click', (e) => {
  e.preventDefault();
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('registerScreen').style.display = 'flex';
});

document.getElementById('showLoginLink').addEventListener('click', (e) => {
  e.preventDefault();
  document.getElementById('registerScreen').style.display = 'none';
  document.getElementById('loginScreen').style.display = 'flex';
});

// Register Logic
document.getElementById('registerButton').addEventListener('click', async () => {
  const email = document.getElementById('regUsername').value;
  const password = document.getElementById('regPassword').value;
  const msgEl = document.getElementById('registerMessage');
  const btn = document.getElementById('registerButton');

  msgEl.textContent = '';
  msgEl.style.color = 'red';
  if (!email || !password) {
    msgEl.textContent = 'Please enter email and password.';
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Registering...';

  const { data, error } = await supabase.auth.signUp({
    email: email,
    password: password,
  });

  btn.disabled = false;
  btn.textContent = 'Register';

  if (error) {
    msgEl.textContent = error.message;
  } else {
    msgEl.style.color = 'green';
    msgEl.textContent = 'Registration successful! You can now log in.';
    document.getElementById('regUsername').value = '';
    document.getElementById('regPassword').value = '';
  }
});

async function checkAuth() {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (session) {
    loggedInUser = session.user;
    document.getElementById('userEmailDisplay').textContent = loggedInUser.email;
    showApp();
  } else {
    loggedInUser = null;
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('app').style.display = 'none';
  }
}

document.getElementById('logoutButton').addEventListener('click', async () => {
  await supabase.auth.signOut();
  checkAuth();
});

async function showApp() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('app').style.display = 'block';
  await applyRoleUI();
  loadSavings();
  loadCredit();
}

/* ==================================================
   LOAD SAVINGS & SUMMARY
================================================== */
async function loadSavings() {
  const table = document.getElementById("savingsTable");
  try {
    const { data, error } = await supabase
      .from('savings')
      .select('*')
      .order('created_at', { ascending: true });
      
    if (error) throw error;
    
    renderSavings(data);
  } catch (error) {
    table.innerHTML = `<tr><td colspan="4"><div class="empty-state"><div class="empty-icon">⚠️</div><h3>Unable to load records</h3><p>${escapeHtml(error.message)}</p></div></td></tr>`;
  }
}

function renderSavings(data) {
  const table = document.getElementById("savingsTable");

  let filteredData = data;
  if (currentRole !== 'admin' && Array.isArray(data)) {
    filteredData = data.filter(row => {
      return row.depositor_name.toLowerCase() === loggedInUser.email.toLowerCase();
    });
  }

  if (!Array.isArray(filteredData) || filteredData.length === 0) {
    table.innerHTML = `<tr><td colspan="4"><div class="empty-state"><div class="empty-icon">💰</div><h3>No savings yet</h3><p>Add your first deposit to get started.</p></div></td></tr>`;
    window.totalSavingsAmount = 0;
    document.getElementById("creditLimit").textContent = "₱0.00";
    if (currentRole !== 'admin') {
      document.getElementById("totalSavings").textContent = "₱0.00";
    }
    calculateFinancialSummary(data);
    return;
  }

  let html = "";
  let total = 0;

  filteredData.forEach(function (row, index) {
    const number = index + 1;
    const date = row.created_at;
    const depositor = row.depositor_name;
    const amount = Number(row.amount) || 0;
    total += amount;

    html += `<tr>
      <td>${number}</td>
      <td>${formatDate(date)}</td>
      <td>${escapeHtml(depositor)}</td>
      <td class="amount">₱${formatMoney(amount)}</td>
    </tr>`;
  });

  table.innerHTML = html;
  window.totalSavingsAmount = total;
  
  const creditLimit = total * 0.5;
  document.getElementById("creditLimit").textContent = "₱" + formatMoney(creditLimit);
  
  if (currentRole !== 'admin') {
    document.getElementById("totalSavings").textContent = "₱" + formatMoney(total);
  }
  
  calculateFinancialSummary(data);
}

function calculateFinancialSummary(allSavingsData) {
  if (currentRole === 'admin') {
    let overallSavings = 0;
    if (Array.isArray(allSavingsData)) {
      overallSavings = allSavingsData.reduce((sum, row) => sum + Number(row.amount || 0), 0);
    }
    document.getElementById("totalSavings").textContent = "₱" + formatMoney(overallSavings);
    
    // In a full implementation, we'd fetch all credits to calculate cash on hand and expected profit
    // Since loadCredit is called alongside loadSavings, loadCredit handles the credit summary.
  }
}

/* ==================================================
   LOAD CREDIT
================================================== */
async function loadCredit() {
  const list = document.getElementById("creditList");
  list.innerHTML = `<div class="loading"><div class="spinner"></div>Loading credit records...</div>`;

  try {
    let query = supabase.from('credits').select('*').order('created_at', { ascending: false });
    
    // If regular user, only fetch their own credits
    if (currentRole !== 'admin') {
      query = query.eq('borrower_name', loggedInUser.email);
    }
    
    const { data, error } = await query;
      
    if (error) throw error;
    
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
    document.getElementById("expectedProfit").textContent = "₱0.00";
    document.getElementById("cashOnHand").textContent = "₱0.00";
    return;
  }

  let principalTotal = 0, interestTotal = 0, penaltyTotal = 0, outstandingTotal = 0;
  let html = "";

  data.forEach(function (credit) {
    const principal = Number(credit.amount) || 0;
    
    // Auto-compute expected profit and late penalty dynamically
    const createdDate = new Date(credit.created_at);
    let dueDate = credit.due_date ? new Date(credit.due_date) : null;
    let expectedProfit = 0;
    let penalty = 0;
    let lateDays = 0;
    
    if (dueDate) {
      // 7% per month. Calculate months between created_at and due_date, rounded up.
      const msPerMonth = 1000 * 60 * 60 * 24 * 30;
      const durationMs = dueDate - createdDate;
      const months = Math.max(1, Math.ceil(durationMs / msPerMonth)); // At least 1 month
      expectedProfit = principal * 0.07 * months;
      
      // Calculate penalty: 0.5% per day if past due
      const now = new Date();
      if (now > dueDate && credit.status === 'Billed') {
        lateDays = Math.floor((now - dueDate) / (1000 * 60 * 60 * 24));
        if (lateDays > 0) {
          penalty = principal * 0.005 * lateDays;
        }
      }
    } else {
      // Default to 1 month profit if no due date specified
      expectedProfit = principal * 0.07;
    }

    const total = principal + expectedProfit + penalty;

    principalTotal += principal;
    interestTotal += expectedProfit;
    penaltyTotal += penalty;
    outstandingTotal += total;

    html += `<div class="credit-item">
      <div class="credit-item-top">
        <div class="credit-name">${escapeHtml(credit.borrower_name || "")}</div>
        <div class="credit-amount">₱${formatMoney(total)}</div>
      </div>
      <div class="credit-date">Credit: ${formatDate(credit.created_at)}</div>
      <div class="credit-status">${escapeHtml(credit.status || "Billed")}</div>
      <div class="credit-details">
        <div class="credit-detail">Principal: <strong>₱${formatMoney(principal)}</strong></div>
        <div class="credit-detail">Expected Profit: <strong>₱${formatMoney(expectedProfit)}</strong></div>
        <div class="credit-detail">Due: <strong>${dueDate ? formatDate(credit.due_date) : 'N/A'}</strong></div>
        <div class="credit-detail">Penalty: <strong>₱${formatMoney(penalty)}</strong></div>
      </div>
      ${lateDays > 0 ? `<div class="credit-status overdue" style="color: red; margin-top: 5px;">${lateDays} day(s) overdue</div>` : ""}
    </div>`;
  });

  list.innerHTML = html;
  
  // Calculate summary values for admin
  if (currentRole === 'admin') {
    document.getElementById("totalCredit").textContent = "₱" + formatMoney(outstandingTotal);
    document.getElementById("creditPrincipal").textContent = "₱" + formatMoney(principalTotal);
    document.getElementById("creditInterest").textContent = "₱" + formatMoney(interestTotal);
    document.getElementById("creditPenalty").textContent = "₱" + formatMoney(penaltyTotal);
    
    // Cash on hand = overallSavings - principalTotal
    const totalSavingsStr = document.getElementById("totalSavings").textContent.replace(/[^0-9.-]+/g,"");
    const overallSavings = Number(totalSavingsStr) || 0;
    const cashOnHand = overallSavings - principalTotal;
    document.getElementById("cashOnHand").textContent = "₱" + formatMoney(cashOnHand);
  }
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

window.openCreditModal = function () {
  document.getElementById("creditModal").style.display = "flex";
  document.getElementById("borrowerEmail").focus();
}

window.closeCreditModal = function () {
  document.getElementById("creditModal").style.display = "none";
  document.getElementById("borrowerEmail").value = "";
  document.getElementById("creditAmount").value = "";
  document.getElementById("creditDueDate").value = "";
}

window.openRequestLoanModal = function () {
  document.getElementById("requestLoanModal").style.display = "flex";
  
  // Set available limit text
  const creditLimit = window.totalSavingsAmount * 0.5;
  document.getElementById("availableCreditLimitDisplay").textContent = "₱" + formatMoney(creditLimit);
  
  document.getElementById("loanRequestAmount").focus();
}

window.closeRequestLoanModal = function () {
  document.getElementById("requestLoanModal").style.display = "none";
  document.getElementById("loanRequestAmount").value = "";
}

/* ==================================================
   SAVE DEPOSIT
================================================== */
window.saveDeposit = async function () {
  const depositor = document.getElementById("depositor").value.trim();
  const amount = Number(document.getElementById("amount").value);

  if (!depositor) return alert("Please enter the depositor email.");
  if (!amount || amount <= 0) return alert("Please enter a valid amount.");

  const button = document.getElementById("saveDepositButton");
  button.disabled = true;
  button.textContent = "Saving...";

  try {
    const { data, error } = await supabase
      .from('savings')
      .insert([
        { 
          depositor_name: depositor, 
          amount: amount,
          user_id: loggedInUser.id // Note: currently using admin's ID since admin adds it
        }
      ]);

    if (error) throw error;
    
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
   SAVE CREDIT
================================================== */
window.saveCredit = async function () {
  const borrower = document.getElementById("borrowerEmail").value.trim();
  const amount = Number(document.getElementById("creditAmount").value);
  const dueDate = document.getElementById("creditDueDate").value;

  if (!borrower) return alert("Please enter the borrower email.");
  if (!amount || amount <= 0) return alert("Please enter a valid amount.");
  if (!dueDate) return alert("Please enter a due date.");

  const button = document.getElementById("saveCreditButton");
  button.disabled = true;
  button.textContent = "Saving...";

  try {
    const insertData = { 
      borrower_name: borrower, 
      amount: amount,
      status: 'Billed',
      user_id: loggedInUser.id
    };
    
    if (dueDate) {
      insertData.due_date = new Date(dueDate).toISOString();
    }

    const { data, error } = await supabase
      .from('credits')
      .insert([insertData]);

    if (error) throw error;
    
    closeCreditModal();
    loadCredit(); // Refresh
  } catch (error) {
    alert(error.message || "Unable to save credit.");
  } finally {
    button.disabled = false;
    button.textContent = "Save Credit";
  }
}

/* ==================================================
   REQUEST LOAN (User)
================================================== */
window.requestLoan = async function () {
  const amount = Number(document.getElementById("loanRequestAmount").value);
  const creditLimit = window.totalSavingsAmount * 0.5;

  if (!amount || amount <= 0) return alert("Please enter a valid amount.");
  if (amount > creditLimit) {
    return alert("Amount exceeds your available credit limit of ₱" + formatMoney(creditLimit) + ".");
  }

  const button = document.getElementById("requestLoanButton");
  button.disabled = true;
  button.textContent = "Submitting...";

  try {
    const { data, error } = await supabase
      .from('credits')
      .insert([
        { 
          borrower_name: loggedInUser.email, 
          amount: amount,
          status: 'Requested',
          user_id: loggedInUser.id
        }
      ]);

    if (error) throw error;
    
    closeRequestLoanModal();
    loadCredit(); // Refresh list to show "Requested"
    alert("Loan request submitted successfully!");
  } catch (error) {
    alert(error.message || "Unable to request loan.");
  } finally {
    button.disabled = false;
    button.textContent = "Submit Request";
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