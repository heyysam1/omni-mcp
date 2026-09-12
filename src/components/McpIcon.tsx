import React, { useState, useEffect } from "react";
import {
  Database,
  Terminal,
  Globe,
  Cpu,
  Layers,
  Sparkles,
  FolderGit2,
  Cloud,
  Clock,
  Brain,
  Palette,
  ShoppingBag,
} from "lucide-react";

interface McpIconProps {
  type?: string;
  color?: string;
  size?: number;
  src?: string;
  className?: string;
}

export const McpIcon: React.FC<McpIconProps> = ({
  type,
  color = "#10B981",
  size = 20,
  src,
  className = "",
}) => {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [src]);

  // If a remote or official source image is provided and hasn't errored, render it
  if (src && !imgError) {
    return (
      <img
        src={src}
        alt={type || "icon"}
        width={size}
        height={size}
        onError={() => setImgError(true)}
        className={`rounded object-contain shrink-0 ${className}`}
        style={{ width: size, height: size }}
        loading="lazy"
      />
    );
  }

  const normalizedType = (type || "").toLowerCase().trim();

  // Official high-fidelity vector icons
  switch (normalizedType) {
    // Official Notion logo
    case "notion":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l11.458-.84c1.12-.094 1.213-.607 1.026-1.214L18.647 1.5c-.373-.56-1.026-.84-2.146-.747L3.992 1.782c-.84.093-1.026.467-.653 1.027l1.12 1.399zm1.307 3.548c-.654 0-.84.373-.84.84v12.7c0 .56.374.933.934.933l13.53-.84c.654 0 .84-.467.84-.933V7.756c0-.56-.373-.933-.933-.933l-13.53.933zm11.2 2.52l-5.6 7.653V10.276H9.133v9.053h2.24l5.6-7.653v7.653h2.24V10.276h-2.24z" fill="#FFFFFF"/>
        </svg>
      );

    // Official Slack 4-color octothorpe logo
    case "slack":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z" fill="#E01E5A"/>
          <path d="M8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312z" fill="#36C5F0"/>
          <path d="M18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312z" fill="#2EB67D"/>
          <path d="M15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" fill="#ECB22E"/>
        </svg>
      );

    // Official Spotify green soundwaves logo
    case "spotify":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="#1DB954">
          <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.502 17.306a.754.754 0 0 1-1.037.249c-2.84-1.734-6.416-2.127-10.627-1.166a.752.752 0 1 1-.336-1.467c4.606-1.052 8.563-.61 11.751 1.347.362.222.473.697.249 1.037zm1.468-3.262a.94.94 0 0 1-1.295.31c-3.25-2-8.204-2.58-12.049-1.412a.942.942 0 1 1-.552-1.802c4.394-1.334 9.852-.693 13.586 1.609.43.264.567.828.31 1.295zm.126-3.41c-3.899-2.316-10.334-2.53-14.072-1.394a1.129 1.129 0 1 1-.652-2.162c4.296-1.304 11.399-1.054 15.892 1.614a1.129 1.129 0 0 1-1.168 1.942z"/>
        </svg>
      );

    // Official Cloudflare orange cloud logo
    case "cloudflare":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="#F38020">
          <path d="M18.3 11.2c-.3-2.6-2.5-4.6-5.2-4.6-2 0-3.7 1.1-4.6 2.7-.5-.2-1-.3-1.6-.3-2.4 0-4.4 2-4.4 4.4 0 .4.1.8.2 1.1C1.1 14.8 0 16.3 0 18.1 0 20.8 2.2 23 4.9 23h13.6c2.8 0 5-2.2 5-5 0-2.3-1.6-4.3-3.8-4.8-.1-.7-.2-1.4-.4-2z"/>
        </svg>
      );

    // Official Supabase emerald emblem
    case "supabase":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <path d="M11.353 0C10.77 0 10.38 0.6 10.63 1.12L13.84 7.9H2.57c-.82 0-1.28.93-.78 1.58l10.86 14.16c.55.72 1.64.3 1.59-.6l-.8-8.24h8.99c.81 0 1.28-.93.79-1.58L12.35.36c-.23-.23-.59-.36-1-.36z" fill="#3ECF8E"/>
        </svg>
      );

    // Official Docker whale with containers
    case "docker":
    case "kubernetes":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="#2496ED">
          <path d="M13.98 10.05h1.94v1.94h-1.94zm-2.43 0h1.94v1.94h-1.94zm-2.43 0h1.94v1.94H9.12zm-2.43 0h1.94v1.94H6.69zm7.29-2.43h1.94v1.94h-1.94zm-2.43 0h1.94v1.94h-1.94zm-2.43 0h1.94v1.94H9.12zm4.86-2.43h1.94v1.94h-1.94zM23.76 11.2a4.95 4.95 0 0 0-3.32-1.9c-.2-.03-.41-.04-.62-.04-.21 0-.41.02-.62.06a3.54 3.54 0 0 0-1.89.87 6.64 6.64 0 0 0-1.32-1.15l-.47.6c.38.3.73.65 1.04 1.03-.38.25-.72.54-1.01.88H1.28c-.28 0-.5.22-.5.5 0 .2.12.38.3.46 1.06.49 1.94 1.26 2.55 2.22.95 1.5 2.5 2.45 4.26 2.62 4.19.41 8.28-.7 11.53-3.13 2.19-.07 3.96-1.57 4.34-3.66v-.3-.3z" />
        </svg>
      );

    // Official GitHub Octocat outline
    case "github":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
          <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
          <path d="M9 18c-4.51 2-5-2-7-2" />
        </svg>
      );

    // Official Git orange diamond
    case "git":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="#F05032">
          <path d="M23.546 10.93L13.067.452c-.604-.603-1.582-.603-2.188 0L8.708 2.627l2.76 2.76c.645-.215 1.379-.07 1.889.441.516.515.658 1.258.438 1.9l2.659 2.66c.645-.223 1.387-.078 1.9.435.721.72.721 1.884 0 2.604-.719.719-1.881.719-2.6 0-.529-.527-.667-1.29-.413-1.943L12.82 8.622v5.772c.174.1.335.231.47.382.72.72.72 1.884 0 2.604-.719.719-1.881.719-2.6 0-.721-.72-.721-1.884 0-2.604.184-.183.4-.316.634-.397V8.552c-.234-.081-.45-.214-.634-.397-.533-.533-.667-1.304-.403-1.96L7.494 3.402.454 10.44c-.605.603-.605 1.582 0 2.188l10.48 10.478c.604.604 1.582.604 2.186 0l10.426-10.427c.606-.603.606-1.58 0-2.187" />
        </svg>
      );

    // Official Sentry radar clover logo
    case "sentry":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="#8B5CF6">
          <path d="M13.484 0a3.67 3.67 0 0 0-2.02.72c-.87.65-1.41 1.65-1.5 2.76l-.01.12-.03.73-.73-.02a3.67 3.67 0 0 0-3.69 3.52v.17l.02.73-.73-.01a3.67 3.67 0 0 0-3.68 3.51v.17l.02.73-.73-.02A3.67 3.67 0 0 0 0 16.03c.09 1.11.63 2.11 1.5 2.76a3.67 3.67 0 0 0 4.19.12l.62-.39.39.62a3.67 3.67 0 0 0 3.09 1.76c1.11-.09 2.11-.63 2.76-1.5a3.67 3.67 0 0 0 .12-4.19l-.39-.62.62-.39a3.67 3.67 0 0 0 1.76-3.09c-.09-1.11-.63-2.11-1.5-2.76a3.67 3.67 0 0 0-4.19-.12l-.62.39-.39-.62A3.67 3.67 0 0 0 4.26 6.7c.09-1.11.63-2.11 1.5-2.76A3.67 3.67 0 0 0 9.95 4l.62.39.39-.62A3.67 3.67 0 0 0 13.484 0z" />
        </svg>
      );

    // Official Obsidian purple gemstone
    case "obsidian":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="#7C3AED">
          <path d="M16.5 2L5.5 8.5 2 17l6.5 5 10-4 3.5-9.5L16.5 2zm-.5 3.5l3.2 5.5-5.2 2-3-4.5 5-3zm-7.5 4.5l3 4.5-5 3.5-2-4.5 4-3.5zm3.5 6l3.5 3-5 1.5-2.5-3 4-1.5z" />
        </svg>
      );

    // Official Todoist red icon
    case "todoist":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <rect width="24" height="24" rx="5" fill="#E44332"/>
          <path d="M5 6.5l4 3.5-4 3.5M10.5 10h8.5M5 12.5l4 3.5-4 3.5M10.5 16h8.5M10.5 4h8.5" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );

    // Official Brave Lion logo
    case "brave":
    case "brave-search":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="#FB542B">
          <path d="M12 2l3.2 4.2 4.6.4-2.1 4.2 2.7 4.1-4.8.8-1.6 4.3L12 18.6l-2 1.4-1.6-4.3-4.8-.8 2.7-4.1-2.1-4.2 4.6-.4L12 2z"/>
        </svg>
      );

    // Official PostgreSQL elephant badge
    case "postgres":
    case "postgresql":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="#336791">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 16.5c-3.04 0-5.5-2.46-5.5-5.5 0-1.85.92-3.49 2.33-4.47l1.17 1.68C10.37 10.72 10 11.56 10 12.5c0 1.93 1.57 3.5 3.5 3.5.74 0 1.42-.23 1.99-.62l1.24 1.63c-.88.63-1.95.99-3.23.99zm4.25-3.25l-1.24-1.63c.63-.88.99-1.95.99-3.23 0-2.48-1.64-4.57-3.88-5.24l.58-1.91c2.97.9 5.3 3.69 5.3 6.99 0 1.7-.5 3.28-1.75 5.02z" />
        </svg>
      );

    // Official SQLite feather/quill logo
    case "sqlite":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="#23678F">
          <path d="M12 2c5.52 0 10 4.48 10 10s-4.48 10-10 10S2 17.52 2 12 6.48 2 12 2zm-1 4.5v11l6.5-5.5L11 6.5z" />
        </svg>
      );

    // Official Neon green triangle/prism
    case "neon":
    case "neon-postgres":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <path d="M12 2L3 21h18L12 2zm0 4.5l5.5 12h-11L12 6.5z" fill="#00E599"/>
        </svg>
      );

    // Official Qdrant red vector diamond
    case "qdrant":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="#DC2626">
          <path d="M12 2L2 8.5v7L12 22l10-6.5v-7L12 2zm0 3.8l6.5 4.2v4.5L12 18.2l-6.5-3.7v-4.5L12 5.8z"/>
        </svg>
      );

    // Official Chroma DB dots logo
    case "chroma":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <circle cx="7" cy="8" r="4" fill="#EF4444"/>
          <circle cx="17" cy="8" r="4" fill="#3B82F6"/>
          <circle cx="12" cy="16" r="4" fill="#10B981"/>
        </svg>
      );

    // Official Netdata pulse logo
    case "netdata":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="#00AB44">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-4.5L8.5 15l-1.5-1.5 4-4.5V7h2v4.5l2.5-2.5 1.5 1.5-4 4.5V17z" />
        </svg>
      );

    // Official Axiom prism
    case "axiom":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="#EB008B">
          <path d="M12 2L2 20h20L12 2zm0 5l6.5 11h-13L12 7z" />
        </svg>
      );

    // Official Context7 / Upstash ribbon
    case "context7":
    case "upstash":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="#00E599">
          <path d="M6 3h12v4H10v4h8v10H6v-4h8v-4H6V3z"/>
        </svg>
      );

    // Playwright official dual masks
    case "playwright":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="9" cy="10" r="5.5" stroke="#2EAD33" strokeWidth="2" fill="#2EAD33" fillOpacity="0.15" />
          <circle cx="15" cy="14" r="5.5" stroke="#E23B26" strokeWidth="2" fill="#E23B26" fillOpacity="0.15" />
          <path d="M10 8l3 3-3 3" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    // Puppeteer strings/browser icon
    case "puppeteer":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#00D8A2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="5" r="3" fill="#00D8A2" fillOpacity="0.2"/>
          <path d="M12 8v4M7 16l5-4 5 4M5 21l3-5M19 21l-3-5"/>
        </svg>
      );

    // Exa Search AI logo
    case "exa":
    case "exa-search":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" stroke="#6366F1" strokeWidth="2.2" />
          <circle cx="12" cy="12" r="4" fill="#6366F1" />
        </svg>
      );

    // Official Anthropic Model Context Protocol reference
    case "modelcontextprotocol":
    case "mcp":
    case "official":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="6" r="3.5" stroke="#10B981" strokeWidth="2" fill="#10B981" fillOpacity="0.2"/>
          <circle cx="6.5" cy="16.5" r="3.5" stroke="#38BDF8" strokeWidth="2" fill="#38BDF8" fillOpacity="0.2"/>
          <circle cx="17.5" cy="16.5" r="3.5" stroke="#A855F7" strokeWidth="2" fill="#A855F7" fillOpacity="0.2"/>
          <path d="M10.5 8.5L8 14M13.5 8.5L16 14M9.5 16.5h5" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      );

    // Clean Specialized System Icons
    case "time":
    case "clock":
      return <Clock size={size} className="text-[#06B6D4]" />;

    case "memory":
    case "brain":
      return <Brain size={size} className="text-[#A855F7]" />;

    case "filesystem":
      return <Layers size={size} className="text-[#EAB308]" />;

    case "fetch":
    case "globe":
      return <Globe size={size} className="text-[#38BDF8]" />;

    case "palette":
    case "draw":
    case "web-draw":
      return <Palette size={size} className="text-[#F43F5E]" />;

    case "store":
    case "ecommerce":
    case "novamira":
      return <ShoppingBag size={size} className="text-[#3B82F6]" />;

    case "everything":
    case "sparkles":
      return <Sparkles size={size} className="text-[#EC4899]" />;

    case "cpu":
    case "sequentialthinking":
    case "sequential-thinking":
      return <Cpu size={size} className="text-[#10B981]" />;

    case "mysql":
    case "clickhouse":
    case "snowflake":
    case "bigquery":
    case "duckdb":
    case "database":
      return <Database size={size} className="text-[#3B82F6]" />;

    case "redis":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#DC382D" strokeWidth="1.8">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
        </svg>
      );

    case "mongodb":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#13AA52" strokeWidth="1.8">
          <path d="M12 2C8 7 7 13 12 22c5-9 4-15 0-20z" fill="#13AA52" fillOpacity="0.2" />
        </svg>
      );

    case "cloud":
    case "s3":
    case "aws":
      return <Cloud size={size} className="text-[#FF9900]" />;

    default:
      return <Terminal size={size} style={{ color }} />;
  }
};
