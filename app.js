const STORAGE_KEY = "kakeibo_transactions_v1";
const SETTINGS_KEY = "kakeibo_settings_v1";
const RECURRING_EXPENSES_KEY = "kakeibo_recurring_expenses_v1";

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
const recurringForm = document.getElementById("recurring-form");
const recurringCategoryInput = document.getElementById("recurring-category");
const recurringAmountInput = document.getElementById("recurring-amount");
const recurringDayInput = document.getElementById("recurring-day");
const recurringStartMonthInput = document.getElementById("recurring-start-month");
const recurringEndMonthInput = document.getElementById("recurring-end-month");
const recurringMemoInput = document.getElementById("recurring-memo");
const recurringList = document.getElementById("recurring-list");
const recurringSubmitButton = document.getElementById("recurring-submit-button") || recurringForm?.querySelector('button[type="submit"]');
const recurringCancelButton = document.getElementById("recurring-cancel-button");
const recurringEditStatus = document.getElementById("recurring-edit-status");
const recurringSection = document.getElementById("trigger-recurring")?.closest("[data-accordion-section]");
const recurringFormAccordion = document.getElementById("trigger-recurring-form")?.closest("[data-child-accordion]");

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
const bottomNavButtons = Array.from(document.querySelectorAll(".bottom-nav-btn"));
const navToast = document.getElementById("nav-toast");
const accordionSections = Array.from(document.querySelectorAll("[data-accordion-section]"));
const assetsSection = document.getElementById("section-assets");

let latestAssetForecastSettings = null;
let assetForecastDirty = true;
let assetForecastRenderRafId = 0;
let recurringEditingId = null;

const NAV_TARGETS = {
  home: "section-home",
  input: "section-input",
  assets: "section-assets",
  history: "section-history",
};

const EXPENSE_CATEGORIES = ["日常費", "趣味・レジャー費", "雑費・予備費", "家賃・マイホーム費", "生命保険"];
const RECURRING_EXPENSE_CATEGORIES = ["家賃", "通信費", "保険料", "その他固定費"];
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
const ALLOWED_EXPENSE_CATEGORIES = [...EXPENSE_CATEGORIES, ASSET_FORMATION_CATEGORY, ...RECURRING_EXPENSE_CATEGORIES];
const ASSET_PIE_COLORS = ["#245e8f", "#b85c3f", "#2f7e68", "#7a56ad", "#9b7a2f", "#3c6a9b", "#b04f74", "#4f7f9f"];
const EXPENSE_COMPOSITION_ITEMS = [
  "日常費",
  "趣味・レジャー費",
  "雑費・予備費",
  "家賃・マイホーム費",
  "家賃",
  "通信費",
  "保険料",
  "その他固定費",
  "NISA",
  "iDeCo",
  "貯蓄性保険",
  "貯金",
  "生命保険",
];
const EXPENSE_CHART_COLORS = ["#ff6b6b", "#ff922b", "#ffd43b", "#38d9a9", "#4dabf7", "#9775fa", "#f06595", "#74c0fc", "#2f9e44", "#5c7cfa", "#e64980", "#15aabf"];

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

function syncRecurringCategoryOptions() {
  if (!recurringCategoryInput) return;
  recurringCategoryInput.innerHTML = "";
  RECURRING_EXPENSE_CATEGORIES.forEach((category) => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    recurringCategoryInput.appendChild(option);
  });
}

function syncRecurringDayOptions() {
  if (!recurringDayInput) return;
  recurringDayInput.innerHTML = "";
  for (let day = 1; day <= 31; day += 1) {
    const option = document.createElement("option");
    option.value = String(day);
    option.textContent = `${day}日`;
    recurringDayInput.appendChild(option);
  }
}

function renderRecurringExpenses(items) {
  if (!recurringList) return;
  recurringList.innerHTML = "";
  if (recurringEditingId && !items.some((item) => item.id === recurringEditingId)) {
    recurringEditingId = null;
    setRecurringFormMode(false);
  }
  if (items.length === 0) {
    const empty = document.createElement("p");
    empty.className = "chart-empty";
    empty.textContent = "登録済みの定期支出はありません。";
    recurringList.appendChild(empty);
    return;
  }

  items
    .slice()
    .sort((a, b) => compareMonth(a.startMonth, b.startMonth))
    .forEach((item) => {
      const card = document.createElement("article");
      card.className = "recurring-card";
      card.innerHTML = `
        <div class="recurring-card-header">
          <h4>${item.category}</h4>
          <p class="recurring-amount">${yen.format(item.amount)}</p>
        </div>
        <ul class="recurring-meta-list">
          <li><span>引落日</span><strong>${item.day}日</strong></li>
          <li><span>開始月</span><strong>${item.startMonth}</strong></li>
          <li><span>終了月</span><strong>${item.endMonth || "継続中"}</strong></li>
          <li><span>メモ</span><strong>${item.memo || "なし"}</strong></li>
        </ul>
      `;
      const actionRow = document.createElement("div");
      actionRow.className = "recurring-actions";

      const editButton = document.createElement("button");
      editButton.type = "button";
      editButton.className = "small";
      editButton.textContent = "修正";
      editButton.addEventListener("click", () => {
        startRecurringExpenseEdit(item.id);
      });

      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "small danger";
      deleteButton.textContent = "削除";
      deleteButton.addEventListener("click", () => {
        const next = loadRecurringExpenses().filter((target) => target.id !== item.id);
        saveRecurringExpenses(next);
        render();
      });

      actionRow.append(editButton, deleteButton);
      card.appendChild(actionRow);
      recurringList.appendChild(card);
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
        if (item.type === "expense") return ALLOWED_EXPENSE_CATEGORIES.includes(item.category);
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

function normalizeRecurringExpense(item) {
  return {
    id: typeof item?.id === "string" ? item.id : crypto.randomUUID(),
    category: RECURRING_EXPENSE_CATEGORIES.includes(item?.category) ? item.category : RECURRING_EXPENSE_CATEGORIES[0],
    amount: Math.max(Number(item?.amount) || 0, 0),
    day: Math.min(Math.max(Number(item?.day) || 1, 1), 31),
    startMonth: parseMonth(item?.startMonth) ? item.startMonth : "",
    endMonth: parseMonth(item?.endMonth) ? item.endMonth : "",
    memo: typeof item?.memo === "string" ? item.memo : "",
    createdAt: typeof item?.createdAt === "string" ? item.createdAt : new Date().toISOString(),
  };
}

function loadRecurringExpenses() {
  const raw = localStorage.getItem(RECURRING_EXPENSES_KEY);
  if (!raw) return [];
  try {
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data
      .map((item) => normalizeRecurringExpense(item))
      .filter((item) => item.amount > 0 && parseMonth(item.startMonth));
  } catch {
    return [];
  }
}

function saveRecurringExpenses(items) {
  localStorage.setItem(RECURRING_EXPENSES_KEY, JSON.stringify(items));
}

function resetRecurringFormFields() {
  if (!recurringForm) return;
  recurringCategoryInput.value = RECURRING_EXPENSE_CATEGORIES[0];
  recurringDayInput.value = "1";
  recurringAmountInput.value = "";
  recurringEndMonthInput.value = "";
  recurringMemoInput.value = "";
  recurringStartMonthInput.value = monthFilter.value || todayISO().slice(0, 7);
  recurringEditingId = null;
  setRecurringFormMode(false);
}

function isRecurringExpenseApplicable(item, month) {
  if (!parseMonth(item.startMonth) || !parseMonth(month)) return false;
  if (compareMonth(month, item.startMonth) < 0) return false;
  if (parseMonth(item.endMonth) && compareMonth(month, item.endMonth) > 0) return false;
  return true;
}

function createRecurringExpenseAutoTransactions(recurringExpenses, month) {
  if (!parseMonth(month)) return [];
  const [yearStr, monthStr] = month.split("-");
  const year = Number(yearStr);
  const monthNum = Number(monthStr);

  return recurringExpenses
    .filter((item) => isRecurringExpenseApplicable(item, month))
    .map((item) => {
      const day = clampDay(year, monthNum, item.day);
      const date = `${month}-${String(day).padStart(2, "0")}`;
      return {
        id: `auto-recurring-${item.id}-${month}`,
        date,
        type: "expense",
        category: item.category,
        amount: item.amount,
        memo: item.memo || `${item.category}（定期支出）`,
        isAuto: true,
        autoKind: "recurring-expense",
        isAutoGenerated: true,
        recurringId: item.id,
        targetMonth: month,
      };
    });
}

function syncRecurringAutoTransactions(transactions, recurringExpenses, month) {
  const nextTransactions = transactions.filter((item) => !(item.isAutoGenerated && item.autoKind === "recurring-expense"));
  let changed = nextTransactions.length !== transactions.length;
  if (!parseMonth(month) || recurringExpenses.length === 0) {
    if (changed) {
      saveTransactions(nextTransactions);
    }
    return nextTransactions;
  }

  const earliestMonth = recurringExpenses
    .map((item) => item.startMonth)
    .filter((target) => parseMonth(target))
    .sort(compareMonth)[0];
  if (!earliestMonth || compareMonth(earliestMonth, month) > 0) {
    if (changed) {
      saveTransactions(nextTransactions);
    }
    return nextTransactions;
  }

  let cursor = earliestMonth;
  while (compareMonth(cursor, month) <= 0) {
    const generated = createRecurringExpenseAutoTransactions(recurringExpenses, cursor);
    generated.forEach((autoTx) => {
      const exists = nextTransactions.some((item) => item.id === autoTx.id || (
        item.isAutoGenerated &&
        item.recurringId === autoTx.recurringId &&
        item.targetMonth === autoTx.targetMonth
      ));
      if (!exists) {
        nextTransactions.push(autoTx);
        changed = true;
      }
    });
    cursor = addOneMonth(cursor);
  }

  if (changed) {
    saveTransactions(nextTransactions);
  }
  return nextTransactions;
}

function setRecurringFormMode(isEditing) {
  if (recurringSubmitButton) {
    recurringSubmitButton.textContent = isEditing ? "更新" : "追加";
  }
  if (recurringEditStatus) {
    recurringEditStatus.hidden = !isEditing;
  }
  if (recurringCancelButton) {
    recurringCancelButton.hidden = !isEditing;
  }
}

function startRecurringExpenseEdit(id) {
  const recurringExpense = loadRecurringExpenses().find((item) => item.id === id);
  if (!recurringExpense) return;

  if (recurringSection) {
    setAccordionExpanded(recurringSection, true);
  }
  if (recurringFormAccordion) {
    setChildAccordionExpanded(recurringFormAccordion, true);
  }

  recurringEditingId = recurringExpense.id;
  recurringCategoryInput.value = recurringExpense.category;
  recurringAmountInput.value = numberWithComma.format(recurringExpense.amount);
  recurringDayInput.value = String(recurringExpense.day);
  recurringStartMonthInput.value = recurringExpense.startMonth;
  recurringEndMonthInput.value = recurringExpense.endMonth || "";
  recurringMemoInput.value = recurringExpense.memo || "";
  setRecurringFormMode(true);
  recurringCategoryInput.focus();
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

function normalizeExpenseCompositionCategory(item) {
  if (item?.type !== "expense") return "";
  if (item.category === ASSET_FORMATION_CATEGORY && PLAN_TYPES.includes(item.sourceType)) {
    return item.sourceType;
  }
  return item.category || "";
}

function buildMonthlyExpenseComposition(transactions, targetMonth) {
  const baseTotals = EXPENSE_COMPOSITION_ITEMS.reduce((acc, name) => {
    acc[name] = 0;
    return acc;
  }, {});

  if (!targetMonth) {
    return {
      totalExpense: 0,
      entries: EXPENSE_COMPOSITION_ITEMS.map((name) => ({ name, amount: 0, ratio: 0 })),
      itemRatios: EXPENSE_COMPOSITION_ITEMS.reduce((acc, name) => ({ ...acc, [name]: 0 }), {}),
    };
  }

  const totals = transactions.reduce((acc, item) => {
    if (item.type !== "expense" || monthISO(item.date) !== targetMonth) return acc;
    const category = normalizeExpenseCompositionCategory(item);
    if (!category) return acc;
    if (!(category in acc)) {
      acc[category] = 0;
    }
    acc[category] += item.amount;
    return acc;
  }, { ...baseTotals });

  const totalExpense = Object.values(totals).reduce((sum, amount) => sum + amount, 0);
  const entries = Object.entries(totals)
    .map(([name, amount]) => ({
      name,
      amount,
      ratio: totalExpense > 0 ? (amount / totalExpense) * 100 : 0,
    }))
    .sort((a, b) => {
      if (b.amount !== a.amount) return b.amount - a.amount;
      return EXPENSE_COMPOSITION_ITEMS.indexOf(a.name) - EXPENSE_COMPOSITION_ITEMS.indexOf(b.name);
    });

  const itemRatios = entries.reduce((acc, item) => {
    acc[item.name] = item.ratio;
    return acc;
  }, {});

  return {
    totalExpense,
    entries,
    itemRatios,
  };
}

function createDashboardDiagnosisComment({ summary, monthlySavingTotal, manualTransactionCount, expenseComposition }) {
  if (manualTransactionCount < 3) {
    return "取引データが少ないため、簡易診断を表示しています。入力が増えると、より実態に近い診断ができます。";
  }

  const balance = summary.endingBalance;
  const itemRatios = expenseComposition?.itemRatios || {};
  const fixedExpenseRatio = (itemRatios["家賃"] || 0) + (itemRatios["通信費"] || 0) + (itemRatios["保険料"] || 0) + (itemRatios["その他固定費"] || 0);
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
  if (hasSavings && reserveRatio >= 0.2 && fixedExpenseRatio < 60) {
    return "今月は家計が安定しています。この調子で資産形成を継続できそうです。";
  }

  return "今月は黒字ですが、月末の余裕はやや小さめです。支出バランスを確認してみましょう。";
}

function renderDashboard(summary, settings, currentMonth, transactions, expenseComposition) {
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
    expenseComposition,
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

  const expenseComposition = buildMonthlyExpenseComposition(transactions, currentMonth);
  const drawableEntries = expenseComposition.entries.filter((entry) => entry.amount > 0 && entry.ratio > 0);
  if (expenseComposition.totalExpense === 0 || drawableEntries.length === 0) {
    const empty = document.createElement("p");
    empty.className = "chart-empty";
    empty.textContent = "この月の支出データはありません。";
    expenseChart.appendChild(empty);
    return;
  }

  expenseChart.classList.toggle("has-data", true);
  let currentDegree = 0;
  const segments = drawableEntries.map((entry, index) => {
    const degree = (entry.amount / expenseComposition.totalExpense) * 360;
    const start = currentDegree;
    const end = currentDegree + degree;
    currentDegree = end;
    return `${EXPENSE_CHART_COLORS[index % EXPENSE_CHART_COLORS.length]} ${start}deg ${end}deg`;
  });

  const pieWrap = document.createElement("div");
  pieWrap.className = "pie-wrap";

  const pieChart = document.createElement("div");
  pieChart.className = "pie-chart";
  pieChart.style.background = `conic-gradient(${segments.join(", ")})`;

  const pieCenter = document.createElement("div");
  pieCenter.className = "pie-center";
  pieCenter.innerHTML = `<span>合計</span><strong>${yen.format(expenseComposition.totalExpense)}</strong>`;

  pieChart.appendChild(pieCenter);
  pieWrap.appendChild(pieChart);
  expenseChart.appendChild(pieWrap);

  const legend = document.createElement("ul");
  legend.className = "pie-legend";

  drawableEntries.forEach(({ name, amount, ratio }, index) => {
    const item = document.createElement("li");
    item.className = "pie-legend-item";
    item.innerHTML = `
      <span class="dot" style="background:${EXPENSE_CHART_COLORS[index % EXPENSE_CHART_COLORS.length]}"></span>
      <span class="category">${name}</span>
      <span class="value">${yen.format(amount)}</span>
      <strong class="ratio">${ratio.toFixed(1)}%</strong>
    `;
    legend.appendChild(item);
  });

  expenseChart.appendChild(legend);
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

  const outlookPanelId = "panel-assets-outlook";
  const outlookTriggerId = "trigger-assets-outlook";
  const compositionPanelId = "panel-assets-composition";
  const compositionTriggerId = "trigger-assets-composition";

  assetForecast.innerHTML = `
    <section class="child-accordion" data-child-accordion>
      <button
        type="button"
        class="child-accordion-trigger"
        aria-expanded="false"
        aria-controls="${outlookPanelId}"
        id="${outlookTriggerId}"
      >
        <h3>将来の資産見通し（60歳時点）</h3>
        <span class="child-accordion-toggle" aria-hidden="true">+</span>
      </button>
      <div
        class="child-accordion-panel"
        id="${outlookPanelId}"
        role="region"
        aria-labelledby="${outlookTriggerId}"
        aria-hidden="true"
      >
        <div class="child-accordion-panel-inner">
          <section class="chart asset-outlook">
            <p class="section-description">現在年齢: <strong>${currentAge}歳</strong> / 60歳までの積立・運用をもとに試算しています。</p>
            <h4>契約別の想定資産額</h4>
            <ul class="asset-list">${rows}</ul>
            <h4>種別別の想定資産額</h4>
            <ul class="asset-list">${typeTotalsHtml}</ul>
            <div class="asset-total">60歳時点の想定総資産額: <strong>${yen.format(totalAt60)}</strong></div>
          </section>
        </div>
      </div>
    </section>
  `;

  const compositionAccordion = document.createElement("section");
  compositionAccordion.className = "child-accordion";
  compositionAccordion.dataset.childAccordion = "";
  compositionAccordion.innerHTML = `
    <button
      type="button"
      class="child-accordion-trigger"
      aria-expanded="false"
      aria-controls="${compositionPanelId}"
      id="${compositionTriggerId}"
    >
      <h3>現時点の総資産額の構成比（契約別）</h3>
      <span class="child-accordion-toggle" aria-hidden="true">+</span>
    </button>
    <div
      class="child-accordion-panel"
      id="${compositionPanelId}"
      role="region"
      aria-labelledby="${compositionTriggerId}"
      aria-hidden="true"
    >
      <div class="child-accordion-panel-inner">
        <section class="chart asset-composition">
          <p class="section-description">現在入力されている積立・一括入金の実績をもとに算出しています（基準月: ${currentAssetTargetMonth}）。</p>
        </section>
      </div>
    </div>
  `;

  const chartSection = compositionAccordion.querySelector(".asset-composition");
  if (!chartSection) {
    assetForecast.appendChild(compositionAccordion);
    setupChildAccordions(assetForecast);
    return;
  }

  const currentTotal = currentRows.reduce((sum, plan) => sum + plan.currentAmount, 0);
  if (currentRows.length === 0 || currentTotal === 0) {
    const empty = document.createElement("p");
    empty.className = "chart-empty";
    empty.textContent = "データがありません";
    chartSection.appendChild(empty);
    assetForecast.appendChild(compositionAccordion);
    setupChildAccordions(assetForecast);
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

  assetForecast.appendChild(compositionAccordion);
  setupChildAccordions(assetForecast);
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
  const planPanelId = `plan-detail-${normalizedPlan.id}`;
  const planTriggerId = `plan-trigger-${normalizedPlan.id}`;

  wrap.innerHTML = `
    <input type="hidden" class="plan-id" value="${normalizedPlan.id}" />
    <div class="plan-card-heading">
      <button
        type="button"
        class="plan-card-trigger"
        aria-expanded="false"
        aria-controls="${planPanelId}"
        id="${planTriggerId}"
      >
        <div class="plan-card-header">
          <p class="plan-card-title">${normalizedPlan.type}｜${normalizedPlan.name || "識別名未設定"}</p>
          <span class="plan-card-tag">${normalizedPlan.type}</span>
        </div>
      </button>
      <button type="button" class="plan-card-toggle-button" aria-expanded="false" aria-controls="${planPanelId}" aria-label="資産枠の開閉">
        <span class="plan-card-toggle-icon" aria-hidden="true">+</span>
      </button>
    </div>
    <div class="plan-card-panel" id="${planPanelId}" role="region" aria-labelledby="${planTriggerId}" aria-hidden="true">
      <div class="plan-card-panel-inner">
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
      </div>
    </div>
  `;

  const lumpList = wrap.querySelector(".lump-list");
  const monthlyList = wrap.querySelector(".monthly-list");
  const planTypeField = wrap.querySelector(".plan-type");
  const planNameField = wrap.querySelector(".plan-name");
  const title = wrap.querySelector(".plan-card-title");
  const tag = wrap.querySelector(".plan-card-tag");
  const cardTrigger = wrap.querySelector(".plan-card-trigger");
  const cardToggleButton = wrap.querySelector(".plan-card-toggle-button");

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

  const setPlanExpanded = (expanded) => {
    setPlanCardExpanded(wrap, expanded);
  };

  setPlanExpanded(false);
  const togglePlanExpanded = () => {
    const expanded = wrap.dataset.planExpanded === "true";
    setPlanExpanded(!expanded);
  };
  cardTrigger.addEventListener("click", togglePlanExpanded);
  cardToggleButton.addEventListener("click", (event) => {
    event.stopPropagation();
    togglePlanExpanded();
  });
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
  const recurringExpenses = loadRecurringExpenses();
  const transactions = syncRecurringAutoTransactions(loadTransactions(), recurringExpenses, monthFilter.value);
  const settings = loadSettings();
  const currentMonth = monthFilter.value;
  const autoTransactions = createEligibleAutoExpensesForMonth(settings, transactions, currentMonth);
  const summary = calculateMonthlySummary(transactions, settings, currentMonth);
  renderRecurringExpenses(recurringExpenses);

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
        ? item.autoKind === "recurring-expense"
          ? `${item.date} / 自動反映 / 定期支出`
          : `${item.date} / 自動反映 / ${item.sourceType}`
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
  const monthlyExpenseComposition = buildMonthlyExpenseComposition([...transactions, ...autoTransactions], currentMonth);
  renderDashboard(summary, settings, currentMonth, transactions, monthlyExpenseComposition);

  renderExpenseChart([...transactions, ...autoTransactions], currentMonth);
  markAssetForecastDirty(settings);
  if (isAssetsSectionExpanded()) {
    queueAssetForecastRender();
  } else {
    clearAssetForecastDOM();
  }
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

function addRecurringExpense(event) {
  event.preventDefault();
  const category = recurringCategoryInput.value;
  const amount = parseAmountInput(recurringAmountInput.value);
  const day = Math.min(Math.max(Number(recurringDayInput.value) || 1, 1), 31);
  const startMonth = recurringStartMonthInput.value;
  const endMonth = recurringEndMonthInput.value;
  const memo = recurringMemoInput.value.trim();

  if (!RECURRING_EXPENSE_CATEGORIES.includes(category)) return;
  if (!parseMonth(startMonth) || amount <= 0) return;
  if (parseMonth(endMonth) && compareMonth(endMonth, startMonth) < 0) return;

  const current = loadRecurringExpenses();
  if (recurringEditingId) {
    const next = current.map((item) => (item.id === recurringEditingId
      ? normalizeRecurringExpense({
          ...item,
          category,
          amount,
          day,
          startMonth,
          endMonth,
          memo,
        })
      : item));
    saveRecurringExpenses(next);
  } else {
    current.push(normalizeRecurringExpense({
      id: crypto.randomUUID(),
      category,
      amount,
      day,
      startMonth,
      endMonth,
      memo,
      createdAt: new Date().toISOString(),
    }));
    saveRecurringExpenses(current);
  }

  resetRecurringFormFields();
  render();
}

function cancelRecurringExpenseEdit() {
  resetRecurringFormFields();
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

function isAssetsSectionExpanded() {
  return assetsSection?.classList.contains("is-expanded");
}

function markAssetForecastDirty(settings) {
  latestAssetForecastSettings = settings;
  assetForecastDirty = true;
}

function clearAssetForecastDOM() {
  assetForecastRenderRafId = 0;
  if (assetForecast?.childNodes.length) {
    assetForecast.replaceChildren();
  }
}

function queueAssetForecastRender(force = false) {
  if (!assetForecast || !latestAssetForecastSettings) return;
  if (!force && !assetForecastDirty) return;
  if (!isAssetsSectionExpanded()) return;
  if (assetForecastRenderRafId) return;

  assetForecastRenderRafId = window.requestAnimationFrame(() => {
    assetForecastRenderRafId = 0;
    if (!isAssetsSectionExpanded()) return;
    renderAssetForecast(latestAssetForecastSettings);
    assetForecastDirty = false;
  });
}

function setPlanCardExpanded(planItem, expanded) {
  const cardTrigger = planItem.querySelector(".plan-card-trigger");
  const cardToggleButton = planItem.querySelector(".plan-card-toggle-button");
  const cardPanel = planItem.querySelector(".plan-card-panel");
  const cardToggleIcon = planItem.querySelector(".plan-card-toggle-icon");
  if (!cardTrigger || !cardToggleButton || !cardPanel || !cardToggleIcon) return;

  planItem.dataset.planExpanded = String(expanded);
  cardTrigger.setAttribute("aria-expanded", String(expanded));
  cardToggleButton.setAttribute("aria-expanded", String(expanded));
  cardPanel.setAttribute("aria-hidden", String(!expanded));
  cardToggleIcon.textContent = expanded ? "-" : "+";
  planItem.classList.toggle("is-expanded", expanded);
}

function closeDescendantPlanCards(root) {
  if (!root) return;
  const planItems = root.querySelectorAll(".plan-item");
  planItems.forEach((planItem) => setPlanCardExpanded(planItem, false));
}

function resetProfileChildAndGrandchildAccordions(section) {
  if (!section) return;
  const descendantChildAccordions = section.querySelectorAll("[data-child-accordion]");
  descendantChildAccordions.forEach((childAccordion) => setChildAccordionExpanded(childAccordion, false));
  closeDescendantPlanCards(section);
}

function isExpenseBalanceSection(section, trigger) {
  return section?.id === "section-chart" || trigger?.id === "trigger-chart";
}

function resetExpenseBalanceChildAccordions(section) {
  if (!section) return;
  const compositionAccordion = section.querySelector("#trigger-chart-composition")?.closest("[data-child-accordion]");
  if (compositionAccordion) setChildAccordionExpanded(compositionAccordion, false);
}

function setAccordionExpanded(section, expanded) {
  const trigger = section.querySelector(".accordion-trigger");
  const panel = section.querySelector(".accordion-panel");
  if (!trigger || !panel) return;
  const wasExpanded = trigger.getAttribute("aria-expanded") === "true";

  if (!expanded) {
    const descendantChildAccordions = section.querySelectorAll("[data-child-accordion]");
    descendantChildAccordions.forEach((childAccordion) => setChildAccordionExpanded(childAccordion, false));
  }

  if (trigger.id === "trigger-profile") {
    resetProfileChildAndGrandchildAccordions(section);
  }

  trigger.setAttribute("aria-expanded", String(expanded));
  panel.setAttribute("aria-hidden", String(!expanded));
  section.classList.toggle("is-expanded", expanded);

  if (section.id === "section-assets" && wasExpanded !== expanded) {
    if (expanded) {
      queueAssetForecastRender(true);
    } else {
      clearAssetForecastDOM();
    }
  }
}

function setupSectionAccordions() {
  accordionSections.forEach((section) => {
    const trigger = section.querySelector(".accordion-trigger");
    const panel = section.querySelector(".accordion-panel");
    if (!trigger || !panel) return;

    const toggleSection = () => {
      if (section.dataset.toggleLocked === "true") return;
      section.dataset.toggleLocked = "true";
      window.setTimeout(() => {
        section.dataset.toggleLocked = "false";
      }, 220);
      const expanded = trigger.getAttribute("aria-expanded") === "true";
      const nextExpanded = !expanded;

      if (!nextExpanded && isExpenseBalanceSection(section, trigger)) {
        resetExpenseBalanceChildAccordions(section);
      }

      setAccordionExpanded(section, nextExpanded);
    };

    setAccordionExpanded(section, false);

    if (isExpenseBalanceSection(section, trigger)) {
      trigger.addEventListener("pointerup", (event) => {
        if (event.pointerType !== "mouse" && event.pointerType !== "touch" && event.pointerType !== "pen") return;
        event.preventDefault();
        toggleSection();
      });
      trigger.addEventListener("click", (event) => {
        if (event.detail !== 0) return;
        toggleSection();
      });
    } else {
      trigger.addEventListener("click", toggleSection);
    }
  });
}

function setChildAccordionExpanded(childAccordion, expanded) {
  const trigger = childAccordion.querySelector(".child-accordion-trigger");
  const panel = childAccordion.querySelector(".child-accordion-panel");
  const toggle = childAccordion.querySelector(".child-accordion-toggle");
  if (!trigger || !panel || !toggle) return;

  closeDescendantPlanCards(childAccordion);

  trigger.setAttribute("aria-expanded", String(expanded));
  panel.hidden = !expanded;
  panel.setAttribute("aria-hidden", String(!expanded));
  toggle.textContent = expanded ? "－" : "＋";
}

function setupChildAccordion(childAccordion) {
  const trigger = childAccordion.querySelector(".child-accordion-trigger");
  if (!trigger || childAccordion.dataset.childAccordionBound === "true") return;

  setChildAccordionExpanded(childAccordion, false);

  const toggleChildAccordion = (event) => {
    event.stopPropagation();
    if (childAccordion.dataset.toggleLocked === "true") return;
    childAccordion.dataset.toggleLocked = "true";
    window.setTimeout(() => {
      childAccordion.dataset.toggleLocked = "false";
    }, 180);
    const expanded = trigger.getAttribute("aria-expanded") === "true";
    setChildAccordionExpanded(childAccordion, !expanded);
  };

  trigger.addEventListener("click", toggleChildAccordion);
  childAccordion.dataset.childAccordionBound = "true";
}

function setupChildAccordions(root = document) {
  const scopedChildAccordions = Array.from(root.querySelectorAll("[data-child-accordion]"));
  scopedChildAccordions.forEach(setupChildAccordion);
}

function scrollToNavSection(target) {
  if (target === "schedule") {
    showNavToast("ライフイベント表は今後追加予定です。");
    return;
  }

  const sectionId = NAV_TARGETS[target];
  const targetSection = sectionId ? document.getElementById(sectionId) : null;
  if (!targetSection) return;

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
  syncRecurringCategoryOptions();
  syncRecurringDayOptions();
  resetRecurringFormFields();
  renderPlans(settings);

  form.addEventListener("submit", addTransaction);
  typeInput.addEventListener("change", syncCategoryOptions);
  monthFilter.addEventListener("change", render);
  setupFormattedAmountInput(amountInput);
  setupFormattedAmountInput(recurringAmountInput);

  profileForm.addEventListener("submit", saveProfile);
  recurringForm.addEventListener("submit", addRecurringExpense);
  recurringCancelButton?.addEventListener("click", cancelRecurringExpenseEdit);
  setupSectionAccordions();
  setupChildAccordions();
  setupBottomNavigation();

  render();
}

init();
