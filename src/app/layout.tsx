import type { Metadata } from "next";
import { Fraunces, Manrope } from "next/font/google";
import { Providers } from "@/components/Providers";
import "./globals.css";

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
});

const body = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "RocketCV — tailor a resume to a job",
  description:
    "Match your resume to a job, then export a layout and see how much of the PDF a text extract keeps.",
  metadataBase: new URL("https://resume.tomorrowtools.dev"),
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "https://resume.tomorrowtools.dev/",
    siteName: "RocketCV",
    title: "RocketCV — tailor a resume to a job",
    description: "Match your resume to a job, then export a layout and see how much of the PDF a text extract keeps.",
    images: [{ url: "/og.png", width: 1200, height: 628, alt: "RocketCV" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "RocketCV — tailor a resume to a job",
    description: "Match your resume to a job, then export a layout and see how much of the PDF a text extract keeps.",
    images: ["/og.png"],
  },
  icons: {
    icon: "/rocketcv-mark.svg",
    apple: "/rocketcv-mark.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} h-full`}>
      <body className="min-h-full antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
