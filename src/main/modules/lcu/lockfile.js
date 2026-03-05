const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");
const { promisify } = require("util");
const { app } = require("electron");

const execFileAsync = promisify(execFile);

const saveCredentialsToCache = (credentials) => {
  try {
    if (!credentials || !credentials.port || !credentials.password) {
      return false;
    }
    const userDir = path.join(app.getPath("userData"), "config");
    fs.mkdirSync(userDir, { recursive: true });
    const cachePath = path.join(userDir, "lcu.json");
    const data = {
      MainClient: {
        Port: String(credentials.port),
        Token: credentials.password,
        Url: `https://127.0.0.1:${credentials.port}`
      }
    };
    if (credentials.riotClient && credentials.riotClient.port && credentials.riotClient.token) {
      data.RiotClient = {
        Port: String(credentials.riotClient.port),
        Token: credentials.riotClient.token,
        Url: `https://127.0.0.1:${credentials.riotClient.port}`
      };
    }
    fs.writeFileSync(cachePath, JSON.stringify(data, null, 2), "utf8");
    return true;
  } catch (_) {
    return false;
  }
};

const loadCredentialsFromConfig = (config) => {
  try {
    if (config.MainClient && config.MainClient.Port && config.MainClient.Token) {
      const credentials = [{
        port: Number(config.MainClient.Port),
        password: config.MainClient.Token,
        protocol: "https",
        source: "config-file",
        riotClient: config.RiotClient ? {
          port: Number(config.RiotClient.Port),
          token: config.RiotClient.Token,
          url: config.RiotClient.Url
        } : null
      }];
      return credentials;
    }
  } catch (_) {}
  return null;
};

const runGetConfigScript = async () => {
  try {
    const scriptPath = path.join(process.cwd(), "get_confg.ps1");
    if (!fs.existsSync(scriptPath)) {
      return { credentials: null, error: "SCRIPT_NOT_FOUND" };
    }
    const { stdout, stderr } = await execFileAsync("powershell", [
      "-NoProfile",
      "-ExecutionPolicy", "Bypass",
      "-File", scriptPath
    ], {
      encoding: "utf8",
      maxBuffer: 10 * 1024 * 1024
    });
    const raw = (stdout || "").trim();
    if (stderr && stderr.trim()) {
      console.error("[LCU] get_confg.ps1 stderr:", stderr);
      if (/Access is denied|Administrator|权限不足|需要管理员/i.test(stderr)) {
        return { credentials: null, error: "ADMIN_REQUIRED" };
      }
    }
    if (!raw) {
      return { credentials: null, error: "EMPTY_OUTPUT" };
    }
    if (!raw.startsWith("{")) {
      if (/未运行|无法获取/i.test(raw)) {
        return { credentials: null, error: "PROCESS_NOT_RUNNING" };
      }
      if (/Access is denied|Administrator|权限不足|需要管理员/i.test(raw)) {
        return { credentials: null, error: "ADMIN_REQUIRED" };
      }
      return { credentials: null, error: "NOT_JSON" };
    }
    const config = JSON.parse(raw);
    const creds = loadCredentialsFromConfig(config);
    if (creds && creds.length > 0) {
      try {
        const userDir = path.join(app.getPath("userData"), "config");
        fs.mkdirSync(userDir, { recursive: true });
        const cachePath = path.join(userDir, "lcu.json");
        fs.writeFileSync(cachePath, JSON.stringify(config, null, 2), "utf8");
        console.log("[LCU] Cached credentials to:", cachePath);
      } catch (e) {
        console.error("[LCU] Cache write failed:", e.message);
      }
      return { credentials: creds, error: null };
    }
    return { credentials: null, error: "INVALID_CONFIG" };
  } catch (error) {
    console.error("[LCU] get_confg.ps1 execution failed:", error.message);
    if (/Access is denied|Administrator|权限不足|需要管理员/i.test(error.message || "")) {
      return { credentials: null, error: "ADMIN_REQUIRED" };
    }
    return { credentials: null, error: "SCRIPT_EXEC_FAILED" };
  }
};

const appendCandidatesFromRoot = (candidates, root) => {
  if (!root) {
    return;
  }

  const normalizedRoot = path.normalize(root);
  const lowerRoot = normalizedRoot.toLowerCase();

  if (lowerRoot.endsWith("league of legends")) {
    candidates.push(path.join(normalizedRoot, "lockfile"));
    candidates.push(path.join(normalizedRoot, "Game", "lockfile"));
  } else {
    candidates.push(path.join(normalizedRoot, "lockfile"));
    candidates.push(path.join(normalizedRoot, "League of Legends", "lockfile"));
    candidates.push(path.join(normalizedRoot, "英雄联盟", "lockfile"));
    candidates.push(path.join(normalizedRoot, "Games", "英雄联盟", "lockfile"));
    candidates.push(path.join(normalizedRoot, "WeGameApps", "英雄联盟", "lockfile"));
    candidates.push(path.join(normalizedRoot, "英雄联盟", "Game", "lockfile"));
    candidates.push(path.join(normalizedRoot, "Game", "lockfile"));
  }
};

const appendCandidatesFromExecutable = (candidates, executablePath) => {
  if (!executablePath) {
    return;
  }

  const dir = path.dirname(executablePath);
  candidates.push(path.join(dir, "lockfile"));
  appendCandidatesFromRoot(candidates, dir);
  appendCandidatesFromRoot(candidates, path.dirname(dir));
};

const appendCandidatesFromChildren = (candidates, root) => {
  if (!root || !fs.existsSync(root)) {
    return;
  }

  let entries = [];
  try {
    entries = fs.readdirSync(root, { withFileTypes: true });
  } catch (error) {
    return;
  }

  entries
    .filter((entry) => entry.isDirectory())
    .slice(0, 20)
    .forEach((entry) => {
      const childRoot = path.join(root, entry.name);
      appendCandidatesFromRoot(candidates, childRoot);
    });
};

const getRunningClientPaths = async () => {
  try {
    const { stdout } = await execFileAsync("powershell", [
      "-NoProfile",
      "-Command",
      "Get-Process LeagueClientUx,LeagueClientUxRender,LeagueClient -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Path"
    ]);
    return stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  } catch (error) {
    return [];
  }
};

const getRunningClientPids = async () => {
  try {
    const { stdout } = await execFileAsync("powershell", [
      "-NoProfile",
      "-Command",
      "Get-Process LeagueClientUx,LeagueClientUxRender,LeagueClient -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Id"
    ]);
    return stdout
      .split(/\r?\n/)
      .map((line) => Number(line.trim()))
      .filter((pid) => Number.isFinite(pid) && pid > 0);
  } catch (error) {
    return [];
  }
};

const getListeningPorts = async (pids) => {
  if (!pids || pids.length === 0) {
    return [];
  }

  const pidList = pids.join(",");
  try {
    const { stdout } = await execFileAsync("powershell", [
      "-NoProfile",
      "-Command",
      `$pids = @(${pidList}); $ports = @(); foreach ($pid in $pids) { $ports += Get-NetTCPConnection -OwningProcess $pid -State Listen -ErrorAction SilentlyContinue | Where-Object { $_.LocalAddress -eq '127.0.0.1' } | Select-Object -ExpandProperty LocalPort }; $ports | Sort-Object -Unique`
    ]);
    return stdout
      .split(/\r?\n/)
      .map((line) => Number(line.trim()))
      .filter((port) => Number.isFinite(port) && port > 0);
  } catch (error) {
    return [];
  }
};

const buildCandidatePaths = (options = {}) => {
  const candidates = [];
  const envPath = process.env.LOL_LOCKFILE_PATH || process.env.LEAGUE_LOCKFILE_PATH;
  if (envPath) {
    candidates.push(envPath);
  }

  const programFiles = process.env.ProgramFiles;
  const programFilesX86 = process.env["ProgramFiles(x86)"];
  const localAppData = process.env.LOCALAPPDATA;

  const roots = [
    "C:\\Riot Games\\League of Legends",
    programFiles ? path.join(programFiles, "Riot Games", "League of Legends") : null,
    programFilesX86 ? path.join(programFilesX86, "Riot Games", "League of Legends") : null,
    localAppData ? path.join(localAppData, "Riot Games", "League of Legends") : null
  ].filter(Boolean);

  roots.forEach((root) => {
    candidates.push(path.join(root, "lockfile"));
  });

  appendCandidatesFromRoot(candidates, options.installRoot);
  appendCandidatesFromChildren(candidates, options.installRoot);

  return Array.from(new Set(candidates));
};

const findLockfile = async (options = {}) => {
  const candidates = buildCandidatePaths(options);
  const processPaths = await getRunningClientPaths();
  const processPids = await getRunningClientPids();
  const portCandidates = await getListeningPorts(processPids);

  processPaths.forEach((processPath) => {
    appendCandidatesFromExecutable(candidates, processPath);
  });

  const existing = [];
  const empty = [];

  Array.from(new Set(candidates)).forEach((candidate) => {
    if (!fs.existsSync(candidate)) {
      return;
    }

    const stat = fs.statSync(candidate);
    if (stat.size === 0) {
      empty.push(candidate);
      return;
    }

    existing.push(candidate);
  });

  if (existing.length === 0) {
    return {
      lockfilePath: null,
      candidates,
      existing,
      empty,
      processPaths,
      processPids,
      portCandidates
    };
  }

  let lockfilePath = null;

  if (existing.length === 1) {
    lockfilePath = existing[0];
  } else {
    const sortedByMtime = existing
      .map((candidate) => ({ candidate, mtime: fs.statSync(candidate).mtimeMs }))
      .sort((a, b) => b.mtime - a.mtime);
    lockfilePath = sortedByMtime[0].candidate;
  }

  return {
    lockfilePath,
    candidates,
    existing,
    empty,
    processPaths,
    processPids,
    portCandidates
  };
};

const parseLockfile = (lockfilePath) => {
  const content = fs.readFileSync(lockfilePath, "utf8").trim();
  if (!content) {
    const error = new Error("LOCKFILE_EMPTY");
    error.code = "LOCKFILE_EMPTY";
    throw error;
  }
  const [name, pid, port, password, protocol] = content.split(":");

  if (!name || !pid || !port || !password || !protocol) {
    const error = new Error("LOCKFILE_INVALID");
    error.code = "LOCKFILE_INVALID";
    throw error;
  }

  return {
    name,
    pid: Number(pid),
    port: Number(port),
    password,
    protocol
  };
};

const getCommandLinesFromWmiQuery = async () => {
  try {
    // 直接使用用户提供的 PowerShell 脚本格式
    console.log("[LCU] Querying LeagueClientUx.exe process via WMI Query (using user's script format)...");
    
    // 尝试多种输出方式，确保能获取到 CommandLine
    // 方法1: 使用 Write-Output
    let psCommand = `$query = "SELECT CommandLine FROM Win32_Process WHERE Name = 'LeagueClientUx.exe'"; $result = Get-WmiObject -Query $query; if ($result.CommandLine) { $result.CommandLine } else { '' }`;
    
    console.log("[LCU] Trying method 1: Direct output...");
    let { stdout, stderr } = await execFileAsync("powershell", [
      "-NoProfile",
      "-Command",
      psCommand
    ], {
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024
    });
    
    let raw = stdout.trim();
    console.log("[LCU] Method 1 result length:", raw.length);
    
    // 如果方法1失败，尝试方法2: 使用 Out-String
    if (!raw || raw.length < 10) {
      console.log("[LCU] Method 1 failed, trying method 2: Out-String...");
      psCommand = `$query = "SELECT CommandLine FROM Win32_Process WHERE Name = 'LeagueClientUx.exe'"; $result = Get-WmiObject -Query $query; if ($result.CommandLine) { $result.CommandLine | Out-String -NoNewline } else { '' }`;
      const result2 = await execFileAsync("powershell", [
        "-NoProfile",
        "-Command",
        psCommand
      ], {
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024
      });
      stdout = result2.stdout;
      stderr = result2.stderr;
      raw = stdout.trim();
      console.log("[LCU] Method 2 result length:", raw.length);
    }
    
    // 如果方法2也失败，尝试方法3: 使用 ConvertTo-Json 然后解析
    if (!raw || raw.length < 10) {
      console.log("[LCU] Method 2 failed, trying method 3: ConvertTo-Json...");
      psCommand = `$query = "SELECT CommandLine FROM Win32_Process WHERE Name = 'LeagueClientUx.exe'"; $result = Get-WmiObject -Query $query; if ($result.CommandLine) { @{CommandLine=$result.CommandLine} | ConvertTo-Json -Compress } else { '{}' }`;
      const result3 = await execFileAsync("powershell", [
        "-NoProfile",
        "-Command",
        psCommand
      ], {
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024
      });
      stdout = result3.stdout;
      stderr = result3.stderr;
      raw = stdout.trim();
      console.log("[LCU] Method 3 result:", raw.substring(0, 200));
      
      if (raw && raw !== '{}') {
        try {
          const parsed = JSON.parse(raw);
          if (parsed.CommandLine) {
            raw = parsed.CommandLine;
            console.log("[LCU] Method 3 extracted CommandLine, length:", raw.length);
          }
        } catch (e) {
          console.error("[LCU] Method 3 JSON parse failed:", e.message);
        }
      }
    }
    
    if (stderr && stderr.trim()) {
      console.error("[LCU] PowerShell stderr:", stderr);
    }
    
    console.log("[LCU] Final raw output (first 500 chars):", raw ? (raw.length > 500 ? raw.substring(0, 500) + "..." : raw) : "(empty)");
    
    if (!raw || raw.length < 10) {
      console.log("[LCU] No command line parameters found (empty or too short output)");
      
      // 尝试调试：检查 $result 对象本身
      try {
        const debugCmd = `$query = "SELECT CommandLine FROM Win32_Process WHERE Name = 'LeagueClientUx.exe'"; $result = Get-WmiObject -Query $query; Write-Output "Result type: $($result.GetType().Name)"; Write-Output "Result is null: $($result -eq $null)"; if ($result) { Write-Output "Has CommandLine property: $($result.PSObject.Properties.Name -contains 'CommandLine')"; if ($result.CommandLine) { Write-Output "CommandLine is not null, length: $($result.CommandLine.Length)"; Write-Output "CommandLine preview: $($result.CommandLine.Substring(0, [Math]::Min(100, $result.CommandLine.Length)))"; } else { Write-Output "CommandLine is null or empty"; } }`;
        const { stdout: debugStdout } = await execFileAsync("powershell", [
          "-NoProfile",
          "-Command",
          debugCmd
        ], {
          encoding: 'utf8',
          maxBuffer: 10 * 1024 * 1024
        });
        console.log("[LCU] Debug output:", debugStdout);
      } catch (debugError) {
        console.error("[LCU] Debug command failed:", debugError.message);
      }
      
      return [];
    }
    
    // 处理单行或多行输出
    const lines = raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    
    console.log("[LCU] Parsed", lines.length, "command line(s)");
    if (lines.length > 0) {
      console.log("[LCU] First line preview:", lines[0].substring(0, 200));
    }
    return lines;
  } catch (error) {
    console.error("[LCU] WMI Query error:", error.message);
    console.error("[LCU] Error stack:", error.stack);
    if (error.stderr) {
      console.error("[LCU] WMI Query stderr:", error.stderr);
    }
    if (error.stdout) {
      console.error("[LCU] WMI Query stdout:", error.stdout.substring(0, 500));
    }
    return [];
  }
};

const getCommandLinesFromWmiObject = async () => {
  try {
    console.log("[LCU] Trying WMI Object method...");
    const { stdout, stderr } = await execFileAsync("powershell", [
      "-NoProfile",
      "-Command",
      "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; Get-WmiObject Win32_Process -Filter \"name='LeagueClientUx.exe'\" | Select-Object -ExpandProperty CommandLine"
    ], {
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024
    });
    
    if (stderr && stderr.trim()) {
      console.error("[LCU] WMI Object stderr:", stderr);
    }
    
    const lines = stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    
    console.log("[LCU] WMI Object found", lines.length, "line(s)");
    return lines;
  } catch (error) {
    console.error("[LCU] WMI Object error:", error.message);
    return [];
  }
};

const getCommandLinesFromCim = async () => {
  try {
    console.log("[LCU] Trying CIM method...");
    const { stdout, stderr } = await execFileAsync("powershell", [
      "-NoProfile",
      "-Command",
      "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; $lines = Get-CimInstance Win32_Process -Filter \"Name='LeagueClientUx.exe'\" | Select-Object -ExpandProperty CommandLine; if ($lines) { $lines | ConvertTo-Json -Compress } else { '[]' }"
    ], {
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024
    });
    
    if (stderr && stderr.trim()) {
      console.error("[LCU] CIM stderr:", stderr);
    }
    
    const raw = stdout.trim();
    console.log("[LCU] CIM raw output:", raw ? (raw.length > 200 ? raw.substring(0, 200) + "..." : raw) : "(empty)");
    
    if (!raw || raw === '[]') {
      return [];
    }
    
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const lines = parsed.map((line) => String(line || "").trim()).filter((line) => line.length > 0);
      console.log("[LCU] CIM found", lines.length, "line(s)");
      return lines;
    }
    const lines = String(parsed || "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    console.log("[LCU] CIM found", lines.length, "line(s)");
    return lines;
  } catch (error) {
    console.error("[LCU] CIM error:", error.message);
    if (error.stdout) {
      console.error("[LCU] CIM stdout:", error.stdout.substring(0, 500));
    }
    return [];
  }
};

// WMIC is deprecated in Windows 11, skip this method
const getCommandLinesFromWmic = async () => {
  console.log("[LCU] WMIC is deprecated, skipping...");
  return [];
};

const checkProcessExists = async () => {
  try {
    const { stdout } = await execFileAsync("powershell", [
      "-NoProfile",
      "-Command",
      "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; Get-Process LeagueClientUx -ErrorAction SilentlyContinue | Select-Object -First 1 | Select-Object -ExpandProperty Id"
    ], {
      encoding: 'utf8'
    });
    const pid = stdout.trim();
    if (pid && !isNaN(Number(pid))) {
      console.log("[LCU] LeagueClientUx.exe is running, PID:", pid);
      return true;
    }
    console.log("[LCU] LeagueClientUx.exe is NOT running");
    return false;
  } catch (error) {
    console.log("[LCU] LeagueClientUx.exe is NOT running (check failed)");
    return false;
  }
};

const getRunningClientCommandLines = async () => {
  console.log("[LCU] Starting to get client command line parameters...");
  
  // 先检查进程是否存在
  const processExists = await checkProcessExists();
  if (!processExists) {
    console.error("[LCU] LeagueClientUx.exe is not running. Please start the League client first.");
    return { lines: [], source: "none", error: "PROCESS_NOT_RUNNING" };
  }
  
  // 优先使用 WMI Query（与用户提供的 PowerShell 代码一致）
  const wmiQueryLines = await getCommandLinesFromWmiQuery();
  if (wmiQueryLines.length > 0) {
    console.log("[LCU] Successfully got command line via WMI Query method");
    return { lines: wmiQueryLines, source: "wmi-query" };
  }

  console.log("[LCU] WMI Query failed, trying CIM method...");
  const cimLines = await getCommandLinesFromCim();
  if (cimLines.length > 0) {
    console.log("[LCU] Successfully got command line via CIM method");
    return { lines: cimLines, source: "cim" };
  }

  console.log("[LCU] CIM failed, trying WMI Object method...");
  const wmiObjectLines = await getCommandLinesFromWmiObject();
  if (wmiObjectLines.length > 0) {
    console.log("[LCU] Successfully got command line via WMI Object method");
    return { lines: wmiObjectLines, source: "wmi" };
  }

  // WMIC is deprecated, skip it
  // const wmicLines = await getCommandLinesFromWmic();

  console.error("[LCU] All methods failed, unable to get command line parameters");
  return { lines: [], source: "none", error: "ALL_METHODS_FAILED" };
};

const parseCommandLineCredentials = (commandLines) => {
  console.log("[LCU] Starting to parse command line parameters, total", commandLines.length, "line(s)");
  const credentials = [];
  const ports = [];
  const riotPorts = [];

  commandLines.forEach((line, index) => {
    const preview = line.length > 100 ? line.substring(0, 100) + "..." : line;
    console.log(`[LCU] Parsing line ${index + 1}:`, preview);
    
    // 提取主客户端参数（参考 PowerShell 代码的正则表达式）
    const appPortMatch = line.match(/--app-port=(\d+)/i);
    const authTokenMatch = line.match(/--remoting-auth-token=([\w-]+)/i);
    
    // 提取 Riot Client 参数（虽然当前可能用不到，但保留信息）
    const riotPortMatch = line.match(/--riotclient-app-port=(\d+)/i);
    const riotTokenMatch = line.match(/--riotclient-auth-token=([\w-]+)/i);

    const port = appPortMatch ? Number(appPortMatch[1]) : null;
    const password = authTokenMatch ? authTokenMatch[1] : null;
    const riotPort = riotPortMatch ? Number(riotPortMatch[1]) : null;
    const riotToken = riotTokenMatch ? riotTokenMatch[1] : null;

    const tokenPreview = password ? password.substring(0, 10) + "..." : "not found";
    console.log(`[LCU] Extracted - Port: ${port}, Token: ${tokenPreview}`);

    if (port) {
      ports.push(port);
    }

    if (riotPort) {
      riotPorts.push(riotPort);
    }

    // 主客户端凭证（用于 LCU 连接）
    if (port && password) {
      console.log(`[LCU] ✓ Found valid credentials - Port: ${port}`);
      credentials.push({
        port,
        password,
        protocol: "https",
        source: "cmdline",
        // 可选：保存 Riot Client 信息供将来使用
        riotClient: riotPort && riotToken ? {
          port: riotPort,
          token: riotToken,
          url: `https://127.0.0.1:${riotPort}`
        } : null
      });
    } else {
      console.log(`[LCU] ✗ Incomplete credentials - Port: ${port}, Token: ${password ? "yes" : "no"}`);
    }
  });

  console.log("[LCU] Parsing completed - Found", credentials.length, "valid credential(s)");
  return {
    commandLinePorts: Array.from(new Set(ports)),
    commandLineRiotPorts: Array.from(new Set(riotPorts)),
    commandLineCredentials: credentials
  };
};

const discoverCommandLineOnly = async () => {
  const result = await getRunningClientCommandLines();
  const data = parseCommandLineCredentials(result.lines);
  return { commandLineCredentials: data.commandLineCredentials, error: result.error || null };
};

const findLockfileWithCommandLine = async (options = {}) => {
  // 优先从用户目录读取配置，其次工程目录 config/lcu.json，最后兼容旧版根目录 config.json
  let userConfigPath = null;
  try {
    const userDir = app.getPath("userData");
    userConfigPath = path.join(userDir, "config", "lcu.json");
  } catch (_) {
    userConfigPath = null;
  }
  const newConfigPath = path.join(process.cwd(), "config", "lcu.json");
  const oldConfigPath = path.join(process.cwd(), "config.json");
  const configPath = (userConfigPath && fs.existsSync(userConfigPath))
    ? userConfigPath
    : (fs.existsSync(newConfigPath) ? newConfigPath : oldConfigPath);
  console.log("[LCU] Trying to read config from:", configPath);
  
  try {
    if (fs.existsSync(configPath)) {
      const configContent = fs.readFileSync(configPath, "utf8");
      const config = JSON.parse(configContent);
      
      console.log("[LCU] Config file found, parsing...");
      const credentials = loadCredentialsFromConfig(config);
      if (credentials && credentials.length > 0) {
        const running = await checkProcessExists();
        if (!running) {
          console.log("[LCU] Client process not running, ignoring cached credentials");
          return { commandLineCredentials: [], error: "PROCESS_NOT_RUNNING" };
        }
        console.log("[LCU] Successfully loaded credentials from", path.basename(configPath));
        console.log("[LCU] Port:", credentials[0].port);
        console.log("[LCU] Token:", credentials[0].password.substring(0, 10) + "...");
        return { commandLineCredentials: credentials };
      }
      console.log("[LCU] Config file exists but MainClient info is incomplete");
    } else {
      console.log("[LCU] Config file not found, will try get_confg.ps1");
    }
  } catch (error) {
    console.error("[LCU] Error reading", path.basename(configPath), ":", error.message);
    console.log("[LCU] Will try auto-discovery instead");
  }
  
  // 尝试通过 PowerShell 脚本获取配置并缓存
  const psResult = await runGetConfigScript();
  if (psResult.credentials && psResult.credentials.length > 0) {
    const running = await checkProcessExists();
    if (!running) {
      console.log("[LCU] Client process not running after script, ignoring credentials");
      return { commandLineCredentials: [], error: "PROCESS_NOT_RUNNING" };
    }
    console.log("[LCU] Successfully loaded credentials via get_confg.ps1");
    return { commandLineCredentials: psResult.credentials };
  }
  if (psResult.error === "PROCESS_NOT_RUNNING") {
    console.log("[LCU] get_confg.ps1 indicates client not running");
    return { commandLineCredentials: [], error: "PROCESS_NOT_RUNNING" };
  }
  
  // 如果 config.json 不存在或读取失败，尝试自动获取
  console.log("[LCU] Attempting auto-discovery...");
  const commandLineResult = await getRunningClientCommandLines();
  const commandLineData = parseCommandLineCredentials(commandLineResult.lines);

  return {
    commandLineCredentials: commandLineData.commandLineCredentials
  };
};

module.exports = { findLockfile, parseLockfile, findLockfileWithCommandLine, runGetConfigScript, discoverCommandLineOnly, saveCredentialsToCache };
