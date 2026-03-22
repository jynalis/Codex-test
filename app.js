const STORAGE_KEY = "kakeibo_transactions_v1";

const form = document.getElementById("transaction-form");
const dateInput = document.getElementById("date");
const typeInput = document.getElementById("type");
const categoryInput = document.getElementById("category");
const amountInput = document.getElementById("amount");
const memoInput = document.getElementById("memo");
const monthFilter = document.getElementById("month-filter");
const clearButton = document.getElementById("clear-btn");

const list = document.getElementById("transaction-list");
const template = document.getElementById("transaction-item-template");
const carryoverTotal = document.getElementById("carryover-total");
const incomeTotal = document.getElementById("income-total");
const expenseTotal = document.getElementById("expense-total");
const balanceTotal = document.getElementById("balance-total");
const expenseChart = document.getElementById("expense-chart");

const CATEGORY_OPTIONS = {
  expense: ["日常費", "趣味レジャー費", "雑費・予備費", "家賃・マイホーム費", "生命保険費", "貯蓄", "NISA", "iDeCo"],
  income: ["定期収入", "臨時収入"],
};

const yen = new Intl.NumberFormat("ja-JP", {
  style: "currency",
  currency: "JPY",
  maximumFractionDigits: 0,
});

function syncCategoryOptions() {
  const options = CATEGORY_OPTIONS[typeInput.value] ?? [];
  categoryInput.innerHTML = "";
  options.forEach((category) => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    categoryInput.appendChild(option);
  });
}

function loadTransactions() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];

  try {
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data;
  } catch {
    return [];
  }
}

function saveTransactions(transactions) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
}

function todayISO() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function monthISO(dateString) {
  return dateString.slice(0, 7);
}

function calculateCarryover(transactions, targetMonth) {
  if (!targetMonth) return 0;

  return transactions.reduce((sum, item) => {
    if (monthISO(item.date) >= targetMonth) return sum;
    return sum + (item.type === "income" ? item.amount : -item.amount);
  }, 0);
}

function calculateMonthlySummary(transactions, targetMonth) {
  if (!targetMonth) {
    return {
      carryover: 0,
      income: 0,
      expense: 0,
      endingBalance: 0,
    };
  }

  const carryover = calculateCarryover(transactions, targetMonth);
  const monthlyTotals = transactions.reduce(
    (totals, item) => {
      if (monthISO(item.date) !== targetMonth) return totals;
      if (item.type === "income") {
        totals.income += item.amount;
      } else {
        totals.expense += item.amount;
      }
      return totals;
    },
    { income: 0, expense: 0 }
  );

  return {
    carryover,
    income: monthlyTotals.income,
    expense: monthlyTotals.expense,
    endingBalance: carryover + monthlyTotals.income - monthlyTotals.expense,
  };
}

function renderExpenseChart(transactions, currentMonth) {
  expenseChart.innerHTML = "";
  expenseChart.classList.toggle("has-data", false);

  if (!currentMonth) {
    const empty = document.createElement("p");
    empty.className = "chart-empty";
    empty.textContent = "月を選択すると支出グラフが表示されます。";
    expenseChart.appendChild(empty);
    return;
  }

  const categoryTotals = transactions.reduce((acc, item) => {
    if (item.type !== "expense" || monthISO(item.date) !== currentMonth) return acc;
    acc[item.category] = (acc[item.category] ?? 0) + item.amount;
    return acc;
  }, {});

  const entries = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) {
    const empty = document.createElement("p");
    empty.className = "chart-empty";
    empty.textContent = "この月の支出データはありません。";
    expenseChart.appendChild(empty);
    return;
  }

  expenseChart.classList.toggle("has-data", true);
  const totalExpense = entries.reduce((sum, [, amount]) => sum + amount, 0);
  const chartColors = ["#e07a5f", "#f2cc8f", "#81b29a", "#3d405b", "#f4a261", "#84a59d", "#c9ada7", "#9d8189"];

  let currentDegree = 0;
  const segments = entries.map(([, amount], index) => {
    const ratio = amount / totalExpense;
    const degree = ratio * 360;
    const start = currentDegree;
    const end = currentDegree + degree;
    currentDegree = end;
    return `${chartColors[index % chartColors.length]} ${start}deg ${end}deg`;
  });

  const pieWrap = document.createElement("div");
  pieWrap.className = "pie-wrap";

  const pieChart = document.createElement("div");
  pieChart.className = "pie-chart";
  pieChart.style.background = `conic-gradient(${segments.join(", ")})`;

  const pieCenter = document.createElement("div");
  pieCenter.className = "pie-center";
  pieCenter.innerHTML = `<span>合計</span><strong>${yen.format(totalExpense)}</strong>`;

  pieChart.appendChild(pieCenter);
  pieWrap.appendChild(pieChart);
  expenseChart.appendChild(pieWrap);

  const legend = document.createElement("ul");
  legend.className = "pie-legend";

  entries.forEach(([category, amount], index) => {
    const ratio = (amount / totalExpense) * 100;
    const item = document.createElement("li");
    item.className = "pie-legend-item";
    item.innerHTML = `
      <span class="dot" style="background:${chartColors[index % chartColors.length]}"></span>
      <span class="category">${category}</span>
      <strong class="ratio">${ratio.toFixed(1)}%</strong>
      <span class="value">${yen.format(amount)}</span>
    `;
    legend.appendChild(item);
  });

  expenseChart.appendChild(legend);
}

function render() {
  const transactions = loadTransactions();
  const currentMonth = monthFilter.value;
  const summary = calculateMonthlySummary(transactions, currentMonth);

  const filtered = currentMonth
    ? transactions.filter((item) => monthISO(item.date) === currentMonth)
    : transactions;

  list.innerHTML = "";

  if (filtered.length === 0) {
    const empty = document.createElement("li");
    empty.textContent = "まだ取引がありません。";
    empty.className = "item";
    list.appendChild(empty);
  }

  filtered
    .slice()
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .forEach((item) => {
      const node = template.content.cloneNode(true);
      const row = node.querySelector(".item");
      const meta = node.querySelector(".meta");
      const memo = node.querySelector(".memo");
      const amount = node.querySelector(".amount");
      const del = node.querySelector(".delete");

      meta.textContent = `${item.date} / ${item.category}`;
      memo.textContent = item.memo || "メモなし";
      amount.textContent = `${item.type === "income" ? "+" : "-"}${yen.format(item.amount)}`;
      amount.classList.add(item.type);

      del.addEventListener("click", () => {
        const next = loadTransactions().filter((tx) => tx.id !== item.id);
        saveTransactions(next);
        render();
      });

      row.dataset.id = item.id;
      list.appendChild(node);
    });

  incomeTotal.textContent = yen.format(summary.income);
  expenseTotal.textContent = yen.format(summary.expense);
  carryoverTotal.textContent = yen.format(summary.carryover);
  balanceTotal.textContent = yen.format(summary.endingBalance);
  renderExpenseChart(transactions, currentMonth);
}

function addTransaction(event) {
  event.preventDefault();

  const date = dateInput.value;
  const type = typeInput.value;
  const category = categoryInput.value.trim();
  const amount = Number(amountInput.value);
  const memo = memoInput.value.trim();

  if (!date || !category || !Number.isFinite(amount) || amount <= 0) {
    return;
  }

  const current = loadTransactions();
  current.push({
    id: crypto.randomUUID(),
    date,
    type,
    category,
    amount,
    memo,
  });

  saveTransactions(current);
  form.reset();
  dateInput.value = date;
  typeInput.value = "expense";
  syncCategoryOptions();
  render();
}

function clearAll() {
  const ok = window.confirm("すべての取引を削除します。よろしいですか？");
  if (!ok) return;
  localStorage.removeItem(STORAGE_KEY);
  render();
}

function init() {
  dateInput.value = todayISO();
  monthFilter.value = todayISO().slice(0, 7);
  syncCategoryOptions();
  form.addEventListener("submit", addTransaction);
  typeInput.addEventListener("change", syncCategoryOptions);
  monthFilter.addEventListener("change", render);
  clearButton.addEventListener("click", clearAll);
  render();
}

init();
