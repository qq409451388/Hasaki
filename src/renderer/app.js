const navItems = Array.from(document.querySelectorAll(".nav-item"));
const pages = Array.from(document.querySelectorAll(".page"));
const appShell = document.querySelector(".app-shell");
const topbar = document.querySelector(".topbar");
const sidebarBrand = document.querySelector(".sidebar .brand");
const loadingOverlay = document.getElementById("loading-overlay");
const settingsCategories = Array.from(document.querySelectorAll(".settings-category"));
const settingsPanels = Array.from(document.querySelectorAll(".settings-panel"));
const companySelect = document.getElementById("ai-company-select");
const endpointGroup = document.getElementById("ai-endpoint-group");
const endpointInput = document.getElementById("ai-endpoint-input");
const promptTextarea = document.getElementById("ai-prompt-textarea");
const languageSelect = document.getElementById("app-language-select");
const variableTags = Array.from(document.querySelectorAll(".variable-tag"));
const toastContainer = document.getElementById("toast-container");
const topBannerEl = document.getElementById("top-banner");
const userNameInline = document.getElementById("user-name-inline");
const statusLamp = document.getElementById("status-lamp");
const aiSettingsPanel = document.getElementById("settings-ai");
const appSettingsPanel = document.getElementById("settings-app");
const heroTabs = Array.from(document.querySelectorAll(".hero-tab"));
const heroAvailableEl = document.getElementById("hero-available");
const heroSelectedEl = document.getElementById("hero-selected");
const saveHeroPoolBtn = document.getElementById("save-hero-pool");
const windowMinimizeBtn = document.getElementById("window-minimize");
const windowMaximizeBtn = document.getElementById("window-maximize");
const windowCloseBtn = document.getElementById("window-close");

// User avatar elements
const userAvatarContainer = document.getElementById("user-avatar-container");
const userAvatar = document.getElementById("user-avatar");
const userPopup = document.getElementById("user-popup");
const userName = document.getElementById("user-name");
const userRegion = document.getElementById("user-region");
const avatarConnectBtn = document.getElementById("avatar-connect-btn");
const avatarReconnectBtn = document.getElementById("avatar-reconnect-btn");
const avatarDisconnectBtn = document.getElementById("avatar-disconnect-btn");
const aboutBrandUnlock = document.getElementById("about-brand-unlock");
const authExplorerToggle = document.getElementById("auth-explorer-toggle");
const authRulesList = document.getElementById("auth-rules-list");
const authClearBtn = document.getElementById("auth-clear");
const authExportBtn = document.getElementById("auth-export");
let authDevUnlocked = false;
let authExplorerEnabled = false;
let authRules = [];
let authHighlightEl = null;
let authLabelEl = null;
let aiTokens = {};
let aiEndpoints = {};

const showPage = (pageId) => {
  navItems.forEach((item) => {
    item.classList.toggle("active", item.dataset.page === pageId);
  });

  pages.forEach((page) => {
    page.classList.toggle("active", page.id === `page-${pageId}`);
  });
  if (pageId === "settings") {
    const heroPanel = document.getElementById("settings-hero");
    if (heroPanel && heroPanel.classList.contains("active")) {
      ensureChampionsLoaded();
    }
  }
};

const showSettingsCategory = (categoryId) => {
  settingsCategories.forEach((item) => {
    item.classList.toggle("active", item.dataset.category === categoryId);
  });

  settingsPanels.forEach((panel) => {
    panel.classList.toggle("active", panel.id === `settings-${categoryId}`);
  });
};

const toggleSidebar = () => {
  if (!appShell) return;
  appShell.classList.toggle("sidebar-collapsed");
};

const applyTheme = (theme) => {
  const themes = ["dark", "light", "slate", "ocean", "forest", "violet"];
  const t = themes.includes(theme) ? `theme-${theme}` : "theme-dark";
  document.body.classList.remove(
    "theme-dark",
    "theme-light",
    "theme-slate",
    "theme-ocean",
    "theme-forest",
    "theme-violet"
  );
  document.body.classList.add(t);
};

let currentLanguage = "zh-CN";
const i18nDict = {
  "zh-CN": {
    "nav.overview": "概览",
    "nav.settings": "设置",
    "settings.hero": "英雄池",
    "settings.ai": "AI配置",
    "settings.app": "应用",
    "settings.about": "关于",
    "title.hero": "英雄池设置",
    "hero.tab.top": "上路",
    "hero.tab.jungle": "打野",
    "hero.tab.mid": "中单",
    "hero.tab.bottom": "下路",
    "hero.tab.support": "辅助",
    "hero.list.available": "英雄列表",
    "hero.list.selected": "已加入英雄池",
    "hero.save": "保存英雄池",
    "ai.vendor": "厂商",
    "ai.endpoint": "自定义 Endpoint",
    "ai.endpoint.hint": "留空则使用厂商默认 Endpoint",
    "ai.token": "Token",
    "ai.options": "选项",
    "ai.opt.position": "注入选位信息",
    "ai.opt.champion": "注入英雄信息",
    "ai.prompt": "辅助选人 Prompt",
    "ai.prompt.hint": "点击上方变量标签可插入到文本中",
    "var.allySelected": "己方已选",
    "var.enemySelected": "敌方已选",
    "var.rankTier": "当前分段",
    "var.gameLane": "当前游戏分路",
    "var.heroPool": "英雄池",
    "var.heroPoolMastery": "英雄池（含熟练度）",
    "var.gameMode": "对局模式",
    "var.bannedHeroes": "禁用英雄列表",
    "app.theme": "主题颜色",
    "app.theme.dark": "深色",
    "app.theme.light": "浅色",
    "app.language": "语言",
    "app.theme.slate": "石板灰",
    "app.theme.ocean": "海洋蓝",
    "app.theme.forest": "森林绿",
    "app.theme.violet": "紫罗兰",
    "app.update": "更新设置",
    "app.update.autoCheck": "自动检查更新",
    "app.update.autoDownload": "自动下载更新",
    "app.update.check": "检查更新",
    "about.title": "关于",
    "about.brand": "League Hasaki",
    "auth.title": "权限配置",
    "auth.open": "启用权限探索",
    "auth.clear": "清空",
    "auth.export": "导出规则",
    "auth.selected": "已选组件",
    "auth.tip.label": "提示",
    "auth.tip.value": "启用权限探索后，悬浮组件显示唯一名，点击加入规则。",
    "toast.settings_saved": "设置已保存",
    "toast.hero_saved": "英雄池已保存",
    "toast.copy_success": "已复制到剪贴板",
    "toast.copy_fail": "复制失败",
    "toast.auth_enabled": "权限探索已启用",
    "toast.auth_disabled": "权限探索已关闭",
    "toast.auth_unlock_first": "请先在关于页面点击解锁",
    "loading.connecting": "正在连接 LCU…"
  },
  "en-US": {
    "nav.overview": "Overview",
    "nav.settings": "Settings",
    "settings.hero": "Hero Pool",
    "settings.ai": "AI Settings",
    "settings.app": "Application",
    "settings.about": "About",
    "title.hero": "Hero Pool Settings",
    "hero.tab.top": "Top",
    "hero.tab.jungle": "Jungle",
    "hero.tab.mid": "Mid",
    "hero.tab.bottom": "Bottom",
    "hero.tab.support": "Support",
    "hero.list.available": "Champion List",
    "hero.list.selected": "In Your Pool",
    "hero.save": "Save Hero Pool",
    "ai.vendor": "Vendor",
    "ai.endpoint": "Custom Endpoint",
    "ai.endpoint.hint": "Leave blank to use vendor default",
    "ai.token": "Token",
    "ai.options": "Options",
    "ai.opt.position": "Inject position info",
    "ai.opt.champion": "Inject champion info",
    "ai.prompt": "Assistant Prompt",
    "ai.prompt.hint": "Click variable tags above to insert",
    "var.allySelected": "Ally Selected",
    "var.enemySelected": "Enemy Selected",
    "var.rankTier": "Rank Tier",
    "var.gameLane": "Game Lane",
    "var.heroPool": "Hero Pool",
    "var.heroPoolMastery": "Hero Pool (with mastery)",
    "var.gameMode": "Game Mode",
    "var.bannedHeroes": "Banned Champions",
    "app.theme": "Theme",
    "app.theme.dark": "Dark",
    "app.theme.light": "Light",
    "app.language": "Language",
    "app.theme.slate": "Slate Gray",
    "app.theme.ocean": "Ocean Blue",
    "app.theme.forest": "Forest Green",
    "app.theme.violet": "Violet",
    "app.update": "Update Settings",
    "app.update.autoCheck": "Auto check updates",
    "app.update.autoDownload": "Auto download updates",
    "app.update.check": "Check Update",
    "about.title": "About",
    "about.brand": "League Hasaki",
    "auth.title": "Permission Config",
    "auth.open": "Enable Permission Explorer",
    "auth.clear": "Clear",
    "auth.export": "Export Rules",
    "auth.selected": "Selected Components",
    "auth.tip.label": "Tip",
    "auth.tip.value": "Hover shows key; click adds to rules.",
    "toast.settings_saved": "Settings saved",
    "toast.hero_saved": "Hero pool saved",
    "toast.copy_success": "Copied to clipboard",
    "toast.copy_fail": "Copy failed",
    "toast.auth_enabled": "Permission explorer enabled",
    "toast.auth_disabled": "Permission explorer disabled",
    "toast.auth_unlock_first": "Please unlock in About first",
    "loading.connecting": "Connecting to LCU…"
  }
};

const t = (key) => {
  const dict = i18nDict[currentLanguage] || i18nDict["zh-CN"];
  return dict[key] || key;
};

const applyLanguage = (lang) => {
  currentLanguage = lang || "zh-CN";
  const dict = i18nDict[lang] || i18nDict["zh-CN"];
  Array.from(document.querySelectorAll("[data-i18n]")).forEach((el) => {
    const key = el.getAttribute("data-i18n");
    const text = dict[key];
    if (typeof text === "string") el.textContent = text;
  });
};

const insertAtCursor = (textarea, text) => {
  if (!textarea) return;
  const start = textarea.selectionStart ?? textarea.value.length;
  const end = textarea.selectionEnd ?? textarea.value.length;
  const before = textarea.value.slice(0, start);
  const after = textarea.value.slice(end);
  textarea.value = `${before}${text}${after}`;
  const nextPosition = start + text.length;
  textarea.setSelectionRange(nextPosition, nextPosition);
  textarea.focus();
};

const showToast = (message) => {
  if (!toastContainer) return;
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  toastContainer.appendChild(toast);
  requestAnimationFrame(() => {
    toast.classList.add("show");
  });
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 200);
  }, 1800);
};

const showTopBanner = (message) => {
  if (!topBannerEl) return;
  topBannerEl.textContent = message;
  topBannerEl.classList.add("show");
  setTimeout(() => {
    topBannerEl.classList.remove("show");
  }, 2400);
};

const collectSystemConfig = () => {
  const companyId = companySelect?.value || "";
  const tokenValue = document.getElementById("ai-token-input")?.value || "";
  const endpointValue = endpointInput?.value || "";
  if (companyId) {
    aiTokens[companyId] = tokenValue;
    aiEndpoints[companyId] = endpointValue;
  }
  return {
    ai: {
      companyId: companySelect?.value || "",
      endpoints: aiEndpoints,
      tokens: aiTokens,
      usePosition: !!document.getElementById("ai-use-position")?.checked,
      useChampion: !!document.getElementById("ai-use-champion")?.checked,
      prompt: promptTextarea?.value || ""
    },
    app: {
      theme: document.getElementById("app-theme-select")?.value || "dark",
      language: languageSelect?.value || "zh-CN",
      autoCheckUpdate: !!document.getElementById("auto-check-update")?.checked,
      autoDownloadUpdate: !!document.getElementById("auto-download-update")?.checked
    }
  };
};

const applySystemConfig = (cfg) => {
  try {
    const ai = cfg?.ai || {};
    const app = cfg?.app || {};
    aiTokens = ai.tokens && typeof ai.tokens === "object" ? ai.tokens : {};
    aiEndpoints = ai.endpoints && typeof ai.endpoints === "object" ? ai.endpoints : {};
    if (companySelect) companySelect.value = ai.companyId || "";
    if (endpointInput) {
      const cid = ai.companyId || "";
      const ep = (cid && aiEndpoints[cid]) ? aiEndpoints[cid] : "";
      endpointInput.value = ep;
    }
    if (document.getElementById("ai-token-input")) {
      const cid = ai.companyId || "";
      const val = (cid && aiTokens[cid]) ? aiTokens[cid] : "";
      document.getElementById("ai-token-input").value = val;
    }
    if (document.getElementById("ai-use-position")) document.getElementById("ai-use-position").checked = !!ai.usePosition;
    if (document.getElementById("ai-use-champion")) document.getElementById("ai-use-champion").checked = !!ai.useChampion;
    if (promptTextarea) promptTextarea.value = ai.prompt || "";
    toggleEndpointVisibility(companySelect?.value || "");
    const themeValue = app.theme || "dark";
    if (document.getElementById("app-theme-select")) document.getElementById("app-theme-select").value = themeValue;
    if (languageSelect) languageSelect.value = app.language || "zh-CN";
    if (document.getElementById("auto-check-update")) document.getElementById("auto-check-update").checked = !!app.autoCheckUpdate;
    if (document.getElementById("auto-download-update")) document.getElementById("auto-download-update").checked = !!app.autoDownloadUpdate;
    applyTheme(themeValue);
    applyLanguage(app.language || "zh-CN");
  } catch {}
};

const loadSystemConfig = async () => {
  if (!window.systemConfig) return;
  const cfg = await window.systemConfig.get();
  if (cfg) applySystemConfig(cfg);
};

const saveSystemConfig = async () => {
  if (!window.systemConfig) return;
  const payload = collectSystemConfig();
  const ok = await window.systemConfig.save(payload);
  showToast(ok ? t("toast.settings_saved") : t("toast.copy_fail"));
};

const setupAutoSave = (panel, message) => {
  if (!panel) return;
  let timer = null;
  const schedule = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      saveSystemConfig();
    }, 600);
  };
  panel.addEventListener("input", schedule);
  panel.addEventListener("change", schedule);
};

const heroRoles = ["top", "jungle", "mid", "bottom", "support"];
let champions = [];
const championIconCache = new Map();
const pendingChampionIcons = new Set();
const CHAMPIONS_CACHE_KEY = "lh:champions:list:v1";
const CHAMPION_ICON_CACHE_PREFIX = "lh:champion:icon:";
const CHAMPIONS_CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12h
const CHAMPION_ICON_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7d

const readCache = (key) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (!obj || typeof obj !== "object") return null;
    const ts = Number(obj.ts || 0);
    const ttl = Number(obj.ttl || 0);
    if (!ts || !ttl) return null;
    if (Date.now() - ts > ttl) return null;
    return obj.data ?? null;
  } catch {
    return null;
  }
};

const writeCache = (key, data, ttlMs) => {
  try {
    const obj = { ts: Date.now(), ttl: Number(ttlMs || 0), data };
    localStorage.setItem(key, JSON.stringify(obj));
  } catch {}
};

const readIconCache = (path) => {
  if (!path) return null;
  return readCache(CHAMPION_ICON_CACHE_PREFIX + path);
};

const writeIconCache = (path, dataUrl) => {
  if (!path || !dataUrl) return;
  writeCache(CHAMPION_ICON_CACHE_PREFIX + path, dataUrl, CHAMPION_ICON_CACHE_TTL_MS);
};
let heroPool = {
  top: [],
  jungle: [],
  mid: [],
  bottom: [],
  support: []
};
let currentHeroRole = "top";
let hasRequestedChampions = false;

const normalizeHeroPool = (data) => {
  const normalized = {};
  heroRoles.forEach((role) => {
    const list = Array.isArray(data?.[role]) ? data[role].map(String) : [];
    normalized[role] = Array.from(new Set(list));
  });
  return normalized;
};

const fetchChampionIcon = async (champion) => {
  if (!window.lcuApi || !champion?.squarePortraitPath) return;
  const key = champion.squarePortraitPath;
  if (championIconCache.has(key) || pendingChampionIcons.has(key)) return;
  const cached = readIconCache(key);
  if (cached) {
    championIconCache.set(key, cached);
    renderHeroPool();
    return;
  }
  pendingChampionIcons.add(key);
  const icon = await window.lcuApi.getChampionIcon(key);
  if (icon) {
    championIconCache.set(key, icon);
    writeIconCache(key, icon);
  }
  pendingChampionIcons.delete(key);
  renderHeroPool();
};

const renderHeroPool = () => {
  if (!heroAvailableEl || !heroSelectedEl) return;
  const selectedIds = new Set(heroPool[currentHeroRole] || []);
  const championMap = new Map(champions.map((champion) => [champion.id, champion]));

  heroAvailableEl.innerHTML = "";
  heroSelectedEl.innerHTML = "";

  if (champions.length === 0) {
    const empty = document.createElement("div");
    empty.className = "hero-empty";
    empty.textContent = "等待连接 LCU 获取英雄列表";
    heroAvailableEl.appendChild(empty);
  }

  champions.forEach((champion) => {
    if (selectedIds.has(champion.id)) return;
    const item = document.createElement("button");
    item.className = "hero-item hero-available-item";
    item.dataset.id = champion.id;
    const iconSrc = championIconCache.get(champion.squarePortraitPath);
    if (iconSrc) {
      const icon = document.createElement("img");
      icon.className = "hero-icon";
      icon.alt = champion.name || "";
      icon.src = iconSrc;
      item.appendChild(icon);
    } else if (champion.squarePortraitPath) {
      fetchChampionIcon(champion);
    }
    const name = document.createElement("span");
    name.className = "hero-name";
    name.textContent = champion.name;
    item.appendChild(name);
    heroAvailableEl.appendChild(item);
  });

  (heroPool[currentHeroRole] || []).forEach((id) => {
    const champion = championMap.get(id);
    const item = document.createElement("button");
    item.className = "hero-item hero-selected-item";
    item.dataset.id = id;
    const iconSrc = champion ? championIconCache.get(champion.squarePortraitPath) : null;
    if (iconSrc) {
      const icon = document.createElement("img");
      icon.className = "hero-icon";
      icon.alt = champion.name || "";
      icon.src = iconSrc;
      item.appendChild(icon);
    } else if (champion?.squarePortraitPath) {
      fetchChampionIcon(champion);
    }
    const name = document.createElement("span");
    name.className = "hero-name";
    name.textContent = champion?.name || id;
    item.appendChild(name);
    heroSelectedEl.appendChild(item);
  });

  if ((heroPool[currentHeroRole] || []).length === 0) {
    const emptySelected = document.createElement("div");
    emptySelected.className = "hero-empty";
    emptySelected.textContent = "暂无英雄池";
    heroSelectedEl.appendChild(emptySelected);
  }
};

const loadHeroPool = async () => {
  if (!window.heroConfig) return;
  const saved = await window.heroConfig.get();
  if (saved) {
    heroPool = normalizeHeroPool(saved);
  } else {
    heroPool = normalizeHeroPool(heroPool);
  }
  renderHeroPool();
};

const ensureChampionsLoaded = () => {
  if (hasRequestedChampions) return;
  hasRequestedChampions = true;
  loadChampions();
};

const loadChampions = async () => {
  if (!window.lcuApi) return;
  const cached = readCache(CHAMPIONS_CACHE_KEY);
  if (Array.isArray(cached) && cached.length > 0) {
    champions = cached;
  } else {
    const list = await window.lcuApi.getChampions();
    champions = Array.isArray(list) ? list : [];
    if (champions.length > 0) {
      writeCache(CHAMPIONS_CACHE_KEY, champions, CHAMPIONS_CACHE_TTL_MS);
    }
  }
  let masteryMap = new Map();
  if (window.lcuApi.getChampionMastery) {
    const masteryList = await window.lcuApi.getChampionMastery();
    masteryMap = new Map(
      (Array.isArray(masteryList) ? masteryList : []).map((item) => [
        String(item.championId),
        Number(item.score || 0)
      ])
    );
  }
  champions.sort((a, b) => {
    const scoreA = masteryMap.get(String(a.id)) || 0;
    const scoreB = masteryMap.get(String(b.id)) || 0;
    if (scoreA !== scoreB) {
      return scoreB - scoreA;
    }
    return (a.name || "").localeCompare(b.name || "", "zh-Hans-CN");
  });
  champions.forEach((c) => {
    const iconCached = readIconCache(c.squarePortraitPath);
    if (iconCached) {
      championIconCache.set(c.squarePortraitPath, iconCached);
    }
  });
  renderHeroPool();
};

const toggleEndpointVisibility = (companyId) => {
  if (!endpointGroup) return;
  const shouldShow = companyId === "custom";
  endpointGroup.style.display = shouldShow ? "flex" : "none";
};

const setEndpointForCompany = (company) => {
  if (!endpointInput) return;
  const previousDefault = endpointInput.dataset.defaultEndpoint || "";
  const shouldReplace = endpointInput.value === "" || endpointInput.value === previousDefault;
  const nextDefault = company?.endpoint || "";
  if (shouldReplace) {
    endpointInput.value = nextDefault;
  }
  endpointInput.dataset.defaultEndpoint = nextDefault;
};

const loadModelCompanies = async () => {
  if (!companySelect) return;
  try {
    const url = new URL("../../config/model_company.json", window.location.href);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const companies = Array.isArray(data.companies) ? data.companies : [];
    companies.forEach((company) => {
      const option = document.createElement("option");
      option.value = company.id;
      option.textContent = company.name;
      option.dataset.endpoint = company.endpoint || "";
      option.dataset.isCustom = company.id === "custom" ? "1" : "0";
      companySelect.appendChild(option);
    });
  } catch (error) {
    console.error("Failed to load model companies:", error);
  }
};

let currentSummoner = null;
let lastConnectionStatus = null; // 缓存上次连接状态，避免频繁调用

const updateUserAvatar = async (status) => {
  const isConnected = status && status.status === "connected";
  const wasConnected = lastConnectionStatus === "connected";
  
  // 只在连接状态变化时或首次连接时获取用户信息
  if (isConnected && !wasConnected) {
    // 获取用户信息（只在连接状态变化时调用）
    try {
      const summoner = await window.lcuApi.getCurrentSummoner();
      if (summoner) {
        currentSummoner = summoner;
        
        // 更新头像 - 使用 Data Dragon 最新版本 CDN
        if (summoner.profileIconId !== undefined) {
          console.log(`[Avatar] Loading profile icon ID: ${summoner.profileIconId}`);
          const cdnUrl = await window.lcuApi.getProfileIconCdn(summoner.profileIconId);
          const img = document.createElement("img");
          img.src = cdnUrl;
          img.alt = "Avatar";
          img.onload = () => {
            console.log(`[Avatar] Successfully loaded icon from CDN`);
          };
          img.onerror = () => {
            console.error(`[Avatar] Failed to load icon from CDN, showing default`);
            userAvatar.innerHTML = `
              <svg class="disconnected-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.2"/>
                <circle cx="12" cy="12" r="6" fill="currentColor" opacity="0.4"/>
              </svg>
            `;
          };
          userAvatar.innerHTML = "";
          userAvatar.appendChild(img);
        } else {
          // 没有头像ID，显示默认图标
          userAvatar.innerHTML = `
            <svg class="disconnected-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.2"/>
              <circle cx="12" cy="12" r="6" fill="currentColor" opacity="0.4"/>
            </svg>
          `;
        }
        
        // 更新用户名
        if (userName) {
          userName.textContent = summoner.displayName || summoner.gameName || "未知用户";
        }
        if (userNameInline) {
          userNameInline.textContent = summoner.displayName || summoner.gameName || "未知用户";
        }
        if (statusLamp) statusLamp.className = "status-lamp connected";
        
        // 更新大区（需要从其他 API 获取，暂时显示 summonerId）
        if (userRegion) {
          userRegion.textContent = `ID: ${summoner.summonerId || "未知"}`;
        }
        
        // 显示重连和断开按钮
        if (avatarConnectBtn) avatarConnectBtn.style.display = "none";
        if (avatarReconnectBtn) avatarReconnectBtn.style.display = "block";
        if (avatarDisconnectBtn) avatarDisconnectBtn.style.display = "block";
      }
    } catch (error) {
      console.error("Failed to get summoner info:", error);
      // 连接成功但获取用户信息失败
      if (userName) userName.textContent = "已连接";
      if (userNameInline) userNameInline.textContent = "已连接";
      if (statusLamp) statusLamp.className = "status-lamp connected";
      if (userRegion) userRegion.textContent = "获取用户信息失败";
      if (avatarDisconnectBtn) avatarDisconnectBtn.style.display = "block";
    }
  } else if (isConnected && wasConnected && currentSummoner) {
    // 已连接且之前已获取过用户信息，直接使用缓存
    if (currentSummoner.profileIconId !== undefined) {
      const cdnUrl = await window.lcuApi.getProfileIconCdn(currentSummoner.profileIconId);
      const img = document.createElement("img");
      img.src = cdnUrl;
      img.alt = "Avatar";
      img.onerror = () => {
        userAvatar.innerHTML = `
          <svg class="disconnected-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.2"/>
            <circle cx="12" cy="12" r="6" fill="currentColor" opacity="0.4"/>
          </svg>
        `;
      };
      userAvatar.innerHTML = "";
      userAvatar.appendChild(img);
    }
    if (userName) {
      userName.textContent = currentSummoner.displayName || currentSummoner.gameName || "未知用户";
    }
    if (userNameInline) {
      userNameInline.textContent = currentSummoner.displayName || currentSummoner.gameName || "未知用户";
    }
    if (statusLamp) statusLamp.className = "status-lamp connected";
    if (userRegion) {
      userRegion.textContent = `ID: ${currentSummoner.summonerId || "未知"}`;
    }
    if (avatarConnectBtn) avatarConnectBtn.style.display = "none";
    if (avatarReconnectBtn) avatarReconnectBtn.style.display = "block";
    if (avatarDisconnectBtn) avatarDisconnectBtn.style.display = "block";
  } else {
    // 未连接状态
    currentSummoner = null;
    userAvatar.innerHTML = `
      <svg class="disconnected-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="currentColor" opacity="0.3"/>
        <circle cx="12" cy="12" r="3" fill="currentColor" opacity="0.5"/>
        <path d="M8 12h8M12 8v8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
    `;
    if (userName) userName.textContent = "未连接";
    if (userNameInline) userNameInline.textContent = "未连接";
    if (userRegion) userRegion.textContent = "点击连接";
    if (statusLamp) statusLamp.className = "status-lamp disconnected";
    if (avatarConnectBtn) avatarConnectBtn.style.display = "block";
    if (avatarReconnectBtn) avatarReconnectBtn.style.display = "none";
    if (avatarDisconnectBtn) avatarDisconnectBtn.style.display = "none";
  }
  
  lastConnectionStatus = status ? status.status : null;
};

const renderStatus = (status) => {
  if (!status) {
    updateUserAvatar(null);
    if (userNameInline) userNameInline.textContent = "未连接";
    if (statusLamp) statusLamp.className = "status-lamp disconnected";
    if (loadingOverlay) loadingOverlay.classList.remove("show");
    return;
  }
  updateUserAvatar(status);
  const isConnected = status.status === "connected";
  if (status.status === "connecting") {
    if (loadingOverlay) loadingOverlay.classList.add("show");
  } else {
    if (loadingOverlay) loadingOverlay.classList.remove("show");
  }
  if (!isConnected) {
    if (userNameInline) userNameInline.textContent = "未连接";
    if (statusLamp) statusLamp.className = "status-lamp disconnected";
    const err = status.lastError || null;
    if (err && (err.message || err.code)) {
      const code = String(err.code || "").toUpperCase();
      const msg = code === "PROCESS_NOT_RUNNING"
        ? "未检测到游戏客户端，请先启动英雄联盟客户端"
        : code === "ADMIN_REQUIRED"
          ? "需管理员权限刷新配置：请以管理员方式启动或手动运行脚本"
          : `客户端已运行但无法连接：${err.message || "未知错误"}`;
      showTopBanner(msg);
    }
  } else {
    // 连接成功后不立即加载英雄池，延迟到用户进入设置页面/英雄池标签时再加载
  }
};

navItems.forEach((item) => {
  item.addEventListener("click", () => showPage(item.dataset.page));
});

settingsCategories.forEach((item) => {
  item.addEventListener("click", () => showSettingsCategory(item.dataset.category));
});

sidebarBrand?.addEventListener("click", toggleSidebar);

heroTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    const role = tab.dataset.role;
    if (!role) return;
    currentHeroRole = role;
    heroTabs.forEach((item) => item.classList.toggle("active", item.dataset.role === role));
    renderHeroPool();
    ensureChampionsLoaded();
  });
});

heroAvailableEl?.addEventListener("click", (event) => {
  const item = event.target.closest(".hero-item");
  if (!item) return;
  const id = item.dataset.id;
  if (!id) return;
  const list = heroPool[currentHeroRole] || [];
  if (!list.includes(id)) {
    list.push(id);
    heroPool[currentHeroRole] = list;
    renderHeroPool();
  }
});

heroSelectedEl?.addEventListener("click", (event) => {
  const item = event.target.closest(".hero-item");
  if (!item) return;
  const id = item.dataset.id;
  if (!id) return;
  const list = heroPool[currentHeroRole] || [];
  heroPool[currentHeroRole] = list.filter((heroId) => heroId !== id);
  renderHeroPool();
});

variableTags.forEach((tag) => {
  tag.addEventListener("click", () => insertAtCursor(promptTextarea, tag.dataset.variable || ""));
});

companySelect?.addEventListener("change", () => {
  const selectedOption = companySelect.options[companySelect.selectedIndex];
  const company = {
    endpoint: selectedOption?.dataset?.endpoint || ""
  };
  setEndpointForCompany(company);
  toggleEndpointVisibility(companySelect.value);
  const cid = companySelect.value || "";
  if (document.getElementById("ai-token-input")) {
    document.getElementById("ai-token-input").value = (cid && aiTokens[cid]) ? aiTokens[cid] : "";
  }
  if (endpointInput) {
    const mapped = (cid && aiEndpoints[cid]) ? aiEndpoints[cid] : "";
    endpointInput.value = mapped || company.endpoint || "";
  }
});

languageSelect?.addEventListener("change", () => {
  applyLanguage(languageSelect.value || "zh-CN");
});

document.getElementById("app-theme-select")?.addEventListener("change", () => {
  const value = document.getElementById("app-theme-select").value;
  applyTheme(value);
});

setupAutoSave(aiSettingsPanel, "AI 设置已保存");
setupAutoSave(appSettingsPanel, "应用设置已保存");

saveHeroPoolBtn?.addEventListener("click", async () => {
  if (!window.heroConfig) return;
  let payload = { ...heroPool };
  try {
    const masteryList = await window.lcuApi.getChampionMastery();
    const byId = new Map();
    (Array.isArray(masteryList) ? masteryList : []).forEach((m) => {
      const id = String(m.championId || "");
      if (!id) return;
      byId.set(id, {
        championId: String(m.championId || ""),
        championLevel: Number(m.championLevel || 0),
        championPoints: Number(m.championPoints || 0),
        highestGrade: String(m.highestGrade || ""),
        lastPlayTime: Number(m.lastPlayTime || 0),
        tokensEarned: Number(m.tokensEarned || 0),
        score: Number(m.score || 0)
      });
    });
    const selectedIds = new Set(
      []
        .concat(payload.top || [], payload.jungle || [], payload.mid || [], payload.bottom || [], payload.support || [])
        .map(String)
    );
    const mastery = {};
    selectedIds.forEach((id) => {
      const m = byId.get(id);
      if (m) mastery[id] = m;
    });
    payload.mastery = mastery;
  } catch {
    payload = { ...heroPool };
  }
  const success = await window.heroConfig.save(payload);
  if (success) {
    showToast(t("toast.hero_saved"));
  } else {
    showToast(t("toast.copy_fail"));
  }
});

windowMinimizeBtn?.addEventListener("click", () => {
  window.appWindow?.minimize();
});

windowMaximizeBtn?.addEventListener("click", () => {
  window.appWindow?.toggleMaximize();
});

windowCloseBtn?.addEventListener("click", () => {
  window.appWindow?.close();
});

topbar?.addEventListener("dblclick", (event) => {
  if (event.target.closest(".no-drag")) return;
  window.appWindow?.toggleMaximize();
});

window.appWindow?.onMaximizeChange((isMaximized) => {
  if (!windowMaximizeBtn) return;
  windowMaximizeBtn.textContent = isMaximized ? "❐" : "▢";
});

window.appWindow?.isMaximized().then((isMaximized) => {
  if (!windowMaximizeBtn) return;
  windowMaximizeBtn.textContent = isMaximized ? "❐" : "▢";
});

const renderAuthRules = () => {
  if (!authRulesList) return;
  authRulesList.innerHTML = "";
  authRules.forEach((rule, idx) => {
    const row = document.createElement("div");
    row.className = "auth-rules-item";
    const key = document.createElement("div");
    key.className = "key";
    key.textContent = rule.key;
    const sel = document.createElement("select");
    ["hide", "disabled"].forEach((opt) => {
      const o = document.createElement("option");
      o.value = opt;
      o.textContent = opt;
      if (opt === rule.action) o.selected = true;
      sel.appendChild(o);
    });
    sel.addEventListener("change", () => {
      authRules[idx].action = sel.value;
      window.permissionExplorer?.broadcastRules(authRules);
    });
    const del = document.createElement("button");
    del.textContent = "移除";
    del.addEventListener("click", () => {
      authRules.splice(idx, 1);
      renderAuthRules();
    });
    row.appendChild(key);
    row.appendChild(sel);
    row.appendChild(del);
    authRulesList.appendChild(row);
  });
  window.permissionExplorer?.broadcastRules(authRules);
};

const ensureAuthOverlay = () => {
  if (!authHighlightEl) {
    authHighlightEl = document.createElement("div");
    authHighlightEl.className = "auth-highlight";
    document.body.appendChild(authHighlightEl);
  }
  if (!authLabelEl) {
    authLabelEl = document.createElement("div");
    authLabelEl.className = "auth-label";
    document.body.appendChild(authLabelEl);
  }
};

const hideAuthOverlay = () => {
  if (authHighlightEl) authHighlightEl.style.display = "none";
  if (authLabelEl) authLabelEl.style.display = "none";
};

const updateAuthOverlay = (el) => {
  if (!el || !authExplorerEnabled) {
    hideAuthOverlay();
    return;
  }
  const key = el.getAttribute("data-auth-key");
  if (!key) {
    hideAuthOverlay();
    return;
  }
  ensureAuthOverlay();
  const rect = el.getBoundingClientRect();
  authHighlightEl.style.display = "block";
  authHighlightEl.style.left = `${rect.left + window.scrollX}px`;
  authHighlightEl.style.top = `${rect.top + window.scrollY}px`;
  authHighlightEl.style.width = `${rect.width}px`;
  authHighlightEl.style.height = `${rect.height}px`;
  authLabelEl.style.display = "block";
  authLabelEl.textContent = key;
  authLabelEl.style.left = `${rect.left + window.scrollX + 6}px`;
  authLabelEl.style.top = `${rect.top + window.scrollY - 26}px`;
};

document.addEventListener("mousemove", (e) => {
  if (!authExplorerEnabled) return;
  const el = e.target.closest("[data-auth-key]");
  updateAuthOverlay(el);
});

document.addEventListener("click", (e) => {
  if (!authExplorerEnabled) return;
  const el = e.target.closest("[data-auth-key]");
  if (!el) return;
  const key = el.getAttribute("data-auth-key");
  if (!key) return;
  if (!authRules.find((r) => r.key === key)) {
    authRules.push({ key, action: "hide" });
    renderAuthRules();
    window.permissionExplorer?.broadcastRules(authRules);
  }
});

authExplorerToggle?.addEventListener("click", () => {
  if (!authDevUnlocked) {
    showToast(t("toast.auth_unlock_first"));
    return;
  }
  authExplorerEnabled = !authExplorerEnabled;
  showToast(authExplorerEnabled ? t("toast.auth_enabled") : t("toast.auth_disabled"));
  if (!authExplorerEnabled) hideAuthOverlay();
  if (authExplorerEnabled) {
    window.permissionExplorer?.open();
    window.permissionExplorer?.broadcastRules(authRules);
  }
});

authClearBtn?.addEventListener("click", () => {
  authRules = [];
  renderAuthRules();
  window.permissionExplorer?.broadcastRules(authRules);
});

authExportBtn?.addEventListener("click", async () => {
  const data = JSON.stringify(authRules, null, 2);
  try {
    await navigator.clipboard.writeText(data);
    showToast(t("toast.copy_success"));
  } catch {
    showToast(t("toast.copy_fail"));
  }
});

let aboutClickCount = 0;
aboutBrandUnlock?.addEventListener("click", () => {
  aboutClickCount += 1;
  if (aboutClickCount >= 10) {
    authDevUnlocked = true;
    const btn = Array.from(document.querySelectorAll(".settings-category")).find((b) => b.dataset.category === "auth");
    if (!btn) {
      const sidebar = document.querySelector(".settings-sidebar");
      const button = document.createElement("button");
      button.className = "settings-category";
      button.dataset.category = "auth";
      button.textContent = "权限配置";
      sidebar.appendChild(button);
      settingsCategories.push(button);
      button.addEventListener("click", () => showSettingsCategory("auth"));
    }
    showToast("开发模式：权限配置已解锁");
  }
});

// 头像点击事件
userAvatarContainer?.addEventListener("click", (e) => {
  e.stopPropagation();
  // 点击头像本身不触发连接，只有点击按钮才触发
});

avatarConnectBtn?.addEventListener("click", async (e) => {
  e.stopPropagation();
  try {
    renderStatus({ status: "connecting" });
    const status = await window.lcuApi.connect();
    renderStatus(status);
  } catch (error) {
    renderStatus({ status: "disconnected", lastError: { message: error.message, code: error.code } });
  }
});

avatarReconnectBtn?.addEventListener("click", async (e) => {
  e.stopPropagation();
  try {
    renderStatus({ status: "connecting" });
    const status = await window.lcuApi.reconnect();
    renderStatus(status);
  } catch (error) {
    renderStatus({ status: "disconnected", lastError: { message: error.message, code: error.code } });
  }
});

avatarDisconnectBtn?.addEventListener("click", async (e) => {
  e.stopPropagation();
  try {
    const status = await window.lcuApi.disconnect();
    renderStatus(status);
  } catch (error) {
    console.error("Failed to disconnect:", error);
  }
});

// 点击外部关闭弹窗
document.addEventListener("click", (e) => {
  if (!userAvatarContainer?.contains(e.target)) {
    // 可以在这里添加关闭弹窗的逻辑，如果需要的话
  }
});

window.lcuApi.onStatus(renderStatus);

loadModelCompanies().then(() => {
  if (!companySelect) return;
  loadSystemConfig().then(() => {
    const selectedOption = companySelect.options[companySelect.selectedIndex];
    const endpoint = selectedOption?.dataset?.endpoint || "";
    setEndpointForCompany({ endpoint });
    toggleEndpointVisibility(companySelect.value);
  });
});

loadHeroPool();
// 启动时主动发起连接，并显示蒙层，待连接完成后再进入正常状态
renderStatus({ status: "connecting" });
window.lcuApi
  .connect()
  .then(renderStatus)
  .catch((error) => {
    renderStatus({ status: "disconnected", lastError: { message: error?.message || "连接失败", code: error?.code } });
  });
