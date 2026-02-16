# ⚔️ Albion Online Market Data Bot

Bu proje, **Albion Online** oyuncuları için geliştirilmiş, **Albion Data Project API** verilerini kullanarak pazar analizi yapan gelişmiş bir Telegram botudur.

Pazar fırsatlarını (Market Flipping), Black Market arbitrajlarını, Crafting kârlarını ve Gathering (Toplayıcılık) için en değerli kaynakları analiz eder ve anlık bildirim gönderir.

## 🚀 Özellikler

- **🔄 Flip Modu:** Aynı şehirdeki al-sat fırsatlarını (Buy Order -> Sell Order) analiz eder.
- **💀 Black Market Modu:** Royal şehirlerden alıp Caerleon Black Market'e satma fırsatlarını tarar.
- **⛏️ Gathering Modu:** Bulunduğunuz şehirdeki en değerli ham kaynakları (Tier ve Enchant seviyesine göre) listeler.
- **⚒️ Crafting Modu:** Hammadde maliyetlerini ve işlenmiş ürün fiyatlarını karşılaştırarak Refining (İşleme) kârlarını hesaplar.
- **📊 Hacim Analizi:** Ürünlerin son 24 saatteki satış hacmini kontrol eder, ölü yatırımları engeller.
- **⚙️ Dinamik Ayarlar:** Telegram üzerinden komutlarla tüm parametreleri (Sermaye, Şehir, Premium durumu vb.) yönetebilirsiniz.

## 🛠️ Kurulum

Projeyi yerel makinenizde çalıştırmak için aşağıdaki adımları izleyin.

### Gereksinimler
- [Node.js](https://nodejs.org/) (v16 veya üzeri)
- Bir Telegram Bot Token'ı (BotFather'dan alınır)

### Adım 1: Projeyi Klonlayın
```bash
git clone https://github.com/bulutemresakarya/albion-data-telegram-bot.git
cd albion-data-telegram-bot
```

### Adım 2: Bağımlılıkları Yükleyin
```bash
npm install
```

### Adım 3: Ayarları Yapılandırın
1. `.env.example` dosyasının adını `.env` olarak değiştirin.
2. Dosyayı açın ve gerekli bilgileri girin:

```env
TELEGRAM_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
ADMIN_CHAT_ID=123456789
```
*(Chat ID'nizi öğrenmek için botunuza herhangi bir mesaj atıp console loglarına bakabilir veya ID Bot kullanabilirsiniz.)*

### Adım 4: Botu Başlatın
```bash
npm start
```

## 🎮 Komutlar

Bot çalışırken Telegram üzerinden aşağıdaki komutları kullanabilirsiniz:

| Komut | Açıklama |
|-------|----------|
| `/durum` | Mevcut ayarları ve bot durumunu gösterir. |
| `/sehir [Isim]` | Analiz yapılacak şehri değiştirir (Örn: `/sehir Martlock`). |
| `/mod [mod_adi]` | Çalışma modunu değiştirir (`flip`, `blackmarket`, `gathering`, `crafting`). |
| `/fiyat [Urun]` | Belirtilen ürünün tüm şehirlerdeki fiyatlarını listeler. |
| `/items [Urun]` | Ürün adı araması yapar ve ID'sini bulur. |
| `/premium [on/off]` | Premium üyelik durumunu değiştirir (Vergi hesaplaması için). |
| `/kar [Miktar]` | Minimum kâr hedefini belirler. |
| `/marj [Yuzde]` | Minimum kâr marjını (%) belirler. |
| `/hacim [Adet]` | Minimum günlük satış hacmini belirler. |
| `/mintier [4-8]` | Taranacak minimum eşya seviyesi. |
| `/veri [Dakika]` | Verinin maksimum kaç dakika eski olabileceğini belirler. |
| `/kaynaklar [on/off]` | Hammadde taramasını açar/kapatır. |

## 📂 Proje Yapısı

- `bot.js`: Ana uygulama dosyası, döngüleri ve Telegram bağlantısını yönetir.
- `commands.js`: Telegram komutlarını işleyen modül.
- `items.js`: Eşya isimleri, çeviriler ve ID eşleştirmeleri.
- `helpers.js`: Yardımcı fonksiyonlar (Zaman hesaplama, Levenshtein vb.).
- `settings.json`: Botun çalışma ayarlarını tutar (Otomatik oluşturulur).

## ⚠️ Uyarı

Bu bot **Albion Online Data Project** (AOD) verilerini kullanır. Verilerin güncel olması için oyun oynarken arka planda Albion Data Client çalıştırmanız veya çalışan diğer oyunculardan veri gelmesini beklemeniz gerekir.

## 🤝 Katkıda Bulunma

Pull request'ler kabul edilir. Büyük değişiklikler için lütfen önce neyi değiştirmek istediğinizi tartışmak üzere bir konu (issue) açınız.

## 📄 Lisans


MIT
