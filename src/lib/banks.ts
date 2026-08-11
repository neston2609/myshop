export type BankOption = {
  code: string;
  name: string;
  shortName: string;
  color: string;
};

export const thaiBanks: BankOption[] = [
  { code: "SCB", name: "Siam Commercial Bank", shortName: "SCB", color: "#4e2a84" },
  { code: "KBANK", name: "Kasikornbank", shortName: "KBank", color: "#138f2d" },
  { code: "KTB", name: "Krungthai Bank", shortName: "KTB", color: "#00a6d6" },
  { code: "BBL", name: "Bangkok Bank", shortName: "BBL", color: "#1f4e9d" },
  { code: "BAY", name: "Krungsri", shortName: "BAY", color: "#f6c343" },
  { code: "TTB", name: "TMBThanachart Bank", shortName: "ttb", color: "#f36f21" },
  { code: "GSB", name: "Government Savings Bank", shortName: "GSB", color: "#ec168c" },
  { code: "UOB", name: "UOB Thailand", shortName: "UOB", color: "#005eb8" },
  { code: "CIMB", name: "CIMB Thai", shortName: "CIMB", color: "#d71920" },
  { code: "BAAC", name: "BAAC", shortName: "BAAC", color: "#7bb342" },
  { code: "OTHER", name: "Other bank", shortName: "BANK", color: "#334155" },
];

export function findBank(codeOrName?: string | null) {
  if (!codeOrName) return null;
  const normalized = codeOrName.toLowerCase();
  return thaiBanks.find((bank) => bank.code.toLowerCase() === normalized || bank.name.toLowerCase() === normalized) || null;
}
