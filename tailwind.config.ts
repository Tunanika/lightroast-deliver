import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Surface-aware tokens (driven by CSS vars on [data-surface]).
        bg: "var(--bg)",
        "bg-soft": "var(--bg-soft)",
        "bg-elevated": "var(--bg-elevated)",
        fg: "var(--fg)",
        "fg-muted": "var(--fg-muted)",
        "fg-subtle": "var(--fg-subtle)",
        border: "var(--border)",
        "border-strong": "var(--border-strong)",
        accent: "var(--accent)",
        "accent-fg": "var(--accent-fg)",
        // Fixed brand tokens.
        ink: "#0A0A0A",
        paper: "#FFFFFF",
        "paper-soft": "#F5F4F1",
      },
      fontFamily: {
        sans: ["var(--font-host)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      letterSpacing: {
        display: "-0.04em",
        heading: "-0.02em",
        subhead: "-0.02em",
        meta: "0.2em",
      },
      borderRadius: {
        // Sharp corners by default; inputs may use 4px at most.
        none: "0",
        DEFAULT: "0",
        sm: "4px",
      },
      boxShadow: {
        // Cards are flat. No shadows.
        none: "none",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
      animation: {
        // Gentle motion only: 240-420ms, ease-out. Never bouncy.
        "fade-up": "fade-up 360ms cubic-bezier(0.22, 1, 0.36, 1) both",
        "fade-in": "fade-in 280ms cubic-bezier(0.22, 1, 0.36, 1) both",
        marquee: "marquee 60s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
