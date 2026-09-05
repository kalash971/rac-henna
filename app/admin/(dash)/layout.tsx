import Link from "next/link";
import { ExternalLink, LogOut } from "lucide-react";
import { ThemeToggle } from "@/components/theme";
import { requireAdmin } from "@/lib/auth";
import { logout } from "../actions";
import DashTabs from "./tabs";

/**
 * The gate here is for the redirect; the actual authorisation lives in each
 * page's data call and each Server Function, because those are reachable
 * without ever rendering this layout.
 */
export default async function DashLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <div className="min-h-dvh bg-ink">
      <header className="sticky top-0 z-30 border-b border-line bg-ink/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-4 sm:px-6">
          <Link href="/admin" className="font-display text-xl text-ivory">
            RAC<span className="text-gold">_</span>Henna
          </Link>

          <nav aria-label="Dashboard" className="ml-auto flex items-center gap-1">
            <DashTabs />
            <ThemeToggle className="border-transparent" />
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open the site in a new tab"
              className="flex size-11 items-center justify-center rounded-full text-muted transition-colors hover:text-gold"
            >
              <ExternalLink className="size-4" aria-hidden />
            </a>
            <form action={logout}>
              <button
                type="submit"
                aria-label="Sign out"
                className="flex size-11 items-center justify-center rounded-full text-muted transition-colors hover:text-danger"
              >
                <LogOut className="size-4" aria-hidden />
              </button>
            </form>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">{children}</main>
    </div>
  );
}
