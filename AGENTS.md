# AGENTS.md

## Proje amacı

Bu proje, kullanıcının girdiği mevcut portföyü kullanıcının belirlediği hedef portföye göre matematiksel olarak yeniden dengeleyen statik React uygulamasıdır. Yatırım tavsiyesi üretmez ve emir göndermez.

## Kod standartları

- React + TypeScript + Vite kullanılır.
- Styling Tailwind CSS ile yapılır.
- Hesaplama fonksiyonları `src/lib/rebalance.ts` içinde saf fonksiyon olarak tutulur.
- Fiyat servisleri `src/lib/priceService.ts` içinde kalır.
- Sembol normalizasyonu `src/lib/symbol.ts` içinde kalır.
- CSV export `src/lib/csv.ts`, localStorage `src/lib/storage.ts` içinde kalır.
- UI componentleri `src/components/` altında tutulur.

## Test komutları

- `npm test`
- `npm run lint`
- `npm run build`

## Rebalancing kuralları

- Hedef portföy hisse sayısı sınırsızdır.
- Varsayılan hedef ağırlık eşittir: `100 / hedef hisse sayısı`.
- Mevcut portföyde olup hedefte olmayan hisseler için `TAMAMINI SAT` gösterilir.
- Hedefte olup mevcutta olmayan hisseler için `YENİ ALIM` gösterilir.
- Hedef lot mevcut lottan büyükse `AL`, küçükse `SAT`, eşitse `TUT` olur.
- Tam lot modunda hedef lot aşağı yuvarlanır ve kalan nakit ayrıca gösterilir.
- Fractional shares açıkken sadece US hisselerinde kesirli adet hesaplanabilir.
- BIST ve US aynı portföydeyse USD/TRY kuru gerekir.

## BIST sembol kuralı

- Kullanıcı `.IS` yazmaz.
- UI'da ve CSV çıktısında `.IS` gösterilmez.
- `.IS` sadece gerekiyorsa `priceService` ve fiyat cache scriptinde arka planda kullanılır.

## Deploy mantığı

- Uygulama backend gerektirmez ve GitHub Pages üzerinde statik çalışır.
- `ci.yml`: install, lint, test, build.
- `deploy.yml`: GitHub Pages deploy.
- `prices.yml`: fiyat cache güncelleme denemesi; hata olursa mevcut `public/prices.json` korunur.
