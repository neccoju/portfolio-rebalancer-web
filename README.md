# Portfolio Rebalancer Web

React + TypeScript + Vite ile hazırlanmış statik portföy yeniden dengeleme hesaplayıcısı.

Bu uygulama yatırım tavsiyesi değildir. Kullanıcının belirlediği hedef dağılıma göre matematiksel al/sat farkı üretir; emir göndermez.

## Kurulum

```bash
npm install
```

## Lokal çalıştırma

```bash
npm run dev
```

Vite varsayılan olarak `http://localhost:5173` adresinde çalışır.

## Test çalıştırma

```bash
npm test
```

## Build alma

```bash
npm run build
```

## GitHub Pages deploy

1. Repo ayarlarında `Settings > Pages` bölümüne gidin.
2. Source olarak `GitHub Actions` seçin.
3. `main` branch'e push yapıldığında `.github/workflows/deploy.yml` build alır ve Pages deploy yapar.
4. Demo adresi: `https://neccoju.github.io/portfolio-rebalancer-web/`

## BIST sembol kullanımı

BIST hisseleri `.IS` olmadan girilir:

```text
THYAO
BIMAS
KCHOL
ASELS
TUPRS
```

Fiyat kaynağı `.IS` isterse dönüşüm sadece `src/lib/priceService.ts` içinde arka planda yapılır. UI, tablo ve CSV çıktısı `.IS` göstermez.

## ABD sembol kullanımı

ABD hisseleri normal sembol formatıyla girilir:

```text
AAPL
NVDA
MSFT
VOO
QQQM
```

## Manuel fiyat fallback sistemi

Uygulama önce `public/prices.json` cache dosyasına bakar. Cache yoksa tarayıcıdan canlı fiyat denemesi yapar. CORS veya kaynak kısıtı nedeniyle fiyat alınamazsa satırdaki manuel fiyat alanı ile hesaplama devam eder.

BIST ve US aynı portföydeyse USD/TRY kuru gerekir. Otomatik kur alınamazsa ayarlardaki manuel kur alanı kullanılmalıdır.

## CSV export

`CSV indir` butonu al/sat emir tablosunu indirir. CSV çıktısında BIST sembolleri `.IS` olmadan görünür.

## JSON import/export

- `JSON dışa aktar`: mevcut portföy, hedef portföy, ayarlar ve tema tercihini indirir.
- `JSON içe aktar`: aynı formatı geri yükler.

## Sorumluluk reddi

Bu araç yatırım tavsiyesi değildir. Sadece kullanıcının belirlediği hedef dağılıma göre matematiksel yeniden dengeleme hesabı yapar. Fiyatlar gecikmeli veya hatalı olabilir; emir vermeden önce aracı kurumunuzdaki fiyatları kontrol edin.

Uygulama emir göndermez. Sadece hesaplama çıktısı üretir. Alım/satım kararından kullanıcı sorumludur.
