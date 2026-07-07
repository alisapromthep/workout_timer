import "./globals.css";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import ThemeToggle from "../components/ThemeToggle";

const display = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-display",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-mono",
});

export const metadata = {
  title: "Reps — workout timer",
  description: "Paste or describe a workout, then run it.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#FBF8F2",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${display.variable} ${mono.variable}`}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var t = localStorage.getItem('theme');
                if (t) document.documentElement.setAttribute('data-theme', t);
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className="font-display min-h-screen">
        <ThemeToggle />
        {children}
      </body>
    </html>
  );
}
