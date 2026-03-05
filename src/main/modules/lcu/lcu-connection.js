const EventEmitter = require("events");
const https = require("https");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { findLockfileWithCommandLine, runGetConfigScript, discoverCommandLineOnly, findLockfile, parseLockfile, saveCredentialsToCache } = require("./lockfile");

const createAxiosClient = (credentials) => {
  const httpsAgent = new https.Agent({ rejectUnauthorized: false });
  const auth = Buffer.from(`riot:${credentials.password}`).toString("base64");
  return axios.create({
    baseURL: `https://127.0.0.1:${credentials.port}`,
    httpsAgent,
    headers: {
      Authorization: `Basic ${auth}`
    }
  });
};

const normalizeError = (error) => {
  if (!error) {
    return { code: "UNKNOWN", message: "Unknown error" };
  }

  const code = error.code || "UNKNOWN";
  const message = error.message || "Unknown error";

  return { code, message };
};

class LcuConnection extends EventEmitter {
  constructor(options = {}) {
    super();
    this.status = "disconnected";
    this.lastError = null;
    this.lockfilePath = options.lockfilePath || null;
    this.installRoot = options.installRoot || null;
    this.pollIntervalMs = options.pollIntervalMs || 3000;
    this.client = null;
    this.credentials = null;
    this.monitorTimer = null;
    this.ddVersion = null;
  }

  getStatus() {
    return {
      status: this.status,
      lastError: this.lastError,
      lockfilePath: this.lockfilePath,
      installRoot: this.installRoot,
      port: this.credentials ? this.credentials.port : null
    };
  }

  setLockfilePath(path) {
    this.lockfilePath = path || null;
  }

  setInstallRoot(path) {
    this.installRoot = path || null;
  }

  async discover() {
    return await findLockfileWithCommandLine({ installRoot: this.installRoot });
  }

  async connect() {
    console.log("[LCU] ========== Starting Connection ==========");
    if (this.status === "connecting") {
      console.log("[LCU] Already connecting, skipping");
      return this.getStatus();
    }

    this.lastError = null;
    this.status = "connecting";
    this.emit("status", this.getStatus());

    try {
      console.log("[LCU] Step 1: Discovering client...");
      const discovery = await this.discover();
      console.log("[LCU] Discovery result:", JSON.stringify(discovery, null, 2));
      
      const cmdCreds = Array.isArray(discovery.commandLineCredentials)
        ? discovery.commandLineCredentials
        : [];
      
      console.log("[LCU] Found", cmdCreds.length, "credential(s)");
      
      if (cmdCreds.length === 0) {
        console.error("[LCU] ✗ No credentials found");
        if (discovery.error === "PROCESS_NOT_RUNNING") {
          const error = new Error("League client is not running. Please start the League client first.");
          error.code = "PROCESS_NOT_RUNNING";
          throw error;
        }
        const error = new Error("CREDENTIALS_NOT_FOUND");
        error.code = "CREDENTIALS_NOT_FOUND";
        throw error;
      }
      
      const credentials = cmdCreds[0];
      console.log("[LCU] Step 2: Creating client with credentials");
      console.log("[LCU] Port:", credentials.port);
      console.log("[LCU] Token:", credentials.password ? credentials.password.substring(0, 10) + "..." : "none");
      
      this.credentials = credentials;
      this.lockfilePath = null;
      this.client = createAxiosClient(credentials);
      console.log("[LCU] Client created, baseURL:", this.client.defaults.baseURL);

      console.log("[LCU] Step 3: Testing connection (ping)...");
      try {
        await this.ping();
        console.log("[LCU] ✓ Ping successful");
        try { saveCredentialsToCache(this.credentials); } catch (_) {}
      } catch (error) {
        console.log("[LCU] ✗ Ping failed, attempting to refresh credentials via get_confg.ps1");
        const ps = await runGetConfigScript();
        if (ps && ps.credentials && ps.credentials.length > 0) {
          this.credentials = ps.credentials[0];
          this.client = createAxiosClient(this.credentials);
          console.log("[LCU] Retrying ping with refreshed credentials (port:", this.credentials.port, ")");
          await this.ping();
          console.log("[LCU] ✓ Ping successful after refresh");
          try { saveCredentialsToCache(this.credentials); } catch (_) {}
        } else {
          console.log("[LCU] Script refresh failed or not permitted, attempting command line auto-discovery");
          const d = await discoverCommandLineOnly();
          const creds = Array.isArray(d.commandLineCredentials) ? d.commandLineCredentials : [];
          if (creds.length > 0) {
            this.credentials = creds[0];
            this.client = createAxiosClient(this.credentials);
            console.log("[LCU] Retrying ping with auto-discovered credentials (port:", this.credentials.port, ")");
            await this.ping();
            console.log("[LCU] ✓ Ping successful after auto-discovery");
            try { saveCredentialsToCache(this.credentials); } catch (_) {}
          } else {
            console.log("[LCU] Auto-discovery failed, attempting lockfile scan");
            const lf = await findLockfile({ installRoot: this.installRoot });
            if (lf && lf.lockfilePath) {
              const parsed = parseLockfile(lf.lockfilePath);
              this.credentials = {
                port: parsed.port,
                password: parsed.password,
                protocol: parsed.protocol || "https",
                source: "lockfile"
              };
              this.client = createAxiosClient(this.credentials);
              console.log("[LCU] Retrying ping with lockfile credentials (port:", this.credentials.port, ")");
              await this.ping();
              console.log("[LCU] ✓ Ping successful after lockfile scan");
              try { saveCredentialsToCache(this.credentials); } catch (_) {}
            } else {
              const err = new Error(error.message || "CREDENTIALS_STALE");
              err.code = (ps && ps.error) ? ps.error : (d.error || error.code || "CREDENTIALS_STALE");
              throw err;
            }
          }
        }
      }

      this.status = "connected";
      console.log("[LCU] ========== Connection Successful ==========");
      this.emit("status", this.getStatus());
      this.startMonitor();

      return this.getStatus();
    } catch (error) {
      console.error("[LCU] ========== Connection Failed ==========");
      console.error("[LCU] Error code:", error.code);
      console.error("[LCU] Error message:", error.message);
      if (error.response) {
        console.error("[LCU] HTTP status:", error.response.status);
        console.error("[LCU] HTTP data:", error.response.data);
      }
      if (error.config) {
        console.error("[LCU] Request URL:", error.config.url);
        console.error("[LCU] Request method:", error.config.method);
      }
      console.error("[LCU] Full error:", error);
      
      this.status = "disconnected";
      this.lastError = normalizeError(error);
      this.emit("status", this.getStatus());
      throw error;
    }
  }

  async disconnect() {
    this.stopMonitor();
    this.client = null;
    this.credentials = null;
    this.status = "disconnected";
    this.emit("status", this.getStatus());
    return this.getStatus();
  }

  async reconnect() {
    await this.disconnect();
    return this.connect();
  }

  async ping() {
    if (!this.client) {
      console.error("[LCU] Ping failed: Client not initialized");
      const error = new Error("CLIENT_NOT_INITIALIZED");
      error.code = "CLIENT_NOT_INITIALIZED";
      throw error;
    }

    try {
      await this.client.get("/lol-summoner/v1/current-summoner");
    } catch (error) {
      if (error.response && error.response.status === 404) {
        console.log("[LCU] Summoner API returned 404, trying gameflow API");
        try {
          await this.client.get("/lol-gameflow/v1/gameflow-phase");
          console.log("[LCU] ✓ Gameflow API responded successfully");
        } catch (gameflowError) {
          console.error("[LCU] ✗ Gameflow API also failed:", gameflowError.message);
          throw gameflowError;
        }
      } else {
        console.error("[LCU] ✗ Ping failed");
        console.error("[LCU] Error code:", error.code);
        console.error("[LCU] Error message:", error.message);
        if (error.code === "ECONNREFUSED") {
          console.error("[LCU] Connection refused - Port may be incorrect or client not running");
        } else if (error.code === "ETIMEDOUT") {
          console.error("[LCU] Connection timeout - Client may not be responding");
        } else if (error.code === "CERT_HAS_EXPIRED" || error.code === "UNABLE_TO_VERIFY_LEAF_SIGNATURE") {
          console.error("[LCU] Certificate error - but should be ignored");
        }
        throw error;
      }
    }
    return true;
  }

  startMonitor() {
    if (this.monitorTimer) {
      return;
    }

    this.monitorTimer = setInterval(async () => {
      if (this.status === "connected") {
        try {
          await this.ping();
        } catch (error) {
          this.status = "disconnected";
          this.lastError = normalizeError(error);
          this.emit("status", this.getStatus());
        }
      }
    }, this.pollIntervalMs);
  }

  stopMonitor() {
    if (this.monitorTimer) {
      clearInterval(this.monitorTimer);
      this.monitorTimer = null;
    }
  }

  async getCurrentSummoner() {
    if (!this.client || this.status !== "connected") {
      return null;
    }

    try {
      const response = await this.client.get("/lol-summoner/v1/current-summoner");
      return response.data;
    } catch (error) {
      console.error("[LCU] Failed to get current summoner:", error.message);
      if (error.response) {
        console.error("[LCU] Response status:", error.response.status);
        console.error("[LCU] Response data:", error.response.data);
      }
      return null;
    }
  }

  async getProfileIcon(profileIconId) {
    if (!this.client || !this.credentials || !this.credentials.port || !profileIconId) {
      return null;
    }

    try {
      // 尝试通过 LCU API 获取头像
      console.log(`[LCU] Requesting profile icon: /lol-game-data/assets/v1/profile-icons/${profileIconId}.jpg`);
      const response = await this.client.get(`/lol-game-data/assets/v1/profile-icons/${profileIconId}.jpg`, {
        responseType: 'arraybuffer'
      });
      
      // 将二进制数据转换为 base64 data URL
      const base64 = Buffer.from(response.data).toString('base64');
      const mimeType = response.headers['content-type'] || 'image/jpeg';
      return `data:${mimeType};base64,${base64}`;
    } catch (error) {
      console.error(`[LCU] Failed to get profile icon ${profileIconId}:`, error.message);
      if (error.response) {
        console.error("[LCU] Response status:", error.response.status);
      }
      return null;
    }
  }

  async getChampionIconByProfileIconId(profileIconId) {
    return await this.getChampionIcon(this.getProfileIconUrl(profileIconId));
  }

  async getChampionIcon(squarePortraitPath) {
    if (!this.client || !this.credentials || !this.credentials.port || !squarePortraitPath) {
      return null;
    }

    try {
      const response = await this.client.get(squarePortraitPath, {
        responseType: "arraybuffer"
      });
      const base64 = Buffer.from(response.data).toString("base64");
      const mimeType = response.headers["content-type"] || "image/png";
      return `data:${mimeType};base64,${base64}`;
    } catch (error) {
      console.error(`[LCU] Failed to get champion icon ${squarePortraitPath}:`, error.message);
      if (error.response) {
        console.error("[LCU] Response status:", error.response.status);
      }
      return null;
    }
  }

  getProfileIconUrl(profileIconId) {
    if (!this.credentials || !this.credentials.port || !profileIconId) {
      return null;
    }
    // 返回本地文件服务 URL（用于 img 标签，但需要处理证书问题）
    return `/lol-game-data/assets/v1/profile-icons/${profileIconId}.jpg`;
  }

  async getChampions() {
    if (!this.client || this.status !== "connected") {
      return [];
    }

    try {
      const response = await this.client.get("/lol-champ-select/v1/all-grid-champions");
      const list = Array.isArray(response.data) ? response.data : [];
      const port = this.credentials?.port;
      return list
        .filter((champion) => !champion.disabled)
        .map((champion) => {
          const path = champion.squarePortraitPath || "";
          const iconUrl = port && path ? `https://127.0.0.1:${port}${path}` : "";
          return {
            id: String(champion.id),
            name: champion.name,
            squarePortraitPath: path,
            iconUrl
          };
        })
        .sort((a, b) => a.name.localeCompare(b.name, "zh-Hans-CN"));
    } catch (error) {
      return [];
    }
  }

  async getChampionMastery() {
    if (!this.client || this.status !== "connected") {
      return [];
    }

    try {
      const response = await this.client.get("/lol-champion-mastery/v1/local-player/champion-mastery");
      const list = Array.isArray(response.data) ? response.data : [];
      const gradeWeights = {
        "S+": 6,
        "S": 5,
        "S-": 4,
        "A+": 3,
        "A": 2,
        "A-": 1,
        "B+": 0.5,
        "B": 0.25
      };
      const now = Date.now();
      return list
        .map((item) => {
          const levelScore = Number(item.championLevel || 0) * 100000;
          const pointsScore = Number(item.championPoints || 0);
          const tokensScore = Number(item.tokensEarned || 0) * 5000;
          const milestoneScore = Number(item.championSeasonMilestone || 0) * 3000;
          const gradeScore = (gradeWeights[item.highestGrade] || 0) * 10000;
          const milestoneGradesScore = Array.isArray(item.milestoneGrades) ? item.milestoneGrades.length * 1000 : 0;
          const lastPlay = Number(item.lastPlayTime || 0);
          const daysAgo = lastPlay ? Math.max(0, (now - lastPlay) / 86400000) : 999;
          const recencyScore = Math.max(0, 30 - daysAgo) * 500;
          const score =
            levelScore +
            pointsScore +
            tokensScore +
            milestoneScore +
            gradeScore +
            milestoneGradesScore +
            recencyScore;
          return {
            ...item,
            score
          };
        })
        .sort((a, b) => b.score - a.score);
    } catch (error) {
      return [];
    }
  }

  async getOwnedChampions() {
    if (!this.client || this.status !== "connected") {
      return [];
    }

    try {
      const response = await this.client.get("/lol-champions/v1/owned-champions-minimal");
      const list = Array.isArray(response.data) ? response.data : [];
      return list
        .filter((champion) => champion?.ownership?.owned)
        .map((champion) => ({
          id: String(champion.id),
          name: champion.name,
          squarePortraitPath: champion.squarePortraitPath || ""
        }));
    } catch (error) {
      return [];
    }
  }

  async getGameflowPhase() {
    if (!this.client || this.status !== "connected") {
      return null;
    }
    try {
      const response = await this.client.get("/lol-gameflow/v1/gameflow-phase");
      return response.data || null;
    } catch (error) {
      return null;
    }
  }

  async getChampSelectSession() {
    if (!this.client || this.status !== "connected") {
      return null;
    }
    try {
      const response = await this.client.get("/lol-champ-select/v1/session");
      return response.data || null;
    } catch (error) {
      return null;
    }
  }

  async getBans() {
    if (!this.client || this.status !== "connected") {
      return null;
    }
    try {
      const response = await this.client.get("/lol-champ-select/v1/bans");
      return response.data || null;
    } catch (error) {
      return null;
    }
  }

  async getLatestDdragonVersion() {
    try {
      const response = await axios.get("https://ddragon.leagueoflegends.com/api/versions.json");
      const versions = Array.isArray(response.data) ? response.data : [];
      const latest = versions[0] || null;
      this.ddVersion = latest;
      return latest;
    } catch (error) {
      return this.ddVersion || null;
    }
  }

  async getProfileIconCdn(profileIconId) {
    if (profileIconId === undefined || profileIconId === null) return null;
    const version = (await this.getLatestDdragonVersion()) || "16.2.1";
    const url = `https://ddragon.leagueoflegends.com/cdn/${version}/img/profileicon/${profileIconId}.png`;
    return url;
  }

  async getRankedStats() {
    if (!this.client || this.status !== "connected") {
      return null;
    }
    try {
      const response = await this.client.get("/lol-ranked/v1/current-ranked-stats");
      return response.data || null;
    } catch (error) {
      try {
        const response = await this.client.get("/lol-ranked/v1/ranked-stats");
        return response.data || null;
      } catch (_) {
        return null;
      }
    }
  }
}

module.exports = { LcuConnection };
