import { ShieldAlert } from 'lucide-react';

export function Disclaimer() {
  return (
    <section className="rounded-lg border border-amber-300/70 bg-amber-50 p-4 text-sm text-amber-950 shadow-soft dark:border-amber-500/30 dark:bg-amber-950/30 dark:text-amber-100">
      <div className="flex items-start gap-3">
        <ShieldAlert className="mt-0.5 h-5 w-5 flex-none" aria-hidden="true" />
        <p>
          <strong>Bu araç yatırım tavsiyesi değildir.</strong> Sadece kullanıcının belirlediği hedef dağılıma göre matematiksel yeniden dengeleme hesabı yapar. Fiyatlar gecikmeli veya hatalı olabilir; emir vermeden önce aracı kurumunuzdaki fiyatları kontrol edin.
        </p>
      </div>
    </section>
  );
}
