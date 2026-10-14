// The app mark: a serif "L" over a thin rule, on ink. Rendered to PNG by next/og.
export function IconArt({ size }: { size: number }) {
  return (
    <div style={{ width: size, height: size, background: "#0e0e0c", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "#ece9e1", fontSize: size * 0.56, fontFamily: "Georgia, serif", lineHeight: 1, marginTop: -size * 0.04 }}>L</div>
      <div style={{ width: size * 0.34, height: Math.max(2, size * 0.014), background: "#6cc296", marginTop: size * 0.05 }} />
    </div>
  );
}
