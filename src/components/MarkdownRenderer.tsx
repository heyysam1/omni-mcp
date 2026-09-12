import React from "react";
import { ExternalLink, Copy, Check } from "lucide-react";

interface MarkdownRendererProps {
  content: string;
  repoUrl?: string;
  rawReadmeUrl?: string;
}

/**
 * Resolves relative and GitHub image URLs to absolute raw images.
 * Also handles GitHub blob URLs (which serve HTML) into raw CDN URLs.
 */
function resolveImageUrl(src: string, repoUrl?: string, rawReadmeUrl?: string): string {
  if (!src) return "";
  let cleanSrc = src.trim();

  // 1. If it's a GitHub blob URL, transform to raw.githubusercontent.com
  if (cleanSrc.includes("github.com/") && cleanSrc.includes("/blob/")) {
    return cleanSrc
      .replace("github.com/", "raw.githubusercontent.com/")
      .replace("/blob/", "/");
  }

  // 2. If it's already an absolute URL (http, https, data:), return directly
  if (
    cleanSrc.startsWith("http://") ||
    cleanSrc.startsWith("https://") ||
    cleanSrc.startsWith("data:")
  ) {
    return cleanSrc;
  }

  // 3. If relative path, resolve against rawReadmeUrl or repoUrl
  let relPath = cleanSrc.replace(/^\.\//, "");
  if (relPath.startsWith("/")) {
    relPath = relPath.substring(1);
  }

  if (rawReadmeUrl) {
    const lastSlash = rawReadmeUrl.lastIndexOf("/");
    const baseDir = lastSlash !== -1 ? rawReadmeUrl.substring(0, lastSlash + 1) : "";
    return `${baseDir}${relPath}`;
  }

  if (repoUrl && repoUrl.includes("github.com/")) {
    const match = repoUrl.match(/github\.com\/([^/]+)\/([^/#?]+)/);
    if (match) {
      const owner = match[1];
      const repo = match[2];
      return `https://raw.githubusercontent.com/${owner}/${repo}/HEAD/${relPath}`;
    }
  }

  return cleanSrc;
}

/**
 * Resolves relative markdown links to full web URLs so they open properly in browser.
 */
function resolveLinkUrl(href: string, repoUrl?: string): string {
  if (!href) return "";
  let cleanHref = href.trim();

  // If in-page anchor like #usage
  if (cleanHref.startsWith("#")) {
    if (repoUrl) {
      return `${repoUrl}${cleanHref}`;
    }
    return cleanHref;
  }

  // If already absolute http/https
  if (cleanHref.startsWith("http://") || cleanHref.startsWith("https://")) {
    return cleanHref;
  }

  // If mailto
  if (cleanHref.startsWith("mailto:")) {
    return cleanHref;
  }

  // If protocol-relative //
  if (cleanHref.startsWith("//")) {
    return `https:${cleanHref}`;
  }

  // If www.
  if (cleanHref.startsWith("www.")) {
    return `https://${cleanHref}`;
  }

  // If relative path like docs/install.md or ./CONTRIBUTING.md
  if (repoUrl && repoUrl.includes("github.com/")) {
    let relPath = cleanHref.replace(/^\.\//, "");
    if (relPath.startsWith("/")) relPath = relPath.substring(1);
    return `${repoUrl}/blob/HEAD/${relPath}`;
  }

  return cleanHref;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  repoUrl,
  rawReadmeUrl,
}) => {
  const [copiedIndex, setCopiedIndex] = React.useState<number | null>(null);

  const handleCopyCode = (code: string, index: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, rawHref?: string) => {
    e.preventDefault();
    if (!rawHref) return;
    const finalUrl = resolveLinkUrl(rawHref, repoUrl);
    if (!finalUrl || finalUrl.startsWith("#")) return;

    if (window.api?.openExternal) {
      window.api.openExternal(finalUrl);
    } else {
      window.open(finalUrl, "_blank", "noopener,noreferrer");
    }
  };

  // Normalize common HTML structures into standard markdown
  const normalizedContent = (content || "")
    .replace(/<hr\s*\/?>/gi, "\n---\n")
    .replace(
      /<a\s+[^>]*href=["']([^"']+)["'][^>]*>\s*(?:<img\s+[^>]*src=["']([^"']+)["'][^>]*>)\s*<\/a>/gis,
      (_match, href, src) => `\n[![image](${src})](${href})\n`
    )
    .replace(
      /<img\s+[^>]*src=["']([^"']+)["'][^>]*alt=["']([^"']*)["'][^>]*\/?>/gis,
      (_match, src, alt) => `\n![${alt || "image"}](${src})\n`
    )
    .replace(
      /<img\s+[^>]*alt=["']([^"']*)["'][^>]*src=["']([^"']+)["'][^>]*\/?>/gis,
      (_match, alt, src) => `\n![${alt || "image"}](${src})\n`
    )
    .replace(/<img\s+[^>]*src=["']([^"']+)["'][^>]*\/?>/gis, (_match, src) => `\n![image](${src})\n`)
    .replace(/^\s*<a\s+[^>]*>\s*$/gim, "")
    .replace(/^\s*<\/a>\s*$/gim, "");

  // Parse lines into tokens
  const rawLines = normalizedContent.split("\n");
  const elements: React.ReactNode[] = [];

  let inCodeBlock = false;
  let codeBuffer: string[] = [];
  let codeLang = "";
  let codeIndex = 0;

  let inList = false;
  let listItems: React.ReactNode[] = [];

  const flushList = () => {
    if (inList && listItems.length > 0) {
      elements.push(
        <ul
          key={`list-${elements.length}`}
          className="my-2 space-y-1 pl-4 list-disc marker:text-emerald-400 text-zinc-300 text-xs leading-relaxed select-text"
        >
          {listItems}
        </ul>
      );
      listItems = [];
      inList = false;
    }
  };

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];

    // Fenced Code Block start/end
    if (line.trim().startsWith("```")) {
      flushList();
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeLang = line.trim().replace(/^```/, "").trim() || "bash";
        codeBuffer = [];
      } else {
        inCodeBlock = false;
        const codeText = codeBuffer.join("\n");
        const idx = codeIndex++;
        elements.push(
          <div
            key={`code-${idx}`}
            className="my-3 rounded-lg bg-zinc-950 border border-zinc-800/90 overflow-hidden shadow-sm select-text"
          >
            <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-900/70 border-b border-zinc-800/80 text-[10px] font-mono text-zinc-400 select-none">
              <span className="uppercase font-semibold tracking-wider text-zinc-400">
                {codeLang}
              </span>
              <button
                onClick={() => handleCopyCode(codeText, idx)}
                className="flex items-center space-x-1 text-zinc-400 hover:text-white transition-colors"
                title="Copy code"
              >
                {copiedIndex === idx ? (
                  <>
                    <Check size={12} className="text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy size={12} />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-3 text-[11px] font-mono text-emerald-300/90 overflow-x-auto selection:bg-emerald-500/30 leading-relaxed select-text">
              <code>{codeText}</code>
            </pre>
          </div>
        );
        codeBuffer = [];
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }

    let trimmed = line.trim();

    // Blank line
    if (!trimmed) {
      flushList();
      continue;
    }

    // Skip purely structural HTML tags like <div>, </div>, <table>, etc.
    if (
      /^<\/?(div|table|tbody|thead|tr|td|th|p|center|span|header|footer|section|article)\b[^>]*>$/i.test(
        trimmed
      )
    ) {
      flushList();
      continue;
    }

    // Standalone HTML image: <img ... src="..." ...>
    const standaloneImgMatch = trimmed.match(/^<img\s+[^>]*src=["']([^"']+)["'][^>]*>/i);
    if (standaloneImgMatch) {
      flushList();
      const altMatch = trimmed.match(/alt=["']([^"']*)["']/i);
      const rawSrc = standaloneImgMatch[1];
      const src = resolveImageUrl(rawSrc, repoUrl, rawReadmeUrl);
      const alt = altMatch ? altMatch[1] : "";
      elements.push(
        <div key={`img-${i}`} className="my-2">
          <img
            src={src}
            alt={alt}
            className="rounded-lg border border-zinc-800 max-h-48 object-contain"
            loading="lazy"
            onError={(e) => {
              (e.currentTarget as HTMLElement).style.display = "none";
            }}
          />
        </div>
      );
      continue;
    }

    // Standalone HTML link wrapping image: <a href="..."><img src="..." .../></a>
    const linkedImgMatch = trimmed.match(
      /^<a\s+[^>]*href=["']([^"']+)["'][^>]*>\s*<img\s+[^>]*src=["']([^"']+)["'][^>]*>\s*<\/a>$/i
    );
    if (linkedImgMatch) {
      flushList();
      const linkHref = linkedImgMatch[1];
      const rawImgSrc = linkedImgMatch[2];
      const imgSrc = resolveImageUrl(rawImgSrc, repoUrl, rawReadmeUrl);
      elements.push(
        <div key={`linked-img-${i}`} className="my-2">
          <a
            href={linkHref}
            onClick={(e) => handleLinkClick(e, linkHref)}
            className="inline-block cursor-pointer"
          >
            <img
              src={imgSrc}
              alt="badge"
              className="rounded-lg border border-zinc-800 max-h-20 object-contain hover:opacity-80 transition-opacity"
              loading="lazy"
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = "none";
              }}
            />
          </a>
        </div>
      );
      continue;
    }

    // Strip HTML wrapper tags from the line
    trimmed = trimmed
      .replace(
        /<\/?(div|table|tbody|thead|tr|td|th|p|center|span|sub|sup|b|i|strong|em|kbd)\b[^>]*>/gi,
        ""
      )
      .trim();

    if (!trimmed) {
      flushList();
      continue;
    }

    // Horizontal Rule
    if (trimmed === "---" || trimmed === "***" || trimmed === "___") {
      flushList();
      elements.push(<hr key={`hr-${i}`} className="my-4 border-zinc-800" />);
      continue;
    }

    // Headings
    if (trimmed.startsWith("# ")) {
      flushList();
      elements.push(
        <h1
          key={`h1-${i}`}
          className="text-base font-bold text-white mt-4 mb-2 tracking-tight flex items-center gap-2 select-text"
        >
          {renderInlineFormatting(trimmed.slice(2), handleLinkClick, repoUrl, rawReadmeUrl)}
        </h1>
      );
      continue;
    }
    if (trimmed.startsWith("## ")) {
      flushList();
      elements.push(
        <h2
          key={`h2-${i}`}
          className="text-sm font-semibold text-zinc-100 mt-3.5 mb-1.5 tracking-tight border-b border-zinc-800/60 pb-1 select-text"
        >
          {renderInlineFormatting(trimmed.slice(3), handleLinkClick, repoUrl, rawReadmeUrl)}
        </h2>
      );
      continue;
    }
    if (trimmed.startsWith("### ")) {
      flushList();
      elements.push(
        <h3 key={`h3-${i}`} className="text-xs font-semibold text-zinc-200 mt-3 mb-1 select-text">
          {renderInlineFormatting(trimmed.slice(4), handleLinkClick, repoUrl, rawReadmeUrl)}
        </h3>
      );
      continue;
    }

    // Blockquote
    if (trimmed.startsWith("> ")) {
      flushList();
      elements.push(
        <blockquote
          key={`bq-${i}`}
          className="my-2 pl-3 border-l-2 border-emerald-500/60 text-xs italic text-zinc-400 select-text"
        >
          {renderInlineFormatting(trimmed.slice(2), handleLinkClick, repoUrl, rawReadmeUrl)}
        </blockquote>
      );
      continue;
    }

    // Bullet List (- or *)
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      inList = true;
      listItems.push(
        <li key={`li-${i}`} className="leading-relaxed select-text">
          {renderInlineFormatting(trimmed.slice(2), handleLinkClick, repoUrl, rawReadmeUrl)}
        </li>
      );
      continue;
    }

    // Numbered List (1. ...)
    if (/^\d+\.\s+/.test(trimmed)) {
      flushList();
      const contentText = trimmed.replace(/^\d+\.\s+/, "");
      elements.push(
        <div key={`ol-${i}`} className="flex items-start space-x-2 my-1 text-xs text-zinc-300 select-text">
          <span className="font-mono text-[10px] text-emerald-400 shrink-0 mt-0.5 select-none">•</span>
          <span className="leading-relaxed select-text">
            {renderInlineFormatting(contentText, handleLinkClick, repoUrl, rawReadmeUrl)}
          </span>
        </div>
      );
      continue;
    }

    // Markdown Table Row (| col1 | col2 |)
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      flushList();
      if (/^\|[\s\-:|]+\|$/.test(trimmed)) {
        continue;
      }
      const cells = trimmed
        .slice(1, -1)
        .split("|")
        .map((c) => c.trim());
      elements.push(
        <div
          key={`tbl-${i}`}
          className="grid grid-flow-col auto-cols-fr gap-2 py-1 px-2 text-xs text-zinc-300 border-b border-zinc-800/60 font-mono text-[11px] select-text"
        >
          {cells.map((cell, cIdx) => (
            <div key={cIdx} className="truncate select-text">
              {renderInlineFormatting(cell, handleLinkClick, repoUrl, rawReadmeUrl)}
            </div>
          ))}
        </div>
      );
      continue;
    }

    // Standard Paragraph
    flushList();
    elements.push(
      <p key={`p-${i}`} className="my-2 text-xs text-zinc-300 leading-relaxed select-text">
        {renderInlineFormatting(trimmed, handleLinkClick, repoUrl, rawReadmeUrl)}
      </p>
    );
  }

  flushList();

  return (
    <div className="space-y-1 selection:bg-emerald-500/30 selection:text-white pb-6 select-text">
      {elements}
    </div>
  );
};

// Helper to format inline bold, links, inline-code, and images
function renderInlineFormatting(
  text: string,
  onLinkClick: (e: React.MouseEvent<HTMLAnchorElement>, href?: string) => void,
  repoUrl?: string,
  rawReadmeUrl?: string
): React.ReactNode {
  // Regex to detect in order of priority:
  // 1. Linked image: [![alt](imgUrl)](linkUrl)
  // 2. Standalone image: ![alt](imgUrl)
  // 3. Standalone link: [text](linkUrl)
  // 4. HTML link: <a href="...">...</a>
  // 5. Plain URL: https://... or http://...
  // 6. Inline code: `code`
  // 7. Bold: **bold**
  const pattern =
    /(\[!\[([^\]]*)\]\(([^)]+)\)\]\(([^)]+)\))|(!\[([^\]]*)\]\(([^)]+)\))|(\[([^\]]+)\]\(([^)]+)\))|(<a\s+[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>)|(https?:\/\/[^\s<>)"]+)|(`[^`]+`)|(\*\*[^*]+\*\*)/gi;

  const parts: React.ReactNode[] = [];
  let lastIdx = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIdx) {
      parts.push(text.slice(lastIdx, match.index));
    }
    const token = match[0];

    // 1. Linked Image [![alt](imgUrl)](linkUrl)
    if (token.startsWith("[![") && match[3] && match[4]) {
      const alt = match[2] || "badge";
      const rawImgSrc = match[3];
      const linkHref = match[4];
      const imgSrc = resolveImageUrl(rawImgSrc, repoUrl, rawReadmeUrl);
      parts.push(
        <a
          key={match.index}
          href={linkHref}
          onClick={(e) => onLinkClick(e, linkHref)}
          className="inline-block my-0.5 mr-1.5 align-middle cursor-pointer"
        >
          <img
            src={imgSrc}
            alt={alt}
            className="inline-block max-h-6 rounded border border-zinc-800/80 hover:opacity-80 transition-opacity"
            loading="lazy"
            onError={(e) => {
              (e.currentTarget as HTMLElement).style.display = "none";
            }}
          />
        </a>
      );
    }
    // 2. Standalone Image ![alt](imgUrl)
    else if (token.startsWith("![") && match[7]) {
      const alt = match[6] || "image";
      const rawImgSrc = match[7];
      const imgSrc = resolveImageUrl(rawImgSrc, repoUrl, rawReadmeUrl);
      parts.push(
        <img
          key={match.index}
          src={imgSrc}
          alt={alt}
          className="inline-block max-h-48 rounded-lg border border-zinc-800/80 my-1.5 align-middle"
          loading="lazy"
          onError={(e) => {
            (e.currentTarget as HTMLElement).style.display = "none";
          }}
        />
      );
    }
    // 3. Regular Markdown Link [text](url)
    else if (token.startsWith("[") && match[9] && match[10]) {
      const linkText = match[9];
      const linkHref = match[10];
      parts.push(
        <a
          key={match.index}
          href={linkHref}
          onClick={(e) => onLinkClick(e, linkHref)}
          className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2 inline-flex items-center gap-0.5 cursor-pointer font-medium"
        >
          <span>{linkText}</span>
          <ExternalLink size={10} className="inline ml-0.5 opacity-80" />
        </a>
      );
    }
    // 4. HTML Link <a href="...">text</a>
    else if (token.toLowerCase().startsWith("<a") && match[11]) {
      const linkHref = match[11];
      const linkText = match[12]
        ? match[12].replace(/<[^>]*>/g, "")
        : linkHref;
      parts.push(
        <a
          key={match.index}
          href={linkHref}
          onClick={(e) => onLinkClick(e, linkHref)}
          className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2 inline-flex items-center gap-0.5 cursor-pointer font-medium"
        >
          <span>{linkText}</span>
          <ExternalLink size={10} className="inline ml-0.5 opacity-80" />
        </a>
      );
    }
    // 5. Plain text URL (Auto-link)
    else if (match[13] && match[13].startsWith("http")) {
      const url = match[13];
      parts.push(
        <a
          key={match.index}
          href={url}
          onClick={(e) => onLinkClick(e, url)}
          className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2 inline-flex items-center gap-0.5 cursor-pointer font-mono text-[11px]"
        >
          <span className="truncate max-w-[280px]">{url}</span>
          <ExternalLink size={10} className="inline ml-0.5 opacity-80 shrink-0" />
        </a>
      );
    }
    // 6. Inline Code `...`
    else if (token.startsWith("`") && token.endsWith("`")) {
      parts.push(
        <code
          key={match.index}
          className="px-1.5 py-0.5 rounded bg-zinc-950 border border-zinc-800 font-mono text-[11px] text-emerald-300 mx-0.5 select-text"
        >
          {token.slice(1, -1)}
        </code>
      );
    }
    // 7. Bold **...**
    else if (token.startsWith("**") && token.endsWith("**")) {
      parts.push(
        <strong key={match.index} className="font-semibold text-white select-text">
          {token.slice(2, -2)}
        </strong>
      );
    }

    lastIdx = pattern.lastIndex;
  }

  if (lastIdx < text.length) {
    parts.push(text.slice(lastIdx));
  }

  return parts.length > 0 ? parts : text;
}
