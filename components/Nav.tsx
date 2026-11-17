"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { IcoAltro, IcoCerca, IcoDeposito, IcoScaffale, IcoScanner } from "./Icone";

const VOCI = [
  { href: "/", label: "Cerca", Ico: IcoCerca },
  { href: "/scanner", label: "Scanner", Ico: IcoScanner },
  { href: "/scaffali", label: "Scaffali", Ico: IcoScaffale },
  { href: "/depositi", label: "Depositi", Ico: IcoDeposito },
  { href: "/altro", label: "Altro", Ico: IcoAltro },
];

export default function Nav() {
  const path = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-800 bg-ink text-white"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <ul className="mx-auto grid max-w-xl grid-cols-5">
        {VOCI.map(({ href, label, Ico }) => {
          const attivo = href === "/" ? path === "/" : path.startsWith(href);
          return (
            <li key={href}>
              <Link href={href} className={`flex min-h-16 flex-col items-center justify-center gap-0.5 text-xs font-bold ${attivo ? "text-brand" : "text-gray-300"}`}>
                <Ico />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
