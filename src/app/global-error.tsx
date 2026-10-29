"use client";

/**
 * Last-resort error page, when even the root layout fails: it replaces the whole document, so it carries its own
 * <html> / <body> and plain inline styles (the site's CSS may not be loaded).
 */
export default function GlobalError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="fr">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#ffffff", color: "#172536" }}>
        <main style={{ maxWidth: 560, margin: "15vh auto", padding: "0 24px" }}>
          <p style={{ fontSize: 13, letterSpacing: "0.16em", textTransform: "uppercase" }}>Jérémy Galéa · Méthode JG®</p>
          <span style={{ display: "block", width: 48, height: 2, background: "#D4A866", margin: "16px 0 24px" }} />
          <h1 style={{ fontSize: 32, margin: 0 }}>Un problème est survenu.</h1>
          <p style={{ lineHeight: 1.6 }}>Le site n’a pas pu s’afficher. Réessayez dans un instant.</p>
          <button
            type="button"
            onClick={() => retry()}
            style={{
              marginTop: 16,
              padding: "14px 28px",
              border: 0,
              borderRadius: 7,
              background: "#172536",
              color: "#ffffff",
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Réessayer
          </button>
        </main>
      </body>
    </html>
  );
}
