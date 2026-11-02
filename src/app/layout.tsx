import type { Metadata } from "next";
import "./globals.css";
export const metadata:Metadata={title:"Cinephil — Your world, in progress",description:"One home for every story you watch and read."};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
