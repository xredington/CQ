/**
 * Minimal markdown renderer for member content — bold, italics, lists,
 * links and headings, matching the composer hint ("Bold, lists and links
 * supported"). Input is HTML-escaped before any transformation, and link
 * hrefs are restricted to http(s), so output is safe to inject.
 */

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function inline(text: string): string {
  return (
    text
      // [label](https://…)
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_m, label, href) => {
        return `<a href="${href}" target="_blank" rel="noopener noreferrer">${label}</a>`;
      })
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, "$1<em>$2</em>")
      .replace(/`([^`]+)`/g, "<code>$1</code>")
  );
}

export function renderMarkdown(md: string): string {
  const lines = escapeHtml(md.replace(/\r\n/g, "\n")).split("\n");
  const html: string[] = [];
  let list: "ul" | "ol" | null = null;
  let paragraph: string[] = [];

  const closeList = () => {
    if (list) {
      html.push(`</${list}>`);
      list = null;
    }
  };
  const closeParagraph = () => {
    if (paragraph.length > 0) {
      html.push(`<p>${paragraph.map(inline).join("<br />")}</p>`);
      paragraph = [];
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const heading = /^(#{1,4})\s+(.*)$/.exec(line);
    const bullet = /^[-*]\s+(.*)$/.exec(line);
    const ordered = /^\d+[.)]\s+(.*)$/.exec(line);

    if (line.trim() === "") {
      closeParagraph();
      closeList();
    } else if (heading) {
      closeParagraph();
      closeList();
      const level = Math.min(heading[1].length + 2, 5); // #→h3 inside content
      html.push(`<h${level}>${inline(heading[2])}</h${level}>`);
    } else if (bullet) {
      closeParagraph();
      if (list !== "ul") {
        closeList();
        html.push("<ul>");
        list = "ul";
      }
      html.push(`<li>${inline(bullet[1])}</li>`);
    } else if (ordered) {
      closeParagraph();
      if (list !== "ol") {
        closeList();
        html.push("<ol>");
        list = "ol";
      }
      html.push(`<li>${inline(ordered[1])}</li>`);
    } else {
      closeList();
      paragraph.push(line);
    }
  }
  closeParagraph();
  closeList();
  return html.join("\n");
}
