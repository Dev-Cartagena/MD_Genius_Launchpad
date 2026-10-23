import { Fragment, type ReactNode } from "react";

/**
 * Minimal, safe Markdown renderer for AI Coach replies.
 * Supports paragraphs, headings (#..###), **bold**, *italic*,
 * `inline code`, ``` fenced code ```, bullet lists (-, *, +) and numbered lists.
 * Output is plain React elements: text is never injected as HTML.
 */

type Block =
  | { kind: "p"; lines: string[] }
  | { kind: "h"; level: number; text: string }
  | { kind: "ul"; items: string[] }
  | { kind: "ol"; items: string[]; start: number }
  | { kind: "code"; text: string };

const BULLET = /^\s*[-*+]\s+(.*)$/;
const NUMBERED = /^\s*(\d+)[.)]\s+(.*)$/;
const HEADING = /^\s*(#{1,6})\s+(.*)$/;
const FENCE = /^\s*```/;

function parseBlocks(source: string): Block[] {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i++;
      continue;
    }

    if (FENCE.test(line)) {
      const body: string[] = [];
      i++;
      while (i < lines.length && !FENCE.test(lines[i])) {
        body.push(lines[i]);
        i++;
      }
      i++; // skip closing fence (or run off the end)
      blocks.push({ kind: "code", text: body.join("\n") });
      continue;
    }

    const heading = HEADING.exec(line);
    if (heading) {
      blocks.push({ kind: "h", level: heading[1].length, text: heading[2] });
      i++;
      continue;
    }

    if (BULLET.test(line)) {
      const items: string[] = [];
      while (i < lines.length && BULLET.test(lines[i])) {
        items.push(BULLET.exec(lines[i])![1]);
        i++;
        // continuation lines (indented, not a new item) belong to the previous item
        while (i < lines.length && /^\s{2,}\S/.test(lines[i]) && !BULLET.test(lines[i]) && !NUMBERED.test(lines[i])) {
          items[items.length - 1] += " " + lines[i].trim();
          i++;
        }
      }
      blocks.push({ kind: "ul", items });
      continue;
    }

    const numbered = NUMBERED.exec(line);
    if (numbered) {
      const items: string[] = [];
      const start = Number(numbered[1]) || 1;
      while (i < lines.length && NUMBERED.test(lines[i])) {
        items.push(NUMBERED.exec(lines[i])![2]);
        i++;
        while (i < lines.length && /^\s{2,}\S/.test(lines[i]) && !BULLET.test(lines[i]) && !NUMBERED.test(lines[i])) {
          items[items.length - 1] += " " + lines[i].trim();
          i++;
        }
      }
      blocks.push({ kind: "ol", items, start });
      continue;
    }

    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !FENCE.test(lines[i]) &&
      !HEADING.test(lines[i]) &&
      !BULLET.test(lines[i]) &&
      !NUMBERED.test(lines[i])
    ) {
      para.push(lines[i]);
      i++;
    }
    blocks.push({ kind: "p", lines: para });
  }

  return blocks;
}

// Inline tokens, in priority order: `code`, **bold** / __bold__, *italic*.
// (_italic_ is left out so snake_case words are not mangled.)
const INLINE = /(`[^`\n]+`)|(\*\*[^*\n]+?\*\*|__[^_\n]+?__)|(\*[^*\s][^*\n]*?\*)/;

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const out: ReactNode[] = [];
  let rest = text;
  let n = 0;

  while (rest.length > 0) {
    const m = INLINE.exec(rest);
    if (!m) {
      out.push(rest);
      break;
    }
    if (m.index > 0) out.push(rest.slice(0, m.index));
    const token = m[0];
    const key = `${keyPrefix}-${n++}`;
    if (m[1]) {
      out.push(
        <code key={key} className="rounded bg-secondary px-1 py-0.5 font-mono text-[0.85em] text-foreground">
          {token.slice(1, -1)}
        </code>,
      );
    } else if (m[2]) {
      out.push(<strong key={key}>{renderInline(token.slice(2, -2), key)}</strong>);
    } else {
      out.push(<em key={key}>{renderInline(token.slice(1, -1), key)}</em>);
    }
    rest = rest.slice(m.index + token.length);
  }

  return out;
}

export default function SimpleMarkdown({ content, className }: { content: string; className?: string }) {
  const blocks = parseBlocks(content);

  return (
    <div className={`space-y-2 break-words ${className ?? ""}`}>
      {blocks.map((block, b) => {
        const key = `b${b}`;
        switch (block.kind) {
          case "h":
            return (
              <p key={key} className={block.level <= 2 ? "font-display font-medium text-base pt-1" : "font-display font-medium"}>
                {renderInline(block.text, key)}
              </p>
            );
          case "ul":
            return (
              <ul key={key} className="list-disc space-y-1 pl-5">
                {block.items.map((item, idx) => (
                  <li key={idx}>{renderInline(item, `${key}-${idx}`)}</li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol key={key} start={block.start} className="list-decimal space-y-1 pl-5">
                {block.items.map((item, idx) => (
                  <li key={idx}>{renderInline(item, `${key}-${idx}`)}</li>
                ))}
              </ol>
            );
          case "code":
            return (
              <pre key={key} className="overflow-x-auto rounded-md border border-border bg-secondary p-2 font-mono text-xs text-foreground">
                <code>{block.text}</code>
              </pre>
            );
          default:
            return (
              <p key={key}>
                {block.lines.map((line, idx) => (
                  <Fragment key={idx}>
                    {idx > 0 && <br />}
                    {renderInline(line, `${key}-${idx}`)}
                  </Fragment>
                ))}
              </p>
            );
        }
      })}
    </div>
  );
}
