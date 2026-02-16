const axios = require('axios');
require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const { timeAgo, getMinutesOld } = require('./helpers');
const { allItems, getItemName, findItemByName, qualityNames } = require('./items');
const { handleCommand } = require('./commands');

// --- AYARLAR ---
const token = process.env.TELEGRAM_TOKEN;
const chatId = process.env.ADMIN_CHAT_ID;
const SETTINGS_FILE = 'settings.json';

// Varsayılan ayarlar
let settings = {
    city: 'Bridgewatch',
    isPremium: true,
    sermaye: 303000,
    blacklist: [], // Yasaklı ürünler listesi
    mode: 'flip',  // 'flip' veya 'transport'
    minProfit: 150000, // Min. Toplam Kâr (YÜKSELTİLDİ: Çerez parasıyla uğraşma)
    minMargin: 25,    // Min. Kâr Marjı (%) (YÜKSELTİLDİ: Riske değsin)
    minVolume: 1,     // Min. Günlük Satış (DÜŞÜRÜLDÜ: Hız önemli değil)
    minTier: 5,       // EKLENDİ: Min. Seviye (T5 ve üzeri - Çöp ayıklama)
    maxTier: 8,       // EKLENDİ: Max. Seviye (T8'e kadar)
    maxDataAge: 120,  // EKLENDİ: Maksimum veri yaşı (Nadir eşyalar geç güncellenir)
    maxAdet: 10,      // EKLENDİ: Maksimum alım adedi (Sepet çeşitliliği için)
    includeResources: true, // EKLENDİ: Hammadde taraması
    maxResourceAdet: 999,   // EKLENDİ: Hammaddeler için özel stok limiti
    minEnchant: 0     // EKLENDİ: Gathering için min büyüleme seviyesi
};

// Varsa kayıtlı ayarları yükle
if (fs.existsSync(SETTINGS_FILE)) {
    try {
        const savedData = JSON.parse(fs.readFileSync(SETTINGS_FILE));
        settings = { ...settings, ...savedData };

    } catch (e) {
        console.error("Ayarlar dosyası okunamadı, varsayılanlar kullanılıyor.");
    }
}

function saveSettings() {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
}

if (!token) {
    console.error("HATA: .env dosyasında TELEGRAM_TOKEN bulunamadı!");
    process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });
// Polling hatalarını yakala (Botun çökmesini engeller)
bot.on('polling_error', (error) => {
    console.log(`⚠️ Polling Hatası: ${error.code || error.message}`);
});
let lastSentAlerts = new Set();
let lastSummaryMessageId = null; // Son sabitlenen özet mesajının ID'si

const ROYAL_CITIES = ['Bridgewatch', 'Martlock', 'Thetford', 'Fort Sterling', 'Lymhurst', 'Caerleon'];

// Kaynakların Ana Biyomları (Nerede toplanır?)
const RESOURCE_BIOMES = {
    'WOOD': '🌲 Orman (Lymhurst)',
    'ORE': '🏔️ Dağ (Fort Sterling)',
    'HIDE': '🏜️ Bozkır (Bridgewatch)',
    'FIBER': '🐸 Bataklık (Thetford)',
    'ROCK': '⛰️ Yayla (Martlock)'
};

// Şehirlerin İşleme (Refining) Bonusları
const CITY_REFINING_BONUS = {
    'Martlock': 'HIDE',
    'Bridgewatch': 'ROCK',
    'Lymhurst': 'FIBER',
    'Fort Sterling': 'WOOD',
    'Thetford': 'ORE'
};

const config = {
    maxMarj: 50000,          // Hata filtresi
    riskOranı: 0.50,       // Sermayenin %25'ini tek bir kaleme ayır
};

bot.on('message', (msg) => {
    const text = msg.text;
    if (msg.chat.id.toString() !== chatId) return;
    if (!text) return;

    if (text.startsWith('/')) {
        handleCommand(bot, msg, settings, saveSettings, lastSentAlerts, getDailyVolume);
    } else if (!isNaN(text)) {
        const newVal = parseInt(text);
        if (settings.sermaye !== newVal) {
            settings.sermaye = newVal;
            saveSettings();
        }
        bot.sendMessage(chatId, `💰 Sermaye güncellendi: *${settings.sermaye.toLocaleString()} Silver*`, { parse_mode: 'Markdown' });
    }
});

// YENİ FONKSİYON: Ürünün son 24 saatteki satış hacmini çeker
async function getDailyVolume(itemId, city, quality) {
    // API'yi yormamak için her hacim sorgusunda 1 saniye bekle
    await new Promise(r => setTimeout(r, 1000));

    try {
        // time-scale=24 parametresi son 24 saati getirir
        const url = `https://west.albion-online-data.com/api/v2/stats/history/${itemId}?locations=${city}&time-scale=24&qualities=${quality}`;
        const response = await axios.get(url);
        
        const data = response.data;
        if (!data || data.length === 0) return 0;

        // İlgili şehirdeki veriyi bul
        const entry = data.find(d => d.location === city);
        if (!entry || !entry.data) return 0;

        // Veri noktalarındaki (genelde saatlik) satışları topla
        return entry.data.reduce((total, point) => total + point.item_count, 0);
    } catch (error) {
        console.error(`Hacim hatası (${itemId}):`, error.message);
        return 0; // Hata olursa 0 varsayalım ki risk almayalım
    }
}

// YENİ: İşleme (Refining) Reçetesi Hesaplayıcı
function getRefiningRecipe(itemId) {
    const match = itemId.match(/^T(\d+)_(PLANKS|METALBAR|LEATHER|CLOTH|STONEBLOCK)(@\d+)?$/);
    if (!match) return null;

    const tier = parseInt(match[1]);
    const type = match[2];
    const enchant = match[3] || '';

    if (tier < 4) return null; // T3 ve altı için basit mantık gerekir, şimdilik T4+ odaklanalım

    let rawType;
    switch (type) {
        case 'PLANKS': rawType = 'WOOD'; break;
        case 'METALBAR': rawType = 'ORE'; break;
        case 'LEATHER': rawType = 'HIDE'; break;
        case 'CLOTH': rawType = 'FIBER'; break;
        case 'STONEBLOCK': rawType = 'ROCK'; break;
    }

    const rawItemId = `T${tier}_${rawType}${enchant}`;
    const lowerRefinedItemId = `T${tier - 1}_${type}`; // Alt seviye işlenmiş malzeme (Genelde düzdür)

    let rawCount, lowerCount;
    // Albion Online standart işleme oranları
    if (tier === 4) { rawCount = 2; lowerCount = 1; }
    else if (tier === 5) { rawCount = 3; lowerCount = 1; }
    else if (tier === 6) { rawCount = 4; lowerCount = 1; }
    else if (tier === 7) { rawCount = 5; lowerCount = 1; }
    else if (tier === 8) { rawCount = 5; lowerCount = 1; }

    return {
        product: itemId,
        ingredients: [
            { id: rawItemId, count: rawCount },
            { id: lowerRefinedItemId, count: lowerCount }
        ]
    };
}

// YENİ: Hammaddeden İşlenmiş Ürünü Bulma
function getRefiningProduct(rawItemId) {
    const match = rawItemId.match(/^T(\d+)_(WOOD|ORE|HIDE|FIBER|ROCK)(@\d+)?$/);
    if (!match) return null;
    const tier = parseInt(match[1]);
    const type = match[2];
    const enchant = match[3] || '';

    let refinedType;
    switch (type) {
        case 'WOOD': refinedType = 'PLANKS'; break;
        case 'ORE': refinedType = 'METALBAR'; break;
        case 'HIDE': refinedType = 'LEATHER'; break;
        case 'FIBER': refinedType = 'CLOTH'; break;
        case 'ROCK': refinedType = 'STONEBLOCK'; break;
    }
    return `T${tier}_${refinedType}${enchant}`;
}

// YENİ: İşleme İçin Gereken Miktar (Tier'a göre)
function getRefiningInputCounts(tier) {
    if (tier === 3) return { raw: 2, aux: 1 };
    if (tier === 4) return { raw: 2, aux: 1 };
    if (tier === 5) return { raw: 3, aux: 1 };
    if (tier === 6) return { raw: 4, aux: 1 };
    if (tier === 7) return { raw: 5, aux: 1 };
    if (tier === 8) return { raw: 5, aux: 1 };
    return { raw: 1, aux: 0 }; // T2
}

async function checkMarket() {
    // URL uzunluk hatasını önlemek için listeyi 50'şerli parçalara bölüyoruz (Chunking)
    const chunkSize = 50;
    let cycleOpportunities = []; // Bu döngüde bulunan fırsatları toplayacak liste
    
    let priceCache = {}; // Tüm fiyatları hafızada tut (Refining hesabı için)
    let gatheringCandidates = []; // Gathering adaylarını geçici tut
    
    // Crafting modunda sadece işlenebilir ürünleri tara
    let itemsToCheck = allItems;
    if (settings.mode === 'crafting') {
        itemsToCheck = allItems.filter(id => /^T[4-8]_(PLANKS|METALBAR|LEATHER|CLOTH|STONEBLOCK)/.test(id));
    }

    for (let i = 0; i < itemsToCheck.length; i += chunkSize) {
        let chunk = itemsToCheck.slice(i, i + chunkSize);
        
        // Crafting modundaysak, listedeki ürünlerin hammaddelerini de sorguya eklemeliyiz
        if (settings.mode === 'crafting') {
            const ingredients = new Set();
            chunk.forEach(id => {
                const recipe = getRefiningRecipe(id);
                if (recipe) recipe.ingredients.forEach(ing => ingredients.add(ing.id));
            });
            // Tekrar edenleri önlemek için Set kullanıp birleştiriyoruz
            const chunkSet = new Set(chunk);
            ingredients.forEach(ing => chunkSet.add(ing));
            chunk = Array.from(chunkSet);
        }
        
        // Mod'a göre lokasyonları belirle
        let locations = settings.city;
        if (settings.mode === 'transport' || settings.mode === 'gathering') locations = ROYAL_CITIES.join(',');
        if (settings.mode === 'blackmarket') locations = `${settings.city},Black Market`;
        if (settings.mode === 'crafting') locations = settings.city; // Üretim yerel yapılır

        const url = `https://west.albion-online-data.com/api/v2/stats/prices/${chunk.join(',')}?locations=${locations}`;

        try {
            const response = await axios.get(url);
            const data = response.data;
            console.log(`📡 API Yanıtı: ${data.length} adet veri alındı (Chunk ${Math.floor(i/chunkSize) + 1})`);

            // Veriyi item_id'ye göre grupla (Çoklu lokasyon karşılaştırması için şart)
            const itemsMap = {};
            data.forEach(item => {
                if (!itemsMap[item.item_id]) itemsMap[item.item_id] = [];
                itemsMap[item.item_id].push(item);
                
                // Fiyat önbelleğini doldur (Sadece mevcut şehir)
                if (item.city === settings.city) {
                    priceCache[item.item_id] = item.sell_price_min;
                }
            });

            for (const itemId in itemsMap) {
                const entries = itemsMap[itemId];
                if (settings.blacklist.includes(itemId)) continue;

                // TIER KONTROLÜ (T3, T4, T5...)
                const tierMatch = itemId.match(/^T(\d+)_/);
                const tier = tierMatch ? parseInt(tierMatch[1]) : 0;
                if (tier < settings.minTier || tier > settings.maxTier) continue;

                // HAMMADDE KONTROLÜ
                const isResource = /^T\d+_(WOOD|ROCK|ORE|HIDE|FIBER|PLANKS|STONEBLOCK|METALBAR|LEATHER|CLOTH)/.test(itemId);
                // Sadece Ham Kaynaklar (Gathering Modu için)
                const isRawResource = /^T\d+_(WOOD|ROCK|ORE|HIDE|FIBER)/.test(itemId);

                if (isResource && !settings.includeResources && settings.mode !== 'gathering' && settings.mode !== 'crafting') continue;

                // Akıllı İsimlendirme (Enchant Desteği)
                const turkceIsim = getItemName(itemId);

                // --- MOD KONTROLLERİ ---
                
                // 1. FLIP MODU (Aynı şehirde Al-Sat)
                if (settings.mode === 'flip') {
                    const item = entries[0];
                    if (!item) continue;
                    
                    // VERİ YAŞI KONTROLÜ: Hem alış hem satış verisi taze olmalı
                    if (getMinutesOld(item.buy_price_max_date) > settings.maxDataAge || getMinutesOld(item.sell_price_min_date) > settings.maxDataAge) continue;

                    // Hızlı işlem için: En yüksek alışın 1 üstü, en düşük satışın 1 altı
                    const buy = item.buy_price_max > 0 ? item.buy_price_max + 1 : 0;
                    const sell = item.sell_price_min > 0 ? item.sell_price_min - 1 : 0;
                    const qualityLabel = qualityNames[item.quality] || `Kalite: ${item.quality}`;

                    if (buy > 0 && sell > 0) {
                        const sellMultiplier = settings.isPremium ? 0.935 : 0.895;
                        const birimNetKar = (sell * sellMultiplier) - (buy * 1.025);
                        const margin = (birimNetKar / (buy * 1.025)) * 100;

                        const limit = settings.sermaye * config.riskOranı;
                        let adet = Math.floor(limit / buy);
                        const maxCount = isResource ? settings.maxResourceAdet : settings.maxAdet;
                        if (adet > maxCount) adet = maxCount; // Limit uygula (Hammadde için farklı)
                        if (adet === 0) adet = 1;
                        const toplamNetKar = birimNetKar * adet;

                        if (toplamNetKar > settings.minProfit && margin > settings.minMargin && margin < config.maxMarj) {
                            const alertId = `${itemId}_${item.quality}_${buy}_${sell}`;
                            if (!lastSentAlerts.has(alertId)) {
                                const volume = await getDailyVolume(itemId, settings.city, item.quality || 1);
                                if (volume >= settings.minVolume) {
                                    lastSentAlerts.add(alertId);
                                    
                                    // FIRSAT SKORU: (Net Kâr * Günlük Hacim) / 1000
                                    // Bu skor, ürünün hem kârlı hem de hızlı olduğunu gösterir.
                                    const score = Math.floor((toplamNetKar * (volume > 100 ? 100 : volume)) / 10000);
                                    
                                    // Listeye ekle
                                    cycleOpportunities.push({
                                        name: turkceIsim,
                                        score: score,
                                        profit: toplamNetKar,
                                        id: itemId,
                                        margin: margin,
                                        investment: buy * adet,
                                        volume: volume,
                                        buyPrice: buy,
                                        sellPrice: sell
                                    });

                                    const fireIcon = score > 50 ? "🔥🔥🔥" : (score > 20 ? "🔥" : "");

                                    const message = `🎯 *FLIP FIRSATI* | ${settings.city} ${fireIcon}\n` +
                                                    `➖➖➖➖➖➖➖➖➖➖\n` +
                                                    `📦 *${turkceIsim}*\n` +
                                                    `✨ Kalite: ${qualityLabel}\n` +
                                                    `🆔 \`${itemId}\`\n` +
                                                    `➖➖➖➖➖➖➖➖➖➖\n` +
                                                    `📉 *Alış:* ${buy.toLocaleString()}  ${timeAgo(item.buy_price_max_date)}\n` +
                                                    `📈 *Satış:* ${sell.toLocaleString()} 🕒 ${timeAgo(item.sell_price_min_date)}\n` +
                                                    `📊 *Günlük Hacim:* ${volume}\n` +
                                                    `➖➖➖➖➖➖➖➖➖➖\n` +
                                                    `🏆 *Fırsat Skoru:* ${score}\n` +
                                                    `💰 *Net Kâr:* ${Math.round(toplamNetKar).toLocaleString()} (%${margin.toFixed(1)})\n` +
                                                    `💵 *Yatırım:* ${(buy * adet).toLocaleString()} (x${adet})`;
                                    try {
                                        await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
                                        setTimeout(() => { lastSentAlerts.delete(alertId); }, 1800000);
                                    } catch (e) { lastSentAlerts.delete(alertId); }
                                }
                            }
                        }
                    }
                }

                // 2. BLACK MARKET MODU (Şehirden Al -> Caerleon BM'ye Sat)
                else if (settings.mode === 'blackmarket') {
                    const cityItem = entries.find(e => e.city === settings.city);
                    const bmItem = entries.find(e => e.city === 'Black Market');

                    if (cityItem && bmItem && cityItem.sell_price_min > 0 && bmItem.buy_price_max > 0) {
                        // Veri yaşı kontrolü
                        if (getMinutesOld(cityItem.sell_price_min_date) > settings.maxDataAge || getMinutesOld(bmItem.buy_price_max_date) > settings.maxDataAge) continue;

                        const buyPrice = cityItem.sell_price_min; // Şehirden hemen al
                        const sellPrice = bmItem.buy_price_max;   // BM'ye hemen sat (Buy Order'a sat)
                        
                        // BM'ye satarken vergi düşer, alırken vergi yok (marketten direkt alım)
                        const sellMultiplier = settings.isPremium ? 0.935 : 0.895;
                        const birimNetKar = (sellPrice * sellMultiplier) - buyPrice;
                        const margin = (birimNetKar / buyPrice) * 100;

                        const limit = settings.sermaye * config.riskOranı;
                        let adet = Math.floor(limit / buyPrice);
                        const maxCount = isResource ? settings.maxResourceAdet : settings.maxAdet;
                        if (adet > maxCount) adet = maxCount; // Limit uygula
                        if (adet === 0) adet = 1;
                        const toplamNetKar = birimNetKar * adet;

                        // BM için %25 üzeri marj arayalım (Riskli bölge taşıması)
                        if (toplamNetKar > settings.minProfit && margin > 25) {
                            const alertId = `BM_${itemId}_${cityItem.quality}_${buyPrice}_${sellPrice}`;
                            
                            if (!lastSentAlerts.has(alertId)) {
                                // BM hacmi kontrolü (BM'de ne kadar talep var?)
                                const volume = await getDailyVolume(itemId, 'Black Market', cityItem.quality || 1);
                                
                                if (volume >= settings.minVolume) {
                                    lastSentAlerts.add(alertId);
                                    const qualityLabel = qualityNames[cityItem.quality] || cityItem.quality;

                                    const message = `💀 *BLACK MARKET* | ${settings.city} ➡️ Caerleon\n` +
                                                    `➖➖➖➖➖➖➖➖➖➖\n` +
                                                    `📦 *${turkceIsim}*\n` +
                                                    `✨ Kalite: ${qualityLabel}\n` +
                                                    `🆔 \`${itemId}\`\n` +
                                                    `➖➖➖➖➖➖➖➖➖➖\n` +
                                                    `📉 *Alış:* ${buyPrice.toLocaleString()} 🕒 ${timeAgo(cityItem.sell_price_min_date)}\n` +
                                                    `📈 *Satış:* ${sellPrice.toLocaleString()} 🕒 ${timeAgo(bmItem.buy_price_max_date)}\n` +
                                                    `📊 *BM Hacmi:* ${volume}\n` +
                                                    `➖➖➖➖➖➖➖➖➖➖\n` +
                                                    `💰 *Net Kâr:* ${Math.round(toplamNetKar).toLocaleString()} (%${margin.toFixed(1)})\n` +
                                                    `💵 *Maliyet:* ${(buyPrice * adet).toLocaleString()} (x${adet})`;
                                    
                                    try {
                                        await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
                                        setTimeout(() => { lastSentAlerts.delete(alertId); }, 1800000);
                                    } catch (e) { lastSentAlerts.delete(alertId); }
                                }
                            }
                        }
                    }
                }

                // 3. GATHERING MODU (Hammadde Fiyat Analizi)
                else if (settings.mode === 'gathering') {
                    if (isRawResource) {
                        // Enchant (Büyüleme) Filtresi
                        const enchantMatch = itemId.match(/@(\d+)$/);
                        const enchantLevel = enchantMatch ? parseInt(enchantMatch[1]) : 0;
                        if (enchantLevel < settings.minEnchant) continue;

                        const localItem = entries.find(e => e.city === settings.city);
                        if (!localItem) continue;

                        const localPrice = localItem.sell_price_min;
                        if (localPrice > 0) {
                            // Veri yaşı kontrolü
                            if (getMinutesOld(localItem.sell_price_min_date) > settings.maxDataAge) continue;

                            // Diğer şehirlerdeki en yüksek fiyatı bul (Transport Önerisi)
                            let maxPrice = 0;
                            let maxCity = '';
                            entries.forEach(e => {
                                if (e.sell_price_min > maxPrice) {
                                    maxPrice = e.sell_price_min;
                                    maxCity = e.city;
                                }
                            });

                            let transportSuggestion = "";
                            // Eğer başka bir şehirde fiyat %15 daha fazlaysa öner
                            if (maxCity && maxCity !== settings.city && maxPrice > localPrice * 1.15) {
                                transportSuggestion = ` 🚚 ${maxCity} (${maxPrice.toLocaleString()})`;
                            }

                            // Biyom Bilgisi Ekle
                            const typeMatch = itemId.match(/_(WOOD|ORE|HIDE|FIBER|ROCK)/);
                            const resType = typeMatch ? typeMatch[1] : '';
                            const biomeInfo = RESOURCE_BIOMES[resType] || 'Bilinmiyor';

                            // Aday listesine ekle (Döngü sonunda işleme kârı hesaplanacak)
                            gatheringCandidates.push({
                                name: turkceIsim,
                                score: localPrice, 
                                profit: localPrice, // Kâr yerine Birim Fiyat
                                id: itemId,
                                margin: 0,
                                investment: 0,
                                volume: 0,
                                buyPrice: 0,
                                sellPrice: localPrice,
                                isGathering: true,
                                transport: transportSuggestion,
                                biome: biomeInfo,
                                resType: resType,
                                tier: tier
                            });
                        }
                    }
                }

                // 4. CRAFTING MODU (İşleme Kârı)
                else if (settings.mode === 'crafting') {
                    const recipe = getRefiningRecipe(itemId);
                    if (!recipe) continue;

                    const productItem = entries.find(e => e.city === settings.city);
                    if (!productItem || productItem.sell_price_min <= 0) continue;
                    if (getMinutesOld(productItem.sell_price_min_date) > settings.maxDataAge) continue;

                    let cost = 0;
                    let possible = true;

                    // Hammadde maliyetlerini topla
                    for (const ing of recipe.ingredients) {
                        const ingEntries = itemsMap[ing.id];
                        const ingItem = ingEntries ? ingEntries.find(e => e.city === settings.city) : null;
                        // Hammaddeyi marketten "Sell Order" fiyatına alıyoruz (Hemen al)
                        if (!ingItem || ingItem.sell_price_min <= 0) { 
                            possible = false;
                            break;
                        }
                        cost += ingItem.sell_price_min * ing.count;
                    }

                    if (possible) {
                        const sellPrice = productItem.sell_price_min;
                        const sellMultiplier = settings.isPremium ? 0.935 : 0.895;
                        const netProfit = (sellPrice * sellMultiplier) - cost;
                        const margin = (netProfit / cost) * 100;

                        if (netProfit > 0 && margin > settings.minMargin) {
                             cycleOpportunities.push({
                                name: turkceIsim,
                                score: netProfit, // Kâra göre sırala
                                profit: netProfit,
                                id: itemId,
                                margin: margin,
                                investment: cost,
                                volume: 0,
                                buyPrice: cost,
                                sellPrice: sellPrice,
                                isCrafting: true
                            });
                        }
                    }
                }
            }
        } catch (error) {
            if (error.response && error.response.status === 429) {
                console.warn(`⚠️ API Hız Sınırı (429) - Chunk ${i}. 60 saniye bekleniyor...`);
                await new Promise(r => setTimeout(r, 60000));
            } else {
                console.error(`API Hatası (Chunk ${i}):`, error.message);
            }
        }
        
        // API'yi boğmamak için chunklar arası minik bekleme (opsiyonel ama iyi olur)
        await new Promise(r => setTimeout(r, 3000));
    }

    // --- GATHERING İÇİN EKSTRA İŞLEMLER (Refining Hesabı) ---
    if (settings.mode === 'gathering') {
        gatheringCandidates.forEach(cand => {
            // 1. İşlenmiş ürünün ID'sini bul
            const refinedId = getRefiningProduct(cand.id);
            
            // 2. Alt seviye işlenmiş ürünün ID'sini bul (Auxiliary)
            // Örn: T4_LEATHER üretmek için T3_LEATHER gerekir.
            // Basitlik için enchant'sız halini varsayıyoruz (Genelde öyledir)
            const auxIdMatch = refinedId ? refinedId.match(/^T(\d+)_(.+)(@\d+)?$/) : null;
            let auxId = null;
            if (auxIdMatch && cand.tier > 2) {
                auxId = `T${cand.tier - 1}_${auxIdMatch[2]}`;
            }

            let refiningNote = "";
            
            // Fiyatlar önbellekte var mı?
            if (refinedId && priceCache[refinedId] && (auxId ? priceCache[auxId] : true)) {
                const refinedPrice = priceCache[refinedId];
                const auxPrice = auxId ? priceCache[auxId] : 0;
                const counts = getRefiningInputCounts(cand.tier);

                // Geri Dönüş Oranı (Return Rate)
                // Şehir bonusu varsa %36.7, yoksa %15.2 (Premiumsuz/Odaksız baz değerler)
                const hasBonus = CITY_REFINING_BONUS[settings.city] === cand.resType;
                const returnRate = hasBonus ? 0.367 : 0.152;

                // 1 Adet İşlenmiş Ürün Maliyeti (Eldeki hammaddeyi satmayıp kullanmanın maliyeti)
                // Etkin Girdi = Girdi * (1 - ReturnRate)
                const effectiveRawNeeded = counts.raw * (1 - returnRate);
                const effectiveAuxNeeded = counts.aux * (1 - returnRate);

                // 1 Raw Kaynağın İşlenmiş haldeki değeri
                // (İşlenmiş Fiyat - Yan Malzeme Maliyeti) / Gereken Ham Madde
                const valuePerRawRefined = (refinedPrice - (effectiveAuxNeeded * auxPrice)) / effectiveRawNeeded;
                
                const profitDiff = valuePerRawRefined - cand.sellPrice;
                
                if (profitDiff > 0) {
                    refiningNote = `\n   🔨 *İşle ve Sat:* +${Math.round(profitDiff).toLocaleString()} kâr/adet (${hasBonus ? 'Bonuslu Şehir' : 'Bonussuz'})`;
                }
            }
            
            cand.refiningNote = refiningNote;
            cycleOpportunities.push(cand);
        });
    }

    // --- DÖNGÜ SONU: ÖZET VE SABİTLEME ---
    if (cycleOpportunities.length > 0) {
        // Skora göre büyükten küçüğe sırala ve ilk 3'ü al
        cycleOpportunities.sort((a, b) => b.score - a.score);
        const topCount = settings.mode === 'gathering' ? 10 : 3;
        const topItems = cycleOpportunities.slice(0, topCount);

        let summaryText = "";
        if (settings.mode === 'gathering') summaryText = `⛏️ *TOPLANACAK EN DEĞERLİ KAYNAKLAR* ⛏️\n(Birim Satış Fiyatına Göre - ${settings.city})\n_Sadece ham kaynaklar (Odun, Deri vb.)_\n\n`;
        else if (settings.mode === 'crafting') summaryText = `⚒️ *ÜRETİM FIRSATLARI (Refining)* ⚒️\n(Hammadde -> İşlenmiş - ${settings.city})\n\n`;
        else summaryText = `🏆 *BU DÖNGÜNÜN EN İYİLERİ* 🏆\n\n`;

        topItems.forEach((op, index) => {
            if (op.isGathering) {
                summaryText += `${index + 1}. *${op.name}*\n   📍 ${op.biome}\n   💰 Birim: ${op.sellPrice.toLocaleString()} | 📦 999x: ${(op.sellPrice * 999).toLocaleString()}${op.transport}${op.refiningNote || ''}\n\n`;
            } else if (op.isCrafting) {
                summaryText += `${index + 1}. *${op.name}*\n`;
                summaryText += `   💰 Kâr: ${Math.round(op.profit).toLocaleString()} (%${op.margin.toFixed(1)})\n`;
                summaryText += `   📉 Maliyet: ${op.investment.toLocaleString()} | 📈 Satış: ${op.sellPrice.toLocaleString()}\n`;
                summaryText += `   🆔 \`${op.id}\`\n\n`;
            } else {
                summaryText += `${index + 1}. *${op.name}*\n`;
                summaryText += `   ⭐️ Skor: ${op.score}\n`;
                summaryText += `   💰 Kâr: ${Math.round(op.profit).toLocaleString()} (%${op.margin.toFixed(1)})\n`;
                summaryText += `   💵 Yatırım: ${op.investment.toLocaleString()} Adet: ${op.investment / op.buyPrice}\n`;
                summaryText += `   📊 Hacim: ${op.volume} | 📉 Al: ${op.buyPrice.toLocaleString()} | 📈 Sat: ${op.sellPrice.toLocaleString()}\n`;
                summaryText += `   🆔 \`${op.id}\`\n\n`;
            }
        });
        summaryText += `_Toplam ${cycleOpportunities.length} yeni fırsat bulundu._`;

        try {
            // Mesajı gönder
            const sentMsg = await bot.sendMessage(chatId, summaryText, { parse_mode: 'Markdown' });
            
            // Varsa eski sabitlemeyi kaldır
            if (lastSummaryMessageId) {
                try { await bot.unpinChatMessage(chatId, { message_id: lastSummaryMessageId }); } catch (e) {}
            }
            // Yeni mesajı sabitle
            await bot.pinChatMessage(chatId, sentMsg.message_id);
            lastSummaryMessageId = sentMsg.message_id;
        } catch (e) { console.error("Özet mesaj hatası:", e.message);}
    } else {
        console.log(`⏳ Döngü tamamlandı. Kriterlere uygun fırsat yok. (Min Kâr: ${settings.minProfit}, Veri Yaşı: ${settings.maxDataAge}dk)`);
    }
    
    // Döngü bittiğinde 5 saniye bekleyip tekrar başlat (Recursive Timeout)
    // Bu sayede işlemler üst üste binmez.
    setTimeout(checkMarket, 5000);
}


// İlk başlatma
checkMarket();
console.log("Hacim Odaklı Bridgewatch Botu Aktif!");