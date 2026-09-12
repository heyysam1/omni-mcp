export function parseCliCommand(raw: string): {
  success: boolean;
  formatted: string;
  parsed: any;
  serverName: string;
  isCliConverted: boolean;
} | null {
  let text = (raw || "").trim();
  if (!text) return null;

  // 1. Strip markdown code fences
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:bash|sh|shell|json|powershell|cmd)?\s*/i, "").replace(/\s*```$/, "").trim();
  }

  // 2. Remove comments (# or //) and merge multiline continuation (\)
  const cleanLines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && !line.startsWith("//"));

  if (cleanLines.length === 0) return null;
  text = cleanLines.join(" ").replace(/\\\s*/g, " ").trim();

  // 3. Strip terminal prompt markers (e.g., PS C:\> or $ or > or #)
  text = text.replace(/^(?:PS\s+[A-Za-z]:[\\/][^>]*>|[$>#])\s*/i, "").trim();

  // 4. Check if it matches CLI add syntax (codex, claude, mcp, agy, antigravity, cursor, windsurf, gemini, code)
  const cliAddRegex = /^(?:codex|claude|mcp|agy|antigravity|cursor|windsurf|gemini|code)\s+(?:mcp\s+)?add\b/i;
  const isCliAdd = cliAddRegex.test(text);

  // Check if it matches direct package runners (npx, uvx, docker, node, python, pnpm dlx, bunx)
  const isDirectRunner = /^(?:npx|uvx|docker|node|python|pnpm\s+dlx|bunx)\b/i.test(text);

  if (!isCliAdd && !isDirectRunner) return null;

  // 5. Tokenize command line preserving quotes
  const tokens: string[] = [];
  const tokenRegex = /[^\s"']+|"([^"]*)"|'([^']*)'/g;
  let match;
  while ((match = tokenRegex.exec(text)) !== null) {
    if (match[1] !== undefined) {
      tokens.push(match[1]);
    } else if (match[2] !== undefined) {
      tokens.push(match[2]);
    } else {
      tokens.push(match[0]);
    }
  }

  if (tokens.length === 0) return null;

  let serverName = "custom-mcp-server";
  let command = "";
  const args: string[] = [];
  const env: Record<string, string> = {};
  let url = "";

  if (isCliAdd) {
    let idx = 0;
    while (idx < tokens.length) {
      const t = tokens[idx].toLowerCase();
      if (["codex", "claude", "mcp", "agy", "antigravity", "cursor", "windsurf", "gemini", "code", "add"].includes(t)) {
        idx++;
        continue;
      }
      break;
    }

    // Process options before or around server name (e.g. -e KEY=VAL, --scope user)
    while (idx < tokens.length) {
      const token = tokens[idx];
      if (token === "--scope" && idx + 1 < tokens.length) {
        idx += 2;
        continue;
      }
      if ((token === "-e" || token === "--env") && idx + 1 < tokens.length) {
        const eqIdx = tokens[idx + 1].indexOf("=");
        if (eqIdx > 0) {
          const k = tokens[idx + 1].slice(0, eqIdx);
          const v = tokens[idx + 1].slice(eqIdx + 1);
          env[k] = v;
        }
        idx += 2;
        continue;
      }
      break;
    }

    // Next non-flag token is server name
    if (idx < tokens.length && !tokens[idx].startsWith("-")) {
      serverName = tokens[idx];
      idx++;
    }

    // Parse remaining tokens: env flags, --url, -- separator, command, args
    while (idx < tokens.length) {
      const token = tokens[idx];
      if (token === "--") {
        idx++;
        continue;
      }

      // Check env: -e KEY=VAL or --env KEY=VAL
      if ((token === "-e" || token === "--env") && idx + 1 < tokens.length) {
        const eqIdx = tokens[idx + 1].indexOf("=");
        if (eqIdx > 0) {
          const k = tokens[idx + 1].slice(0, eqIdx);
          const v = tokens[idx + 1].slice(eqIdx + 1);
          env[k] = v;
        }
        idx += 2;
        continue;
      }

      // Check --url
      if (token === "--url" && idx + 1 < tokens.length) {
        url = tokens[idx + 1];
        idx += 2;
        continue;
      }

      // Check if standalone token is an HTTP/HTTPS URL
      if ((token.startsWith("http://") || token.startsWith("https://")) && !command) {
        url = token;
        idx++;
        continue;
      }

      // First executable token is command
      if (!command) {
        command = token;
      } else {
        args.push(token);
      }
      idx++;
    }
  } else {
    // Direct runner: npx, uvx, docker, node, python
    command = tokens[0];
    args.push(...tokens.slice(1));

    // Derive a clean serverName
    const pkgToken = args.find((a) => a.includes("/") || a.startsWith("@") || (!a.startsWith("-") && a !== "run" && a !== "-m")) || command;
    serverName = pkgToken.replace(/^@/, "").replace(/\//g, "-").replace(/\.[a-z]+$/, "");
  }

  const serverConfig: any = {};
  if (url) {
    serverConfig.url = url;
  } else {
    serverConfig.command = command || "npx";
    serverConfig.args = args;
  }
  if (Object.keys(env).length > 0) {
    serverConfig.env = env;
  }

  const converted = {
    mcpServers: {
      [serverName]: serverConfig,
    },
  };

  return {
    success: true,
    formatted: JSON.stringify(converted, null, 2),
    parsed: converted,
    serverName,
    isCliConverted: true,
  };
}

export function sanitizeAndFormatJson(raw: string): {
  success: boolean;
  formatted: string;
  parsed?: any;
  serverName?: string;
  error?: string;
  isCliConverted?: boolean;
} {
  let text = (raw || "").trim();
  if (!text) {
    return { success: false, formatted: "", error: "Empty input" };
  }

  // 1. Strip markdown code fences if pasted from AI/Claude/ChatGPT/GitHub
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json|bash|sh|shell)?\s*/i, "").replace(/\s*```$/, "").trim();
  }

  // 2. Smart CLI Auto-Parser: Detects codex, claude, mcp, npx, uvx, docker commands
  const cliResult = parseCliCommand(text);
  if (cliResult) {
    return cliResult;
  }

  // 3. Progressive repair pipeline
  let repaired = text;

  // Convert single quotes around keys/values to double quotes: 'key': 'value' -> "key": "value"
  repaired = repaired.replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, '"$1"');

  // Convert unquoted keys safely: only at start of line or after { or , or newline
  // Avoids matching "https:" or "http:" inside URLs
  repaired = repaired.replace(/(^|[{,\n])\s*([a-zA-Z0-9_$-]+)\s*:/g, (match, prefix, key) => {
    return `${prefix}"${key}":`;
  });

  // Remove trailing commas before } or ]
  repaired = repaired.replace(/,\s*([}\]])/g, "$1");

  // Fix missing commas between properties on separate lines
  repaired = repaired.replace(/(["\dtruefalsenull}\]])\s*\n\s*(["{a-zA-Z0-9_$])/g, (match, end, start) => {
    return `${end},\n${start}`;
  });

  // Balance unclosed quotes and curly braces/brackets
  let inString = false;
  let escape = false;
  let openBraces = 0;
  let openBrackets = 0;

  for (let i = 0; i < repaired.length; i++) {
    const char = repaired[i];
    if (char === "\\" && inString) {
      escape = !escape;
      continue;
    }
    if (char === '"' && !escape) {
      inString = !inString;
    } else if (!inString) {
      if (char === "{") openBraces++;
      else if (char === "}") openBraces--;
      else if (char === "[") openBrackets++;
      else if (char === "]") openBrackets--;
    }
    escape = false;
  }

  // Close unclosed string if open
  if (inString) {
    repaired += '"';
  }

  // Remove trailing commas before auto-closing braces
  repaired = repaired.replace(/,\s*$/, "");

  // Auto-close missing brackets and braces
  while (openBrackets > 0) {
    repaired += "\n]";
    openBrackets--;
  }
  while (openBraces > 0) {
    repaired += "\n}";
    openBraces--;
  }

  // Attempt parse 1: directly on repaired string
  try {
    const parsed = JSON.parse(repaired);
    return normalizeParsed(parsed);
  } catch (err1: any) {
    // Attempt parse 2: wrap in root object { ... } if user pasted snippet without root
    try {
      const wrapped = JSON.parse(`{\n${repaired}\n}`);
      return normalizeParsed(wrapped);
    } catch {
      // Attempt parse 3: If user just pasted an array of args
      try {
        const arrayWrapped = JSON.parse(`[\n${repaired}\n]`);
        return normalizeParsed({ args: arrayWrapped });
      } catch {
        return {
          success: false,
          formatted: text,
          error: err1.message,
        };
      }
    }
  }
}

function normalizeParsed(parsed: any): {
  success: boolean;
  formatted: string;
  parsed: any;
  serverName: string;
} {
  let serverName = "";
  let normalized: any = { mcpServers: {} };

  if (parsed.mcpServers && typeof parsed.mcpServers === "object") {
    normalized = parsed;
    serverName = Object.keys(parsed.mcpServers)[0] || "";
  } else if (parsed.servers && typeof parsed.servers === "object") {
    normalized = { mcpServers: parsed.servers };
    serverName = Object.keys(parsed.servers)[0] || "";
  } else if (parsed.command || parsed.url) {
    // 1. Reuse existing canonical identity fields if present in configuration
    let derivedName = parsed.name || parsed.id || parsed.server || parsed.title || "";

    // 2. Fallback: package / URL / command inference only when config contains no usable identity
    if (!derivedName && Array.isArray(parsed.args)) {
      const pkgArg = parsed.args.find(
        (a: any) => typeof a === "string" && !a.startsWith("-") && a !== "run" && a !== "-m" && a.length > 2
      );
      if (pkgArg) {
        derivedName = pkgArg.replace(/^@[^/]+\//, "").replace(/[^a-zA-Z0-9_-]/g, "-");
      }
    }
    if (!derivedName && parsed.url) {
      try {
        const u = new URL(parsed.url);
        derivedName = u.hostname.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "-");
      } catch {}
    }
    if (!derivedName && parsed.command && !["npx", "node", "python", "uvx", "docker"].includes(parsed.command)) {
      derivedName = String(parsed.command).replace(/[^a-zA-Z0-9_-]/g, "-");
    }
    serverName = derivedName || "mcp-server";
    normalized = { mcpServers: { [serverName]: parsed } };
  } else {
    const keys = Object.keys(parsed);
    if (keys.length === 1 && typeof parsed[keys[0]] === "object") {
      serverName = keys[0];
      normalized = { mcpServers: { [serverName]: parsed[keys[0]] } };
    } else {
      normalized = { mcpServers: parsed };
      serverName = keys[0] || "mcp-server";
    }
  }

  return {
    success: true,
    formatted: JSON.stringify(normalized, null, 2),
    parsed: normalized,
    serverName,
  };
}

// Dedicated formatter for individual server config blocks (e.g. inside ConfigModal)
// Strictly formats the JSON object without wrapping in mcpServers or altering keys
export function formatSingleServerConfig(raw: string): {
  success: boolean;
  formatted: string;
  parsed?: any;
  error?: string;
} {
  let text = (raw || "").trim();
  if (!text) {
    return { success: false, formatted: "", error: "Empty input" };
  }

  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  }

  try {
    const parsed = JSON.parse(text);
    return {
      success: true,
      formatted: JSON.stringify(parsed, null, 2),
      parsed,
    };
  } catch {}

  // Progressive syntax repairs for minor JSON formatting mistakes:
  let repaired = text;
  // Convert single quotes to double quotes around keys/values
  repaired = repaired.replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, '"$1"');
  // Unquoted keys
  repaired = repaired.replace(/(^|[{,\n])\s*([a-zA-Z0-9_$-]+)\s*:/g, (m, prefix, key) => `${prefix}"${key}":`);
  // Trailing commas before } or ]
  repaired = repaired.replace(/,\s*([}\]])/g, "$1");
  // Missing commas between lines
  repaired = repaired.replace(/(["\dtruefalsenull}\]])\s*\n\s*(["{a-zA-Z0-9_$])/g, "$1,\n$2");

  try {
    const parsed = JSON.parse(repaired);
    return {
      success: true,
      formatted: JSON.stringify(parsed, null, 2),
      parsed,
    };
  } catch (err: any) {
    return {
      success: false,
      formatted: text,
      error: err.message,
    };
  }
}

export function toggleAllowHttp(jsonText: string, enable: boolean): string {
  const result = sanitizeAndFormatJson(jsonText);
  if (!result.success || !result.parsed) return jsonText;

  const data = JSON.parse(JSON.stringify(result.parsed));
  const serversObj = data.mcpServers || data.servers || data;

  for (const serverKey of Object.keys(serversObj)) {
    const server = serversObj[serverKey];
    if (server && typeof server === "object") {
      if (!Array.isArray(server.args)) {
        if (enable) {
          server.args = ["--allow-http"];
        }
      } else {
        if (enable) {
          if (!server.args.includes("--allow-http")) {
            server.args.push("--allow-http");
          }
        } else {
          server.args = server.args.filter((arg: string) => arg !== "--allow-http");
        }
      }
    }
  }

  return JSON.stringify(data, null, 2);
}
