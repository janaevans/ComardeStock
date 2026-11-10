import "./globals.css";

export const metadata = {
  title: {
    default: "Tribunal — Multi-Agent Stock Research",
    template: "%s · Tribunal",
  },
  description:
    "Stock research and risk analysis where a Bull analyst, a Bear analyst and an independent Judge debate the evidence. Educational decision support, not investment advice.",
};

export const viewport = {
  themeColor: "#0a0d12",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-dvh bg-bg text-ink antialiased">{children}</body>
    </html>
  );
}
