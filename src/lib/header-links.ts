export type HeaderLinkTarget = "_self" | "_blank";

export type HeaderLinkItem = {
  label: string;
  href: string;
  target: HeaderLinkTarget;
};

function normalizeTarget(value?: string): HeaderLinkTarget {
  const target = (value || "").trim().toLowerCase();
  if (target === "_blank" || target === "blank" || target === "new" || target === "new_tab") return "_blank";
  return "_self";
}

function isAllowedHref(href: string) {
  return href.startsWith("/") || href.startsWith("https://") || href.startsWith("http://");
}

export function parseHeaderLinks(value?: string | null): HeaderLinkItem[] {
  return (value || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split("|").map((part) => part.trim());
      const label = parts[0] || "";
      const target = parts.length > 2 ? normalizeTarget(parts[parts.length - 1]) : "_self";
      const href = parts.length > 2 ? parts.slice(1, -1).join("|").trim() : (parts[1] || "").trim();
      return { label, href, target };
    })
    .filter((link) => link.label && link.href && isAllowedHref(link.href));
}

export function serializeHeaderLinks(links: HeaderLinkItem[]) {
  return links
    .map((link) => ({
      label: link.label.trim(),
      href: link.href.trim(),
      target: normalizeTarget(link.target),
    }))
    .filter((link) => link.label && link.href)
    .map((link) => `${link.label} | ${link.href} | ${link.target}`)
    .join("\n");
}
