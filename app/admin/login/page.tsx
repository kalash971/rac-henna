import { redirect } from "next/navigation";
import { adminConfigured, isAdmin } from "@/lib/auth";
import LoginForm from "./login-form";

export default async function LoginPage() {
  if (await isAdmin()) redirect("/admin");

  if (!adminConfigured()) {
    return (
      <main className="mx-auto max-w-lg px-5 py-20">
        <h1 className="text-3xl text-ivory">Dashboard not set up yet</h1>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          Three environment variables need to be set before anyone can sign in.
          There is no default password.
        </p>
        <ul className="mt-6 space-y-3 text-sm">
          {[
            ["MONGODB_URI", "MongoDB Atlas connection string"],
            ["ADMIN_PASSWORD", "the password you will sign in with"],
            ["AUTH_SECRET", "any long random string — signs the session cookie"],
          ].map(([name, why]) => (
            <li key={name} className="glass rounded-2xl p-4">
              <code className="text-gold">{name}</code>
              <p className="mt-1 text-muted">{why}</p>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-xs text-muted">
          See <code className="text-gold">.env.example</code>. Restart the dev server after
          adding them.
        </p>
      </main>
    );
  }

  return <LoginForm />;
}
