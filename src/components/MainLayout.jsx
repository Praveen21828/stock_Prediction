import React, { useEffect } from "react";

export default function MainLayout({ children }) {
  useEffect(() => {
    const root = document.documentElement;
    const storedTheme = localStorage.getItem("theme");

    if (storedTheme === "light" || storedTheme === "dark") {
      root.setAttribute("data-theme", storedTheme);
    }

    function handleThemeToggle(event) {
      const button = event.target.closest(".theme-toggle");
      if (!button) return;

      const prefersLight = window.matchMedia(
        "(prefers-color-scheme: light)"
      ).matches;
      const currentTheme =
        root.getAttribute("data-theme") || (prefersLight ? "light" : "dark");
      const nextTheme = currentTheme === "light" ? "dark" : "light";

      root.setAttribute("data-theme", nextTheme);
      localStorage.setItem("theme", nextTheme);
    }

    document.addEventListener("click", handleThemeToggle);

    return () => {
      document.removeEventListener("click", handleThemeToggle);
    };
  }, []);

  return <>{children}</>;
}
