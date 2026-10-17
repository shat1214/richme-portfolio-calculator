
"use strict";

const $ = (id) => document.getElementById(id);

const GROUPS = {
  cash: "وجه نقد و سپرده",
  stocks: "سهام و صندوق‌ها",
  gold: "طلا و فلزات گران‌بها",
  currency: "ارز",
  crypto: "رمزارز",
  fixed: "درآمد ثابت",
  other: "سایر دارایی‌ها"
};

const MARKETS = {
  iran: "ایران",
  global: "جهانی"
};

const COLORS = [
  "#d6b45a",
  "#43c6b7",
  "#7398ff",
  "#c18bfa",
  "#f08e78",
  "#76c98c",
  "#e2a6d2"
];

const CURRENCIES = new Set([
  "IRR", "IRT", "USD", "EUR", "GBP", "AED", "USDT"
]);

let assets = [];
let nextId = 1;

const numberFormat = new Intl.NumberFormat("fa-IR", {
  maximumFractionDigits: 4
});

const moneyFormat = new Intl.NumberFormat("fa-IR", {
  maximumFractionDigits: 2
});

function normalizeCode(value) {
  return String(value || "").trim().toUpperCase();
}

function getReportCurrency() {
  const selected = $("reportCurrency").value;

  if (selected === "OTHER") {
    return normalizeCode($("customCurrency").value);
  }

  return selected;
}

function getAssetCurrency() {
  const selected = $("assetCurrency").value;

  if (selected === "OTHER") {
    return normalizeCode($("assetCustomCurrency").value);
  }

  return selected;
}

function getMarketFilter() {
  return $("marketFilter").value;
}

function getVisibleAssets() {
  const filter = getMarketFilter();

  if (filter === "all") {
    return assets.slice();
  }

  return assets.filter((asset) => asset.market === filter);
}

function getConversionRate(asset, reportCurrency) {
  if (asset.currency === reportCurrency) {
    return 1;
  }

  return asset.fx;
}

function getAssetValue(asset, reportCurrency) {
  const fx = getConversionRate(asset, reportCurrency);

  if (!Number.isFinite(fx) || fx <= 0) {
    return null;
  }

  const value = asset.quantity * asset.price * fx;

  return Number.isFinite(value) ? value : null;
}

function formatNumber(value) {
  if (!Number.isFinite(value)) {
    return "—";
  }

  return numberFormat.format(value);
}

function formatMoney(value) {
  if (!Number.isFinite(value)) {
    return "—";
  }

  return moneyFormat.format(value);
}

function showMessage(message, type = "") {
  const element = $("formMessage");

  element.textContent = message;
  element.className = "message";

  if (type) {
    element.classList.add(type);
  }
}

function showCustomCurrencyFields() {
  $("customCurrencyWrap").hidden =
    $("reportCurrency").value !== "OTHER";

  $("assetCustomCurrencyWrap").hidden =
    $("assetCurrency").value !== "OTHER";
}

function validateCurrencyCode(code) {
  return /^[A-Z][A-Z0-9]{1,9}$/.test(code);
}

function validateForm() {
  const name = $("assetName").value.trim();
  const group = $("assetGroup").value;
  const market = $("assetMarket").value;
  const quantity = Number($("assetQuantity").value);
  const price = Number($("assetPrice").value);
  const currency = getAssetCurrency();
  const reportCurrency = getReportCurrency();
  const fxInput = $("assetFx").value.trim();
  const fx = fxInput === "" ? NaN : Number(fxInput);

  if (!name) {
    throw new Error("نام دارایی را وارد کن.");
  }

  if (!Object.hasOwn(GROUPS, group)) {
    throw new Error("گروه دارایی معتبر نیست.");
  }

  if (!Object.hasOwn(MARKETS, market)) {
    throw new Error("بازار انتخاب‌شده معتبر نیست.");
  }

  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new Error("مقدار دارایی باید بیشتر از صفر باشد.");
  }

  if (!Number.isFinite(price) || price < 0) {
    throw new Error("قیمت باید عددی معتبر و صفر یا بیشتر باشد.");
  }

  if (!validateCurrencyCode(currency)) {
    throw new Error("کد ارز دارایی معتبر نیست.");
  }

  if (!validateCurrencyCode(reportCurrency)) {
    throw new Error("کد ارز گزارش معتبر نیست.");
  }

  let finalFx;

  if (currency === reportCurrency) {
    finalFx = 1;
  } else {
    if (!Number.isFinite(fx) || fx <= 0) {
      throw new Error(
        "ارز دارایی با ارز گزارش متفاوت است؛ نرخ تبدیل معتبر وارد کن."
      );
    }

    finalFx = fx;
  }

  const calculatedValue = quantity * price * finalFx;

  if (!Number.isFinite(calculatedValue)) {
    throw new Error("ارزش محاسبه‌شده بیش از محدوده قابل پشتیبانی است.");
  }

  return {
    name,
    group,
    market,
    quantity,
    price,
    currency,
    fx: finalFx,
    notes: $("assetNotes").value.trim()
  };
}

function resetForm() {
  $("assetForm").reset();
  $("editId").value = "";
  $("formTitle").textContent = "ثبت دارایی جدید";
  $("submitButton").textContent = "افزودن دارایی";
  $("cancelEdit").hidden = true;

  showCustomCurrencyFields();
  showMessage("");
}

function addOrUpdateAsset(event) {
  event.preventDefault();

  try {
    const data = validateForm();
    const editId = $("editId").value;

    if (editId) {
      const index = assets.findIndex(
        (asset) => asset.id === Number(editId)
      );

      if (index === -1) {
        throw new Error("دارایی موردنظر پیدا نشد.");
      }

      assets[index] = {
        ...assets[index],
        ...data
      };

      showMessage("دارایی با موفقیت ویرایش شد.", "success");
    } else {
      assets.push({
        id: nextId++,
        ...data
      });

      showMessage("دارایی با موفقیت ثبت شد.", "success");
    }

    renderAll();
    resetForm();
  } catch (error) {
    showMessage(error.message || "ثبت اطلاعات ناموفق بود.", "error");
  }
}

function startEdit(id) {
  const asset = assets.find((item) => item.id === id);

  if (!asset) {
    showMessage("دارایی موردنظر پیدا نشد.", "error");
    return;
  }

  $("editId").value = String(asset.id);
  $("assetName").value = asset.name;
  $("assetGroup").value = asset.group;
  $("assetMarket").value = asset.market;
  $("assetQuantity").value = String(asset.quantity);
  $("assetPrice").value = String(asset.price);
  $("assetCurrency").value = CURRENCIES.has(asset.currency)
    ? asset.currency
    : "OTHER";

  $("assetCustomCurrency").value =
    $("assetCurrency").value === "OTHER" ? asset.currency : "";

  $("assetFx").value =
    asset.currency === getReportCurrency() ? "" : String(asset.fx);

  $("assetNotes").value = asset.notes || "";
  $("formTitle").textContent = "ویرایش دارایی";
  $("submitButton").textContent = "ذخیره تغییرات";
  $("cancelEdit").hidden = false;

  showCustomCurrencyFields();
  showMessage("اطلاعات دارایی برای ویرایش بارگذاری شد.");
  $("assetName").focus();
  $("assetForm").scrollIntoView({ behavior: "smooth", block: "start" });
}

function deleteAsset(id) {
  const asset = assets.find((item) => item.id === id);

  if (!asset) {
    return;
  }

  const confirmed = window.confirm(
    `آیا می‌خواهی دارایی «${asset.name}» حذف شود؟`
  );

  if (!confirmed) {
    return;
  }

  assets = assets.filter((item) => item.id !== id);

  if (Number($("editId").value) === id) {
    resetForm();
  }

  renderAll();
  showMessage("دارایی حذف شد.", "success");
}

function getCalculatedRows() {
  const currency = getReportCurrency();
  const visibleAssets = getVisibleAssets();

  return visibleAssets.map((asset) => ({
    asset,
    value: getAssetValue(asset, currency)
  }));
}

function renderSummary(rows) {
  const validRows = rows.filter((row) => row.value !== null);

  const total = validRows.reduce(
    (sum, row) => sum + row.value,
    0
  );

  $("totalValue").textContent = formatMoney(total);
  $("totalCurrency").textContent = getReportCurrency() || "ارز نامشخص";
  $("assetCount").textContent = numberFormat.format(rows.length);

  const groupTotals = {};

  for (const row of validRows) {
    const group = row.asset.group;
    groupTotals[group] = (groupTotals[group] || 0) + row.value;
  }

  const sortedGroups = Object.entries(groupTotals).sort(
    (a, b) => b[1] - a[1]
  );

  if (sortedGroups.length === 0 || total <= 0) {
    $("largestGroup").textContent = "—";
    $("largestGroupShare").textContent =
      "برای محاسبه سهم، دارایی معتبر با ارزش مثبت ثبت کن.";
    return;
  }

  const [group, value] = sortedGroups[0];

  $("largestGroup").textContent = GROUPS[group] || group;
  $("largestGroupShare").textContent =
    `${formatMoney((value / total) * 100)}٪ از ارزش پرتفوی`;
}

function createCell(text, className = "") {
  const cell = document.createElement("td");
  cell.textContent = text;

  if (className) {
    cell.className = className;
  }

  return cell;
}

function createActionButton(label, className, onClick) {
  const button = document.createElement("button");

  button.type = "button";
  button.textContent = label;
  button.className = className;
  button.addEventListener("click", onClick);

  return button;
}

function renderTable(rows) {
  const tbody = $("assetTableBody");
  tbody.replaceChildren();

  if (rows.length === 0) {
    const tr = document.createElement("tr");
    const td = createCell("هنوز دارایی‌ای ثبت نشده است.", "empty");

    td.colSpan = 8;
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  const total = rows.reduce(
    (sum, row) => sum + (row.value ?? 0),
    0
  );

  for (const row of rows) {
    const { asset, value } = row;
    const tr = document.createElement("tr");

    tr.appendChild(createCell(asset.name));
    tr.appendChild(createCell(GROUPS[asset.group] || asset.group));
    tr.appendChild(createCell(MARKETS[asset.market] || asset.market));
    tr.appendChild(createCell(formatNumber(asset.quantity)));
    tr.appendChild(
      createCell(`${formatNumber(asset.price)} ${asset.currency}`)
    );
    tr.appendChild(
      createCell(
        value === null
          ? "نرخ تبدیل نامعتبر"
          : `${formatMoney(value)} ${getReportCurrency()}`
      )
    );

    const weight =
      value !== null && total > 0
        ? `${formatMoney((value / total) * 100)}٪`
        : "—";

    tr.appendChild(createCell(weight));

    const actionsCell = document.createElement("td");
    const actions = document.createElement("div");
    actions.className = "table-actions";

    actions.appendChild(
      createActionButton("ویرایش", "secondary", () => startEdit(asset.id))
    );

    actions.appendChild(
      createActionButton("حذف", "danger-button", () => deleteAsset(asset.id))
    );

    actionsCell.appendChild(actions);
    tr.appendChild(actionsCell);
    tbody.appendChild(tr);
  }
}

function renderChart(rows) {
  const chart = $("allocationChart");
  const legend = $("allocationLegend");

  chart.replaceChildren();
  legend.replaceChildren();

  const groupTotals = {};

  for (const row of rows) {
    if (row.value === null || row.value <= 0) {
      continue;
    }

    groupTotals[row.asset.group] =
      (groupTotals[row.asset.group] || 0) + row.value;
  }

  const entries = Object.entries(groupTotals).sort(
    (a, b) => b[1] - a[1]
  );

  const total = entries.reduce((sum, entry) => sum + entry[1], 0);

  if (total <= 0) {
    chart.setAttribute("aria-label", "اطلاعاتی برای نمایش نمودار وجود ندارد.");

    const empty = document.createElement("p");
    empty.className = "hint";
    empty.textContent = "پس از ثبت دارایی‌ها، نمودار اینجا نمایش داده می‌شود.";
    legend.appendChild(empty);
    return;
  }

  chart.setAttribute("role", "img");
  chart.setAttribute(
    "aria-label",
    `نمودار تخصیص دارایی‌ها بر مبنای ${getReportCurrency()}`
  );

  entries.forEach(([group, value], index) => {
    const share = (value / total) * 100;
    const segment = document.createElement("div");

    segment.className = "chart-segment";
    segment.style.width = `${share}%`;
    segment.style.backgroundColor = COLORS[index % COLORS.length];
    segment.title =
      `${GROUPS[group]}: ${formatMoney(share)}٪`;

    chart.appendChild(segment);

    const item = document.createElement("div");
    item.className = "legend-item";

    const label = document.createElement("span");
    label.className = "legend-label";

    const dot = document.createElement("span");
    dot.className = "legend-dot";
    dot.style.backgroundColor = COLORS[index % COLORS.length];

    const name = document.createElement("span");
    name.textContent = GROUPS[group];

    label.append(dot, name);

    const amount = document.createElement("span");
    amount.className = "legend-value";
    amount.textContent =
      `${formatMoney(value)} ${getReportCurrency()} · ${formatMoney(share)}٪`;

    item.append(label, amount);
    legend.appendChild(item);
  });
}

function renderAll() {
  const rows = getCalculatedRows();

  renderSummary(rows);
  renderTable(rows);
  renderChart(rows);
}

function escapeCsv(value) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function exportCsv() {
  const rows = getCalculatedRows();

  if (rows.length === 0) {
    showMessage("برای خروجی گرفتن، ابتدا دارایی ثبت کن.", "error");
    return;
  }

  const currency = getReportCurrency();
  const total = rows.reduce(
    (sum, row) => sum + (row.value ?? 0),
    0
  );

  const header = [
    "نام دارایی",
    "گروه",
    "بازار",
    "مقدار",
    "قیمت واحد",
    "ارز قیمت",
    "نرخ تبدیل",
    "ارزش در ارز گزارش",
    "سهم از پرتفوی",
    "یادداشت"
  ];

  const lines = [header.map(escapeCsv).join(",")];

  for (const row of rows) {
    const { asset, value } = row;
    const weight =
      value !== null && total > 0 ? (value / total) * 100 : "";

    const values = [
      asset.name,
      GROUPS[asset.group] || asset.group,
      MARKETS[asset.market] || asset.market,
      asset.quantity,
      asset.price,
      asset.currency,
      asset.fx,
      value === null ? "" : value,
      weight,
      asset.notes || ""
    ];

    lines.push(values.map(escapeCsv).join(","));
  }

  const csv = "\uFEFF" + lines.join("\r\n");
  const blob = new Blob([csv], {
    type: "text/csv;charset=utf-8;"
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "RichMe-Portfolio.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
  showMessage(`خروجی CSV برای ارز گزارش ${currency} آماده شد.`, "success");
}

function handleCurrencyChange() {
  showCustomCurrencyFields();
  renderAll();
}

$("assetForm").addEventListener("submit", addOrUpdateAsset);

$("assetForm").addEventListener("reset", () => {
  window.setTimeout(() => {
    if (!$("editId").value) {
      showCustomCurrencyFields();
    }
  }, 0);
});

$("reportCurrency").addEventListener("change", handleCurrencyChange);
$("customCurrency").addEventListener("input", renderAll);
$("assetCurrency").addEventListener("change", showCustomCurrencyFields);
$("marketFilter").addEventListener("change", renderAll);
$("exportCsv").addEventListener("click", exportCsv);

$("cancelEdit").addEventListener("click", resetForm);

$("assetFx").addEventListener("input", () => {
  if ($("formMessage").classList.contains("error")) {
    showMessage("");
  }
});

showCustomCurrencyFields();
renderAll();
