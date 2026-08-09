import { saveSmtpAction } from "@/app/actions";
import { SmtpTestPanel } from "@/components/smtp-test-panel";
import { prisma } from "@/lib/prisma";

export default async function SmtpSettingsPage() {
  const settings = await prisma.smtpSettings.findFirst();
  return (
    <div className="grid max-w-2xl gap-4">
      <form action={saveSmtpAction} className="grid gap-4 rounded-lg border border-black/10 bg-white p-5">
        <div>
          <h2 className="font-semibold">SMTP settings</h2>
          <p className="mt-1 text-sm text-slate-600">Supports Gmail SMTP, transactional providers, TLS, and SSL.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <input name="host" defaultValue={settings?.host} placeholder="smtp.gmail.com" required className="h-10 rounded-md border border-black/10 px-3" />
          <input name="port" defaultValue={settings?.port || 465} type="number" required className="h-10 rounded-md border border-black/10 px-3" />
          <input name="username" defaultValue={settings?.username} placeholder="Username" required className="h-10 rounded-md border border-black/10 px-3" />
          <input name="password" type="password" placeholder="Password or app password" required className="h-10 rounded-md border border-black/10 px-3" />
          <input name="senderEmail" defaultValue={settings?.senderEmail} type="email" placeholder="Sender email" required className="h-10 rounded-md border border-black/10 px-3" />
          <input name="senderName" defaultValue={settings?.senderName} placeholder="Sender name" required className="h-10 rounded-md border border-black/10 px-3" />
        </div>
        <label className="flex items-center gap-2 text-sm"><input name="secure" type="checkbox" defaultChecked={settings?.secure ?? true} /> TLS/SSL</label>
        <label className="flex items-center gap-2 text-sm"><input name="enabled" type="checkbox" defaultChecked={settings?.enabled ?? true} /> Enabled</label>
        <button className="h-10 rounded-md bg-[#17201c] font-semibold text-white">Save SMTP</button>
      </form>
      <SmtpTestPanel defaultEmail={settings?.senderEmail} configured={Boolean(settings)} />
    </div>
  );
}
