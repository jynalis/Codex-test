const STORAGE_KEY = "kakeibo_transactions_v1";
const SETTINGS_KEY = "kakeibo_settings_v1";
const RECURRING_EXPENSES_KEY = "kakeibo_recurring_expenses_v1";
const LIFE_EVENTS_KEY = "kakeibo_life_events_v1";
const CASHFLOW_ASSUMPTIONS_KEY = "kakeibo_cashflow_assumptions_v1";

const form = document.getElementById("transaction-form");
const dateInput = document.getElementById("date");
const typeInput = document.getElementById("type");
const categoryInput = document.getElementById("category");
const amountInput = document.getElementById("amount");
const memoInput = document.getElementById("memo");
const transactionSubmitButton = document.getElementById("transaction-submit-button") || form?.querySelector('button[type="submit"]');
const transactionCancelButton = document.getElementById("transaction-cancel-button");
const transactionEditStatus = document.getElementById("transaction-edit-status");
const plannedHistoryBlock = document.getElementById("planned-history-block");
const sharedViewFilterControls = [
  {
    mode: null,
    year: document.getElementById("history-year-filter"),
    month: document.getElementById("history-month-filter"),
  },
  {
    mode: document.getElementById("dashboard-view-mode"),
    year: document.getElementById("dashboard-year-filter"),
    month: document.getElementById("dashboard-month-filter"),
  },
  {
    mode: document.getElementById("expense-view-mode"),
    year: document.getElementById("expense-year-filter"),
    month: document.getElementById("expense-month-filter"),
  },
];

const profileForm = document.getElementById("profile-form");
const entryStartMonthInput = document.getElementById("entry-start-month");
const birthDateInput = document.getElementById("birth-date");
const planList = document.getElementById("plan-list");
const addPlanButton = document.getElementById("add-plan-button");
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
const inputSection = document.getElementById("section-input");

const lifeEventForm = document.getElementById("life-event-form");
const lifeEventMonthInput = document.getElementById("life-event-month");
const lifeEventAgePreview = document.getElementById("life-event-age-preview");
const lifeEventTypeInput = document.getElementById("life-event-type");
const lifeEventCategoryInput = document.getElementById("life-event-category");
const lifeEventAmountInput = document.getElementById("life-event-amount");
const lifeEventMemoInput = document.getElementById("life-event-memo");
const lifeEventList = document.getElementById("life-event-list");
const lifeEventSubmitButton = document.getElementById("life-event-submit-button") || lifeEventForm?.querySelector('button[type="submit"]');
const lifeEventCancelButton = document.getElementById("life-event-cancel-button");
const lifeEventEditStatus = document.getElementById("life-event-edit-status");
const lifeEventError = document.getElementById("life-event-error");
const lifeEventsSection = document.getElementById("section-life-events");
const lifeEventFormAccordion = document.getElementById("trigger-life-event-form")?.closest("[data-child-accordion]");

const list = document.getElementById("transaction-list");
const plannedList = document.getElementById("planned-transaction-list");
const plannedHistoryTitle = document.getElementById("planned-history-title");
const template = document.getElementById("transaction-item-template");
const dashboardIncomeTotal = document.getElementById("dashboard-income-total");
const dashboardExpenseTotal = document.getElementById("dashboard-expense-total");
const dashboardBalanceTotal = document.getElementById("dashboard-balance-total");
const dashboardAge60Total = document.getElementById("dashboard-age60-total");
const dashboardDiagnosisComment = document.getElementById("dashboard-diagnosis-comment");
const dashboardAssetFormationChart = document.getElementById("dashboard-asset-formation-chart");
const expenseChart = document.getElementById("expense-chart");
const bottomNavButtons = Array.from(document.querySelectorAll(".bottom-nav-btn"));
const navToast = document.getElementById("nav-toast");
const backToTopButton = document.getElementById("back-to-top-button");
const accordionSections = Array.from(document.querySelectorAll("[data-accordion-section]"));
const assetsSection = document.getElementById("section-assets");
const cashflowSettingsForm = document.getElementById("cashflow-settings-form");
const cashflowSalaryGrowthRateInput = document.getElementById("cashflow-salary-growth-rate");
const cashflowInflationRateInput = document.getElementById("cashflow-inflation-rate");
const cashflowTableWrap = document.getElementById("cashflow-table-wrap");
const cashflowDownloadPdfButton = document.getElementById("cashflow-download-pdf-button");
const accordionCloseTimers = new WeakMap();
const accordionCollapseWaiters = new WeakMap();
const NAV_CLOSE_NEAR_DISTANCE = 180;
const NAV_CLOSE_FAR_DISTANCE = 520;
const BACK_TO_TOP_SHOW_SCROLL_Y = 320;
let navActionToken = 0;

let latestAssetForecastSettings = null;
let assetForecastDirty = true;
let assetForecastRenderRafId = 0;
let recurringEditingId = null;
let transactionEditingId = null;
let lifeEventEditingId = null;
let sharedViewState = {
  averageMode: "month",
  year: "",
  month: "",
};

const NAV_TARGETS = {
  home: "section-profile",
  input: "section-input",
  assets: "section-assets",
  expense: "section-expense",
  transactions: "section-history",
};

const DEFAULT_CASHFLOW_ASSUMPTIONS = {
  salaryGrowthRate: 1,
  inflationRate: 1,
};

const RETIREMENT_REFERENCE_AGE = 60;
const RETIREMENT_REFERENCE_DAY_OFFSET = 2;

const EXPENSE_CATEGORIES = ["日常費", "レジャー費", "ガソリン費", "雑費"];
const LEGACY_EXPENSE_CATEGORY_ALIASES = {
  "趣味・レジャー費": "レジャー費",
  "雑費・予備費": "雑費",
  家賃: "家賃・住宅ローン",
};
const LEGACY_EXPENSE_CATEGORIES = ["家賃・マイホーム費", "生命保険"];
const RECURRING_EXPENSE_CATEGORIES = ["家賃・住宅ローン", "通信費", "保険料", "カーローン", "教育費", "その他固定費"];
const LEGACY_RECURRING_EXPENSE_CATEGORY_ALIASES = {
  家賃: "家賃・住宅ローン",
};
const LIFE_EVENT_TYPES = {
  income: "臨時収入",
  expense: "臨時支出",
};
const LIFE_EVENT_CATEGORY_OPTIONS = {
  income: ["退職金", "相続・贈与", "売却収入", "給付金・補助金", "その他"],
  expense: ["車購入", "教育費", "住宅", "リフォーム", "旅行", "その他"],
};
const LEGACY_LIFE_EVENT_CATEGORY_ALIASES = {
  "保険満期・解約返戻金": "その他",
};
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
const ALLOWED_EXPENSE_CATEGORIES = [
  ...EXPENSE_CATEGORIES,
  ...LEGACY_EXPENSE_CATEGORIES,
  ASSET_FORMATION_CATEGORY,
  ...RECURRING_EXPENSE_CATEGORIES,
];
const ASSET_PIE_COLORS = ["#2b85e4", "#18b8c9", "#41b86f", "#f3a64c", "#9d86eb", "#ef7fa8", "#e3c44b", "#57bce8", "#66a8f1", "#79c99a"];
const EXPENSE_COMPOSITION_ITEMS = [
  "日常費",
  "レジャー費",
  "ガソリン費",
  "雑費",
  "家賃・マイホーム費",
  "家賃・住宅ローン",
  "通信費",
  "保険料",
  "カーローン",
  "教育費",
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

function normalizeLegacyExpenseCategory(category) {
  return LEGACY_EXPENSE_CATEGORY_ALIASES[category] || category;
}

function normalizeRecurringExpenseCategory(category) {
  const normalized = LEGACY_RECURRING_EXPENSE_CATEGORY_ALIASES[category] || category;
  if (RECURRING_EXPENSE_CATEGORIES.includes(normalized)) {
    return normalized;
  }
  return RECURRING_EXPENSE_CATEGORIES[0];
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

function syncLifeEventCategoryOptions() {
  if (!lifeEventCategoryInput) return;
  const categoryOptions = LIFE_EVENT_CATEGORY_OPTIONS[lifeEventTypeInput?.value] ?? [];
  const currentCategory = normalizeLegacyLifeEventCategory(lifeEventCategoryInput.value);
  const canKeepCurrentCategory = categoryOptions.includes(currentCategory);
  lifeEventCategoryInput.innerHTML = "";
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "選択してください";
  lifeEventCategoryInput.appendChild(placeholder);
  categoryOptions.forEach((category) => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    lifeEventCategoryInput.appendChild(option);
  });
  lifeEventCategoryInput.value = canKeepCurrentCategory ? currentCategory : "";
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
        category: item?.type === "expense" ? normalizeLegacyExpenseCategory(item.category) : item.category,
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

function getLatestMonthFromTransactions(items) {
  return items.reduce((latest, item) => {
    const month = monthISO(item?.date);
    if (!parseMonth(month)) return latest;
    if (!latest) return month;
    return compareMonth(month, latest) > 0 ? month : latest;
  }, "");
}

function getMonthsWithData(items) {
  const monthSet = new Set();
  items.forEach((item) => {
    const month = monthISO(item?.date);
    if (!parseMonth(month)) return;
    monthSet.add(month);
  });
  return Array.from(monthSet).sort((a, b) => compareMonth(a, b));
}

function resolveInitialSharedViewState(baseMonth) {
  const parsed = parseMonth(baseMonth) || parseMonth(todayISO().slice(0, 7));
  return {
    averageMode: "month",
    year: String(parsed.year),
    month: String(parsed.monthIndex + 1).padStart(2, "0"),
  };
}

function resolveViewMonthFromState() {
  const year = Number(sharedViewState.year);
  const month = Number(sharedViewState.month);
  if (!Number.isInteger(year) || month < 1 || month > 12) return "";
  return formatMonth(year, month - 1);
}

function syncSharedViewFilterOptions(availableMonths) {
  const yearSet = new Set();
  availableMonths.forEach((month) => {
    const parsed = parseMonth(month);
    if (!parsed) return;
    yearSet.add(parsed.year);
  });
  const selectedYear = Number(sharedViewState.year);
  if (Number.isInteger(selectedYear)) {
    yearSet.add(selectedYear);
  }
  if (yearSet.size === 0) {
    yearSet.add(Number(sharedViewState.year) || Number(todayISO().slice(0, 4)));
  }
  const years = Array.from(yearSet).sort((a, b) => b - a);
  if (!Number.isInteger(selectedYear)) {
    sharedViewState.year = String(years[0]);
  }
  if (!/^\d{2}$/.test(sharedViewState.month)) {
    sharedViewState.month = todayISO().slice(5, 7);
  }

  sharedViewFilterControls.forEach((controls) => {
    if (!controls.year || !controls.month) return;
    if (controls.mode) {
      controls.mode.value = sharedViewState.averageMode;
    }

    controls.year.innerHTML = years.map((year) => `<option value="${year}">${year}年</option>`).join("");
    controls.year.value = sharedViewState.year;

    controls.month.innerHTML = Array.from({ length: 12 }, (_, index) => {
      const value = String(index + 1).padStart(2, "0");
      return `<option value="${value}">${index + 1}月</option>`;
    }).join("");
    controls.month.value = sharedViewState.month;

    const isAverage = sharedViewState.averageMode === "average";
    controls.year.disabled = isAverage;
    controls.month.disabled = isAverage;
  });
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
    withdrawMonth: parseMonth(plan.withdrawMonth) ? plan.withdrawMonth : "",
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
    category: normalizeRecurringExpenseCategory(item?.category),
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
  recurringStartMonthInput.value = resolveViewMonthFromState() || todayISO().slice(0, 7);
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

function setTransactionFormMode(isEditing, editingType = "expense") {
  if (transactionSubmitButton) {
    transactionSubmitButton.textContent = isEditing ? "更新する" : "追加する";
  }
  if (transactionEditStatus) {
    transactionEditStatus.textContent = editingType === "income"
      ? "日ごとの収入を編集中"
      : "日ごとの支出を編集中";
    transactionEditStatus.hidden = !isEditing;
  }
  if (transactionCancelButton) {
    transactionCancelButton.hidden = !isEditing;
  }
}

function resetTransactionFormFields(options = {}) {
  const nextDate = options.date ?? dateInput.value ?? todayISO();
  transactionEditingId = null;
  form.reset();
  dateInput.value = nextDate;
  typeInput.value = "expense";
  syncCategoryOptions();
  amountInput.value = "";
  setTransactionFormMode(false);
}

function startTransactionEdit(id) {
  const transaction = loadTransactions().find((item) => item.id === id);
  if (!transaction) return;

  transactionEditingId = transaction.id;
  dateInput.value = transaction.date;
  typeInput.value = transaction.type;
  syncCategoryOptions();
  categoryInput.value = transaction.category;
  amountInput.value = numberWithComma.format(transaction.amount);
  memoInput.value = transaction.memo || "";
  setTransactionFormMode(true, transaction.type);

  if (inputSection) {
    setAccordionExpanded(inputSection, true);
    inputSection.scrollIntoView({ behavior: "smooth", block: "start" });
  } else {
    form.scrollIntoView({ behavior: "smooth", block: "center" });
  }
  categoryInput.focus();
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

function normalizeLifeEvent(item) {
  const type = item?.type === "income" ? "income" : "expense";
  const validCategories = LIFE_EVENT_CATEGORY_OPTIONS[type] ?? [];
  const normalizedCategory = normalizeLegacyLifeEventCategory(item?.category);
  const settings = loadSettings();
  const birth = parseBirthDate(settings?.birthDate);
  const legacyAge = Math.min(Math.max(Number(item?.age) || 0, 0), 120);
  const normalizedMonth = parseMonth(item?.month)
    ? item.month
    : (birth ? formatMonth(birth.getFullYear() + legacyAge, birth.getMonth()) : "");
  return {
    id: typeof item?.id === "string" ? item.id : crypto.randomUUID(),
    month: normalizedMonth,
    type,
    category: validCategories.includes(normalizedCategory) ? normalizedCategory : "その他",
    amount: Math.max(Number(item?.amount) || 0, 0),
    memo: typeof item?.memo === "string" ? item.memo : "",
    createdAt: typeof item?.createdAt === "string" ? item.createdAt : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function normalizeLegacyLifeEventCategory(category) {
  return LEGACY_LIFE_EVENT_CATEGORY_ALIASES[category] || category;
}

function isValidLifeEventCategoryForType(type, category) {
  const normalizedCategory = normalizeLegacyLifeEventCategory(category);
  const categoryOptions = LIFE_EVENT_CATEGORY_OPTIONS[type] ?? [];
  return categoryOptions.includes(normalizedCategory);
}

function handleLifeEventTypeChange() {
  syncLifeEventCategoryOptions();
}

function loadLifeEvents() {
  const raw = localStorage.getItem(LIFE_EVENTS_KEY);
  if (!raw) return [];
  try {
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data
      .map((item) => normalizeLifeEvent(item))
      .filter((item) => item.amount > 0 && parseMonth(item.month));
  } catch {
    return [];
  }
}

function saveLifeEvents(items) {
  localStorage.setItem(LIFE_EVENTS_KEY, JSON.stringify(items));
}

function loadCashflowAssumptions() {
  const raw = localStorage.getItem(CASHFLOW_ASSUMPTIONS_KEY);
  if (!raw) return { ...DEFAULT_CASHFLOW_ASSUMPTIONS };
  try {
    const data = JSON.parse(raw);
    return {
      salaryGrowthRate: Number.isFinite(Number(data?.salaryGrowthRate)) ? Number(data.salaryGrowthRate) : DEFAULT_CASHFLOW_ASSUMPTIONS.salaryGrowthRate,
      inflationRate: Number.isFinite(Number(data?.inflationRate)) ? Number(data.inflationRate) : DEFAULT_CASHFLOW_ASSUMPTIONS.inflationRate,
    };
  } catch {
    return { ...DEFAULT_CASHFLOW_ASSUMPTIONS };
  }
}

function saveCashflowAssumptions(assumptions) {
  localStorage.setItem(CASHFLOW_ASSUMPTIONS_KEY, JSON.stringify({
    salaryGrowthRate: Number(assumptions?.salaryGrowthRate) || 0,
    inflationRate: Number(assumptions?.inflationRate) || 0,
  }));
}

function updateCashflowAssumptionInputs(assumptions) {
  if (!cashflowSalaryGrowthRateInput || !cashflowInflationRateInput) return;
  cashflowSalaryGrowthRateInput.value = String(assumptions.salaryGrowthRate ?? DEFAULT_CASHFLOW_ASSUMPTIONS.salaryGrowthRate);
  cashflowInflationRateInput.value = String(assumptions.inflationRate ?? DEFAULT_CASHFLOW_ASSUMPTIONS.inflationRate);
}

function setLifeEventFormMode(isEditing) {
  if (lifeEventSubmitButton) {
    lifeEventSubmitButton.textContent = isEditing ? "更新" : "追加";
  }
  if (lifeEventCancelButton) {
    lifeEventCancelButton.hidden = !isEditing;
  }
  if (lifeEventEditStatus) {
    lifeEventEditStatus.hidden = !isEditing;
  }
}

function setLifeEventError(message = "") {
  if (!lifeEventError) return;
  const hasError = Boolean(message);
  lifeEventError.textContent = message;
  lifeEventError.hidden = !hasError;
}

function resetLifeEventFormFields() {
  if (!lifeEventForm) return;
  lifeEventForm.reset();
  lifeEventEditingId = null;
  lifeEventTypeInput.value = "";
  if (lifeEventMonthInput) {
    lifeEventMonthInput.value = "";
  }
  syncLifeEventCategoryOptions();
  lifeEventAmountInput.value = "";
  updateLifeEventAgePreview();
  setLifeEventError("");
  setLifeEventFormMode(false);
}

function startLifeEventEdit(id) {
  const lifeEvent = loadLifeEvents().find((item) => item.id === id);
  if (!lifeEvent) return;
  if (lifeEventsSection) {
    setAccordionExpanded(lifeEventsSection, true);
  }
  if (lifeEventFormAccordion) {
    setChildAccordionExpanded(lifeEventFormAccordion, true);
  }
  lifeEventEditingId = lifeEvent.id;
  lifeEventMonthInput.value = lifeEvent.month;
  lifeEventTypeInput.value = lifeEvent.type;
  syncLifeEventCategoryOptions();
  lifeEventCategoryInput.value = normalizeLegacyLifeEventCategory(lifeEvent.category);
  lifeEventAmountInput.value = numberWithComma.format(lifeEvent.amount);
  lifeEventMemoInput.value = lifeEvent.memo || "";
  updateLifeEventAgePreview();
  setLifeEventError("");
  setLifeEventFormMode(true);
  if (lifeEventsSection) {
    lifeEventsSection.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  lifeEventMonthInput.focus();
}

function resolveLifeEventHistoryPeriodLabel(item, settings) {
  const monthLabel = formatScheduledMonthLabel(item.month);
  const age = resolveAgeAtDate(settings?.birthDate, `${item.month}-01`);
  if (!Number.isFinite(age)) return `${monthLabel}の予定`;
  return `${monthLabel}（${age}歳）の予定`;
}

function buildLifeEventHistoryItems(lifeEvents, settings) {
  return lifeEvents
    .slice()
    .sort((a, b) => (a.month !== b.month ? compareMonth(a.month, b.month) : a.createdAt.localeCompare(b.createdAt)))
    .map((item, index) => ({
      id: `life-event-history-${item.id}`,
      source: "lifeEvent",
      originalId: item.id,
      type: item.type,
      category: item.category,
      amount: item.amount,
      memo: item.memo,
      age: resolveAgeAtDate(settings?.birthDate, `${item.month}-01`),
      classificationLabel: LIFE_EVENT_TYPES[item.type],
      scheduledLabel: resolveLifeEventHistoryPeriodLabel(item, settings),
      scheduledMonth: item.month,
      date: "",
      order: index,
    }));
}

function resolveAgeAtDate(birthDate, dateString) {
  const birth = parseBirthDate(birthDate);
  const target = parseISODateParts(dateString);
  if (!birth || !target) return null;
  const targetDate = new Date(target.year, target.month - 1, target.day);
  let age = targetDate.getFullYear() - birth.getFullYear();
  const hadBirthday =
    targetDate.getMonth() > birth.getMonth()
    || (targetDate.getMonth() === birth.getMonth() && targetDate.getDate() >= birth.getDate());
  if (!hadBirthday) age -= 1;
  return Math.max(age, 0);
}

function formatScheduledMonthLabel(month) {
  const parsed = parseMonth(month);
  if (!parsed) return month;
  return `${parsed.year}年${parsed.monthIndex + 1}月`;
}

function formatWithdrawMonthLabelWithAge(withdrawMonth, birthDate) {
  const monthLabel = formatScheduledMonthLabel(withdrawMonth);
  if (!parseMonth(withdrawMonth)) return monthLabel;
  const age = resolveAgeAtDate(birthDate, `${withdrawMonth}-01`);
  if (!Number.isFinite(age)) return monthLabel;
  return `${monthLabel}（${age}歳）`;
}

function buildFutureTransactionHistoryItems(transactions, settings, baseMonth) {
  if (!parseMonth(baseMonth)) return [];
  return (Array.isArray(transactions) ? transactions : [])
    .filter((item) => item?.date && !item.isAutoGenerated)
    .filter((item) => {
      const month = monthISO(item.date);
      return parseMonth(month) && compareMonth(month, baseMonth) > 0;
    })
    .sort(compareTransactionHistoryRecency)
    .map((item, index) => {
      const scheduledMonth = monthISO(item.date);
      return {
        id: `future-transaction-history-${item.id}`,
        source: "transaction",
        originalId: item.id,
        type: item.type,
        category: item.category,
        amount: item.amount,
        memo: item.memo,
        age: resolveAgeAtDate(settings?.birthDate, item.date),
        classificationLabel: item.type === "income" ? "収入" : "支出",
        scheduledLabel: `${formatScheduledMonthLabel(scheduledMonth)}（${item.date}）`,
        scheduledMonth,
        date: item.date,
        order: index,
      };
    });
}

const PLANNED_HISTORY_AGE_BRACKETS = [
  { key: "20s", label: "20代", minAge: 20, maxAge: 29 },
  { key: "30s", label: "30代", minAge: 30, maxAge: 39 },
  { key: "40s", label: "40代", minAge: 40, maxAge: 49 },
  { key: "50plus", label: "50代以降", minAge: 50, maxAge: Number.POSITIVE_INFINITY },
];

function resolvePlannedHistoryAgeBracket(age) {
  const numericAge = Number(age);
  if (!Number.isFinite(numericAge)) return null;
  const normalizedAge = Math.floor(numericAge);
  return PLANNED_HISTORY_AGE_BRACKETS.find((bracket) => normalizedAge >= bracket.minAge && normalizedAge <= bracket.maxAge) || null;
}

function groupPlannedHistoryItemsByAgeBracket(items) {
  const grouped = new Map();
  PLANNED_HISTORY_AGE_BRACKETS.forEach((bracket) => grouped.set(bracket.key, []));
  items.forEach((item) => {
    const bracket = resolvePlannedHistoryAgeBracket(item.age);
    if (!bracket) return;
    grouped.get(bracket.key).push(item);
  });
  return PLANNED_HISTORY_AGE_BRACKETS
    .map((bracket) => ({
      ...bracket,
      items: grouped.get(bracket.key)
        .slice()
        .sort((a, b) => {
          const monthA = parseMonth(a.scheduledMonth) ? a.scheduledMonth : "";
          const monthB = parseMonth(b.scheduledMonth) ? b.scheduledMonth : "";
          if (monthA && monthB && monthA !== monthB) {
            return compareMonth(monthA, monthB);
          }
          if (monthA && !monthB) return -1;
          if (!monthA && monthB) return 1;
          if (a.date && b.date && a.date !== b.date) {
            return a.date.localeCompare(b.date);
          }
          if (a.age !== b.age) return a.age - b.age;
          return a.order - b.order;
        }),
    }))
    .filter((group) => group.items.length > 0);
}

function buildTransactionHistoryItems(transactions, autoTransactions, currentMonth) {
  const allTransactions = [...transactions, ...autoTransactions];
  const filtered = currentMonth
    ? allTransactions.filter((item) => monthISO(item.date) === currentMonth)
    : allTransactions;

  return filtered
    .slice()
    .sort(compareTransactionHistoryRecency)
    .map((item) => ({
      ...item,
      source: item.isAuto ? "autoTransaction" : "transaction",
      originalId: item.id,
    }));
}

function buildAverageTransactionHistoryItems(transactions, targetMonths) {
  if (!Array.isArray(targetMonths) || targetMonths.length === 0) return [];
  const monthCount = targetMonths.length;
  const targetMonthSet = new Set(targetMonths);
  const totals = new Map();

  transactions.forEach((item) => {
    const month = monthISO(item.date);
    if (!targetMonthSet.has(month)) return;
    const key = `${item.type}:${item.category}`;
    const current = totals.get(key) || {
      type: item.type,
      category: item.category,
      total: 0,
    };
    current.total += item.amount;
    totals.set(key, current);
  });

  return Array.from(totals.values())
    .map((item) => ({
      ...item,
      average: item.total / monthCount,
    }))
    .filter((item) => item.average > 0)
    .sort((a, b) => {
      if (b.average !== a.average) return b.average - a.average;
      if (a.type !== b.type) return a.type.localeCompare(b.type);
      return a.category.localeCompare(b.category, "ja");
    });
}

function compareTransactionHistoryRecency(a, b) {
  if (a.date !== b.date) {
    return a.date < b.date ? 1 : -1;
  }

  if (a.createdAt && b.createdAt && a.createdAt !== b.createdAt) {
    return a.createdAt < b.createdAt ? 1 : -1;
  }

  return 0;
}

function parseISODateParts(dateString) {
  if (typeof dateString !== "string") return null;
  const match = dateString.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return { year, month, day };
}

function getLastDayOfMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

function formatHistoryMonthLabel(monthKey) {
  const parsed = parseMonth(monthKey);
  if (!parsed) return monthKey;
  return `${parsed.year}年${parsed.monthIndex + 1}月`;
}

function getDayRangeDefinitions(lastDay) {
  return [
    { key: "late", startDay: 21, endDay: lastDay },
    { key: "middle", startDay: 11, endDay: 20 },
    { key: "early", startDay: 1, endDay: 10 },
  ];
}

function resolveDayRangeKey(day) {
  if (day <= 10) return "early";
  if (day <= 20) return "middle";
  return "late";
}

function groupTransactionsByMonthAndDayRange(items) {
  const monthMap = new Map();
  items.forEach((item) => {
    const parsedDate = parseISODateParts(item.date);
    if (!parsedDate) return;
    const monthKey = `${parsedDate.year}-${String(parsedDate.month).padStart(2, "0")}`;
    const monthGroup = monthMap.get(monthKey)
      || {
        monthKey,
        lastDay: getLastDayOfMonth(parsedDate.year, parsedDate.month),
        ranges: { early: [], middle: [], late: [] },
      };
    monthGroup.ranges[resolveDayRangeKey(parsedDate.day)].push(item);
    monthMap.set(monthKey, monthGroup);
  });

  return Array.from(monthMap.values())
    .sort((a, b) => compareMonth(b.monthKey, a.monthKey));
}

function createTransactionItemNode(item) {
  const node = template.content.cloneNode(true);
  const row = node.querySelector(".item");
  const meta = node.querySelector(".meta");
  const memo = node.querySelector(".memo");
  const amount = node.querySelector(".amount");
  const edit = node.querySelector(".edit");
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
    edit.remove();
    del.remove();
  } else {
    edit.addEventListener("click", () => {
      startTransactionEdit(item.id);
    });
    del.addEventListener("click", () => {
      if (transactionEditingId === item.id) {
        resetTransactionFormFields();
      }
      const next = loadTransactions().filter((tx) => tx.id !== item.id);
      saveTransactions(next);
      render();
    });
  }

  row.dataset.id = item.id;
  row.dataset.source = item.source;
  row.dataset.originalId = item.originalId;
  return node;
}

function createPlannedTransactionItemNode(item) {
  const node = template.content.cloneNode(true);
  const row = node.querySelector(".item");
  const meta = node.querySelector(".meta");
  const memo = node.querySelector(".memo");
  const amount = node.querySelector(".amount");
  const edit = node.querySelector(".edit");
  const del = node.querySelector(".delete");

  row.classList.add("is-planned-transaction");

  meta.textContent = "";
  const plannedLabel = document.createElement("span");
  plannedLabel.className = "transaction-source-badge";
  plannedLabel.textContent = "予定";
  const plannedMetaText = document.createElement("span");
  plannedMetaText.className = "planned-meta-text";
  plannedMetaText.textContent = `${item.classificationLabel} / ${item.category} / ${item.scheduledLabel}`;
  meta.append(plannedLabel, plannedMetaText);

  if (item.source === "lifeEvent") {
    memo.textContent = item.memo
      ? `発生年月: ${item.scheduledMonth} / メモ: ${item.memo}`
      : `発生年月: ${item.scheduledMonth}`;
  } else {
    const ageText = Number.isFinite(item.age) ? `予定時年齢: ${item.age}歳 / ` : "";
    memo.textContent = item.memo
      ? `${ageText}予定日: ${item.date} / メモ: ${item.memo}`
      : `${ageText}予定日: ${item.date}`;
  }
  amount.textContent = `${item.type === "income" ? "+" : "-"}${yen.format(item.amount)}`;
  amount.classList.add(item.type);

  if (item.source === "lifeEvent") {
    edit.addEventListener("click", () => {
      startLifeEventEdit(item.originalId);
    });
    del.addEventListener("click", () => {
      if (!window.confirm("この予定取引（ライフイベント）を削除しますか？")) return;
      const next = loadLifeEvents().filter((target) => target.id !== item.originalId);
      saveLifeEvents(next);
      if (lifeEventEditingId === item.originalId) {
        resetLifeEventFormFields();
      }
      render();
    });
  } else {
    edit.addEventListener("click", () => {
      startTransactionEdit(item.originalId);
    });
    del.addEventListener("click", () => {
      if (!window.confirm("この予定取引を削除しますか？")) return;
      if (transactionEditingId === item.originalId) {
        resetTransactionFormFields();
      }
      const next = loadTransactions().filter((target) => target.id !== item.originalId);
      saveTransactions(next);
      render();
    });
  }

  row.dataset.id = item.id;
  row.dataset.source = item.source;
  row.dataset.originalId = item.originalId;
  return node;
}

function createPlannedAgeAccordion(group) {
  const accordion = document.createElement("section");
  accordion.className = "child-accordion history-planned-age-accordion";
  accordion.dataset.childAccordion = "";
  accordion.dataset.accordionStateKey = `planned-age:${group.key}`;
  const panelId = `panel-history-planned-${group.key}`;
  const triggerId = `trigger-history-planned-${group.key}`;
  const countLabel = `（${group.items.length}件）`;

  accordion.innerHTML = `
    <button
      type="button"
      class="child-accordion-trigger history-planned-age-trigger"
      aria-expanded="false"
      aria-controls="${panelId}"
      id="${triggerId}"
    >
      <h3>${group.label}${countLabel}</h3>
      <span class="child-accordion-toggle" aria-hidden="true">＋</span>
    </button>
    <div
      class="child-accordion-panel history-planned-age-panel"
      id="${panelId}"
      role="region"
      aria-labelledby="${triggerId}"
      aria-hidden="true"
      hidden
    >
      <div class="child-accordion-panel-inner history-planned-age-panel-inner">
        <ul class="list transaction-list planned-age-list"></ul>
      </div>
    </div>
  `;

  const listElement = accordion.querySelector(".planned-age-list");
  const renderItems = () => {
    if (!listElement || accordion.dataset.rendered === "true") return;
    const fragment = document.createDocumentFragment();
    group.items.forEach((item) => fragment.appendChild(createPlannedTransactionItemNode(item)));
    listElement.appendChild(fragment);
    accordion.dataset.rendered = "true";
  };
  const clearItems = () => {
    if (!listElement || accordion.dataset.rendered !== "true") return;
    listElement.replaceChildren();
    accordion.dataset.rendered = "false";
  };

  accordion.addEventListener("childaccordiontoggle", (event) => {
    if (event.detail?.expanded) {
      renderItems();
    } else {
      clearItems();
    }
  });

  return accordion;
}

function renderPlannedTransactionHistory(items) {
  if (!plannedList) return;
  const accordionState = captureChildAccordionState(plannedList);
  plannedList.replaceChildren();
  if (plannedHistoryTitle) {
    plannedHistoryTitle.textContent = `予定の取引履歴${items.length > 0 ? `（${items.length}件）` : ""}`;
  }

  const ageGroups = groupPlannedHistoryItemsByAgeBracket(items);
  if (ageGroups.length === 0) {
    const empty = document.createElement("p");
    empty.className = "chart-empty history-planned-empty";
    empty.textContent = "予定の取引はまだありません。";
    plannedList.appendChild(empty);
    return;
  }

  const fragment = document.createDocumentFragment();
  ageGroups.forEach((group) => {
    fragment.appendChild(createPlannedAgeAccordion(group));
  });
  plannedList.appendChild(fragment);
  setupChildAccordions(plannedList);
  restoreChildAccordionState(plannedList, accordionState);
}

function createDayRangeAccordion({ monthKey, range, items }) {
  const accordion = document.createElement("section");
  accordion.className = "child-accordion history-day-range-accordion";
  accordion.dataset.childAccordion = "";
  accordion.dataset.accordionStateKey = `actual:${monthKey}:${range.key}`;
  const panelId = `panel-history-${monthKey}-${range.key}`;
  const triggerId = `trigger-history-${monthKey}-${range.key}`;
  const countLabel = `（${items.length}件）`;

  accordion.innerHTML = `
    <button
      type="button"
      class="child-accordion-trigger history-day-range-trigger"
      aria-expanded="false"
      aria-controls="${panelId}"
      id="${triggerId}"
    >
      <h3>${range.startDay}日〜${range.endDay}日${countLabel}</h3>
      <span class="child-accordion-toggle" aria-hidden="true">＋</span>
    </button>
    <div
      class="child-accordion-panel history-day-range-panel"
      id="${panelId}"
      role="region"
      aria-labelledby="${triggerId}"
      aria-hidden="true"
      hidden
    >
      <div class="child-accordion-panel-inner history-day-range-panel-inner">
        <ul class="list transaction-list history-range-list"></ul>
      </div>
    </div>
  `;

  const listElement = accordion.querySelector(".history-range-list");
  const renderItems = () => {
    if (!listElement || accordion.dataset.rendered === "true") return;
    const fragment = document.createDocumentFragment();
    items.forEach((item) => fragment.appendChild(createTransactionItemNode(item)));
    listElement.appendChild(fragment);
    accordion.dataset.rendered = "true";
  };
  const clearItems = () => {
    if (!listElement || accordion.dataset.rendered !== "true") return;
    listElement.replaceChildren();
    accordion.dataset.rendered = "false";
  };

  accordion.addEventListener("childaccordiontoggle", (event) => {
    if (event.detail?.expanded) {
      renderItems();
    } else {
      clearItems();
    }
  });

  return accordion;
}

function renderTransactionHistory(items) {
  const accordionState = captureChildAccordionState(list);
  list.innerHTML = "";
  if (items.length === 0) {
    const empty = document.createElement("li");
    empty.textContent = "まだ取引がありません。";
    empty.className = "item";
    list.appendChild(empty);
    return;
  }

  const monthGroups = groupTransactionsByMonthAndDayRange(items);
  const fragment = document.createDocumentFragment();

  monthGroups.forEach((monthGroup) => {
    const monthItem = document.createElement("li");
    monthItem.className = "history-month-item";
    const monthWrap = document.createElement("article");
    monthWrap.className = "history-month-group";

    const monthTitle = document.createElement("h4");
    monthTitle.className = "history-month-title";
    monthTitle.textContent = formatHistoryMonthLabel(monthGroup.monthKey);
    monthWrap.appendChild(monthTitle);

    const dayRanges = getDayRangeDefinitions(monthGroup.lastDay);
    const dayRangeList = document.createElement("div");
    dayRangeList.className = "history-day-range-list";
    dayRanges.forEach((range) => {
      const rangeItems = monthGroup.ranges[range.key];
      if (!Array.isArray(rangeItems) || rangeItems.length === 0) return;
      dayRangeList.appendChild(createDayRangeAccordion({ monthKey: monthGroup.monthKey, range, items: rangeItems }));
    });
    monthWrap.appendChild(dayRangeList);
    monthItem.appendChild(monthWrap);
    fragment.appendChild(monthItem);
  });

  list.appendChild(fragment);
  setupChildAccordions(list);
  restoreChildAccordionState(list, accordionState);
}

function renderAverageTransactionHistory(items, targetMonths) {
  list.innerHTML = "";
  if (!Array.isArray(targetMonths) || targetMonths.length === 0) {
    const empty = document.createElement("li");
    empty.className = "item";
    empty.textContent = "平均対象となる取引データがありません。";
    list.appendChild(empty);
    return;
  }
  if (items.length === 0) {
    const empty = document.createElement("li");
    empty.className = "item";
    empty.textContent = "平均対象期間に取引がありません。";
    list.appendChild(empty);
    return;
  }
  const header = document.createElement("li");
  header.className = "item history-average-header";
  header.textContent = `平均対象: ${targetMonths.length}か月（データがある月のみ）`;
  list.appendChild(header);

  const fragment = document.createDocumentFragment();
  items.forEach((item) => {
    const row = document.createElement("li");
    row.className = "item history-average-item";
    const sign = item.type === "income" ? "+" : "-";
    row.innerHTML = `
      <div>
        <p class="meta">${item.type === "income" ? "収入" : "支出"} / ${item.category}</p>
        <p class="memo">月平均（データ月ベース）</p>
      </div>
      <p class="amount ${item.type}">${sign}${yen.format(item.average)}</p>
    `;
    fragment.appendChild(row);
  });
  list.appendChild(fragment);
}

function getChildAccordionStateKey(childAccordion, index = 0) {
  if (!childAccordion) return `index:${index}`;
  const explicitKey = childAccordion.dataset.accordionStateKey;
  if (explicitKey) return explicitKey;
  const triggerId = childAccordion.querySelector(".child-accordion-trigger")?.id;
  if (triggerId) return `trigger:${triggerId}`;
  return `index:${index}`;
}

function captureChildAccordionState(root) {
  if (!root) return null;
  const expandedKeys = new Set();
  const childAccordions = Array.from(root.querySelectorAll("[data-child-accordion]"));
  childAccordions.forEach((childAccordion, index) => {
    const trigger = childAccordion.querySelector(".child-accordion-trigger");
    if (trigger?.getAttribute("aria-expanded") !== "true") return;
    expandedKeys.add(getChildAccordionStateKey(childAccordion, index));
  });
  return {
    expandedKeys,
    anchorTop: root.getBoundingClientRect().top,
  };
}

function restoreChildAccordionState(root, state) {
  if (!root || !state) return;
  const childAccordions = Array.from(root.querySelectorAll("[data-child-accordion]"));
  childAccordions.forEach((childAccordion, index) => {
    const key = getChildAccordionStateKey(childAccordion, index);
    if (!state.expandedKeys.has(key)) return;
    setChildAccordionExpanded(childAccordion, true);
  });

  if (!Number.isFinite(state.anchorTop)) return;
  const nextTop = root.getBoundingClientRect().top;
  const topDelta = nextTop - state.anchorTop;
  if (Math.abs(topDelta) <= 1) return;
  window.scrollBy({ top: topDelta, behavior: "auto" });
}

function renderLifeEvents(items) {
  if (!lifeEventList) return;
  lifeEventList.innerHTML = "";
  const settings = loadSettings();

  if (lifeEventEditingId && !items.some((item) => item.id === lifeEventEditingId)) {
    lifeEventEditingId = null;
    setLifeEventFormMode(false);
  }

  if (items.length === 0) {
    const empty = document.createElement("p");
    empty.className = "chart-empty";
    empty.textContent = "まだライフイベントは登録されていません。";
    lifeEventList.appendChild(empty);
    return;
  }

  items
    .slice()
    .sort((a, b) => (a.month !== b.month ? compareMonth(a.month, b.month) : a.createdAt.localeCompare(b.createdAt)))
    .forEach((item) => {
      const monthLabel = formatScheduledMonthLabel(item.month);
      const age = resolveAgeAtDate(settings?.birthDate, `${item.month}-01`);
      const monthWithAgeLabel = Number.isFinite(age) ? `${monthLabel}（${age}歳）` : monthLabel;
      const card = document.createElement("article");
      card.className = "life-event-card";
      card.innerHTML = `
        <div class="life-event-card-header">
          <h4>${monthWithAgeLabel} / ${item.category}</h4>
          <p class="life-event-amount ${item.type}">${yen.format(item.amount)}</p>
        </div>
        <ul class="life-event-meta-list">
          <li><span>区分</span><strong>${LIFE_EVENT_TYPES[item.type]}</strong></li>
          <li><span>費目</span><strong>${item.category}</strong></li>
          ${item.memo ? `<li><span>メモ</span><strong>${item.memo}</strong></li>` : ""}
        </ul>
      `;

      const actions = document.createElement("div");
      actions.className = "life-event-actions";

      const editButton = document.createElement("button");
      editButton.type = "button";
      editButton.className = "small";
      editButton.textContent = "修正";
      editButton.addEventListener("click", () => startLifeEventEdit(item.id));

      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "small danger";
      deleteButton.textContent = "削除";
      deleteButton.addEventListener("click", () => {
        if (!window.confirm("このライフイベントを削除しますか？")) return;
        const next = loadLifeEvents().filter((target) => target.id !== item.id);
        saveLifeEvents(next);
        if (lifeEventEditingId === item.id) {
          resetLifeEventFormFields();
        }
        render();
      });

      actions.append(editButton, deleteButton);
      card.appendChild(actions);
      lifeEventList.appendChild(card);
    });
}

function addLifeEvent(event) {
  event.preventDefault();
  const month = lifeEventMonthInput.value;
  const type = lifeEventTypeInput.value;
  const category = lifeEventCategoryInput.value;
  const amount = parseAmountInput(lifeEventAmountInput.value);
  const memo = lifeEventMemoInput.value.trim();

  if (!parseMonth(month)) {
    setLifeEventError("発生年月を入力してください。");
    lifeEventMonthInput.focus();
    return;
  }
  if (!(type in LIFE_EVENT_TYPES)) {
    setLifeEventError("区分を選択してください。");
    lifeEventTypeInput.focus();
    return;
  }
  if (!isValidLifeEventCategoryForType(type, category)) {
    setLifeEventError("区分に対応する費目を選択してください。");
    lifeEventCategoryInput.focus();
    return;
  }
  if (amount <= 0) {
    setLifeEventError("金額は1円以上で入力してください。");
    lifeEventAmountInput.focus();
    return;
  }
  setLifeEventError("");

  const current = loadLifeEvents();
  if (lifeEventEditingId) {
    const next = current.map((item) => (item.id === lifeEventEditingId
      ? normalizeLifeEvent({
          ...item,
          month,
          type,
          category: normalizeLegacyLifeEventCategory(category),
          amount,
          memo,
          updatedAt: new Date().toISOString(),
        })
      : item));
    saveLifeEvents(next);
  } else {
    current.push(normalizeLifeEvent({
      id: crypto.randomUUID(),
      month,
      type,
      category: normalizeLegacyLifeEventCategory(category),
      amount,
      memo,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
    saveLifeEvents(current);
  }

  resetLifeEventFormFields();
  render();
}

function cancelLifeEventEdit() {
  resetLifeEventFormFields();
}

function updateLifeEventAgePreview() {
  if (!lifeEventAgePreview || !lifeEventMonthInput) return;
  const month = lifeEventMonthInput.value;
  if (!parseMonth(month)) {
    lifeEventAgePreview.textContent = "";
    return;
  }
  const monthLabel = formatScheduledMonthLabel(month);
  const age = resolveAgeAtDate(loadSettings()?.birthDate, `${month}-01`);
  lifeEventAgePreview.textContent = Number.isFinite(age)
    ? `想定年齢: ${monthLabel}（${age}歳）`
    : `予定: ${monthLabel}`;
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

function subtractOneMonth(month) {
  const parsed = parseMonth(month);
  if (!parsed) return month;
  const previous = new Date(parsed.year, parsed.monthIndex - 1, 1);
  return formatMonth(previous.getFullYear(), previous.getMonth());
}

function getMonthRangeInclusive(startMonth, endMonth) {
  if (!parseMonth(startMonth) || !parseMonth(endMonth)) return [];
  if (compareMonth(startMonth, endMonth) > 0) return [];
  const months = [];
  let cursor = startMonth;
  while (compareMonth(cursor, endMonth) <= 0) {
    months.push(cursor);
    cursor = addOneMonth(cursor);
  }
  return months;
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

    const canApplyMonthlyContribution = shouldApplyPlanContributionForMonth(plan, settings.birthDate, month);
    const monthlyAmount = canApplyMonthlyContribution ? findActiveMonthlyContribution(plan, month) : 0;
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

    const withdrawTargetMonth = resolveWithdrawExecutionMonth(plan);
    const withdrawTx = [];
    if (withdrawTargetMonth && isSameMonth(withdrawTargetMonth, month)) {
      const projection = projectPlanAssetDetails(plan, settings.birthDate, withdrawTargetMonth);
      const amount = Math.max(Number(projection?.amount) || 0, 0);
      if (amount > 0) {
        withdrawTx.push({
          id: `auto-withdraw-${plan.id}-${month}`,
          date,
          type: "income",
          category: "臨時収入",
          amount,
          memo: `資産取崩: ${plan.type}${plan.name ? `（${plan.name}）` : ""}`,
          isAuto: true,
          sourceType: plan.type,
          sourceKind: "withdraw",
        });
      }
    }

    return [...monthlyTx, ...lumpTx, ...withdrawTx];
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

function resolveAverageTargetMonths(settings, transactions) {
  const entryStartMonth = resolveEntryStartMonth(settings, transactions);
  const operationMonth = todayISO().slice(0, 7);
  const endMonth = subtractOneMonth(operationMonth);
  return getMonthRangeInclusive(entryStartMonth, endMonth);
}

function createEligibleAutoExpensesForMonth(settings, transactions, month) {
  if (!month) return [];
  const entryStartMonth = resolveEntryStartMonth(settings, transactions);
  if (entryStartMonth && compareMonth(month, entryStartMonth) < 0) return [];

  const generated = createAutoExpensesForMonth(settings, month);
  return generated.filter((autoTx) => {
    return !transactions.some((item) => {
      return (
        item.type === autoTx.type &&
        item.date === autoTx.date &&
        item.category === autoTx.category &&
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
      auto += autoTransactions.reduce((sum, item) => sum + (item.type === "income" ? item.amount : -item.amount), 0);
      month = addOneMonth(month);
    }
  }

  return manual + auto;
}

function calculateMonthlySummary(transactions, settings, targetMonth) {
  if (!targetMonth) {
    return {
      carryover: 0,
      income: 0,
      regularExpense: 0,
      recurringExpense: 0,
      assetFormationExpense: 0,
      expense: 0,
      endingBalance: 0,
    };
  }

  const carryover = calculateCarryover(transactions, settings, targetMonth);
  const autoTransactions = createEligibleAutoExpensesForMonth(settings, transactions, targetMonth);
  const monthly = [...transactions, ...autoTransactions].reduce(
    (totals, item) => {
      if (monthISO(item.date) !== targetMonth) return totals;
      if (item.type === "income") {
        totals.income += item.amount;
      } else if (item.autoKind === "recurring-expense") {
        totals.recurringExpense += item.amount;
      } else if (item.category === ASSET_FORMATION_CATEGORY) {
        totals.assetFormationExpense += item.amount;
      } else {
        totals.regularExpense += item.amount;
      }
      return totals;
    },
    { income: 0, regularExpense: 0, recurringExpense: 0, assetFormationExpense: 0 }
  );
  const totalExpense = monthly.regularExpense + monthly.recurringExpense + monthly.assetFormationExpense;

  return {
    carryover,
    income: monthly.income,
    regularExpense: monthly.regularExpense,
    recurringExpense: monthly.recurringExpense,
    assetFormationExpense: monthly.assetFormationExpense,
    expense: totalExpense,
    endingBalance: carryover + monthly.income - totalExpense,
  };
}

function calculateAverageMonthlySummary(transactions, settings, months) {
  if (!Array.isArray(months) || months.length === 0) {
    return {
      summary: { carryover: 0, income: 0, expense: 0, endingBalance: 0 },
      monthlySavingTotal: 0,
      manualTransactionCount: 0,
      monthCount: 0,
    };
  }
  const totals = months.reduce((acc, month) => {
    const summary = calculateMonthlySummary(transactions, settings, month);
    acc.carryover += summary.carryover;
    acc.income += summary.income;
    acc.expense += summary.expense;
    acc.endingBalance += summary.endingBalance;
    acc.monthlySavingTotal += calculateMonthlyContributionTotal(settings, month);
    acc.manualTransactionCount += transactions.filter((item) => monthISO(item.date) === month).length;
    return acc;
  }, {
    carryover: 0,
    income: 0,
    expense: 0,
    endingBalance: 0,
    monthlySavingTotal: 0,
    manualTransactionCount: 0,
  });
  const monthCount = months.length;
  return {
    summary: {
      carryover: totals.carryover / monthCount,
      income: totals.income / monthCount,
      expense: totals.expense / monthCount,
      endingBalance: totals.endingBalance / monthCount,
    },
    monthlySavingTotal: totals.monthlySavingTotal / monthCount,
    manualTransactionCount: totals.manualTransactionCount / monthCount,
    monthCount,
  };
}

function calculateMonthlyContributionTotal(settings, month) {
  if (!month || !Array.isArray(settings.plans)) return 0;
  return settings.plans.reduce((sum, plan) => sum + findActiveMonthlyContribution(plan, month), 0);
}

function isPlanHeldUntilAge(plan, age, birthDate = "") {
  if (!parseMonth(plan?.withdrawMonth) || !parseBirthDate(birthDate)) return true;
  const withdrawDate = `${plan.withdrawMonth}-01`;
  const withdrawAgeByMonth = resolveAgeAtDate(birthDate, withdrawDate);
  if (!Number.isFinite(withdrawAgeByMonth)) return true;
  return withdrawAgeByMonth >= age;
}

function resolveAge60AssetFormationBalance({ settings, transactions, recurringExpenses, lifeEvents, assumptions }) {
  const cashflowRows = buildCashflowRows({ settings, transactions, recurringExpenses, lifeEvents, assumptions });
  const retirementReferenceYear = resolveRetirementReferenceYear(settings.birthDate);
  const age60CashflowRow = cashflowRows.find((row) => row.year === retirementReferenceYear)
    || cashflowRows[cashflowRows.length - 1]
    || null;
  return age60CashflowRow?.assetFormationBalance ?? 0;
}

function normalizeExpenseCompositionCategory(item) {
  if (item?.type !== "expense") return "";
  if (item.category === ASSET_FORMATION_CATEGORY && PLAN_TYPES.includes(item.sourceType)) {
    return item.sourceType;
  }
  return normalizeLegacyExpenseCategory(item.category || "");
}

function buildMonthlyExpenseComposition(transactions, targetMonth) {
  const baseTotals = EXPENSE_COMPOSITION_ITEMS.reduce((acc, name) => {
    acc[name] = 0;
    return acc;
  }, {});

  if (!targetMonth) {
    return {
      totalExpense: 0,
      entries: [],
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

  const positiveEntries = Object.entries(totals)
    .filter(([, amount]) => amount > 0)
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => {
      if (b.amount !== a.amount) return b.amount - a.amount;
      return EXPENSE_COMPOSITION_ITEMS.indexOf(a.name) - EXPENSE_COMPOSITION_ITEMS.indexOf(b.name);
    });
  const totalExpense = positiveEntries.reduce((sum, item) => sum + item.amount, 0);
  const entries = positiveEntries.map((item) => ({
    ...item,
    ratio: totalExpense > 0 ? (item.amount / totalExpense) * 100 : 0,
  }));

  const itemRatios = EXPENSE_COMPOSITION_ITEMS.reduce((acc, name) => {
    acc[name] = 0;
    return acc;
  }, {});
  entries.forEach((item) => {
    itemRatios[item.name] = item.ratio;
  });

  return {
    totalExpense,
    entries,
    itemRatios,
  };
}

function buildAverageExpenseComposition(transactions, targetMonths) {
  if (!Array.isArray(targetMonths) || targetMonths.length === 0) {
    return {
      totalExpense: 0,
      entries: [],
      itemRatios: EXPENSE_COMPOSITION_ITEMS.reduce((acc, name) => ({ ...acc, [name]: 0 }), {}),
    };
  }
  const monthSet = new Set(targetMonths);
  const monthCount = targetMonths.length;
  const totals = EXPENSE_COMPOSITION_ITEMS.reduce((acc, name) => {
    acc[name] = 0;
    return acc;
  }, {});

  transactions.forEach((item) => {
    if (item.type !== "expense") return;
    if (!monthSet.has(monthISO(item.date))) return;
    const category = normalizeExpenseCompositionCategory(item);
    if (!category) return;
    if (!(category in totals)) totals[category] = 0;
    totals[category] += item.amount;
  });

  const avgEntries = Object.entries(totals)
    .map(([name, amount]) => ({ name, amount: amount / monthCount }))
    .filter((item) => item.amount > 0)
    .sort((a, b) => b.amount - a.amount);
  const totalExpense = avgEntries.reduce((sum, item) => sum + item.amount, 0);
  const entries = avgEntries.map((item) => ({ ...item, ratio: totalExpense > 0 ? (item.amount / totalExpense) * 100 : 0 }));
  const itemRatios = EXPENSE_COMPOSITION_ITEMS.reduce((acc, name) => {
    acc[name] = 0;
    return acc;
  }, {});
  entries.forEach((item) => {
    itemRatios[item.name] = item.ratio;
  });
  return { totalExpense, entries, itemRatios };
}

function createDashboardDiagnosisComment({ summary, monthlySavingTotal, manualTransactionCount, expenseComposition }) {
  if (manualTransactionCount < 3) {
    return "取引データが少ないため、簡易診断を表示しています。入力が増えると、より実態に近い診断ができます。";
  }

  const balance = summary.endingBalance;
  const itemRatios = expenseComposition?.itemRatios || {};
  const fixedExpenseRatio = (itemRatios["家賃・住宅ローン"] || 0) + (itemRatios["家賃"] || 0) + (itemRatios["通信費"] || 0) + (itemRatios["保険料"] || 0) + (itemRatios["カーローン"] || 0) + (itemRatios["教育費"] || 0) + (itemRatios["その他固定費"] || 0);
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

function formatYenAsManYenLabel(value) {
  const manYen = Math.round((Number(value) || 0) / 10000);
  return `${numberWithComma.format(manYen)}万円`;
}

function calculateNiceYAxisStep(maxValue) {
  if (!Number.isFinite(maxValue) || maxValue <= 0) return 1000000;
  const roughStep = maxValue / 4;
  const exponent = 10 ** Math.floor(Math.log10(roughStep));
  const fraction = roughStep / exponent;
  let niceFraction = 1;
  if (fraction <= 1) {
    niceFraction = 1;
  } else if (fraction <= 2) {
    niceFraction = 2;
  } else if (fraction <= 5) {
    niceFraction = 5;
  } else {
    niceFraction = 10;
  }
  return Math.max(niceFraction * exponent, 1000000);
}

function renderDashboardAssetFormationChart(cashflowRows) {
  if (!dashboardAssetFormationChart) return;
  dashboardAssetFormationChart.innerHTML = "";
  const points = (Array.isArray(cashflowRows) ? cashflowRows : [])
    .map((row) => ({ year: row.year, amount: row.assetFormationBalance }))
    .filter((row) => Number.isFinite(row.year) && Number.isFinite(row.amount) && row.amount >= 0);

  const hasPositiveValue = points.some((item) => item.amount > 0);
  if (points.length === 0 || !hasPositiveValue) {
    const empty = document.createElement("p");
    empty.className = "chart-empty";
    empty.textContent = "資産形成額データがないため、グラフを表示できません。";
    dashboardAssetFormationChart.appendChild(empty);
    return;
  }

  const BAR_SLOT_WIDTH_PER_YEAR = 32;
  const chartHeight = 280;
  const margin = { top: 24, right: 12, bottom: 56, left: 0 };
  const yAxisWidth = 76;
  const plotWidth = points.length * BAR_SLOT_WIDTH_PER_YEAR;
  const plotContentWidth = plotWidth + margin.right;
  const plotHeight = chartHeight - margin.top - margin.bottom;
  const yStep = calculateNiceYAxisStep(Math.max(...points.map((item) => item.amount)));
  const yMax = Math.max(yStep, Math.ceil(Math.max(...points.map((item) => item.amount)) / yStep) * yStep);
  const yTickCount = Math.max(2, Math.ceil(yMax / yStep));
  const slotWidth = plotWidth / points.length;
  const barWidth = Math.max(8, Math.min(22, slotWidth * 0.42));
  const xLabelStep = Math.max(1, Math.ceil(34 / Math.max(slotWidth, 1)));

  const svgNS = "http://www.w3.org/2000/svg";
  const yAxisSvg = document.createElementNS(svgNS, "svg");
  yAxisSvg.setAttribute("viewBox", `0 0 ${yAxisWidth} ${chartHeight}`);
  yAxisSvg.setAttribute("role", "img");
  yAxisSvg.setAttribute("aria-label", "年ごとの資産形成額の縦軸");
  yAxisSvg.classList.add("dashboard-asset-formation-chart-svg", "dashboard-asset-formation-y-axis-svg");
  yAxisSvg.style.width = `${yAxisWidth}px`;
  yAxisSvg.style.height = `${chartHeight}px`;

  const plotSvg = document.createElementNS(svgNS, "svg");
  plotSvg.setAttribute("viewBox", `0 0 ${plotContentWidth} ${chartHeight}`);
  plotSvg.setAttribute("role", "img");
  plotSvg.setAttribute("aria-label", "年ごとの資産形成額棒グラフ");
  plotSvg.classList.add("dashboard-asset-formation-chart-svg", "dashboard-asset-formation-plot-svg");
  plotSvg.style.width = `${plotContentWidth}px`;
  plotSvg.style.height = `${chartHeight}px`;

  for (let tick = 0; tick <= yTickCount; tick += 1) {
    const value = tick * yStep;
    const y = margin.top + plotHeight - (value / yMax) * plotHeight;
    const yAxisGrid = document.createElementNS(svgNS, "line");
    yAxisGrid.setAttribute("x1", "0");
    yAxisGrid.setAttribute("x2", String(yAxisWidth));
    yAxisGrid.setAttribute("y1", String(y));
    yAxisGrid.setAttribute("y2", String(y));
    yAxisGrid.setAttribute("class", "dashboard-bar-chart-grid-line");
    yAxisSvg.appendChild(yAxisGrid);

    const label = document.createElementNS(svgNS, "text");
    label.setAttribute("x", String(yAxisWidth - 10));
    label.setAttribute("y", String(y + 4));
    label.setAttribute("text-anchor", "end");
    label.setAttribute("class", "dashboard-bar-chart-y-label");
    label.textContent = formatYenAsManYenLabel(value);
    yAxisSvg.appendChild(label);

    const plotGrid = document.createElementNS(svgNS, "line");
    plotGrid.setAttribute("x1", "0");
    plotGrid.setAttribute("x2", String(plotContentWidth));
    plotGrid.setAttribute("y1", String(y));
    plotGrid.setAttribute("y2", String(y));
    plotGrid.setAttribute("class", "dashboard-bar-chart-grid-line");
    plotSvg.appendChild(plotGrid);
  }

  points.forEach((item, index) => {
    const xCenter = slotWidth * index + slotWidth / 2;
    const barHeight = item.amount > 0 ? Math.max(1, (item.amount / yMax) * plotHeight) : 0;
    const y = margin.top + plotHeight - barHeight;
    const rect = document.createElementNS(svgNS, "rect");
    rect.setAttribute("x", String(xCenter - barWidth / 2));
    rect.setAttribute("y", String(y));
    rect.setAttribute("width", String(barWidth));
    rect.setAttribute("height", String(barHeight));
    rect.setAttribute("rx", "4");
    rect.setAttribute("class", "dashboard-bar-chart-bar");
    plotSvg.appendChild(rect);

    if (index % xLabelStep === 0 || index === points.length - 1) {
      const xLabel = document.createElementNS(svgNS, "text");
      xLabel.setAttribute("x", String(xCenter));
      xLabel.setAttribute("y", String(chartHeight - 24));
      xLabel.setAttribute("text-anchor", "middle");
      xLabel.setAttribute("class", "dashboard-bar-chart-x-label");
      xLabel.textContent = String(item.year);
      plotSvg.appendChild(xLabel);
    }
  });

  const axisY = document.createElementNS(svgNS, "line");
  axisY.setAttribute("x1", String(yAxisWidth));
  axisY.setAttribute("x2", String(yAxisWidth));
  axisY.setAttribute("y1", String(margin.top));
  axisY.setAttribute("y2", String(margin.top + plotHeight));
  axisY.setAttribute("class", "dashboard-bar-chart-axis");
  yAxisSvg.appendChild(axisY);

  const axisX = document.createElementNS(svgNS, "line");
  axisX.setAttribute("x1", "0");
  axisX.setAttribute("x2", String(plotContentWidth));
  axisX.setAttribute("y1", String(margin.top + plotHeight));
  axisX.setAttribute("y2", String(margin.top + plotHeight));
  axisX.setAttribute("class", "dashboard-bar-chart-axis");
  plotSvg.appendChild(axisX);

  const layout = document.createElement("div");
  layout.className = "dashboard-asset-formation-chart-layout";
  const yAxisPane = document.createElement("div");
  yAxisPane.className = "dashboard-asset-formation-chart-y-axis-pane";
  yAxisPane.appendChild(yAxisSvg);

  const scrollPane = document.createElement("div");
  scrollPane.className = "dashboard-asset-formation-chart-scroll-pane";
  const scrollContent = document.createElement("div");
  scrollContent.className = "dashboard-asset-formation-chart-scroll-content";
  scrollContent.style.minWidth = `${plotContentWidth}px`;
  scrollContent.appendChild(plotSvg);
  scrollPane.appendChild(scrollContent);

  layout.appendChild(yAxisPane);
  layout.appendChild(scrollPane);
  dashboardAssetFormationChart.appendChild(layout);
}

function renderDashboard({ summary, settings, transactions, recurringExpenses, lifeEvents, expenseComposition, monthlySavingTotal, manualTransactionCount, monthCount }) {
  const assumptions = loadCashflowAssumptions();
  const cashflowRows = buildCashflowRows({ settings, transactions, recurringExpenses, lifeEvents, assumptions });
  dashboardIncomeTotal.textContent = yen.format(summary.income);
  dashboardExpenseTotal.textContent = yen.format(summary.expense);
  dashboardBalanceTotal.textContent = yen.format(summary.endingBalance);
  const retirementReferenceYear = resolveRetirementReferenceYear(settings.birthDate);
  const age60AssetFormationBalance = cashflowRows.find((row) => row.year === retirementReferenceYear)?.assetFormationBalance
    ?? cashflowRows[cashflowRows.length - 1]?.assetFormationBalance
    ?? 0;
  dashboardAge60Total.textContent = yen.format(age60AssetFormationBalance);
  dashboardDiagnosisComment.textContent = createDashboardDiagnosisComment({
    summary,
    monthlySavingTotal,
    manualTransactionCount,
    expenseComposition,
  });
  if (monthCount > 0) {
    dashboardDiagnosisComment.textContent = `平均対象 ${monthCount}か月。${dashboardDiagnosisComment.textContent}`;
  }
  renderDashboardAssetFormationChart(cashflowRows);
}

function renderExpenseChart(expenseComposition, isAverageMode) {
  expenseChart.innerHTML = "";
  expenseChart.classList.toggle("has-data", false);
  if (expenseComposition.totalExpense === 0 || expenseComposition.entries.length === 0) {
    const empty = document.createElement("p");
    empty.className = "chart-empty";
    empty.textContent = isAverageMode ? "平均対象期間の支出データがありません。" : "この月の支出データはありません。";
    expenseChart.appendChild(empty);
    return;
  }

  expenseChart.classList.toggle("has-data", true);
  let currentDegree = 0;
  const segments = expenseComposition.entries.map((entry, index) => {
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
  pieCenter.innerHTML = `<span>${isAverageMode ? "月平均" : "合計"}</span><strong>${yen.format(expenseComposition.totalExpense)}</strong>`;

  pieChart.appendChild(pieCenter);
  pieWrap.appendChild(pieChart);
  expenseChart.appendChild(pieWrap);

  const legend = document.createElement("ul");
  legend.className = "pie-legend";

  expenseComposition.entries.forEach(({ name, amount, ratio }, index) => {
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
  const formatCategoryLabel = typeof options.formatCategoryLabel === "function"
    ? options.formatCategoryLabel
    : (name) => name;
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
    const formattedName = formatCategoryLabel(name);
    item.innerHTML = `
      <span class="dot" style="background:${chartColors[index % chartColors.length]}"></span>
      <span class="category">${formattedName}</span>
      <span class="value">${yen.format(amount)}</span>
      <strong class="ratio">${ratio.toFixed(1)}%</strong>
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

function formatAssetCompositionCategoryLabel(name) {
  if (typeof name !== "string") return "";
  const parenStart = name.indexOf("（");
  const parenEnd = name.lastIndexOf("）");
  if (parenStart <= 0 || parenEnd <= parenStart) {
    return name;
  }

  const main = name.slice(0, parenStart);
  const note = name.slice(parenStart);
  return `<span class="category-main">${main}</span><span class="category-note">${note}</span>`;
}

function calculateAverageMonthlyAmount(transactions, {
  startMonth,
  endMonth,
  type,
  categories,
}) {
  if (!parseMonth(startMonth) || !parseMonth(endMonth) || compareMonth(startMonth, endMonth) > 0) return 0;

  let cursor = startMonth;
  let targetMonths = 0;
  while (compareMonth(cursor, endMonth) <= 0) {
    targetMonths += 1;
    cursor = addOneMonth(cursor);
  }
  if (targetMonths <= 0) return 0;

  const total = transactions.reduce((sum, item) => {
    const month = monthISO(item.date);
    if (compareMonth(month, startMonth) < 0 || compareMonth(month, endMonth) > 0) return sum;
    if (item.type !== type) return sum;
    if (Array.isArray(categories) && !categories.includes(item.category)) return sum;
    return sum + item.amount;
  }, 0);

  return total / targetMonths;
}

function getRecurringExpenseMonthsInYear(item, year) {
  const itemStart = parseMonth(item.startMonth);
  if (!itemStart) return 0;
  const start = formatMonth(year, 0);
  const end = formatMonth(year, 11);
  let effectiveStart = compareMonth(item.startMonth, start) > 0 ? item.startMonth : start;
  let effectiveEnd = end;
  if (parseMonth(item.endMonth) && compareMonth(item.endMonth, effectiveEnd) < 0) {
    effectiveEnd = item.endMonth;
  }
  if (compareMonth(effectiveStart, effectiveEnd) > 0) return 0;
  return monthsBetweenInclusive(effectiveStart, effectiveEnd);
}

function isRecurringExpenseActiveOnMonth(item, month) {
  if (!parseMonth(month)) return false;
  if (!parseMonth(item?.startMonth)) return false;
  if (compareMonth(item.startMonth, month) > 0) return false;
  if (parseMonth(item.endMonth) && compareMonth(item.endMonth, month) < 0) return false;
  return true;
}

function calculateCurrentRecurringExpenseMonthlyTotal(recurringExpenses, nowMonth) {
  if (!parseMonth(nowMonth)) return 0;
  return (Array.isArray(recurringExpenses) ? recurringExpenses : []).reduce((sum, item) => {
    if (!isRecurringExpenseActiveOnMonth(item, nowMonth)) return sum;
    return sum + Math.max(Number(item.amount) || 0, 0);
  }, 0);
}

function resolveAgeAtYear(birthDate, year) {
  const birth = parseBirthDate(birthDate);
  if (!birth) return null;
  return year - birth.getFullYear();
}

function shouldApplyPlanContributionForMonth(plan, _birthDate, month) {
  const contributionEndMonth = resolvePlanContributionEndMonth(plan);
  if (!contributionEndMonth) return true;
  return compareMonth(month, contributionEndMonth) <= 0;
}

function countPlanContributionMonthsInYear(plan, birthDate, year) {
  let months = 0;
  for (let monthIndex = 0; monthIndex < 12; monthIndex += 1) {
    const month = formatMonth(year, monthIndex);
    if (shouldApplyPlanContributionForMonth(plan, birthDate, month)) {
      months += 1;
    }
  }
  return months;
}

function calculateAnnualAssetFormationExpense(settings, year) {
  const nowMonth = todayISO().slice(0, 7);
  if (!Array.isArray(settings.plans) || settings.plans.length === 0 || !parseMonth(nowMonth)) return 0;

  return settings.plans.reduce((sum, plan) => {
    const monthlyContribution = findActiveMonthlyContribution(plan, nowMonth);
    if (monthlyContribution <= 0) return sum;
    const activeMonths = countPlanContributionMonthsInYear(plan, settings.birthDate, year);
    return sum + (monthlyContribution * activeMonths);
  }, 0);
}

function buildLifeEventTotalsByMonth(lifeEvents, birthDate) {
  if (!parseBirthDate(birthDate)) return { income: {}, expense: {} };
  return (Array.isArray(lifeEvents) ? lifeEvents : []).reduce((map, event) => {
    const month = parseMonth(event?.month) ? event.month : "";
    const amount = Math.max(Number(event?.amount) || 0, 0);
    if (!month || amount <= 0) return map;
    if (event.type === 'income') {
      map.income[month] = (map.income[month] || 0) + amount;
    } else if (event.type === 'expense') {
      map.expense[month] = (map.expense[month] || 0) + amount;
    }
    return map;
  }, { income: {}, expense: {} });
}

function buildPlannedExtraTotalsByMonth(transactions, startMonth) {
  if (!parseMonth(startMonth)) return { income: {}, expense: {} };
  return (Array.isArray(transactions) ? transactions : []).reduce((map, item) => {
    if (!item?.date || item.isAutoGenerated) return map;
    const month = monthISO(item.date);
    if (!parseMonth(month) || compareMonth(month, startMonth) < 0) return map;

    const amount = Math.max(Number(item.amount) || 0, 0);
    if (amount <= 0) return map;

    const isPlannedExtraIncome = item.type === "income" && item.category === "臨時収入";
    const isPlannedExtraExpense = item.type === "expense" && item.category === "臨時支出";
    if (!isPlannedExtraIncome && !isPlannedExtraExpense) return map;

    if (isPlannedExtraIncome) {
      map.income[month] = (map.income[month] || 0) + amount;
    }
    if (isPlannedExtraExpense) {
      map.expense[month] = (map.expense[month] || 0) + amount;
    }
    return map;
  }, { income: {}, expense: {} });
}

function buildAssetWithdrawalTransfersByMonth(settings) {
  if (!Array.isArray(settings?.plans) || settings.plans.length === 0) return {};
  return settings.plans.reduce((map, plan) => {
    const withdrawTargetMonth = resolveWithdrawExecutionMonth(plan);
    if (!withdrawTargetMonth) return map;

    const projection = projectPlanAssetDetails(plan, settings.birthDate, withdrawTargetMonth);
    const amount = Math.max(Number(projection?.amount) || 0, 0);
    if (amount <= 0) return map;

    map[withdrawTargetMonth] = (map[withdrawTargetMonth] || 0) + amount;
    return map;
  }, {});
}

function buildAssetLumpInvestmentsByMonth(settings) {
  if (!Array.isArray(settings?.plans) || settings.plans.length === 0) return {};
  return settings.plans.reduce((map, plan) => {
    const lumpSums = Array.isArray(plan?.lumpSums) ? plan.lumpSums : [];
    lumpSums.forEach((history) => {
      if (!parseMonth(history.month)) return;
      const amount = Math.max(Number(history.amount) || 0, 0);
      if (amount <= 0) return;
      map[history.month] = (map[history.month] || 0) + amount;
    });
    return map;
  }, {});
}

function sumMonthlyAmountsInYear(monthlyMap, year, startMonth, endMonth) {
  if (!monthlyMap || !Number.isFinite(year)) return 0;
  let total = 0;
  for (let monthIndex = 0; monthIndex < 12; monthIndex += 1) {
    const month = formatMonth(year, monthIndex);
    if (startMonth && compareMonth(month, startMonth) < 0) continue;
    if (endMonth && compareMonth(month, endMonth) > 0) continue;
    total += monthlyMap[month] || 0;
  }
  return total;
}

function buildCashflowRows({ settings, transactions, recurringExpenses, lifeEvents, assumptions }) {
  const birth = parseBirthDate(settings.birthDate);
  if (!birth) return [];

  const retirementReferenceDate = resolveRetirementReferenceDate(settings.birthDate);
  if (!retirementReferenceDate) return [];
  const retirementReferenceYear = retirementReferenceDate.getFullYear();
  const retirementReferenceMonth = formatMonth(retirementReferenceYear, retirementReferenceDate.getMonth());

  const cashflowStartMonth = resolveEntryStartMonth(settings, transactions);
  const parsedCashflowStartMonth = parseMonth(cashflowStartMonth);
  if (!parsedCashflowStartMonth) return [];
  const startYear = parsedCashflowStartMonth.year;
  const endYear = retirementReferenceYear;
  if (startYear > endYear) return [];

  const nowMonth = todayISO().slice(0, 7);
  const averageStartMonth = cashflowStartMonth;
  const averageEndMonth = compareMonth(averageStartMonth, nowMonth) <= 0 ? nowMonth : averageStartMonth;
  const cashflowStartDate = `${cashflowStartMonth}-01`;
  const currentAge = resolveAgeAtDate(settings.birthDate, cashflowStartDate) ?? calculateAge(settings.birthDate);

  const monthlyIncome = calculateAverageMonthlyAmount(transactions, {
    startMonth: averageStartMonth,
    endMonth: averageEndMonth,
    type: 'income',
    categories: ['定期収入'],
  });
  const monthlyRegularExpense = calculateAverageMonthlyAmount(transactions, {
    startMonth: averageStartMonth,
    endMonth: averageEndMonth,
    type: 'expense',
    categories: EXPENSE_CATEGORIES,
  });

  const recurringMonthlyBase = calculateCurrentRecurringExpenseMonthlyTotal(recurringExpenses, cashflowStartMonth);

  const salaryGrowth = (Number(assumptions?.salaryGrowthRate) || 0) / 100;
  const inflationRate = (Number(assumptions?.inflationRate) || 0) / 100;
  const lifeEventByMonth = buildLifeEventTotalsByMonth(lifeEvents, settings.birthDate);
  const plannedExtraByMonth = buildPlannedExtraTotalsByMonth(transactions, averageStartMonth);
  const assetWithdrawalTransfersByMonth = buildAssetWithdrawalTransfersByMonth(settings);
  const assetLumpInvestmentsByMonth = buildAssetLumpInvestmentsByMonth(settings);

  const initialBalance = calculateCarryover(transactions, settings, cashflowStartMonth);
  const rows = [];
  let endingBalance = initialBalance;

  for (let year = startYear; year <= endYear; year += 1) {
    const yearOffset = year - startYear;
    const age = resolveAgeAtYear(settings.birthDate, year);
    if (!Number.isFinite(age) || age < currentAge || age > RETIREMENT_REFERENCE_AGE) continue;

    const isRetirementReferenceYear = year === retirementReferenceYear;
    const activeMonthsInYear = isRetirementReferenceYear ? (retirementReferenceDate.getMonth() + 1) : 12;
    const yearProgressRate = activeMonthsInYear / 12;

    const annualIncome = Math.round(monthlyIncome * activeMonthsInYear * ((1 + salaryGrowth) ** yearOffset));
    const annualRegularExpense = Math.round(monthlyRegularExpense * activeMonthsInYear * ((1 + inflationRate) ** yearOffset));

    const annualRecurringExpense = Math.round(recurringMonthlyBase * activeMonthsInYear);

    const annualAssetFormationExpense = isRetirementReferenceYear
      ? Math.round(calculateAnnualAssetFormationExpense(settings, year) * yearProgressRate)
      : calculateAnnualAssetFormationExpense(settings, year);
    const yearStartMonth = year === startYear ? cashflowStartMonth : formatMonth(year, 0);
    const yearEndMonth = isRetirementReferenceYear ? retirementReferenceMonth : formatMonth(year, 11);
    const annualLumpInvestmentExpense = sumMonthlyAmountsInYear(assetLumpInvestmentsByMonth, year, yearStartMonth, yearEndMonth);

    const annualLifeEventIncome = sumMonthlyAmountsInYear(
      lifeEventByMonth.income,
      year,
      yearStartMonth,
      yearEndMonth
    );
    const annualLifeEventExpense = sumMonthlyAmountsInYear(
      lifeEventByMonth.expense,
      year,
      yearStartMonth,
      yearEndMonth
    );
    const annualPlannedExtraIncome = sumMonthlyAmountsInYear(
      plannedExtraByMonth.income,
      year,
      yearStartMonth,
      yearEndMonth
    );
    const annualPlannedExtraExpense = sumMonthlyAmountsInYear(
      plannedExtraByMonth.expense,
      year,
      yearStartMonth,
      yearEndMonth
    );
    const annualExtraIncome = annualLifeEventIncome + annualPlannedExtraIncome;
    const annualExtraExpense = annualLifeEventExpense + annualPlannedExtraExpense;
    const annualAssetWithdrawalTransfer = sumMonthlyAmountsInYear(
      assetWithdrawalTransfersByMonth,
      year,
      yearStartMonth,
      yearEndMonth
    );
    const annualTotalIncome = annualIncome
      + annualAssetWithdrawalTransfer
      + annualExtraIncome;
    const annualTotalExpense = annualRegularExpense
      + annualRecurringExpense
      + annualAssetFormationExpense
      + annualLumpInvestmentExpense
      + annualExtraExpense;
    const annualBalance = annualTotalIncome - annualTotalExpense;
    endingBalance += annualBalance;
    const rowTargetMonth = isRetirementReferenceYear ? retirementReferenceMonth : formatMonth(year, 11);
    const assetFormationBalance = calculateFinancialAssetTotalAtMonth(settings, rowTargetMonth);
    const financialAssetTotal = endingBalance + assetFormationBalance;

    rows.push({
      year,
      age,
      annualIncome,
      annualRegularExpense,
      annualRecurringExpense,
      annualAssetFormationExpense,
      annualLumpInvestmentExpense,
      annualExtraIncome,
      annualExtraExpense,
      annualAssetWithdrawalTransfer,
      annualBalance,
      endingBalance,
      assetFormationBalance,
      financialAssetTotal,
    });
  }

  return rows;
}

function renderCashflowTable({ settings, transactions, recurringExpenses, lifeEvents, assumptions }) {
  if (!cashflowTableWrap) return;
  cashflowTableWrap.innerHTML = '';

  if (!settings.birthDate) {
    cashflowTableWrap.innerHTML = '<p class="chart-empty">生年月日を保存するとキャッシュフロー表を表示できます。</p>';
    return;
  }

  const rows = buildCashflowRows({ settings, transactions, recurringExpenses, lifeEvents, assumptions });
  if (rows.length === 0) {
    cashflowTableWrap.innerHTML = '<p class="chart-empty">対象期間のデータが不足しているため、表を作成できません。</p>';
    return;
  }

  const table = document.createElement('table');
  table.className = 'cashflow-table';
  table.innerHTML = `
    <thead>
      <tr>
        <th>年</th>
        <th>年齢</th>
        <th>年収</th>
        <th>資産取崩金</th>
        <th>通常支出</th>
        <th>定期支出</th>
        <th>積立支出</th>
        <th>一括投資額</th>
        <th>臨時収入</th>
        <th>臨時支出</th>
        <th>収支</th>
        <th>残高</th>
        <th>資産形成額</th>
        <th>金融資産合計</th>
      </tr>
    </thead>
    <tbody>
      ${rows.map((row) => `
        <tr>
          <td>${row.year}</td>
          <td>${row.age}歳</td>
          <td class="is-amount">${yen.format(row.annualIncome)}</td>
          <td class="is-amount">${yen.format(row.annualAssetWithdrawalTransfer)}</td>
          <td class="is-amount">${yen.format(row.annualRegularExpense)}</td>
          <td class="is-amount">${yen.format(row.annualRecurringExpense)}</td>
          <td class="is-amount">${yen.format(row.annualAssetFormationExpense)}</td>
          <td class="is-amount">${yen.format(row.annualLumpInvestmentExpense)}</td>
          <td class="is-amount">${yen.format(row.annualExtraIncome)}</td>
          <td class="is-amount">${yen.format(row.annualExtraExpense)}</td>
          <td class="is-amount is-annual-balance ${row.annualBalance >= 0 ? 'is-positive' : 'is-negative'}">${yen.format(row.annualBalance)}</td>
          <td class="is-amount is-ending-balance ${row.endingBalance >= 0 ? 'is-positive' : 'is-negative'}">${yen.format(row.endingBalance)}</td>
          <td class="is-amount is-asset-formation-balance">${yen.format(row.assetFormationBalance)}</td>
          <td class="is-amount is-financial-asset-total">${yen.format(row.financialAssetTotal)}</td>
        </tr>
      `).join('')}
    </tbody>
  `;
  cashflowTableWrap.appendChild(table);
}

function downloadCashflowPdf() {
  const settings = loadSettings();
  const transactions = loadTransactions();
  const recurringExpenses = loadRecurringExpenses();
  const lifeEvents = loadLifeEvents();
  const assumptions = loadCashflowAssumptions();
  const rows = buildCashflowRows({ settings, transactions, recurringExpenses, lifeEvents, assumptions });
  if (rows.length === 0) return;

  const win = window.open('', '_blank');
  if (!win) return;
  const generatedAt = new Date().toLocaleString('ja-JP');
  const bodyRows = rows.map((row) => `
    <tr>
      <td>${row.year}</td>
      <td>${row.age}歳</td>
      <td>${yen.format(row.annualIncome)}</td>
      <td>${yen.format(row.annualAssetWithdrawalTransfer)}</td>
      <td>${yen.format(row.annualRegularExpense)}</td>
      <td>${yen.format(row.annualRecurringExpense)}</td>
      <td>${yen.format(row.annualAssetFormationExpense)}</td>
      <td>${yen.format(row.annualLumpInvestmentExpense)}</td>
      <td>${yen.format(row.annualExtraIncome)}</td>
      <td>${yen.format(row.annualExtraExpense)}</td>
      <td>${yen.format(row.annualBalance)}</td>
      <td>${yen.format(row.endingBalance)}</td>
      <td>${yen.format(row.assetFormationBalance)}</td>
      <td>${yen.format(row.financialAssetTotal)}</td>
    </tr>
  `).join('');

  win.document.write(`<!doctype html><html lang="ja"><head><meta charset="UTF-8" /><title>キャッシュフロー表</title>
    <style>
      @page { size: A4 landscape; margin: 10mm; }
      body { font-family: "Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif; color: #1d2a3b; font-size: 11px; }
      h1 { font-size: 18px; margin: 0 0 6px; }
      .meta { margin: 0 0 12px; color: #475569; }
      table { width: 100%; border-collapse: collapse; table-layout: fixed; }
      th, td { border: 1px solid #cbd5e1; padding: 6px 8px; white-space: nowrap; }
      th { background: #e2e8f0; }
      td { text-align: right; }
      td:first-child, td:nth-child(2) { text-align: center; }
      tr { page-break-inside: avoid; }
    </style></head><body>
    <h1>キャッシュフロー表</h1>
    <p class="meta">作成日時: ${generatedAt}</p>
    <table>
      <thead><tr><th>年</th><th>年齢</th><th>年収</th><th>資産取崩金</th><th>通常支出</th><th>定期支出</th><th>積立支出</th><th>一括投資額</th><th>臨時収入</th><th>臨時支出</th><th>収支</th><th>残高</th><th>資産形成額</th><th>金融資産合計</th></tr></thead>
      <tbody>${bodyRows}</tbody>
    </table></body></html>`);
  win.document.close();
  win.focus();
  win.print();
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

function resolveTargetAgeDate(birthDate, targetAge) {
  const birth = parseBirthDate(birthDate);
  if (!birth) return null;

  const age = Number(targetAge);
  if (!Number.isFinite(age) || age < 0) return null;

  return new Date(
    birth.getFullYear() + age,
    birth.getMonth(),
    birth.getDate()
  );
}

function resolveRetirementReferenceDate(birthDate) {
  const ageDate = resolveTargetAgeDate(birthDate, RETIREMENT_REFERENCE_AGE);
  if (!ageDate) return null;
  const cutoffDate = new Date(ageDate);
  cutoffDate.setDate(cutoffDate.getDate() - RETIREMENT_REFERENCE_DAY_OFFSET);
  return cutoffDate;
}

function resolveRetirementReferenceYear(birthDate) {
  const cutoffDate = resolveRetirementReferenceDate(birthDate);
  return cutoffDate ? cutoffDate.getFullYear() : null;
}

function resolveRetirementReferenceMonth(birthDate) {
  const cutoffDate = resolveRetirementReferenceDate(birthDate);
  return cutoffDate ? formatMonth(cutoffDate.getFullYear(), cutoffDate.getMonth()) : null;
}

function resolveWithdrawExecutionMonth(plan) {
  return parseMonth(plan?.withdrawMonth) ? plan.withdrawMonth : null;
}

function resolvePlanContributionEndMonth(plan) {
  return parseMonth(plan?.withdrawMonth) ? plan.withdrawMonth : null;
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

function resolvePlanSimulationTargetMonth(plan, baseTargetMonth) {
  if (!baseTargetMonth) return null;

  const withdrawTargetMonth = resolveWithdrawExecutionMonth(plan);
  if (!withdrawTargetMonth) return baseTargetMonth;
  return compareMonth(withdrawTargetMonth, baseTargetMonth) <= 0 ? withdrawTargetMonth : baseTargetMonth;
}

function calculatePlanBalanceAtMonth(plan, birthDate, targetMonth) {
  if (!parseMonth(targetMonth)) return 0;

  const withdrawTargetMonth = resolveWithdrawExecutionMonth(plan);
  if (withdrawTargetMonth && compareMonth(targetMonth, withdrawTargetMonth) >= 0) {
    return 0;
  }

  const projection = projectPlanAssetDetails(plan, birthDate, targetMonth);
  return Math.max(Number(projection?.amount) || 0, 0);
}

function calculateFinancialAssetTotalAtMonth(settings, targetMonth) {
  if (!parseMonth(targetMonth) || !Array.isArray(settings?.plans) || settings.plans.length === 0) return 0;

  return settings.plans.reduce(
    (sum, plan) => sum + calculatePlanBalanceAtMonth(plan, settings.birthDate, targetMonth),
    0
  );
}

function buildPlanBalancesAtMonth(settings, targetMonth) {
  if (!parseMonth(targetMonth) || !Array.isArray(settings?.plans)) return [];

  return settings.plans.map((plan) => ({
    ...plan,
    projectedAmount: calculatePlanBalanceAtMonth(plan, settings.birthDate, targetMonth),
  }));
}

function projectPlanAssetDetails(plan, birthDate, explicitTargetMonth = null) {
  const annualReturn = (Number(plan.expectedReturn) || 0) / 100;
  const monthlyRate = Math.pow(1 + annualReturn, 1 / 12) - 1;
  const targetMonth = explicitTargetMonth || resolveWithdrawExecutionMonth(plan);
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

function resolveCurrentAssetTargetMonth() {
  return todayISO().slice(0, 7);
}

function renderAssetForecast(settings) {
  assetForecast.innerHTML = "";
  if (!settings.birthDate || settings.plans.length === 0) {
    assetForecast.innerHTML = '<p class="chart-empty">生年月日と積立設定を保存すると、現時点と60歳時点の資産試算が表示されます。</p>';
    return;
  }

  const transactions = loadTransactions();
  const recurringExpenses = loadRecurringExpenses();
  const assumptions = loadCashflowAssumptions();
  const currentAge = calculateAge(settings.birthDate);
  const age60TargetMonth = resolveRetirementReferenceMonth(settings.birthDate);
  const currentAssetTargetMonth = resolveCurrentAssetTargetMonth();
  const currentAssetBaseDate = todayISO();

  const projectedRowsAt60 = settings.plans.map((plan) => {
    const planTargetMonth = resolvePlanSimulationTargetMonth(plan, age60TargetMonth);
    const projection = projectPlanAssetDetails(plan, settings.birthDate, planTargetMonth);
    return {
      ...plan,
      isHeldUntil60: isPlanHeldUntilAge(plan, RETIREMENT_REFERENCE_AGE, settings.birthDate),
      projectedAmount: projection.amount,
      projection,
    };
  });
  const earlyWithdrawPlans = projectedRowsAt60.filter((plan) => !plan.isHeldUntil60 && plan.projectedAmount > 0);
  const earlyWithdrawPlansForDisplay = earlyWithdrawPlans.map((plan) => {
    const displayTargetMonth = resolveWithdrawExecutionMonth(plan);
    const displayProjection = displayTargetMonth
      ? projectPlanAssetDetails(plan, settings.birthDate, displayTargetMonth)
      : null;
    return {
      ...plan,
      displayProjectedAmount: displayProjection?.amount ?? plan.projectedAmount,
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

  const totalAt60 = resolveAge60AssetFormationBalance({
    settings,
    transactions,
    recurringExpenses,
    lifeEvents: loadLifeEvents(),
    assumptions,
  });
  const retirementReferenceYear = resolveRetirementReferenceYear(settings.birthDate);
  const age60BalanceTargetMonth = age60TargetMonth || (retirementReferenceYear ? formatMonth(retirementReferenceYear, 11) : null);
  const planBalancesAt60 = buildPlanBalancesAtMonth(settings, age60BalanceTargetMonth)
    .filter((plan) => plan.projectedAmount > 0);

  const rows = planBalancesAt60
    .map(
      (plan) => `
      <li>
        <span>${plan.type}${plan.name ? `（${plan.name}）` : ""}</span>
        <strong>${yen.format(plan.projectedAmount)}</strong>
      </li>
    `
    )
    .join("");

  const typeTotals = PLAN_TYPES.map((type) => {
    const amount = planBalancesAt60
      .filter((plan) => plan.type === type)
      .reduce((sum, plan) => sum + plan.projectedAmount, 0);
    return { type, amount };
  }).filter((item) => item.amount > 0);
  const earlyWithdrawHtml = earlyWithdrawPlansForDisplay
    .map((plan) => {
      const withdrawLabel = parseMonth(plan.withdrawMonth)
        ? formatWithdrawMonthLabelWithAge(plan.withdrawMonth, settings.birthDate)
        : "未設定";
      return `
        <li>
          <div class="asset-withdraw-item-main">
            <span class="asset-withdraw-contract">${plan.type}${plan.name ? `（${plan.name}）` : ""}</span>
            <span class="asset-withdraw-age">取崩し: ${withdrawLabel}</span>
          </div>
          <strong>${yen.format(plan.displayProjectedAmount)}</strong>
        </li>
      `;
    })
    .join("");

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
            <p class="section-description">現在年齢: <strong>${currentAge}歳</strong> / 60歳時点の一覧は、キャッシュフロー表の資産形成額と同じ計算条件で表示しています。</p>
            <h4>60歳時点の想定資産額（契約別）</h4>
            ${rows ? `<ul class="asset-list">${rows}</ul>` : '<p class="chart-empty">60歳時点の評価対象となる契約はありません。</p>'}
            <h4>60歳時点の想定資産額（種別別）</h4>
            ${typeTotalsHtml ? `<ul class="asset-list">${typeTotalsHtml}</ul>` : '<p class="chart-empty">60歳時点の評価対象となる契約はありません。</p>'}
            <div class="asset-total">60歳時点の想定総資産額: <strong>${yen.format(totalAt60)}</strong></div>
            <section class="asset-withdraw-card" aria-label="60歳前に取崩す予定の資産">
              <h4>60歳前に取崩す予定の資産</h4>
              ${earlyWithdrawHtml
    ? `<ul class="asset-list asset-withdraw-list">${earlyWithdrawHtml}</ul>`
    : '<p class="chart-empty">60歳前に取崩す予定の契約はありません。</p>'}
            </section>
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
      <h3>現在資産形成の構成比</h3>
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
          <p class="section-description">現在入力されている資産形成の契約（積立・一括入金）の実績をもとに算出しています（基準日: ${currentAssetBaseDate}）。</p>
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
    formatCategoryLabel: formatAssetCompositionCategoryLabel,
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
          <label>取崩年月<input class="plan-withdraw-month" type="month" value="${normalizedPlan.withdrawMonth || ""}" /></label>
          <p class="plan-withdraw-hint">※取崩年月が未設定の場合は、積立支出を継続します。</p>
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

  return wrap;
}

function addPlanBlockFromProfileButton() {
  if (!planList) return;
  const planChildAccordion = document.getElementById("trigger-profile-plan-assets")?.closest("[data-child-accordion]");
  if (planChildAccordion) {
    setChildAccordionExpanded(planChildAccordion, true);
  }
  const newBlock = createPlanBlock();
  planList.appendChild(newBlock);
  setPlanCardExpanded(newBlock, true);
  newBlock.scrollIntoView({ behavior: "smooth", block: "center" });
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
        withdrawMonth: block.querySelector(".plan-withdraw-month").value,
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
  const rawTransactions = loadTransactions();
  const fallbackMonth = getLatestMonthFromTransactions(rawTransactions) || todayISO().slice(0, 7);
  const currentViewMonth = resolveViewMonthFromState() || fallbackMonth;
  const syncTargetMonth = [fallbackMonth, currentViewMonth].sort(compareMonth).at(-1);
  const transactions = syncRecurringAutoTransactions(rawTransactions, recurringExpenses, syncTargetMonth);
  const lifeEvents = loadLifeEvents();
  const settings = loadSettings();
  const assumptions = loadCashflowAssumptions();
  const dataMonths = getMonthsWithData(transactions);
  syncSharedViewFilterOptions(dataMonths);
  const currentMonth = resolveViewMonthFromState() || fallbackMonth;
  const isAverageMode = sharedViewState.averageMode === "average";
  const autoTransactions = createEligibleAutoExpensesForMonth(settings, transactions, currentMonth);
  const combinedTransactions = [...transactions, ...autoTransactions];
  const averageTargetMonths = resolveAverageTargetMonths(settings, transactions);
  const summary = calculateMonthlySummary(transactions, settings, currentMonth);
  if (transactionEditingId && !transactions.some((item) => item.id === transactionEditingId)) {
    resetTransactionFormFields();
  }
  renderRecurringExpenses(recurringExpenses);
  renderLifeEvents(lifeEvents);

  entryStartMonthInput.value = resolveEntryStartMonth(settings, transactions);
  birthDateInput.value = settings.birthDate || "";
  updateCashflowAssumptionInputs(assumptions);

  const historyItems = buildTransactionHistoryItems(transactions, autoTransactions, currentMonth);
  const nowMonth = todayISO().slice(0, 7);
  const lifeEventPlannedHistoryItems = buildLifeEventHistoryItems(lifeEvents, settings);
  const futureTransactionHistoryItems = buildFutureTransactionHistoryItems(transactions, settings, nowMonth);
  const plannedHistoryItems = [...lifeEventPlannedHistoryItems, ...futureTransactionHistoryItems];

  renderTransactionHistory(historyItems);
  renderPlannedTransactionHistory(plannedHistoryItems);
  if (plannedHistoryBlock) {
    plannedHistoryBlock.hidden = false;
  }

  const monthlyExpenseComposition = buildMonthlyExpenseComposition(combinedTransactions, currentMonth);
  const averageExpenseComposition = buildAverageExpenseComposition(combinedTransactions, averageTargetMonths);
  const averageSummary = calculateAverageMonthlySummary(transactions, settings, averageTargetMonths);
  renderDashboard(isAverageMode
    ? {
        summary: averageSummary.summary,
        settings,
        transactions,
        recurringExpenses,
        lifeEvents,
        expenseComposition: averageExpenseComposition,
        monthlySavingTotal: averageSummary.monthlySavingTotal,
        manualTransactionCount: averageSummary.manualTransactionCount,
        monthCount: averageSummary.monthCount,
      }
    : {
        summary,
        settings,
        transactions,
        recurringExpenses,
        lifeEvents,
        expenseComposition: monthlyExpenseComposition,
        monthlySavingTotal: calculateMonthlyContributionTotal(settings, currentMonth),
        manualTransactionCount: transactions.filter((item) => monthISO(item.date) === currentMonth).length,
        monthCount: 0,
      });

  renderExpenseChart(isAverageMode ? averageExpenseComposition : monthlyExpenseComposition, isAverageMode);
  renderCashflowTable({ settings, transactions, recurringExpenses, lifeEvents, assumptions });
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
  if (type === "expense" && !EXPENSE_CATEGORIES.includes(category)) {
    return;
  }

  const current = loadTransactions();
  if (transactionEditingId) {
    const next = current.map((item) => (item.id === transactionEditingId
      ? {
          ...item,
          date,
          type,
          category,
          amount,
          memo,
        }
      : item));
    saveTransactions(next);
    resetTransactionFormFields({ date });
  } else {
    current.push({
      id: crypto.randomUUID(),
      date,
      type,
      category,
      amount,
      memo,
    });

    saveTransactions(current);
    resetTransactionFormFields({ date });
  }

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
  const expandedChildTriggers = section.querySelectorAll('[data-child-accordion] .child-accordion-trigger[aria-expanded="true"]');
  expandedChildTriggers.forEach((trigger) => {
    const childAccordion = trigger.closest("[data-child-accordion]");
    if (!childAccordion) return;
    setChildAccordionExpanded(childAccordion, false);
  });
  closeDescendantPlanCards(section);
}

function isExpenseBalanceSection(section, trigger) {
  return section?.id === "section-chart" || trigger?.id === "trigger-chart";
}

function clearAccordionCloseTimer(panel) {
  const timerId = accordionCloseTimers.get(panel);
  if (!timerId) return;
  window.clearTimeout(timerId);
  accordionCloseTimers.delete(panel);
}

function collapseAccordionPanel(panel) {
  clearAccordionCloseTimer(panel);
  const collapseWaiter = {};
  collapseWaiter.promise = new Promise((resolve) => {
    collapseWaiter.resolve = resolve;
  });
  accordionCollapseWaiters.set(panel, collapseWaiter);
  panel.classList.add("is-collapsing");
  const timerId = window.setTimeout(() => {
    panel.hidden = true;
    panel.classList.remove("is-collapsing");
    accordionCloseTimers.delete(panel);
    const waiter = accordionCollapseWaiters.get(panel);
    accordionCollapseWaiters.delete(panel);
    if (waiter?.resolve) {
      window.requestAnimationFrame(() => waiter.resolve());
    }
  }, 170);
  accordionCloseTimers.set(panel, timerId);
  return collapseWaiter.promise;
}

function expandAccordionPanel(panel) {
  clearAccordionCloseTimer(panel);
  const waiter = accordionCollapseWaiters.get(panel);
  if (waiter?.resolve) {
    accordionCollapseWaiters.delete(panel);
    waiter.resolve();
  }
  panel.hidden = false;
  panel.classList.remove("is-collapsing");
}

function closeExpandedChildAccordions(section) {
  if (!section) return;
  const expandedChildTriggers = section.querySelectorAll('[data-child-accordion] .child-accordion-trigger[aria-expanded="true"]');
  expandedChildTriggers.forEach((trigger) => {
    const childAccordion = trigger.closest("[data-child-accordion]");
    if (!childAccordion) return;
    setChildAccordionExpanded(childAccordion, false);
  });
}

function setAccordionExpanded(section, expanded) {
  const trigger = section.querySelector(".accordion-trigger");
  const panel = section.querySelector(".accordion-panel");
  if (!trigger || !panel) return;
  const wasExpanded = trigger.getAttribute("aria-expanded") === "true";

  if (!expanded) {
    closeExpandedChildAccordions(section);
  }

  if (!expanded && trigger.id === "trigger-profile") {
    resetProfileChildAndGrandchildAccordions(section);
  }

  if (expanded) {
    expandAccordionPanel(panel);
  }

  trigger.setAttribute("aria-expanded", String(expanded));
  panel.setAttribute("aria-hidden", String(!expanded));
  section.classList.toggle("is-expanded", expanded);

  if (!expanded) {
    if (wasExpanded) {
      return collapseAccordionPanel(panel);
    } else {
      clearAccordionCloseTimer(panel);
      panel.hidden = true;
      panel.classList.remove("is-collapsing");
    }
  }

  if (section.id === "section-assets" && wasExpanded !== expanded) {
    if (expanded) {
      queueAssetForecastRender(true);
    } else {
      clearAssetForecastDOM();
    }
  }

  return Promise.resolve();
}

function setupSectionAccordions() {
  accordionSections.forEach((section) => {
    const trigger = section.querySelector(".accordion-trigger");
    const panel = section.querySelector(".accordion-panel");
    if (!trigger || !panel) return;
    section.dataset.hasChildAccordion = section.querySelector("[data-child-accordion]") ? "true" : "false";

    const toggleSection = () => {
      if (section.dataset.toggleLocked === "true") return;
      section.dataset.toggleLocked = "true";
      window.setTimeout(() => {
        section.dataset.toggleLocked = "false";
      }, 180);
      const expanded = trigger.getAttribute("aria-expanded") === "true";
      const nextExpanded = !expanded;

      setAccordionExpanded(section, nextExpanded);
    };

    const initialExpanded = section.dataset.accordionInitialExpanded === "true";
    setAccordionExpanded(section, initialExpanded);

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
  childAccordion.dispatchEvent(
    new CustomEvent("childaccordiontoggle", {
      detail: { expanded },
    })
  );
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

function isAccordionSectionExpanded(section) {
  const trigger = section?.querySelector(".accordion-trigger");
  return trigger?.getAttribute("aria-expanded") === "true";
}

function getSectionHeadingTargetY(section) {
  const trigger = section?.querySelector(".accordion-trigger");
  if (!trigger) return window.scrollY;
  const topMargin = 12;
  return window.scrollY + trigger.getBoundingClientRect().top - topMargin;
}

function distanceBasedScrollBehavior(distance) {
  if (distance > NAV_CLOSE_FAR_DISTANCE) return "auto";
  return "smooth";
}

function ensureSectionHeadingVisible(section, { behavior } = {}) {
  if (!section) return;
  const trigger = section.querySelector(".accordion-trigger");
  if (!trigger) return;

  const bottomNav = document.querySelector(".bottom-nav");
  const navHeight = bottomNav?.offsetHeight || 0;
  const topMargin = 12;
  const bottomMargin = navHeight + 12;
  const rect = trigger.getBoundingClientRect();
  const isVisible = rect.top >= topMargin && rect.bottom <= window.innerHeight - bottomMargin;

  if (isVisible) return;
  const targetY = getSectionHeadingTargetY(section);
  const distance = Math.abs(window.scrollY - targetY);
  window.scrollTo({
    top: targetY,
    behavior: behavior || distanceBasedScrollBehavior(distance),
  });
}

function waitForAccordionCollapseLayout(panel) {
  const collapseWaiter = accordionCollapseWaiters.get(panel);
  if (collapseWaiter?.promise) {
    return collapseWaiter.promise.then(
      () =>
        new Promise((resolve) => {
          window.requestAnimationFrame(resolve);
        })
    );
  }

  return new Promise((resolve) => {
    if (!panel || panel.hidden) {
      window.requestAnimationFrame(() => resolve());
      return;
    }

    let settled = false;
    let fallbackId = 0;

    const finish = () => {
      if (settled) return;
      settled = true;
      panel.removeEventListener("transitionend", handleTransitionEnd);
      window.clearTimeout(fallbackId);
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(resolve);
      });
    };

    const handleTransitionEnd = (event) => {
      if (event.target !== panel) return;
      finish();
    };

    panel.addEventListener("transitionend", handleTransitionEnd);
    fallbackId = window.setTimeout(finish, 220);
  });
}

function scrollToNavSection(target) {
  const actionToken = ++navActionToken;
  const sectionId = NAV_TARGETS[target];
  const targetSection = sectionId ? document.getElementById(sectionId) : null;
  if (!targetSection) return;
  setBottomNavActive(target);

  if (targetSection.dataset.accordionSection === undefined) {
    targetSection.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  const expanded = isAccordionSectionExpanded(targetSection);
  if (expanded) {
    const panel = targetSection.querySelector(".accordion-panel");
    const beforeCloseDistance = Math.abs(window.scrollY - getSectionHeadingTargetY(targetSection));
    if (beforeCloseDistance > NAV_CLOSE_NEAR_DISTANCE) {
      const closeBehavior = distanceBasedScrollBehavior(beforeCloseDistance);
      document.body.classList.add("is-nav-closing");
      window.scrollTo({
        top: getSectionHeadingTargetY(targetSection),
        behavior: closeBehavior,
      });
    }

    setAccordionExpanded(targetSection, false);
    waitForAccordionCollapseLayout(panel).then(() => {
      if (actionToken === navActionToken && !isAccordionSectionExpanded(targetSection)) {
        ensureSectionHeadingVisible(targetSection, {
          behavior: distanceBasedScrollBehavior(beforeCloseDistance),
        });
      }
    }).finally(() => {
      document.body.classList.remove("is-nav-closing");
    });
    return;
  }

  setAccordionExpanded(targetSection, true);
  ensureSectionHeadingVisible(targetSection);
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

function setupBackToTopButton() {
  if (!backToTopButton) return;

  const updateBackToTopVisibility = () => {
    const shouldShow = window.scrollY >= BACK_TO_TOP_SHOW_SCROLL_Y;
    backToTopButton.classList.toggle("is-visible", shouldShow);
  };

  backToTopButton.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  window.addEventListener("scroll", updateBackToTopVisibility, { passive: true });
  window.addEventListener("resize", updateBackToTopVisibility);
  updateBackToTopVisibility();
}

function handleSharedViewFilterChange() {
  const active = sharedViewFilterControls.find((controls) => controls.mode?.matches(":focus") || controls.year?.matches(":focus") || controls.month?.matches(":focus"))
    || sharedViewFilterControls[0];
  if (!active?.year || !active.month) return;
  sharedViewState = {
    averageMode: active.mode ? (active.mode.value === "average" ? "average" : "month") : sharedViewState.averageMode,
    year: active.year.value,
    month: active.month.value,
  };
  render();
}

function setupSharedViewFilters() {
  sharedViewFilterControls.forEach((controls) => {
    if (!controls.year || !controls.month) return;
    controls.mode?.addEventListener("change", handleSharedViewFilterChange);
    controls.year.addEventListener("change", handleSharedViewFilterChange);
    controls.month.addEventListener("change", handleSharedViewFilterChange);
  });
}

function init() {
  const settings = loadSettings();
  const initialMonth = todayISO().slice(0, 7);
  sharedViewState = resolveInitialSharedViewState(initialMonth);

  dateInput.value = todayISO();
  entryStartMonthInput.value = settings.entryStartMonth || todayISO().slice(0, 7);
  syncCategoryOptions();
  syncRecurringCategoryOptions();
  syncRecurringDayOptions();
  syncLifeEventCategoryOptions();
  setTransactionFormMode(false);
  resetRecurringFormFields();
  resetLifeEventFormFields();
  renderPlans(settings);

  form.addEventListener("submit", addTransaction);
  typeInput.addEventListener("change", syncCategoryOptions);
  transactionCancelButton?.addEventListener("click", () => resetTransactionFormFields());
  setupSharedViewFilters();
  setupFormattedAmountInput(amountInput);
  setupFormattedAmountInput(recurringAmountInput);
  setupFormattedAmountInput(lifeEventAmountInput);

  profileForm.addEventListener("submit", saveProfile);
  addPlanButton?.addEventListener("click", addPlanBlockFromProfileButton);
  recurringForm.addEventListener("submit", addRecurringExpense);
  recurringCancelButton?.addEventListener("click", cancelRecurringExpenseEdit);
  lifeEventForm?.addEventListener("submit", addLifeEvent);
  lifeEventTypeInput?.addEventListener("change", handleLifeEventTypeChange);
  lifeEventMonthInput?.addEventListener("change", updateLifeEventAgePreview);
  lifeEventCancelButton?.addEventListener("click", cancelLifeEventEdit);
  cashflowSettingsForm?.addEventListener("input", () => {
    const assumptions = {
      salaryGrowthRate: Number(cashflowSalaryGrowthRateInput?.value) || 0,
      inflationRate: Number(cashflowInflationRateInput?.value) || 0,
    };
    saveCashflowAssumptions(assumptions);
    render();
  });
  cashflowDownloadPdfButton?.addEventListener("click", downloadCashflowPdf);
  setupSectionAccordions();
  setupChildAccordions();
  setupBottomNavigation();
  setupBackToTopButton();

  render();
}

init();
