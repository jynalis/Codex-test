const STORAGE_KEY = "kakeibo_transactions_v1";
const SETTINGS_KEY = "kakeibo_settings_v1";

const form = document.getElementById("transaction-form");
const dateInput = document.getElementById("date");
const typeInput = document.getElementById("type");
const categoryInput = document.getElementById("category");
const amountInput = document.getElementById("amount");
const memoInput = document.getElementById("memo");
const monthFilter = document.getElementById("month-filter");

const profileForm = document.getElementById("profile-form");
const entryStartMonthInput = document.getElementById("entry-start-month");
const birthDateInput = document.getElementById("birth-date");
const planList = document.getElementById("plan-list");
const assetForecast = document.getElementById("asset-forecast");

const list = document.getElementById("transaction-list");
const template = document.getElementById("transaction-item-template");
const carryoverTotal = document.getElementById("carryover-total");
const incomeTotal = document.getElementById("income-total");
const regularExpenseTotal = document.getElementById("regular-expense-total");
const assetExpenseTotal = document.getElementById("asset-expense-total");
const expenseTotal = document.getElementById("expense-total");
const balanceTotal = document.getElementById("balance-total");
const dashboardCarryoverTotal = document.getElementById("dashboard-carryover-total");
const dashboardIncomeTotal = document.getElementById("dashboard-income-total");
const dashboardExpenseTotal = document.getElementById("dashboard-expense-total");
const dashboardBalanceTotal = document.getElementById("dashboard-balance-total");
const dashboardMonthlySavingTotal = document.getElementById("dashboard-monthly-saving-total");
const dashboardAge60Total = document.getElementById("dashboard-age60-total");
const dashboardDiagnosisComment = document.getElementById("dashboard-diagnosis-comment");
const expenseChart = document.getElementById("expense-chart");
const autoBreakdown = document.getElementById("auto-breakdown");
const bottomNavButtons = Array.from(document.querySelectorAll(".bottom-nav-btn"));
const navToast = document.getElementById("nav-toast");
const accordionSections = Array.from(document.querySelectorAll("[data-accordion-section]"));

const NAV_TARGETS = {
  home: "section-home",
  input: "section-input",
  assets: "section-assets",
  history: "section-history",
};

const EXPENSE_CATEGORIES = ["日常費", "趣味・レジャー費", "雑費・予備費", "家賃・マイホーム費", "生命保険"];
const CATEGORY_OPTIONS = {
  expense: EXPENSE_CATEGORIES,
  income: ["定期収入", "臨時収入"],
};
const PLAN_TYPES = ["NISA", "iDeCo", "貯蓄性保険", "貯金"];
const PLAN_TYPE_CLASS = {
  NISA: "is-nisa",
  iDeCo: "is-ideco",
  貯蓄性保険: "is-insurance",
  貯金: "is-savings",
};
const ASSET_FORMATION_CATEGORY = "資産形成支出";
const ASSET_PIE_COLORS = ["#245e8f", "#b85c3f", "#2f7e68", "#7a56ad", "#9b7a2f", "#3c6a9b", "#b04f74", "#4f7f9f"];

const yen = new Intl.NumberFormat("ja-JP", {
  style: "currency",
  currency: "JPY",
  maximumFractionDigits: 0,
});
const numberWithComma = new Intl.NumberFormat("ja-JP");

function parseAmountInput(value) {
  if (typeof value !== "string") return 0;
  const normalized = value.replace(/[^\d]/g, "");
  return normalized ? Number(normalized) : 0;
}

function formatAmountInputValue(value) {
  const amount = parseAmountInput(value);
  return amount > 0 ? numberWithComma.format(amount) : "";
}

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
  return { birthDate: "", entryStartMonth: "", plans: [] };
}

function parseMonth(month) {
  if (typeof month !== "string") return null;
  const match = month.match(/^(\d{4})-(\d{2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  if (!Number.isInteger(year) || monthIndex < 0 || monthIndex > 11) return null;
  return { year, monthIndex };
}

function formatMonth(year, monthIndex) {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
}

function compareMonth(a, b) {
  return a.localeCompare(b);
}

function isMonthOnOrAfter(targetMonth, baseMonth) {
  if (!parseMonth(targetMonth) || !parseMonth(baseMonth)) return false;
  return compareMonth(targetMonth, baseMonth) >= 0;
}

function isSameMonth(a, b) {
  if (!parseMonth(a) || !parseMonth(b)) return false;
  return compareMonth(a, b) === 0;
}

function normalizeMonthlyContributionHistory(plan) {
  if (Array.isArray(plan.monthlyContributions) && plan.monthlyContributions.length > 0) {
    return plan.monthlyContributions
      .map((item) => ({
        startMonth: item.startMonth,
        amount: Math.max(Number(item.amount) || 0, 0),
      }))
      .filter((item) => parseMonth(item.startMonth))
      .sort((a, b) => compareMonth(a.startMonth, b.startMonth));
  }

  const migrated = [];
  if (parseMonth(plan.startMonth)) {
    migrated.push({ startMonth: plan.startMonth, amount: Math.max(Number(plan.baseAmount) || 0, 0) });
  }

  const oldChanges = Array.isArray(plan.changes) ? plan.changes : [];
  oldChanges.forEach((change) => {
    if (!parseMonth(change.month)) return;
    migrated.push({
      startMonth: change.month,
      amount: Math.max(Number(change.amount) || 0, 0),
    });
  });

  return migrated.sort((a, b) => compareMonth(a.startMonth, b.startMonth));
}

function normalizeLumpSumHistory(plan) {
  if (!Array.isArray(plan.lumpSums)) return [];
  return plan.lumpSums
    .map((item) => ({
      month: item.month,
      amount: Math.max(Number(item.amount) || 0, 0),
    }))
    .filter((item) => parseMonth(item.month))
    .sort((a, b) => compareMonth(a.month, b.month));
}

function normalizePlan(rawPlan) {
  const plan = rawPlan ?? {};
  return {
    id: plan.id || crypto.randomUUID(),
    type: PLAN_TYPES.includes(plan.type) ? plan.type : "NISA",
    name: typeof plan.name === "string" ? plan.name : "",
    expectedReturn: Number(plan.expectedReturn) || 0,
    withdrawalDay: Math.max(Number(plan.withdrawalDay) || 1, 1),
    withdrawAge: Math.max(Number(plan.withdrawAge) || 0, 0),
    lumpSums: normalizeLumpSumHistory(plan),
    monthlyContributions: normalizeMonthlyContributionHistory(plan),
  };
}

function loadSettings() {
  const raw = localStorage.getItem(SETTINGS_KEY);
  if (!raw) return defaultSettings();

  try {
    const data = JSON.parse(raw);
    const plans = Array.isArray(data.plans) ? data.plans : [];
    return {
      birthDate: data.birthDate ?? "",
      entryStartMonth: parseMonth(data.entryStartMonth) ? data.entryStartMonth : "",
      plans: plans.map((plan) => normalizePlan(plan)),
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

function clampDay(year, month, day) {
  const lastDay = new Date(year, month, 0).getDate();
  return Math.min(Math.max(day, 1), lastDay);
}

function addOneMonth(month) {
  const parsed = parseMonth(month);
  if (!parsed) return month;
  const next = new Date(parsed.year, parsed.monthIndex + 1, 1);
  return formatMonth(next.getFullYear(), next.getMonth());
}

function monthsBetweenInclusive(startMonth, endMonth) {
  const start = parseMonth(startMonth);
  const end = parseMonth(endMonth);
  if (!start || !end) return 0;
  return (end.year - start.year) * 12 + (end.monthIndex - start.monthIndex) + 1;
}

function findActiveMonthlyContribution(plan, month) {
  const histories = Array.isArray(plan.monthlyContributions) ? plan.monthlyContributions : [];
  const active = histories
    .filter((history) => history.startMonth && isMonthOnOrAfter(month, history.startMonth))
    .sort((a, b) => compareMonth(a.startMonth, b.startMonth));
  if (active.length === 0) return 0;
  return Math.max(Number(active[active.length - 1].amount) || 0, 0);
}

function getLumpSumsOnMonth(plan, month) {
  const histories = Array.isArray(plan.lumpSums) ? plan.lumpSums : [];
  return histories.filter((history) => isSameMonth(history.month, month)).map((history) => Math.max(Number(history.amount) || 0, 0));
}

function createAutoExpensesForMonth(settings, month) {
  if (!month) return [];
  if (parseMonth(settings.entryStartMonth) && compareMonth(month, settings.entryStartMonth) < 0) return [];
  const [yearStr, monthStr] = month.split("-");
  const year = Number(yearStr);
  const monthNum = Number(monthStr);

  return settings.plans.flatMap((plan) => {
    const day = clampDay(year, monthNum, Number(plan.withdrawalDay) || 1);
    const date = `${month}-${String(day).padStart(2, "0")}`;

    const monthlyAmount = findActiveMonthlyContribution(plan, month);
    const monthlyTx = monthlyAmount
      ? [{
          id: `auto-monthly-${plan.id}-${month}`,
          date,
          type: "expense",
          category: ASSET_FORMATION_CATEGORY,
          amount: monthlyAmount,
          memo: `月額積立: ${plan.type}${plan.name ? `（${plan.name}）` : ""}`,
          isAuto: true,
          sourceType: plan.type,
          sourceKind: "monthly",
        }]
      : [];

    const lumpTx = getLumpSumsOnMonth(plan, month).map((amount, index) => ({
      id: `auto-lump-${plan.id}-${month}-${index}`,
      date,
      type: "expense",
      category: ASSET_FORMATION_CATEGORY,
      amount,
      memo: `一括入金: ${plan.type}${plan.name ? `（${plan.name}）` : ""}`,
      isAuto: true,
      sourceType: plan.type,
      sourceKind: "lump",
    }));

    return [...monthlyTx, ...lumpTx];
  });
}

function resolveEntryStartMonth(settings, transactions) {
  if (parseMonth(settings.entryStartMonth)) return settings.entryStartMonth;

  const earliestManual = transactions
    .map((item) => item.date)
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b))[0];
  if (earliestManual) return monthISO(earliestManual);
  return todayISO().slice(0, 7);
}

function createEligibleAutoExpensesForMonth(settings, transactions, month) {
  if (!month) return [];
  const entryStartMonth = resolveEntryStartMonth(settings, transactions);
  if (entryStartMonth && compareMonth(month, entryStartMonth) < 0) return [];

  const generated = createAutoExpensesForMonth(settings, month);
  return generated.filter((autoTx) => {
    return !transactions.some((item) => {
      return (
        item.type === "expense" &&
        item.date === autoTx.date &&
        item.category === ASSET_FORMATION_CATEGORY &&
        item.amount === autoTx.amount &&
        item.memo === autoTx.memo
      );
    });
  });
}

function resolveAutoExpenseStartMonth(settings) {
  const planMonths = (settings.plans ?? []).flatMap((plan) => {
    const monthlyMonths = (Array.isArray(plan.monthlyContributions) ? plan.monthlyContributions : [])
      .map((history) => history.startMonth)
      .filter((month) => parseMonth(month));
    const lumpMonths = (Array.isArray(plan.lumpSums) ? plan.lumpSums : [])
      .map((history) => history.month)
      .filter((month) => parseMonth(month));
    return [...monthlyMonths, ...lumpMonths];
  });

  if (planMonths.length === 0) return null;
  return planMonths.sort(compareMonth)[0];
}

function resolveEffectiveAutoStartMonth(settings) {
  const autoStartMonth = resolveAutoExpenseStartMonth(settings);
  const entryStartMonth = parseMonth(settings.entryStartMonth) ? settings.entryStartMonth : null;

  if (!autoStartMonth) return null;
  if (!entryStartMonth) return autoStartMonth;
  return compareMonth(autoStartMonth, entryStartMonth) < 0 ? entryStartMonth : autoStartMonth;
}

function calculateCarryover(transactions, settings, targetMonth) {
  if (!targetMonth) return 0;

  const manual = transactions.reduce((sum, item) => {
    const txMonth = monthISO(item.date);
    if (compareMonth(txMonth, targetMonth) >= 0) return sum;
    return sum + (item.type === "income" ? item.amount : -item.amount);
  }, 0);

  let auto = 0;
  const autoStartMonth = resolveEffectiveAutoStartMonth(settings);
  if (autoStartMonth) {
    let month = autoStartMonth;
    while (compareMonth(month, targetMonth) < 0) {
      const autoTransactions = createEligibleAutoExpensesForMonth(settings, transactions, month);
      auto -= autoTransactions.reduce((sum, item) => sum + item.amount, 0);
      month = addOneMonth(month);
    }
  }

  return manual + auto;
}

function calculateMonthlySummary(transactions, settings, targetMonth) {
  if (!targetMonth) {
    return { carryover: 0, income: 0, regularExpense: 0, assetExpense: 0, expense: 0, endingBalance: 0 };
  }

  const carryover = calculateCarryover(transactions, settings, targetMonth);
  const autoTransactions = createEligibleAutoExpensesForMonth(settings, transactions, targetMonth);
  const monthly = [...transactions, ...autoTransactions].reduce(
    (totals, item) => {
      if (monthISO(item.date) !== targetMonth) return totals;
      if (item.type === "income") {
        totals.income += item.amount;
      } else if (item.isAuto) {
        totals.assetExpense += item.amount;
      } else {
        totals.regularExpense += item.amount;
      }
      return totals;
    },
    { income: 0, regularExpense: 0, assetExpense: 0 }
  );
  const totalExpense = monthly.regularExpense + monthly.assetExpense;

  return {
    carryover,
    income: monthly.income,
    regularExpense: monthly.regularExpense,
    assetExpense: monthly.assetExpense,
    expense: totalExpense,
    endingBalance: carryover + monthly.income - totalExpense,
  };
}

function calculateMonthlyContributionTotal(settings, month) {
  if (!month || !Array.isArray(settings.plans)) return 0;
  return settings.plans.reduce((sum, plan) => sum + findActiveMonthlyContribution(plan, month), 0);
}

function calculateProjectedTotalAtAge(settings, age) {
  if (!settings.birthDate || !Array.isArray(settings.plans) || settings.plans.length === 0) return 0;
  return settings.plans.reduce((sum, plan) => {
    const projection = projectPlanAssetDetails(plan, settings.birthDate, resolveWithdrawTargetMonth(settings.birthDate, age));
    return sum + (projection.amount || 0);
  }, 0);
}

function createDashboardDiagnosisComment({ summary, monthlySavingTotal, manualTransactionCount }) {
  if (manualTransactionCount < 3) {
    return "取引データが少ないため、簡易診断を表示しています。入力が増えると、より実態に近い診断ができます。";
  }

  const balance = summary.endingBalance;
  if (balance < 0) {
    return "今月は赤字傾向です。固定費や臨時支出の見直し余地があります。";
  }

  const income = summary.income;
  const reserveRatio = income > 0 ? balance / income : 0;
  const savingsHeavyAndLowCash = monthlySavingTotal > 0 && income > 0 && monthlySavingTotal / income >= 0.25 && reserveRatio <= 0.1;
  if (savingsHeavyAndLowCash) {
    return "資産形成はできていますが、手元資金に余裕が少ない状態です。積立額とのバランス確認がおすすめです。";
  }

  const hasSavings = monthlySavingTotal > 0;
  if (hasSavings && reserveRatio >= 0.2) {
    return "今月は家計が安定しています。この調子で資産形成を継続できそうです。";
  }

  return "今月は黒字ですが、月末の余裕はやや小さめです。支出バランスを確認してみましょう。";
}

function renderDashboard(summary, settings, currentMonth, transactions) {
  const monthlySavingTotal = calculateMonthlyContributionTotal(settings, currentMonth);
  const manualTransactionCount = transactions.filter((item) => monthISO(item.date) === currentMonth).length;
  dashboardCarryoverTotal.textContent = yen.format(summary.carryover);
  dashboardIncomeTotal.textContent = yen.format(summary.income);
  dashboardExpenseTotal.textContent = yen.format(summary.expense);
  dashboardBalanceTotal.textContent = yen.format(summary.endingBalance);
  dashboardMonthlySavingTotal.textContent = yen.format(monthlySavingTotal);
  dashboardAge60Total.textContent = yen.format(calculateProjectedTotalAtAge(settings, 60));
  dashboardDiagnosisComment.textContent = createDashboardDiagnosisComment({
    summary,
    monthlySavingTotal,
    manualTransactionCount,
  });
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
  wrap.innerHTML = `<h3>資産形成支出（自動反映）の内訳（${month}）</h3>`;

  if (!hasAny) {
    const empty = document.createElement("p");
    empty.className = "chart-empty";
    empty.textContent = "この月の資産形成支出はありません。";
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
  totalEl.innerHTML = `資産形成支出合計: <strong>${yen.format(total)}</strong>`;
  wrap.appendChild(totalEl);
  autoBreakdown.appendChild(wrap);
}

function createPieChartElements(entries, total, options = {}) {
  const chartColors = options.colors || ASSET_PIE_COLORS;
  let currentDegree = 0;
  const segments = entries.map(([, amount], index) => {
    const ratio = amount / total;
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
  pieCenter.innerHTML = `<span>${options.centerLabel || "合計"}</span><strong>${yen.format(total)}</strong>`;
  pieChart.appendChild(pieCenter);
  pieWrap.appendChild(pieChart);

  const legend = document.createElement("ul");
  legend.className = "pie-legend";
  entries.forEach(([name, amount], index) => {
    const ratio = total === 0 ? 0 : (amount / total) * 100;
    const item = document.createElement("li");
    item.className = "pie-legend-item";
    item.innerHTML = `
      <span class="dot" style="background:${chartColors[index % chartColors.length]}"></span>
      <span class="category">${name}</span>
      <strong class="ratio">${ratio.toFixed(1)}%</strong>
      <span class="value">${yen.format(amount)}</span>
    `;
    legend.appendChild(item);
  });

  return { pieWrap, legend };
}

function setupFormattedAmountInput(input) {
  if (!input) return;
  input.addEventListener("input", () => {
    const amount = parseAmountInput(input.value);
    input.dataset.rawValue = amount > 0 ? String(amount) : "";
  });
  input.addEventListener("blur", () => {
    input.value = formatAmountInputValue(input.value);
  });
  input.addEventListener("focus", () => {
    const amount = parseAmountInput(input.value);
    input.value = amount > 0 ? String(amount) : "";
  });
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

function parseBirthDate(birthDate) {
  if (typeof birthDate !== "string") return null;
  const match = birthDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, monthIndex, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== monthIndex ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

function resolveWithdrawTargetMonth(birthDate, withdrawAge) {
  const birth = parseBirthDate(birthDate);
  if (!birth) return null;

  const targetAge = Number(withdrawAge);
  if (!Number.isFinite(targetAge) || targetAge < 0) return null;

  const withdrawDate = new Date(
    birth.getFullYear() + targetAge,
    birth.getMonth(),
    birth.getDate()
  );
  return formatMonth(withdrawDate.getFullYear(), withdrawDate.getMonth());
}

function resolveProjectionStartMonth(plan, targetMonth) {
  const monthlyStart = (Array.isArray(plan.monthlyContributions) ? plan.monthlyContributions : [])
    .map((history) => history.startMonth)
    .filter((month) => parseMonth(month) && isMonthOnOrAfter(targetMonth, month))
    .sort(compareMonth)[0];

  const lumpStart = (Array.isArray(plan.lumpSums) ? plan.lumpSums : [])
    .map((history) => history.month)
    .filter((month) => parseMonth(month) && isMonthOnOrAfter(targetMonth, month))
    .sort(compareMonth)[0];

  if (!monthlyStart) return lumpStart || null;
  if (!lumpStart) return monthlyStart;
  return compareMonth(monthlyStart, lumpStart) <= 0 ? monthlyStart : lumpStart;
}

function projectPlanAssetDetails(plan, birthDate, explicitTargetMonth = null) {
  const annualReturn = (Number(plan.expectedReturn) || 0) / 100;
  const monthlyRate = Math.pow(1 + annualReturn, 1 / 12) - 1;
  const targetMonth = explicitTargetMonth || resolveWithdrawTargetMonth(birthDate, plan.withdrawAge);
  if (!targetMonth) {
    return { amount: 0, startMonth: null, targetMonth, months: 0, appliedMonthly: [], appliedLumpSums: [] };
  }

  const startMonth = resolveProjectionStartMonth(plan, targetMonth);
  if (!startMonth || compareMonth(startMonth, targetMonth) > 0) {
    return { amount: 0, startMonth, targetMonth, months: 0, appliedMonthly: [], appliedLumpSums: [] };
  }

  let month = startMonth;
  let total = 0;
  const appliedMonthly = [];
  const appliedLumpSums = [];

  while (compareMonth(month, targetMonth) <= 0) {
    const monthlyAmount = findActiveMonthlyContribution(plan, month);
    if (monthlyAmount > 0) {
      appliedMonthly.push({ month, amount: monthlyAmount });
      total += monthlyAmount;
    }

    const lumpSums = getLumpSumsOnMonth(plan, month);
    lumpSums.forEach((amount) => {
      if (amount > 0) {
        appliedLumpSums.push({ month, amount });
        total += amount;
      }
    });

    total *= 1 + monthlyRate;
    month = addOneMonth(month);
  }

  return {
    amount: Math.round(total),
    startMonth,
    targetMonth,
    months: monthsBetweenInclusive(startMonth, targetMonth),
    appliedMonthly,
    appliedLumpSums,
  };
}

function resolveCurrentAssetTargetMonth(settings, transactions) {
  const months = [
    todayISO().slice(0, 7),
    parseMonth(monthFilter.value) ? monthFilter.value : "",
    resolveEntryStartMonth(settings, transactions),
    ...transactions.map((item) => monthISO(item.date)),
  ].filter((month) => parseMonth(month));

  if (months.length === 0) return todayISO().slice(0, 7);
  return months.sort(compareMonth).at(-1);
}

function renderAssetForecast(settings) {
  assetForecast.innerHTML = "";
  if (!settings.birthDate || settings.plans.length === 0) {
    assetForecast.innerHTML = '<p class="chart-empty">生年月日と積立設定を保存すると、現時点と60歳時点の資産試算が表示されます。</p>';
    return;
  }

  const transactions = loadTransactions();
  const currentAge = calculateAge(settings.birthDate);
  const age60TargetMonth = resolveWithdrawTargetMonth(settings.birthDate, 60);
  const currentAssetTargetMonth = resolveCurrentAssetTargetMonth(settings, transactions);

  const projectedRowsAt60 = settings.plans.map((plan) => {
    const projection = projectPlanAssetDetails(plan, settings.birthDate, age60TargetMonth);
    return {
      ...plan,
      projectedAmount: projection.amount,
      projection,
    };
  });

  const currentRows = settings.plans.map((plan) => {
    const currentProjection = projectPlanAssetDetails(plan, settings.birthDate, currentAssetTargetMonth);
    return {
      ...plan,
      currentAmount: currentProjection.amount,
      currentProjection,
    };
  });

  const rows = projectedRowsAt60
    .map(
      (plan) => `
      <li>
        <span>${plan.type}${plan.name ? `（${plan.name}）` : ""} / 60歳時点</span>
        <strong>${yen.format(plan.projectedAmount)}</strong>
      </li>
    `
    )
    .join("");

  const typeTotals = PLAN_TYPES.map((type) => {
    const amount = projectedRowsAt60
      .filter((plan) => plan.type === type)
      .reduce((sum, plan) => sum + plan.projectedAmount, 0);
    return { type, amount };
  });

  const totalAt60 = projectedRowsAt60.reduce((sum, plan) => sum + plan.projectedAmount, 0);
  const typeTotalsHtml = typeTotals
    .map((item) => `<li><span>${item.type} 合計</span><strong>${yen.format(item.amount)}</strong></li>`)
    .join("");
  assetForecast.innerHTML = `
    <section class="chart asset-outlook">
      <h3>将来の資産見通し（60歳時点）</h3>
      <p class="section-description">現在年齢: <strong>${currentAge}歳</strong> / 60歳までの積立・運用をもとに試算しています。</p>
      <h4>契約別の想定資産額</h4>
      <ul class="asset-list">${rows}</ul>
      <h4>種別別の想定資産額</h4>
      <ul class="asset-list">${typeTotalsHtml}</ul>
      <div class="asset-total">60歳時点の想定総資産額: <strong>${yen.format(totalAt60)}</strong></div>
    </section>
  `;

  const chartSection = document.createElement("section");
  chartSection.className = "chart asset-composition";
  chartSection.innerHTML = `
    <h3>現時点の総資産額の構成比（契約別）</h3>
    <p class="section-description">現在入力されている積立・一括入金の実績をもとに算出しています（基準月: ${currentAssetTargetMonth}）。</p>
  `;

  const currentTotal = currentRows.reduce((sum, plan) => sum + plan.currentAmount, 0);
  if (currentRows.length === 0 || currentTotal === 0) {
    const empty = document.createElement("p");
    empty.className = "chart-empty";
    empty.textContent = "データがありません";
    chartSection.appendChild(empty);
    assetForecast.appendChild(chartSection);
    return;
  }

  const contractEntries = currentRows
    .filter((plan) => plan.currentAmount > 0)
    .map((plan) => [`${plan.type}${plan.name ? `（${plan.name}）` : ""}`, plan.currentAmount]);
  const { pieWrap, legend } = createPieChartElements(contractEntries, currentTotal, {
    centerLabel: "現時点総額",
    colors: ASSET_PIE_COLORS,
  });
  chartSection.appendChild(pieWrap);
  chartSection.appendChild(legend);

  assetForecast.appendChild(chartSection);
}

function createHistoryRow({ type, month = "", amount = "" } = {}) {
  const row = document.createElement("div");
  row.className = "history-row";
  const monthClass = type === "lump" ? "lump-month" : "monthly-start-month";
  const amountClass = type === "lump" ? "lump-amount" : "monthly-amount";
  const monthLabel = type === "lump" ? "年月" : "開始年月";
  const amountLabel = type === "lump" ? "一括入金額(円)" : "月額(円)";

  row.innerHTML = `
    <label>${monthLabel}<input type="month" class="${monthClass}" value="${month}" /></label>
    <label>${amountLabel}<input type="text" inputmode="numeric" class="${amountClass} js-amount-field" value="${amount ? numberWithComma.format(amount) : ""}" /></label>
    <button type="button" class="small danger remove-history">削除</button>
  `;
  const amountField = row.querySelector(`.${amountClass}`);
  setupFormattedAmountInput(amountField);
  row.querySelector(".remove-history").addEventListener("click", () => row.remove());
  return row;
}

function createPlanBlock(plan = {}) {
  const normalizedPlan = normalizePlan(plan);
  const wrap = document.createElement("article");
  wrap.className = "plan-item";

  const typeOptions = PLAN_TYPES.map((type) => `<option value="${type}" ${normalizedPlan.type === type ? "selected" : ""}>${type}</option>`).join("");
  wrap.innerHTML = `
    <input type="hidden" class="plan-id" value="${normalizedPlan.id}" />
    <header class="plan-card-header">
      <p class="plan-card-title">${normalizedPlan.type}｜${normalizedPlan.name || "識別名未設定"}</p>
      <span class="plan-card-tag">${normalizedPlan.type}</span>
    </header>
    <div class="plan-grid">
      <label>種類<select class="plan-type">${typeOptions}</select></label>
      <label>識別名<input class="plan-name" type="text" maxlength="30" placeholder="例: つみたて枠" value="${normalizedPlan.name || ""}" /></label>
      <label>想定利回り(年%)<input class="plan-expected-return" type="number" step="0.1" value="${normalizedPlan.expectedReturn ?? ""}" /></label>
      <label>取崩年齢<input class="plan-withdraw-age" type="number" min="0" max="120" step="1" value="${normalizedPlan.withdrawAge ?? ""}" /></label>
      <label>引き落とし日<input class="plan-withdrawal-day" type="number" min="1" max="31" step="1" value="${normalizedPlan.withdrawalDay ?? 1}" /></label>
    </div>
    <div class="change-wrap">
      <div class="change-header">
        <p>一括入金履歴（登録月に1回のみ反映）</p>
        <button type="button" class="small add-lump">一括入金を追加</button>
      </div>
      <div class="lump-list"></div>
    </div>
    <div class="change-wrap">
      <div class="change-header">
        <p>月額積立履歴（開始年月以降で有効）</p>
        <button type="button" class="small add-monthly">月額履歴を追加</button>
      </div>
      <div class="monthly-list"></div>
    </div>
    <button type="button" class="add-plan-inline"><span aria-hidden="true" class="add-plan-inline-icon">＋</span><span>この下に追加</span></button>
    <button type="button" class="danger remove-plan">この枠を削除</button>
  `;

  const lumpList = wrap.querySelector(".lump-list");
  const monthlyList = wrap.querySelector(".monthly-list");
  const planTypeField = wrap.querySelector(".plan-type");
  const planNameField = wrap.querySelector(".plan-name");
  const title = wrap.querySelector(".plan-card-title");
  const tag = wrap.querySelector(".plan-card-tag");

  normalizedPlan.lumpSums.forEach((history) => lumpList.appendChild(createHistoryRow({ type: "lump", month: history.month, amount: history.amount })));
  normalizedPlan.monthlyContributions.forEach((history) =>
    monthlyList.appendChild(createHistoryRow({ type: "monthly", month: history.startMonth, amount: history.amount }))
  );

  const refreshPlanVisual = () => {
    const type = planTypeField.value;
    const name = planNameField.value.trim();
    wrap.classList.remove(...Object.values(PLAN_TYPE_CLASS));
    wrap.classList.add(PLAN_TYPE_CLASS[type] || PLAN_TYPE_CLASS.NISA);
    title.textContent = `${type}｜${name || "識別名未設定"}`;
    tag.textContent = type;
  };

  planTypeField.addEventListener("change", refreshPlanVisual);
  planNameField.addEventListener("input", refreshPlanVisual);
  refreshPlanVisual();

  wrap.querySelector(".add-lump").addEventListener("click", () => {
    lumpList.appendChild(createHistoryRow({ type: "lump" }));
  });

  wrap.querySelector(".add-monthly").addEventListener("click", () => {
    monthlyList.appendChild(createHistoryRow({ type: "monthly" }));
  });

  wrap.querySelector(".remove-plan").addEventListener("click", () => {
    wrap.remove();
  });

  wrap.querySelector(".add-plan-inline").addEventListener("click", () => {
    const newBlock = createPlanBlock();
    wrap.insertAdjacentElement("afterend", newBlock);
    newBlock.scrollIntoView({ behavior: "smooth", block: "center" });
  });

  return wrap;
}

function collectPlansFromForm() {
  return Array.from(planList.querySelectorAll(".plan-item"))
    .map((block) => {
      const lumpSums = Array.from(block.querySelectorAll(".lump-list .history-row"))
        .map((row) => ({
          month: row.querySelector(".lump-month").value,
          amount: parseAmountInput(row.querySelector(".lump-amount").value),
        }))
        .filter((item) => item.month && Number.isFinite(item.amount) && item.amount >= 0)
        .sort((a, b) => compareMonth(a.month, b.month));

      const monthlyContributions = Array.from(block.querySelectorAll(".monthly-list .history-row"))
        .map((row) => ({
          startMonth: row.querySelector(".monthly-start-month").value,
          amount: parseAmountInput(row.querySelector(".monthly-amount").value),
        }))
        .filter((item) => item.startMonth && Number.isFinite(item.amount) && item.amount >= 0)
        .sort((a, b) => compareMonth(a.startMonth, b.startMonth));

      return {
        id: block.querySelector(".plan-id").value,
        type: block.querySelector(".plan-type").value,
        name: block.querySelector(".plan-name").value.trim(),
        expectedReturn: Number(block.querySelector(".plan-expected-return").value),
        withdrawAge: Number(block.querySelector(".plan-withdraw-age").value),
        withdrawalDay: Number(block.querySelector(".plan-withdrawal-day").value),
        lumpSums,
        monthlyContributions,
      };
    })
    .filter((plan) => plan.lumpSums.length > 0 || plan.monthlyContributions.length > 0)
    .map((plan) => normalizePlan(plan));
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
    entryStartMonth: entryStartMonthInput.value,
    plans: collectPlansFromForm(),
  };

  if (!settings.birthDate || !settings.entryStartMonth) return;

  saveSettings(settings);
  render();
}

function render() {
  const transactions = loadTransactions();
  const settings = loadSettings();
  const currentMonth = monthFilter.value;
  const autoTransactions = createEligibleAutoExpensesForMonth(settings, transactions, currentMonth);
  const summary = calculateMonthlySummary(transactions, settings, currentMonth);

  entryStartMonthInput.value = resolveEntryStartMonth(settings, transactions);
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

      meta.textContent = item.isAuto
        ? `${item.date} / 自動反映 / ${item.sourceType}`
        : `${item.date} / ${item.category}`;
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
  regularExpenseTotal.textContent = yen.format(summary.regularExpense);
  assetExpenseTotal.textContent = yen.format(summary.assetExpense);
  expenseTotal.textContent = yen.format(summary.expense);
  carryoverTotal.textContent = yen.format(summary.carryover);
  balanceTotal.textContent = yen.format(summary.endingBalance);
  renderDashboard(summary, settings, currentMonth, transactions);

  renderExpenseChart([...transactions, ...autoTransactions], currentMonth);
  renderAutoBreakdown(autoTransactions, currentMonth);
  renderAssetForecast(settings);
  syncAccordionPanelHeights();
}

function addTransaction(event) {
  event.preventDefault();

  const date = dateInput.value;
  const type = typeInput.value;
  const category = categoryInput.value.trim();
  const amount = parseAmountInput(amountInput.value);
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
  amountInput.value = "";
  render();
}

function setBottomNavActive(target) {
  bottomNavButtons.forEach((button) => {
    const isActive = button.dataset.navTarget === target;
    button.classList.toggle("is-active", isActive);
    if (isActive) {
      button.setAttribute("aria-current", "page");
    } else {
      button.removeAttribute("aria-current");
    }
  });
}

function showNavToast(message) {
  if (!navToast) return;
  navToast.textContent = message;
  navToast.classList.add("show");
  window.setTimeout(() => {
    navToast.classList.remove("show");
  }, 1500);
}

function updateAccordionPanelHeight(section) {
  const trigger = section.querySelector(".accordion-trigger");
  const panel = section.querySelector(".accordion-panel");
  if (!trigger || !panel) return;
  if (trigger.getAttribute("aria-expanded") !== "true") return;
  panel.style.maxHeight = `${panel.scrollHeight}px`;
}

function syncAccordionPanelHeights() {
  accordionSections.forEach((section) => updateAccordionPanelHeight(section));
}

function setAccordionExpanded(section, expanded) {
  const trigger = section.querySelector(".accordion-trigger");
  const panel = section.querySelector(".accordion-panel");
  if (!trigger || !panel) return;

  trigger.setAttribute("aria-expanded", String(expanded));
  section.classList.toggle("is-expanded", expanded);

  if (expanded) {
    panel.style.maxHeight = `${panel.scrollHeight}px`;
    return;
  }

  panel.style.maxHeight = `${panel.scrollHeight}px`;
  window.requestAnimationFrame(() => {
    panel.style.maxHeight = "0px";
  });
}

function setupSectionAccordions() {
  accordionSections.forEach((section) => {
    const trigger = section.querySelector(".accordion-trigger");
    if (!trigger) return;

    section.classList.remove("is-expanded");
    trigger.setAttribute("aria-expanded", "false");
    const panel = section.querySelector(".accordion-panel");
    if (panel) {
      panel.style.maxHeight = "0px";
    }

    trigger.addEventListener("click", () => {
      const expanded = trigger.getAttribute("aria-expanded") === "true";
      setAccordionExpanded(section, !expanded);
    });
  });

  window.addEventListener("resize", syncAccordionPanelHeights);
}

function scrollToNavSection(target) {
  if (target === "schedule") {
    showNavToast("ライフイベント表は今後追加予定です。");
    return;
  }

  const sectionId = NAV_TARGETS[target];
  const targetSection = sectionId ? document.getElementById(sectionId) : null;
  if (!targetSection) return;

  const accordion = targetSection.querySelector("details.accordion");
  if (accordion) {
    accordion.open = true;
  }
  if (targetSection.dataset.accordionSection !== undefined) {
    setAccordionExpanded(targetSection, true);
  }

  targetSection.scrollIntoView({ behavior: "smooth", block: "start" });
  setBottomNavActive(target);
}

function setupBottomNavigation() {
  bottomNavButtons.forEach((button) => {
    button.addEventListener("click", () => {
      scrollToNavSection(button.dataset.navTarget);
    });
  });

  const sectionElements = Object.entries(NAV_TARGETS)
    .map(([name, id]) => ({ name, element: document.getElementById(id) }))
    .filter((item) => item.element);
  if (sectionElements.length === 0) return;

  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;

      const activeSection = sectionElements.find((item) => item.element === visible.target);
      if (activeSection) {
        setBottomNavActive(activeSection.name);
      }
    },
    { threshold: [0.35, 0.6], rootMargin: "-10% 0px -35% 0px" }
  );

  sectionElements.forEach((item) => observer.observe(item.element));
}

function init() {
  const settings = loadSettings();

  dateInput.value = todayISO();
  monthFilter.value = todayISO().slice(0, 7);
  entryStartMonthInput.value = settings.entryStartMonth || todayISO().slice(0, 7);
  syncCategoryOptions();
  renderPlans(settings);

  form.addEventListener("submit", addTransaction);
  typeInput.addEventListener("change", syncCategoryOptions);
  monthFilter.addEventListener("change", render);
  setupFormattedAmountInput(amountInput);

  profileForm.addEventListener("submit", saveProfile);
  setupSectionAccordions();
  setupBottomNavigation();

  render();
}

init();
