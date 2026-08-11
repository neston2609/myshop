import { findBank } from "@/lib/banks";

export function BankLogo({ code, name, className = "" }: { code?: string | null; name?: string | null; className?: string }) {
  const bank = findBank(code) || findBank(name) || { shortName: "BANK", color: "#334155" };

  return (
    <span
      aria-label={name || bank.shortName}
      title={name || bank.shortName}
      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[9px] font-black uppercase text-white ${className}`}
      style={{ backgroundColor: bank.color }}
    >
      {bank.shortName.slice(0, 4)}
    </span>
  );
}
