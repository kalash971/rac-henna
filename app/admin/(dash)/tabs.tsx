"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Images, Inbox } from "lucide-react";

const TABS = [
  { href: "/admin", label: "Enquiries", Icon: Inbox },
  { href: "/admin/gallery", label: "Gallery", Icon: Images },
];

/**
 * The labels are hidden on a phone to fit the header, which left two
 * indistinguishable icons and no way to tell which page you were on. The
 * active tab now carries the accent colour, a surface, and an underline —
 * three cues, not colour alone.
 */
export default function DashTabs() {
  const pathname = usePathname();

  return (
    <>
      {TABS.map(({ href, label, Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`relative flex min-h-11 items-center gap-2 rounded-full px-3 text-sm transition-colors duration-200 ${
              active
                ? "bg-ink-3 text-gold"
                : "text-muted hover:bg-ink-2 hover:text-ivory"
            }`}
          >
            <Icon className="size-4" aria-hidden />
            <span className="hidden sm:inline">{label}</span>
            <span className="sr-only sm:hidden">{label}</span>
            <span
              aria-hidden
              className={`absolute inset-x-3 -bottom-px h-0.5 origin-center rounded-full bg-gold transition-transform duration-300 ${
                active ? "scale-x-100" : "scale-x-0"
              }`}
              style={{ transitionTimingFunction: "var(--ease-silk)" }}
            />
          </Link>
        );
      })}
    </>
  );
}
