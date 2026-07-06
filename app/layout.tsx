import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { CartProvider } from "../context/CartContext";
import { Toaster } from "react-hot-toast";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Chicken Delight | Fresh, Hot & Delicious Online Ordering",
  description: "Don't cook tonight, order online from Chicken Delight! Delicious fried chicken, combos, burgers, sides, and more delivered fresh to your door.",
  keywords: "chicken delight, online order, fast food delivery, takeout, fried chicken, burgers, meals",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full`}>
      <body className="min-h-full flex flex-col font-sans">
        <CartProvider>
          {children}
          <Toaster 
            position="bottom-right" 
            toastOptions={{
              duration: 3000,
              style: {
                background: '#FFFFFF',
                color: '#1C1917',
                borderRadius: '12px',
                border: '1px solid #E7E5E4',
                fontSize: '13px',
                fontWeight: '600',
              },
              success: {
                iconTheme: {
                  primary: '#F97316',
                  secondary: '#FFFFFF',
                },
              },
            }}
          />
        </CartProvider>
      </body>
    </html>
  );
}
