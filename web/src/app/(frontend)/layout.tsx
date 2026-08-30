import { Header } from "@/components/base/nav/Header";

export default function FrontendLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-5xl p-6">{children}</main>
    </>
  );
}