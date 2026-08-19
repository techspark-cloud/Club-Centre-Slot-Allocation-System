import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ 
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RIT Club & Centre Allocation",
  description: "Official portal for RIT students to book their Club and Centre activity slots.",
  keywords: ["RIT", "Rajalakshmi Institute of Technology", "Club Allocation", "Centre Allocation", "Student Portal", "TechSpark"],
  authors: [{ name: "TechSpark" }],
  openGraph: {
    title: "RIT Club & Centre Allocation Portal",
    description: "Secure your slots for RIT Clubs and Centres for the upcoming academic session.",
    url: "https://techspark-slots.vercel.app",
    siteName: "RIT Allocation Portal",
    images: [
      {
        url: "/rit-logo.png",
        width: 800,
        height: 600,
        alt: "RIT Logo",
      },
    ],
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "RIT Club & Centre Allocation Portal",
    description: "Secure your slots for RIT Clubs and Centres for the upcoming academic session.",
    images: ["/rit-logo.png"],
  },
  icons: {
    icon: "/favicon.webp",
    apple: "/rit-logo.png",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${jakarta.className} antialiased`}>
        {children}
      </body>
    </html>
  );
}
