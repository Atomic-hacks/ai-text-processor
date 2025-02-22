import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Head from "next/head";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI Text Processing App",
  description: "An AI-powered text processing interface with summarization, translation, and language detection.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <Head>
        <meta httpEquiv="origin-trial" content="AmwGD3ien2DN68/EAPO+CJgyCWsMpgRYMAPF+WmYV83SmRnje8SokkfSn9DjP3YVz7Xo0PIrEYUhw1VeqTLZVwQAAACBeyJvcmlnaW4iOiJodHRwczovL2FpLXRleHQtcHJvY2Vzc29yLXNvb3R5LnZlcmNlbC5hcHA6NDQzIiwiZmVhdHVyZSI6IkFJU3VtbWFyaXphdGlvbkFQSSIsImV4cGlyeSI6MTc1MzE0MjQwMCwiaXNTdWJkb21haW4iOnRydWV9" />
        <meta httpEquiv="origin-trial" content="AlHEd/dS619mLYSqA3e9++Aw8KZmnevFf08N33RaqLUZ8DmMvfHeuxQYGeok80pdzlqNZgyYltUrQVl2g4jUqQMAAACDeyJvcmlnaW4iOiJodHRwczovL2FpLXRleHQtcHJvY2Vzc29yLXNvb3R5LnZlcmNlbC5hcHA6NDQzIiwiZmVhdHVyZSI6Ikxhbmd1YWdlRGV0ZWN0aW9uQVBJIiwiZXhwaXJ5IjoxNzQ5NTk5OTk5LCJpc1N1YmRvbWFpbiI6dHJ1ZX0=" />
        <meta httpEquiv="origin-trial" content="AolPFIEkYJIzuapFPP6YlKqcOdklY4hZW/c3XGXUbRxEdBxJ5nt2maALkewearY9qkOfEr6Q9VoOHKkzqubtHgoAAAB9eyJvcmlnaW4iOiJodHRwczovL2FpLXRleHQtcHJvY2Vzc29yLXNvb3R5LnZlcmNlbC5hcHA6NDQzIiwiZmVhdHVyZSI6IlRyYW5zbGF0aW9uQVBJIiwiZXhwaXJ5IjoxNzUzMTQyNDAwLCJpc1N1YmRvbWFpbiI6dHJ1ZX0=" />
      </Head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}