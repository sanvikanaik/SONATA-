import "./globals.css";
import Nav from "@/components/Nav";

export const metadata = { title: "Sonata | Music gig marketplace", description: "Book musicians. Find gigs." };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Nav />
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
