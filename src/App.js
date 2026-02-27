import React, { useEffect, useMemo } from "react";
import { useRouter } from "next/router";

const TAB_TO_APP_URL = {
  tasks: process.env.NEXT_PUBLIC_TASKS_APP_URL,
  projects: process.env.NEXT_PUBLIC_PROJECTS_APP_URL,
  people: process.env.NEXT_PUBLIC_CONTACTS_APP_URL,
};

const SUPPORTED_TABS = new Set(["tasks", "projects", "people"]);

function getTabValue(rawTab) {
  const value = Array.isArray(rawTab) ? rawTab[0] : rawTab;
  if (!value) return null;
  if (value === "dreams") return "tasks";
  if (SUPPORTED_TABS.has(value)) return value;
  return null;
}

function buildRedirectUrl(baseUrl, routerQuery) {
  const url = new URL(baseUrl, window.location.origin);
  Object.entries(routerQuery).forEach(([key, value]) => {
    if (key === "tab") return;
    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item != null) url.searchParams.append(key, String(item));
      });
      return;
    }
    if (value != null) {
      url.searchParams.set(key, String(value));
    }
  });
  return url.toString();
}

function App() {
  const router = useRouter();

  const links = useMemo(
    () => [
      { key: "tasks", label: "Tasks", href: TAB_TO_APP_URL.tasks },
      { key: "projects", label: "Projects", href: TAB_TO_APP_URL.projects },
      { key: "people", label: "Contacts", href: TAB_TO_APP_URL.people },
    ],
    []
  );

  useEffect(() => {
    if (!router.isReady) return;

    const requestedTab = getTabValue(router.query.tab);
    const hadDreamsTab =
      (Array.isArray(router.query.tab) ? router.query.tab[0] : router.query.tab) === "dreams";

    if (!requestedTab) return;

    const destination = TAB_TO_APP_URL[requestedTab];
    if (destination) {
      window.location.replace(buildRedirectUrl(destination, router.query));
      return;
    }

    if (hadDreamsTab) {
      router.replace({ pathname: "/" }, undefined, { shallow: true });
    }
  }, [router]);

  return (
    <main style={{ padding: 24 }}>
      <h1>FOMO Life</h1>
      <p>Legacy root shell. Use extracted apps:</p>
      <ul>
        {links.map((link) => (
          <li key={link.key}>
            {link.href ? (
              <a href={link.href}>{link.label}</a>
            ) : (
              <span>{link.label} (URL not configured)</span>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}

export default App;
