const sessionPre = document.getElementById("champ-session-json");
const loadingOverlay = document.getElementById("loading-overlay");
const promptPreview = document.getElementById("prompt-preview");
const aiGenerateBtn = document.getElementById("ai-generate-btn");
const aiResultPre = document.getElementById("ai-result");
const windowMinimizeBtn = document.getElementById("window-minimize");
const windowCloseBtn = document.getElementById("window-close");
const windowMaximizeBtn = document.getElementById("window-maximize");

let latestSession = null;
let championsMap = new Map();
let currentSummoner = null;
let heroPool = { top: [], jungle: [], mid: [], bottom: [], support: [] };
let modelCompanies = null;
let currentLanguage = "zh-CN";
let currentRankTierText = "";
let currentTheme = "dark";
let promptDirty = false;
let isPinned = false;
let heroMasteryMap = {};
let lastRenderedText = "";
let currentBans = null;
const queueIdToModeZh = {
  420: "单双排",
  440: "灵活排位",
  400: "匹配（征召）",
  430: "匹配（盲选）",
  450: "大乱斗",
  700: "Clash",
  490: "快速匹配",
  930: "自定义/训练模式",
  830: "人机（初级）",
  840: "人机（中级）",
  850: "人机（高级）"
};
const queueIdToModeEn = {
  420: "Ranked Solo",
  440: "Ranked Flex",
  400: "Normal Draft",
  430: "Normal Blind",
  450: "ARAM",
  700: "Clash",
  490: "Quickplay",
  930: "Practice Tool / Custom",
  830: "Co-op vs AI (Beginner)",
  840: "Co-op vs AI (Intermediate)",
  850: "Co-op vs AI (Advanced)"
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

const i18n = {
  "zh-CN": {
    lanes: { top: "上路", jungle: "打野", mid: "中单", bottom: "下路", support: "辅助" },
    unknownLane: "未知",
    unknownTier: "未知分段",
    unknownMode: "未知模式",
    labels: { allyBans: "我方禁用", enemyBans: "敌方禁用", none: "暂无" },
    tiers: {
      IRON: "黑铁",
      BRONZE: "青铜",
      SILVER: "白银",
      GOLD: "黄金",
      PLATINUM: "铂金",
      EMERALD: "翡翠",
      DIAMOND: "钻石",
      MASTER: "大师",
      GRANDMASTER: "宗师",
      CHALLENGER: "王者"
    }
  },
  "en-US": {
    lanes: { top: "Top", jungle: "Jungle", mid: "Mid", bottom: "ADC", support: "Support" },
    unknownLane: "Unknown",
    unknownTier: "Unknown Tier",
    unknownMode: "Unknown Mode",
    labels: { allyBans: "Our bans", enemyBans: "Enemy bans", none: "None" },
    tiers: {
      IRON: "Iron",
      BRONZE: "Bronze",
      SILVER: "Silver",
      GOLD: "Gold",
      PLATINUM: "Platinum",
      EMERALD: "Emerald",
      DIAMOND: "Diamond",
      MASTER: "Master",
      GRANDMASTER: "Grandmaster",
      CHALLENGER: "Challenger"
    }
  }
};

const renderJson = (obj) => {
  try {
    sessionPre.textContent = JSON.stringify(obj, null, 2);
  } catch (_) {
    sessionPre.textContent = String(obj);
  }
};

const loadLanguage = async () => {
  try {
    const cfg = await window.systemConfig.get();
    const lang = cfg?.app?.language || "zh-CN";
    currentLanguage = i18n[lang] ? lang : "zh-CN";
  } catch {
    currentLanguage = "zh-CN";
  }
};

const loadTheme = async () => {
  try {
    const cfg = await window.systemConfig.get();
    const theme = cfg?.app?.theme || "dark";
    currentTheme = theme;
    applyTheme(theme);
  } catch {
    currentTheme = "dark";
    applyTheme("dark");
  }
};

const formatRankTier = (stats) => {
  const dict = i18n[currentLanguage];
  const queues = Array.isArray(stats?.queues) ? stats.queues : [];
  const solo = queues.find((q) => q.queueType === "RANKED_SOLO_5x5" || q.queueType === "RANKED_SOLO");
  const any = solo || queues[0] || null;
  const tierKey = String(any?.tier || "").toUpperCase();
  const division = String(any?.division || "").toUpperCase();
  const tierName = dict?.tiers?.[tierKey] || dict?.unknownTier || "Unknown Tier";
  if (!any) return dict?.unknownTier || "Unknown Tier";
  const div = division || "";
  return div ? `${tierName} ${div}` : tierName;
};

const loadRankedStats = async () => {
  try {
    const stats = await window.lcuApi.getRankedStats();
    currentRankTierText = formatRankTier(stats);
  } catch {
    currentRankTierText = i18n[currentLanguage]?.unknownTier || "Unknown Tier";
  }
};

const loadModelCompanies = async () => {
  try {
    const url = new URL("../../config/model_company.json", window.location.href);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    modelCompanies = await response.json();
  } catch {}
};

const loadChampionsMap = async () => {
  try {
    const list = await window.lcuApi.getChampions();
    championsMap = new Map((Array.isArray(list) ? list : []).map((c) => [String(c.id), c.name || String(c.id)]));
  } catch {}
};

const loadSummoner = async () => {
  try {
    currentSummoner = await window.lcuApi.getCurrentSummoner();
  } catch {
    currentSummoner = null;
  }
};

const loadHeroPool = async () => {
  try {
    const saved = await window.heroConfig.get();
    if (saved && typeof saved === "object") {
      heroPool = {
        top: Array.isArray(saved.top) ? saved.top.map(String) : [],
        jungle: Array.isArray(saved.jungle) ? saved.jungle.map(String) : [],
        mid: Array.isArray(saved.mid) ? saved.mid.map(String) : [],
        bottom: Array.isArray(saved.bottom) ? saved.bottom.map(String) : [],
        support: Array.isArray(saved.support) ? saved.support.map(String) : []
      };
      heroMasteryMap = saved.mastery && typeof saved.mastery === "object" ? saved.mastery : {};
    }
  } catch {}
};

const laneKeyFromPosition = (pos) => {
  const p = String(pos || "").toLowerCase();
  if (p.includes("top")) return "top";
  if (p.includes("jungle")) return "jungle";
  if (p.includes("mid") || p.includes("middle")) return "mid";
  if (p.includes("bottom") || p.includes("bot") || p.includes("adc")) return "bottom";
  if (p.includes("support") || p.includes("utility")) return "support";
  return "";
};

const laneDisplayFromPosition = (pos) => {
  const key = laneKeyFromPosition(pos);
  const dict = i18n[currentLanguage];
  return (dict?.lanes?.[key]) || (dict?.unknownLane) || "未知";
};

const extractContextFromSession = (session) => {
  const ally = [];
  const enemy = [];
  let myLane = "";
  let queueId = 0;
  let allyBans = [];
  let enemyBans = [];
  try {
    const myTeam = Array.isArray(session?.myTeam) ? session.myTeam : [];
    const theirTeam = Array.isArray(session?.theirTeam) ? session.theirTeam : [];
    const bans = session?.bans || currentBans || {};
    const dict = i18n[currentLanguage];
    queueId = Number(session?.queueId || session?.gameData?.queue?.id || session?.queue?.id || 0) || 0;
    const mb = Array.isArray(bans?.myTeamBans) ? bans.myTeamBans : [];
    const eb = Array.isArray(bans?.theirTeamBans) ? bans.theirTeamBans : [];
    allyBans = mb.filter((id) => id && id !== -1).map((id) => championsMap.get(String(id)) || String(id));
    enemyBans = eb.filter((id) => id && id !== -1).map((id) => championsMap.get(String(id)) || String(id));
    myTeam.forEach((p) => {
      const id = String(p.championId || p.selectedChampionId || "");
      const lane = p.assignedPosition || p.selectedPosition || p.pickIntentedPosition || "";
      const laneText = laneDisplayFromPosition(lane);
      const name = championsMap.get(id) || id;
      if (id) ally.push(`${laneText}-${name}`);
      if (currentSummoner && (p.summonerId === currentSummoner.summonerId || p.puuid === currentSummoner.puuid)) {
        myLane = p.assignedPosition || p.selectedPosition || p.pickIntentedPosition || "";
      }
    });
    theirTeam.forEach((p) => {
      const id = String(p.championId || p.selectedChampionId || "");
      const lane = p.assignedPosition || p.selectedPosition || p.pickIntentedPosition || "";
      const laneText = laneDisplayFromPosition(lane);
      const name = championsMap.get(id) || id;
      if (id) enemy.push(`${laneText}-${name}`);
    });
  } catch {}
  const laneKey = laneKeyFromPosition(myLane);
  const laneDisplay = laneDisplayFromPosition(myLane);
  const pool = laneKey ? heroPool[laneKey] || [] : [];
  const poolNames = pool.map((id) => championsMap.get(String(id)) || String(id));
  const dict = i18n[currentLanguage];
  const qm = currentLanguage === "en-US" ? queueIdToModeEn : queueIdToModeZh;
  const gameMode = queueId && qm[queueId] ? qm[queueId] : (dict?.unknownMode || "未知模式");
  const allyBansText = (allyBans.length ? allyBans.join("、") : (dict?.labels?.none || "暂无"));
  const enemyBansText = (enemyBans.length ? enemyBans.join("、") : (dict?.labels?.none || "暂无"));
  const bannedCombined = `${dict?.labels?.allyBans || "我方禁用"}：${allyBansText}；${dict?.labels?.enemyBans || "敌方禁用"}：${enemyBansText}`;
  const poolMastery = pool.map((id) => {
    const m = heroMasteryMap[String(id)];
    const name = championsMap.get(String(id)) || String(id);
    if (m && (m.championLevel || m.championPoints)) {
      const lv = Number(m.championLevel || 0);
      const pts = Number(m.championPoints || 0);
      return `${name}(Lv${lv}, ${pts}分)`;
    }
    return name;
  }).join("、");
  return {
    allySelected: ally.join("、") || "暂无",
    enemySelected: enemy.join("、") || "暂无",
    rankTier: currentRankTierText || (i18n[currentLanguage]?.unknownTier) || "未知分段",
    gameLane: laneDisplay,
    heroPool: poolNames.join("、") || "暂无",
    heroPoolMastery: poolMastery || (poolNames.join("、") || "暂无"),
    gameMode,
    bannedHeroes: bannedCombined
  };
};

const renderPromptPreview = async () => {
  try {
    const cfg = await window.systemConfig.get();
    const template = cfg?.ai?.prompt || "";
    const ctx = extractContextFromSession(latestSession || {});
    const rendered = ["allySelected", "enemySelected", "rankTier", "gameLane", "heroPool", "heroPoolMastery", "gameMode", "bannedHeroes"].reduce((acc, key) => {
      return acc.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), ctx[key] || "");
    }, template);
    if (promptPreview) {
      const currentValue = String(promptPreview.value || "");
      const canAutoUpdate = (!promptDirty) || (currentValue === lastRenderedText);
      if (canAutoUpdate) {
        promptPreview.value = rendered;
        lastRenderedText = rendered;
        promptDirty = false;
      }
    }
    try {
      console.log("SystemPrompt:", rendered);
    } catch {}
    return promptPreview ? (promptPreview.value || rendered) : rendered;
  } catch {
    if (promptPreview) {
      if ((!promptDirty) || (String(promptPreview.value || "") === lastRenderedText)) {
        promptPreview.value = "";
        lastRenderedText = "";
        promptDirty = false;
      }
    }
    return "";
  }
};

const findDefaultModel = (companyId) => {
  try {
    const companies = Array.isArray(modelCompanies?.companies) ? modelCompanies.companies : [];
    const hit = companies.find((c) => c.id === companyId);
    return hit?.defaultModel || "";
  } catch {
    return "";
  }
};

const callAi = async (systemPrompt) => {
  aiResultPre.textContent = "请求中…";
  try {
    const cfg = await window.systemConfig.get();
    const companyId = cfg?.ai?.companyId || "";
    const tokensMap = cfg?.ai?.tokens && typeof cfg.ai.tokens === "object" ? cfg.ai.tokens : {};
    const endpointsMap = cfg?.ai?.endpoints && typeof cfg.ai.endpoints === "object" ? cfg.ai.endpoints : {};
    const fallbackCompany = Array.isArray(modelCompanies?.companies) ? modelCompanies.companies.find((c) => c.id === companyId) : null;
    const endpoint = endpointsMap[companyId] || fallbackCompany?.endpoint || "";
    const token = tokensMap[companyId] || "";
    const model = findDefaultModel(companyId) || "gpt-4";
    if (!endpoint) {
      aiResultPre.textContent = "未配置 API 地址";
      return;
    }
    const body = {
      model,
      messages: [{ role: "system", content: systemPrompt }]
    };
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      aiResultPre.textContent = `HTTP ${res.status}`;
      return;
    }
    const data = await res.json();
    const content =
      data?.choices?.[0]?.message?.content ||
      data?.output_text ||
      JSON.stringify(data, null, 2);
    aiResultPre.textContent = content || "无内容";
  } catch (error) {
    aiResultPre.textContent = `请求失败: ${error?.message || String(error)}`;
  }
};

window.lcuApi?.onChampSelectUpdate(async (session) => {
  try {
    console.log("ChampSelectSession:", JSON.stringify(session, null, 2));
  } catch (_) {
    console.log("ChampSelectSession:", session);
  }
  latestSession = session || {};
  try {
    const bans = await window.lcuApi.getBans();
    currentBans = bans || null;
  } catch {}
  renderJson(latestSession);
  renderPromptPreview();
});

window.lcuApi?.onGameflowPhase((phase) => {
  console.log("GameflowPhase:", phase);
});

window.lcuApi?.onStatus((status) => {
  if (!status) {
    loadingOverlay?.classList.remove("show");
    return;
  }
  if (status.status === "connecting") {
    loadingOverlay?.classList.add("show");
  } else {
    loadingOverlay?.classList.remove("show");
  }
});

promptPreview?.addEventListener("input", () => {
  promptDirty = true;
  const val = String(promptPreview.value || "");
  if (val === lastRenderedText) {
    promptDirty = false;
  }
});

aiGenerateBtn?.addEventListener("click", async () => {
  const currentText = (promptPreview && typeof promptPreview.value === "string") ? promptPreview.value.trim() : "";
  const prompt = currentText || await renderPromptPreview();
  if (prompt) {
    callAi(prompt);
  }
});

windowMinimizeBtn?.addEventListener("click", () => {
  window.appWindow?.minimize();
});

windowCloseBtn?.addEventListener("click", () => {
  window.appWindow?.close();
});

windowMaximizeBtn?.addEventListener("click", () => {
  window.appWindow?.toggleMaximize();
});

(async () => {
  await loadTheme();
  await loadLanguage();
  await loadModelCompanies();
  await loadSummoner();
  await loadChampionsMap();
  await loadHeroPool();
  await loadRankedStats();
  try {
    const pinned = await window.appWindow?.isAlwaysOnTop?.();
    isPinned = !!pinned;
  } catch {}
})();
