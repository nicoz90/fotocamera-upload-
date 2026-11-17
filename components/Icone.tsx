type P = { className?: string };
const base = "h-7 w-7";
const svg = (d: React.ReactNode) =>
  function Icona({ className = base }: P) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round"
        strokeLinejoin="round" className={className} aria-hidden="true">{d}</svg>
    );
  };

export const IcoCerca = svg(<><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>);
export const IcoScanner = svg(<><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" /><path d="M7 8v8M10 8v8M13 8v8M17 8v8" /></>);
export const IcoScaffale = svg(<><path d="M4 3v18M20 3v18M4 8h16M4 14h16M4 20h16" /></>);
export const IcoDeposito = svg(<><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3.5" /></>);
export const IcoAltro = svg(<><circle cx="5" cy="12" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="19" cy="12" r="1.5" /></>);
export const IcoIndietro = svg(<path d="M15 18 9 12l6-6" />);
export const IcoPiu = svg(<path d="M12 5v14M5 12h14" />);
export const IcoFoto = svg(<><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></>);
export const IcoAvviso = svg(<><path d="M12 3 2 21h20z" /><path d="M12 10v5M12 18v.01" /></>);
export const IcoTelefono = svg(<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />);
