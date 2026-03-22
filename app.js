const STORAGE_KEY = "kakeibo_transactions_v1";
const SETTINGS_KEY = "kakeibo_settings_v1";

const form = document.getElementById("transaction-form");
const dateInput = document.getElementById("date");
const typeInput = document.getElementById("type");
const categoryInput = document.getElementById("category");
const amountInput = document.getElementById("amount");
const memoInput = document.getElementById("memo");
const monthFilter = document.getElementById("month-filter");
const clearButton = document.getElementById("clear-btn");

const profileForm = document.getElementById("profile-form");
const birthDateInput = document.getElementById("birth-date");
const addPlanButton = document.getElementById("add-plan-btn");
const planList = document.getElementById("plan-list");
const assetForecast = document.getElementById("asset-forecast");

const list = document.getElementById("transaction-list");
const template = document.getElementById("transaction-item-template");
const carryoverTotal = document.getElementById("carryover-total");
const incomeTotal = document.getElementById("income-total");
const expenseTotal = document.getElementById("expense-total");
const balanceTotal = document.getElementById("balance-total");
const expenseChart = document.getElementById("expense-chart");
const autoBreakdown = document.getElementById("auto-breakdown");

const EXPENSE_CATEGORIES = ["日常費", "趣味・レジャー費", "雑費・予備費", "家賃・マイホーム費", "生命保険"];
const CATEGORY_OPTIONS = {
  expense: EXPENSE_CATEGORIES,
  income: ["定期収入", "臨時収入"],
};
const PLAN_TYPES = ["NISA", "iDeCo", "貯蓄性保険", "貯金"];

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
    return data
      .map((item) => ({
        ...item,
        amount: Number(item.amount) || 0,
      }))
      .filter((item) => {
        if (!item?.date || !item?.type || !item?.category || item.amount <= 0) return false;
        if (item.type === "expense") return EXPENSE_CATEGORIES.includes(item.category);
        return true;
      });
  } catch {
    return [];
  }
}

function saveTransactions(transactions) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
}

function defaultSettings() {
  return { birthDate: "", plans: [] };
}

function loadSettings() {
  const raw = localStorage.getItem(SETTINGS_KEY);
  if (!raw) return defaultSettings();

  try {
    const data = JSON.parse(raw);
    const plans = Array.isArray(data.plans) ? data.plans : [];
    return {
      birthDate: data.birthDate ?? "",
      plans: plans
        .map((plan) => ({
          ...plan,
          type: PLAN_TYPES.includes(plan.type) ? plan.type : "NISA",
          baseAmount: Number(plan.baseAmount) || 0,
          expectedReturn: Number(plan.expectedReturn) || 0,
          withdrawalDay: Number(plan.withdrawalDay) || 1,
          withdrawAge: Number(plan.withdrawAge) || 0,
          changes: Array.isArray(plan.changes)
            ? plan.changes
                .map((change) => ({
                  month: change.month,
                  amount: Number(change.amount) || 0,
                }))
                .filter((change) => change.month)
            : [],
        }))
        .filter((plan) => plan.startMonth),
    };
  } catch {
    return defaultSettings();
  }
}

function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
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

function compareMonth(a, b) {
  return a.localeCompare(b);
}

function clampDay(year, month, day) {
  const lastDay = new Date(year, month, 0).getDate();
  return Math.min(Math.max(day, 1), lastDay);
}

function planAmountAtMonth(plan, month) {
  if (!plan.startMonth || compareMonth(month, plan.startMonth) < 0) return 0;

  const changes = Array.isArray(plan.changes) ? plan.changes : [];
  let amount = Number(plan.baseAmount) || 0;

  changes
    .filter((change) => change.month && compareMonth(change.month, month) <= 0)
    .sort((a, b) => compareMonth(a.month, b.month))
    .forEach((change) => {
      amount = Number(change.amount) || 0;
    });

  return Math.max(amount, 0);
}

function createAutoExpensesForMonth(settings, month) {
  if (!month) return [];
  const [yearStr, monthStr] = month.split("-");
  const year = Number(yearStr);
  const monthNum = Number(monthStr);

  return settings.plans.flatMap((plan) => {
    const amount = planAmountAtMonth(plan, month);
    if (!amount) return [];

    const day = clampDay(year, monthNum, Number(plan.withdrawalDay) || 1);
    const date = `${month}-${String(day).padStart(2, "0")}`;
    return [
      {
        id: `auto-${plan.id}-${month}`,
        date,
        type: "expense",
        category: plan.type,
        amount,
        memo: `自動反映: ${plan.type}${plan.name ? `（${plan.name}）` : ""}`,
        isAuto: true,
        sourceType: plan.type,
      },
    ];
  });
}

function calculateCarryover(transactions, settings, targetMonth) {
  if (!targetMonth) return 0;

  const manual = transactions.reduce((sum, item) => {
    if (monthISO(item.date) >= targetMonth) return sum;
    return sum + (item.type === "income" ? item.amount : -item.amount);
  }, 0);

  const auto = settings.plans.reduce((sum, plan) => {
    if (!plan.startMonth || compareMonth(plan.startMonth, targetMonth) >= 0) return sum;

    let month = plan.startMonth;
    while (compareMonth(month, targetMonth) < 0) {
      sum -= planAmountAtMonth(plan, month);
      const [y, m] = month.split("-").map(Number);
      const next = new Date(y, m, 1);
      month = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
    }
    return sum;
  }, 0);

  return manual + auto;
}

function calculateMonthlySummary(transactions, settings, targetMonth) {
  if (!targetMonth) {
    return { carryover: 0, income: 0, expense: 0, endingBalance: 0 };
  }

  const carryover = calculateCarryover(transactions, settings, targetMonth);
  const autoTransactions = createAutoExpensesForMonth(settings, targetMonth);
  const monthly = [...transactions, ...autoTransactions].reduce(
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
    income: monthly.income,
    expense: monthly.expense,
    endingBalance: carryover + monthly.income - monthly.expense,
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
    if (item.type !== "expense" || monthISO(item.date) !== currentMonth || item.isAuto) return acc;
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
  const chartColors = ["#ff6b6b", "#ff922b", "#ffd43b", "#38d9a9", "#4dabf7", "#9775fa", "#f06595", "#74c0fc"];

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

function renderAutoBreakdown(autoTransactions, month) {
  autoBreakdown.innerHTML = "";
  if (!month) return;

  const totals = PLAN_TYPES.reduce((acc, type) => ({ ...acc, [type]: 0 }), {});
  autoTransactions.forEach((item) => {
    totals[item.sourceType] = (totals[item.sourceType] ?? 0) + item.amount;
  });

  const hasAny = Object.values(totals).some((amount) => amount > 0);
  const wrap = document.createElement("div");
  wrap.className = "auto-card";
  wrap.innerHTML = `<h3>固定引落の内訳（${month}）</h3>`;

  if (!hasAny) {
    const empty = document.createElement("p");
    empty.className = "chart-empty";
    empty.textContent = "この月の固定引落はありません。";
    wrap.appendChild(empty);
    autoBreakdown.appendChild(wrap);
    return;
  }

  const listEl = document.createElement("ul");
  listEl.className = "asset-list";
  PLAN_TYPES.forEach((type) => {
    const li = document.createElement("li");
    li.innerHTML = `<span>${type}</span><strong>${yen.format(totals[type] || 0)}</strong>`;
    listEl.appendChild(li);
  });
  wrap.appendChild(listEl);

  const total = Object.values(totals).reduce((sum, amount) => sum + amount, 0);
  const totalEl = document.createElement("div");
  totalEl.className = "asset-total";
  totalEl.innerHTML = `固定引落合計: <strong>${yen.format(total)}</strong>`;
  wrap.appendChild(totalEl);
  autoBreakdown.appendChild(wrap);
}

function calculateAge(birthDate) {
  if (!birthDate) return 0;
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const hadBirthday =
    today.getMonth() > birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() >= birth.getDate());
  if (!hadBirthday) age -= 1;
  return Math.max(age, 0);
}

function projectedAsset(plan, birthDate) {
  const startMonth = plan.startMonth || todayISO().slice(0, 7);
  const nowMonth = todayISO().slice(0, 7);
  const currentAge = calculateAge(birthDate);
  const targetAge = Number(plan.withdrawAge) || currentAge;
  const annualReturn = (Number(plan.expectedReturn) || 0) / 100;
  const monthlyRate = Math.pow(1 + annualReturn, 1 / 12) - 1;

  const birth = new Date(birthDate || todayISO());
  const withdrawDate = new Date(birth.getFullYear() + targetAge, birth.getMonth(), 1);
  const targetMonth = `${withdrawDate.getFullYear()}-${String(withdrawDate.getMonth() + 1).padStart(2, "0")}`;

  let month = startMonth;
  let total = 0;

  const simulationStartMonth = compareMonth(startMonth, nowMonth) < 0 ? nowMonth : startMonth;
  month = simulationStartMonth;
  while (compareMonth(month, targetMonth) <= 0) {
    const amount = planAmountAtMonth(plan, month);
    total = total * (1 + monthlyRate) + amount;

    const [y, m] = month.split("-").map(Number);
    const next = new Date(y, m, 1);
    month = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
  }

  if (compareMonth(targetMonth, nowMonth) < 0) {
    return 0;
  }

  return Math.round(total);
}

function renderAssetForecast(settings) {
  assetForecast.innerHTML = "";
  if (!settings.birthDate || settings.plans.length === 0) {
    assetForecast.innerHTML = '<p class="chart-empty">生年月日と積立設定を保存すると、想定資産額が表示されます。</p>';
    return;
  }

  const currentAge = calculateAge(settings.birthDate);
  const projectedRows = settings.plans.map((plan) => ({
    ...plan,
    projectedAmount: projectedAsset(plan, settings.birthDate),
    effectiveWithdrawAge: Number(plan.withdrawAge) || currentAge,
  }));
  const rows = projectedRows
    .map(
      (plan) => `
      <li>
        <span>${plan.type}${plan.name ? `（${plan.name}）` : ""} / 取崩${plan.effectiveWithdrawAge}歳</span>
        <strong>${yen.format(plan.projectedAmount)}</strong>
      </li>
    `
    )
    .join("");

  const typeTotals = PLAN_TYPES.map((type) => {
    const amount = projectedRows
      .filter((plan) => plan.type === type)
      .reduce((sum, plan) => sum + plan.projectedAmount, 0);
    return `<li><span>${type} 合計</span><strong>${yen.format(amount)}</strong></li>`;
  }).join("");

  const total = projectedRows.reduce((sum, plan) => sum + plan.projectedAmount, 0);
  assetForecast.innerHTML = `
    <p>現在年齢: <strong>${currentAge}歳</strong></p>
    <h3>契約ごとの想定資産額（取崩年齢時点）</h3>
    <ul class="asset-list">${rows}</ul>
    <h3>種別ごとの想定資産額</h3>
    <ul class="asset-list">${typeTotals}</ul>
    <div class="asset-total">想定総資産額: <strong>${yen.format(total)}</strong></div>
  `;
}

function createChangeRow(change = { month: "", amount: "" }) {
  const row = document.createElement("div");
  row.className = "change-row";
  row.innerHTML = `
    <input type="month" class="change-month" value="${change.month || ""}" />
    <input type="number" min="0" step="1" class="change-amount" placeholder="変更後月額(円)" value="${change.amount || ""}" />
    <button type="button" class="small danger remove-change">削除</button>
  `;
  row.querySelector(".remove-change").addEventListener("click", () => row.remove());
  return row;
}

function createPlanBlock(plan = {}) {
  const wrap = document.createElement("article");
  wrap.className = "plan-item";
  const planId = plan.id || crypto.randomUUID();

  const typeOptions = PLAN_TYPES.map((type) => `<option value="${type}" ${plan.type === type ? "selected" : ""}>${type}</option>`).join("");
  wrap.innerHTML = `
    <input type="hidden" class="plan-id" value="${planId}" />
    <div class="plan-grid">
      <label>種類<select class="plan-type">${typeOptions}</select></label>
      <label>識別名<input class="plan-name" type="text" maxlength="30" placeholder="例: つみたて枠" value="${plan.name || ""}" /></label>
      <label>開始月<input class="plan-start-month" type="month" value="${plan.startMonth || todayISO().slice(0, 7)}" /></label>
      <label>月額(円)<input class="plan-base-amount" type="number" min="0" step="1" value="${plan.baseAmount ?? ""}" /></label>
      <label>引き落とし日<input class="plan-withdrawal-day" type="number" min="1" max="31" step="1" value="${plan.withdrawalDay ?? 1}" /></label>
      <label>想定利回り(年%)<input class="plan-expected-return" type="number" step="0.1" value="${plan.expectedReturn ?? ""}" /></label>
      <label>取崩年齢<input class="plan-withdraw-age" type="number" min="0" max="120" step="1" value="${plan.withdrawAge ?? ""}" /></label>
    </div>
    <div class="change-wrap">
      <div class="change-header">
        <p>金額変更（月から反映）</p>
        <button type="button" class="small add-change">変更を追加</button>
      </div>
      <div class="change-list"></div>
    </div>
    <button type="button" class="danger remove-plan">この枠を削除</button>
  `;

  const changeList = wrap.querySelector(".change-list");
  const changes = Array.isArray(plan.changes) && plan.changes.length > 0 ? plan.changes : [];
  changes.forEach((change) => changeList.appendChild(createChangeRow(change)));

  wrap.querySelector(".add-change").addEventListener("click", () => {
    changeList.appendChild(createChangeRow());
  });

  wrap.querySelector(".remove-plan").addEventListener("click", () => {
    wrap.remove();
  });

  return wrap;
}

function collectPlansFromForm() {
  return Array.from(planList.querySelectorAll(".plan-item"))
    .map((block) => {
      const changes = Array.from(block.querySelectorAll(".change-row"))
        .map((row) => ({
          month: row.querySelector(".change-month").value,
          amount: Number(row.querySelector(".change-amount").value),
        }))
        .filter((item) => item.month && Number.isFinite(item.amount));

      return {
        id: block.querySelector(".plan-id").value,
        type: block.querySelector(".plan-type").value,
        name: block.querySelector(".plan-name").value.trim(),
        startMonth: block.querySelector(".plan-start-month").value,
        baseAmount: Number(block.querySelector(".plan-base-amount").value),
        withdrawalDay: Number(block.querySelector(".plan-withdrawal-day").value),
        expectedReturn: Number(block.querySelector(".plan-expected-return").value),
        withdrawAge: Number(block.querySelector(".plan-withdraw-age").value),
        changes,
      };
    })
    .filter((plan) => Number.isFinite(plan.baseAmount) && plan.baseAmount >= 0 && plan.startMonth);
}

function renderPlans(settings) {
  planList.innerHTML = "";
  settings.plans.forEach((plan) => {
    planList.appendChild(createPlanBlock(plan));
  });
}

function saveProfile(event) {
  event.preventDefault();
  const settings = {
    birthDate: birthDateInput.value,
    plans: collectPlansFromForm(),
  };

  if (!settings.birthDate) return;

  saveSettings(settings);
  render();
}

function render() {
  const transactions = loadTransactions();
  const settings = loadSettings();
  const currentMonth = monthFilter.value;
  const autoTransactions = createAutoExpensesForMonth(settings, currentMonth);
  const summary = calculateMonthlySummary(transactions, settings, currentMonth);

  birthDateInput.value = settings.birthDate || "";

  const filtered = currentMonth
    ? [...transactions, ...autoTransactions].filter((item) => monthISO(item.date) === currentMonth)
    : [...transactions, ...autoTransactions];

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

      if (item.isAuto) {
        del.remove();
      } else {
        del.addEventListener("click", () => {
          const next = loadTransactions().filter((tx) => tx.id !== item.id);
          saveTransactions(next);
          render();
        });
      }

      row.dataset.id = item.id;
      list.appendChild(node);
    });

  incomeTotal.textContent = yen.format(summary.income);
  expenseTotal.textContent = yen.format(summary.expense);
  carryoverTotal.textContent = yen.format(summary.carryover);
  balanceTotal.textContent = yen.format(summary.endingBalance);

  renderExpenseChart([...transactions, ...autoTransactions], currentMonth);
  renderAutoBreakdown(autoTransactions, currentMonth);
  renderAssetForecast(settings);
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
  const ok = window.confirm("すべての取引・設定を削除します。よろしいですか？");
  if (!ok) return;
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(SETTINGS_KEY);
  planList.innerHTML = "";
  render();
}

function init() {
  const settings = loadSettings();

  dateInput.value = todayISO();
  monthFilter.value = todayISO().slice(0, 7);
  syncCategoryOptions();
  renderPlans(settings);

  form.addEventListener("submit", addTransaction);
  typeInput.addEventListener("change", syncCategoryOptions);
  monthFilter.addEventListener("change", render);
  clearButton.addEventListener("click", clearAll);

  addPlanButton.addEventListener("click", () => {
    planList.appendChild(createPlanBlock());
  });
  profileForm.addEventListener("submit", saveProfile);

  render();
}

init();
