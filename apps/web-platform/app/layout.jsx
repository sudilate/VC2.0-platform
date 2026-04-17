export const metadata = {
    title: "VC Platform",
    description: "Enterprise VC 2.0 platform",
};
export default function RootLayout({ children }) {
    return (<html lang="en">
      <body>{children}</body>
    </html>);
}
