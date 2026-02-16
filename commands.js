
const axios = require('axios');
const fs = require('fs');
const { getItemName, findItemByName, allItems } = require('./items');
const { timeAgo } = require('./helpers');

const ROYAL_CITIES = ['Bridgewatch', 'Martlock', 'Thetford', 'Fort Sterling', 'Lymhurst', 'Caerleon'];

// Tüm şehirlerde fiyat kontrolü (Komut için)
async function checkPriceForAllCities(bot, chatId, itemId, itemName) {
    const locations = ROYAL_CITIES.join(',');
    const url = `https://west.albion-online-data.com/api/v2/stats/prices/${itemId}?locations=${locations}`;
    
    try {
        const response = await axios.get(url);
        const data = response.data;
        
        if (!data || data.length === 0) {
            bot.sendMessage(chatId, `❌ *${itemName}* için fiyat verisi yok.`, { parse_mode: 'Markdown' });
            return;
        }

        let msg = `💰 *FİYAT LİSTESİ: ${itemName}*\n➖➖➖➖➖➖➖➖➖➖\n`;
        const validEntries = data.filter(d => d.sell_price_min > 0).sort((a, b) => a.sell_price_min - b.sell_price_min);
        
        if (validEntries.length === 0) {
             bot.sendMessage(chatId, `⚠️ *${itemName}* için aktif satış emri bulunamadı.`, { parse_mode: 'Markdown' });
             return;
        }

        const minPrice = validEntries[0].sell_price_min;

        validEntries.forEach(d => {
            const cheapestLabel = d.sell_price_min === minPrice ? " ✅ *En Ucuz*" : "";
            msg += `🏙 *${d.city}*${cheapestLabel}\n`;
            msg += `   📉 Satış: ${d.sell_price_min.toLocaleString()} 🕒 ${timeAgo(d.sell_price_min_date)}\n`;
            msg += `   📈 Alış: ${d.buy_price_max.toLocaleString()} 🕒 ${timeAgo(d.buy_price_max_date)}\n`;
        });
        
        bot.sendMessage(chatId, msg, { parse_mode: 'Markdown' });

    } catch (e) {
        console.error(e);
        bot.sendMessage(chatId, `⚠️ API Hatası: ${e.message}`);
    }
}

// Tek ürünün tüm şehirlerdeki hacmini kıyaslar
async function checkVolumeComparison(bot, chatId, itemId) {
    const locations = ROYAL_CITIES.join(',');
    const itemName = getItemName(itemId);
    
    try {
        const url = `https://west.albion-online-data.com/api/v2/stats/history/${itemId}?locations=${locations}&time-scale=24&qualities=1`;
        const response = await axios.get(url);
        const data = response.data;

        if (!data || data.length === 0) {
            bot.sendMessage(chatId, `❌ *${itemName}* için veri bulunamadı.`, { parse_mode: 'Markdown' });
            return;
        }

        let message = `📊 *ŞEHİR BAZLI HACİM: ${itemName}*\n(Son 24 Saat)\n➖➖➖➖➖➖➖➖➖➖\n`;
        
        const cityVolumes = data.map(entry => {
            const vol = entry.data ? entry.data.reduce((sum, p) => sum + p.item_count, 0) : 0;
            return { city: entry.location, volume: vol };
        }).sort((a, b) => b.volume - a.volume);

        cityVolumes.forEach(cv => {
            const bar = "█".repeat(Math.min(10, Math.ceil(cv.volume / (cityVolumes[0].volume || 1) * 10)));
            message += `🏙 *${cv.city}:* ${cv.volume} ${bar}\n`;
        });

        bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    } catch (error) {
        bot.sendMessage(chatId, `⚠️ Hata: ${error.message}`);
    }
}

// Birden fazla ürünün mevcut şehirdeki hacmini kıyaslar
async function checkMultiItemVolume(bot, chatId, items, city, getDailyVolume) {
    let message = `⚖️ *ÜRÜN KIYASLAMASI (${city})*\n➖➖➖➖➖➖➖➖➖➖\n`;
    const results = [];

    for (const itemId of items) {
        const vol = await getDailyVolume(itemId, city, 1);
        results.push({ id: itemId, volume: vol, name: getItemName(itemId) });
    }

    results.sort((a, b) => b.volume - a.volume);
    results.forEach((r, i) => {
        message += `${i+1}. *${r.name}*: ${r.volume} Adet\n`;
    });
    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
}

async function handleCommand(bot, msg, settings, saveSettings, lastSentAlerts, getDailyVolume) {
    const chatId = msg.chat.id;
    const text = msg.text;
    const args = text.split(' ');
    const command = args[0].toLowerCase();

    if (command === '/sehir' && args[1]) {
        if (settings.city !== args[1]) {
            settings.city = args[1];
            saveSettings();
            lastSentAlerts.clear();
        }
        bot.sendMessage(chatId, `🏙 Şehir değiştirildi: *${settings.city}*`, { parse_mode: 'Markdown' });
    } else if (command === '/premium') {
        let newPremium = settings.isPremium;
        if (args[1] === 'on') newPremium = true;
        if (args[1] === 'off') newPremium = false;
        
        if (settings.isPremium !== newPremium) {
            settings.isPremium = newPremium;
            saveSettings();
        }
        bot.sendMessage(chatId, `🌟 Premium durumu: *${settings.isPremium ? 'AÇIK (%6.5 Kesinti)' : 'KAPALI (%10.5 Kesinti)'}*`, { parse_mode: 'Markdown' });
    } else if (command === '/mod') {
        if (['transport', 'flip', 'blackmarket', 'gathering', 'crafting'].includes(args[1])) {
            if (settings.mode !== args[1]) {
                settings.mode = args[1];
                saveSettings();
                lastSentAlerts.clear();
            }
            bot.sendMessage(chatId, `🔄 Mod değiştirildi: *${settings.mode.toUpperCase()}*`, { parse_mode: 'Markdown' });
        } else {
            bot.sendMessage(chatId, `⚠️ Geçersiz mod! Kullanım: \`/mod flip\`, \`/mod transport\`, \`/mod blackmarket\`, \`/mod gathering\` veya \`/mod crafting\``, { parse_mode: 'Markdown' });
        }
    } else if (command === '/kar' && args[1]) {
        settings.minProfit = parseInt(args[1]);
        saveSettings();
        bot.sendMessage(chatId, `💰 Min. Kâr güncellendi: *${settings.minProfit.toLocaleString()}*`, { parse_mode: 'Markdown' });
    } else if (command === '/marj' && args[1]) {
        settings.minMargin = parseFloat(args[1]);
        saveSettings();
        bot.sendMessage(chatId, `📊 Min. Marj güncellendi: *%${settings.minMargin}*`, { parse_mode: 'Markdown' });
    } else if (command === '/hacim' && args[1]) {
        settings.minVolume = parseInt(args[1]);
        saveSettings();
        bot.sendMessage(chatId, `📦 Min. Hacim güncellendi: *${settings.minVolume}*`, { parse_mode: 'Markdown' });
    } else if (command === '/mintier' && args[1]) {
        settings.minTier = parseInt(args[1]);
        saveSettings();
        bot.sendMessage(chatId, `🔻 Min. Tier: *T${settings.minTier}*`, { parse_mode: 'Markdown' });
    } else if (command === '/minenchant' && args[1]) {
        settings.minEnchant = parseInt(args[1]);
        saveSettings();
        bot.sendMessage(chatId, `✨ Min. Büyüleme (Enchant): *${settings.minEnchant}*`, { parse_mode: 'Markdown' });
    } else if (command === '/maxtier' && args[1]) {
        settings.maxTier = parseInt(args[1]);
        saveSettings();
        bot.sendMessage(chatId, `🔺 Max. Tier: *T${settings.maxTier}*`, { parse_mode: 'Markdown' });
    } else if (command === '/preset' && args[1]) {
        if (args[1] === 'balina') {
            settings.minVolume = 1; settings.minProfit = 100000; settings.minMargin = 20; settings.minTier = 5; settings.maxDataAge = 720; settings.maxAdet = 10;
            saveSettings();
            bot.sendMessage(chatId, `🐋 *BALİNA MODU AKTİF*`, { parse_mode: 'Markdown' });
        } else if (args[1] === 'seri') {
            settings.minVolume = 50; settings.minProfit = 10000; settings.minMargin = 12; settings.minTier = 4; settings.maxDataAge = 60; settings.maxAdet = 50;
            saveSettings();
            bot.sendMessage(chatId, `🐆 *SERİ MOD AKTİF*`, { parse_mode: 'Markdown' });
        }
    } else if (command === '/veri' && args[1]) {
        settings.maxDataAge = parseInt(args[1]);
        saveSettings();
        bot.sendMessage(chatId, `🕒 Veri yaşı sınırı: *${settings.maxDataAge} dakika*`, { parse_mode: 'Markdown' });
    } else if (command === '/maxadet' && args[1]) {
        settings.maxAdet = parseInt(args[1]);
        saveSettings();
        bot.sendMessage(chatId, `🔢 Maksimum alım adedi: *${settings.maxAdet}*`, { parse_mode: 'Markdown' });
    } else if (command === '/kaynaklar') {
        if (args[1] === 'on') settings.includeResources = true;
        else if (args[1] === 'off') settings.includeResources = false;
        else settings.includeResources = !settings.includeResources;
        saveSettings();
        bot.sendMessage(chatId, `🪨 Hammadde taraması: *${settings.includeResources ? 'AÇIK' : 'KAPALI'}*`, { parse_mode: 'Markdown' });
    } else if (command === '/maxkaynak' && args[1]) {
        settings.maxResourceAdet = parseInt(args[1]);
        saveSettings();
        bot.sendMessage(chatId, `🧱 Max Hammadde Adedi: *${settings.maxResourceAdet}*`, { parse_mode: 'Markdown' });
    } else if (command === '/hacimara') {
        if (args.length === 2) checkVolumeComparison(bot, chatId, args[1].toUpperCase());
        else if (args.length > 2) checkMultiItemVolume(bot, chatId, args.slice(1).map(i => i.toUpperCase()), settings.city, getDailyVolume);
        else bot.sendMessage(chatId, `⚠️ Kullanım: \`/hacimara [ID]\` veya \`/hacimara [ID1] [ID2]\``, { parse_mode: 'Markdown' });
    } else if (command === '/yasakli') {
        bot.sendMessage(chatId, `🚫 *Yasaklı Ürünler:*\n\`${settings.blacklist.length > 0 ? settings.blacklist.join(', ') : "Yok"}\``, { parse_mode: 'Markdown' });
    } else if (command === '/durum') {
        bot.sendMessage(chatId, `📊 *BOT DURUMU*\n⚙️ Mod: ${settings.mode.toUpperCase()}\n🏙 Şehir: ${settings.city}\n💰 Sermaye: ${settings.sermaye.toLocaleString()}\n🌟 Premium: ${settings.isPremium ? 'Var' : 'Yok'}\n🚫 Yasaklı: ${settings.blacklist.length}\n📉 Min Marj: %${settings.minMargin}\n💰 Min Kâr: ${settings.minProfit}\n📦 Min Hacim: ${settings.minVolume}\n🔢 Max Adet: ${settings.maxAdet}\n🪨 Hammadde: ${settings.includeResources ? 'Açık' : 'Kapalı'} (Max: ${settings.maxResourceAdet})\n💎 Tier: T${settings.minTier}-T${settings.maxTier}\n🕒 Max Veri Yaşı: ${settings.maxDataAge}dk`, { parse_mode: 'Markdown' });
    } else if (command === '/ignore' && args[1]) {
        if (!settings.blacklist.includes(args[1])) {
            settings.blacklist.push(args[1]);
            saveSettings();
            bot.sendMessage(chatId, `🚫 Ürün yasaklandı: *${args[1]}*`, { parse_mode: 'Markdown' });
        }
    } else if (command === '/unignore' && args[1]) {
        settings.blacklist = settings.blacklist.filter(id => id !== args[1]);
        saveSettings();
        bot.sendMessage(chatId, `✅ Ürün yasağı kalktı: *${args[1]}*`, { parse_mode: 'Markdown' });
    } else if (command === '/rehber') {
        const msg = `📚 *ALBION ONLINE YÜKSELME REHBERİ (T4 -> T8)*\n\n` +
            `👤 *Mevcut Durumun:* T4 Deri Yüzücü (Skinning)\n` +
            `🎯 *Hedef:* T5 ve üzeri\n\n` +
            `1️⃣ *Para Kazanma:* Botu \`/mod gathering\` ve \`/mintier 4\` ayarına getir. Bulunduğun şehirdeki en pahalı T4.0, T4.1 ve T4.2 derileri topla.\n` +
            `2️⃣ *Fame Kasma:* Sadece T4 ve üzeri hayvanları kes. T1-T3 hayvanlar çok az fame verir. Öğrenme Puanlarını (LP) sadece bir sonraki seviyeye (T5) geçmek için sakla.\n` +
            `3️⃣ *Ekipman:* \`/fiyat Deri Yüzücü\` yazarak toplayıcı setini al. Bu set toplama verimini artırır. Ayrıca *Domuz Turtası (Pork Pie)* ye.\n` +
            `4️⃣ *Bölge:* T4 için Mavi/Sarı bölgeler güvenlidir. T5 için Sarı bölgelere gitmelisin. Kırmızı bölgeler risklidir ama çok kazandırır.\n\n` +
            `💡 *İpucu:* Yanına mutlaka boş bir "Gamekeeper Journal" (Avcı Günlüğü) al. Dolunca satarsın.`;
        bot.sendMessage(chatId, msg, { parse_mode: 'Markdown' });
    } else if (command === '/yardim') {
        bot.sendMessage(chatId, `🛠 *KOMUTLAR*\n/rehber - Yükselme Rehberi\n/fiyat [İsim] - Fiyat sorgula\n/items [İsim] - Ürün ara\n/mod [flip/transport/gathering] - Mod değiştir\n/sehir [Isim] - Şehir değiştir\n/minenchant [0-3] - Min. Büyüleme\n/mintier [4-8] - Min. Seviye\n/veri [Dakika] - Veri yaşı\n/durum - Ayarları gör`, { parse_mode: 'Markdown' });
    } else if (command === '/fiyat') {
        const query = args.slice(1).join(' ');
        if (!query) {
            bot.sendMessage(chatId, `⚠️ Kullanım: \`/fiyat [Ürün Adı]\``, { parse_mode: 'Markdown' });
            return;
        }
        const result = findItemByName(query);
        if (result.type === 'exact' || (result.type === 'partial' && result.items.length === 1)) {
            const item = result.type === 'exact' ? result.item : result.items[0];
            checkPriceForAllCities(bot, chatId, item.id, item.name);
        } else if (result.type === 'partial') {
            let msg = `🔍 *Birden fazla ürün bulundu:*\n`;
            result.items.slice(0, 10).forEach(i => msg += `- \`/fiyat ${i.name}\`\n`);
            if (result.items.length > 10) msg += `...ve ${result.items.length - 10} tane daha.`;
            bot.sendMessage(chatId, msg, { parse_mode: 'Markdown' });
        } else if (result.type === 'suggestion') {
            bot.sendMessage(chatId, `💡 *${result.item.name}* mı demek istediniz?\nBunu deneyin: \`/fiyat ${result.item.name}\``, { parse_mode: 'Markdown' });
        } else {
            bot.sendMessage(chatId, `❌ Ürün bulunamadı.`, { parse_mode: 'Markdown' });
        }
    } else if (command === '/items') {
        const query = args.slice(1).join(' ');
        if (!query) {
            const allItemsList = allItems.map(id => `${getItemName(id)} (${id})`).join('\n');
            const fileName = 'tum_urunler.txt';
            fs.writeFileSync(fileName, allItemsList);
            bot.sendDocument(chatId, fileName, { caption: '📜 Oyundaki tüm takip edilen ürünlerin listesi.' });
            fs.unlinkSync(fileName);
        } else {
            const result = findItemByName(query);
            if (result.type === 'exact') {
                 bot.sendMessage(chatId, `✅ *Tam Eşleşme:* ${result.item.name}\nID: \`${result.item.id}\``, { parse_mode: 'Markdown' });
            } else if (result.type === 'partial') {
                let msg = `🔎 *Arama Sonuçları ("${query}"):*\n`;
                result.items.slice(0, 20).forEach(i => msg += `- ${i.name} (\`${i.id}\`)\n`);
                if (result.items.length > 20) msg += `...ve ${result.items.length - 20} tane daha.`;
                bot.sendMessage(chatId, msg, { parse_mode: 'Markdown' });
            } else if (result.type === 'suggestion') {
                bot.sendMessage(chatId, `💡 *${result.item.name}* mı demek istediniz?`, { parse_mode: 'Markdown' });
            } else {
                bot.sendMessage(chatId, `❌ Eşleşen ürün bulunamadı.`, { parse_mode: 'Markdown' });
            }
        }
    }
}

module.exports = { handleCommand };
