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
  expense: ["日常費", "趣味レジャー費", "雑費・予備費", "家賃・マイホーム費", "貯蓄", "NISA", "iDeCo"],
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

function renderExpenseChart(transactions, currentMonth) {
  expenseChart.innerHTML = "";

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

  const maxValue = entries[0][1];

  entries.forEach(([category, total]) => {
    const row = document.createElement("div");
    row.className = "chart-row";

    const meta = document.createElement("div");
    meta.className = "chart-meta";
    meta.innerHTML = `<span>${category}</span><strong>${yen.format(total)}</strong>`;

    const track = document.createElement("div");
    track.className = "chart-track";

    const bar = document.createElement("div");
    bar.className = "chart-bar";
    bar.style.width = `${(total / maxValue) * 100}%`;

    track.appendChild(bar);
    row.append(meta, track);
    expenseChart.appendChild(row);
  });
}

function render() {
  const transactions = loadTransactions();
  const currentMonth = monthFilter.value;

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

  let income = 0;
  let expense = 0;
  const carryover = calculateCarryover(transactions, currentMonth);

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

      if (item.type === "income") {
        income += item.amount;
      } else {
        expense += item.amount;
      }
    });

  incomeTotal.textContent = yen.format(income);
  expenseTotal.textContent = yen.format(expense);
  carryoverTotal.textContent = yen.format(carryover);
  balanceTotal.textContent = yen.format(carryover + income - expense);
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
