const windowMinimizeBtn = document.getElementById("window-minimize");
const windowMaximizeBtn = document.getElementById("window-maximize");
const windowCloseBtn = document.getElementById("window-close");
const rulesList = document.getElementById("permission-rules-list");

const renderRules = (rules) => {
  if (!rulesList) return;
  rulesList.innerHTML = "";
  (Array.isArray(rules) ? rules : []).forEach((rule) => {
    const row = document.createElement("div");
    row.className = "auth-rules-item";
    const key = document.createElement("div");
    key.className = "key";
    key.textContent = rule.key;
    const action = document.createElement("div");
    action.textContent = rule.action || "hide";
    row.appendChild(key);
    row.appendChild(action);
    rulesList.appendChild(row);
  });
};

window.permissionExplorer?.onRulesUpdate(renderRules);

windowMinimizeBtn?.addEventListener("click", () => {
  window.appWindow?.minimize();
});

windowMaximizeBtn?.addEventListener("click", () => {
  window.appWindow?.toggleMaximize();
});

windowCloseBtn?.addEventListener("click", () => {
  window.appWindow?.close();
});

window.appWindow?.onMaximizeChange((isMaximized) => {
  if (!windowMaximizeBtn) return;
  windowMaximizeBtn.textContent = isMaximized ? "❐" : "▢";
});

window.appWindow?.isMaximized().then((isMaximized) => {
  if (!windowMaximizeBtn) return;
  windowMaximizeBtn.textContent = isMaximized ? "❐" : "▢";
});
