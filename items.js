
const { levenshtein } = require('./helpers');

const qualityNames = {
    1: "Normal",
    2: "İyi (Good)",
    3: "Üstün (Outstanding)",
    4: "Mükemmel (Excellent)",
    5: "🌟 ŞAHESER (Masterpiece)"
};

const tierNames = {
    4: "Ehil",
    5: "Uzman",
    6: "Usta",
    7: "Üstat",
    8: "Kadim"
};

const baseItemNames = {
    // ZIRHLAR
    'HEAD_CLOTH_SET1': 'Alim Başlığı', 'ARMOR_CLOTH_SET1': 'Alim Cübbesi', 'SHOES_CLOTH_SET1': 'Alim Ayakkabısı',
    'HEAD_CLOTH_SET2': 'Rahip Başlığı', 'ARMOR_CLOTH_SET2': 'Rahip Cübbesi', 'SHOES_CLOTH_SET2': 'Rahip Ayakkabısı',
    'HEAD_CLOTH_SET3': 'Büyücü Başlığı', 'ARMOR_CLOTH_SET3': 'Büyücü Cübbesi', 'SHOES_CLOTH_SET3': 'Büyücü Ayakkabısı',
    'HEAD_LEATHER_SET1': 'Paralı Asker Başlığı', 'ARMOR_LEATHER_SET1': 'Paralı Asker Ceketi', 'SHOES_LEATHER_SET1': 'Paralı Asker Ayakkabısı',
    'HEAD_LEATHER_SET2': 'Avcı Başlığı', 'ARMOR_LEATHER_SET2': 'Avcı Ceketi', 'SHOES_LEATHER_SET2': 'Avcı Ayakkabısı',
    'HEAD_LEATHER_SET3': 'Suikastçi Başlığı', 'ARMOR_LEATHER_SET3': 'Suikastçi Ceketi', 'SHOES_LEATHER_SET3': 'Suikastçi Ayakkabısı',
    'HEAD_PLATE_SET1': 'Asker Miğferi', 'ARMOR_PLATE_SET1': 'Asker Zırhı', 'SHOES_PLATE_SET1': 'Asker Botları',
    'HEAD_PLATE_SET2': 'Şövalye Miğferi', 'ARMOR_PLATE_SET2': 'Şövalye Zırhı', 'SHOES_PLATE_SET2': 'Şövalye Botları',
    'HEAD_PLATE_SET3': 'Muhafız Miğferi', 'ARMOR_PLATE_SET3': 'Muhafız Zırhı', 'SHOES_PLATE_SET3': 'Muhafız Botları',
    
    // SİLAHLAR
    'MAIN_SWORD': 'Geniş Kılıç', '2H_CLAYMORE': 'Klaymor', '2H_DUALSWORDS': 'Çifte Kılıç',
    '2H_BOW': 'Yay', '2H_LONGBOW': 'Uzun Yay', '2H_WARBOW': 'Savaş Yayı',
    '2H_CROSSBOW': 'Arbalet', 'MAIN_1HCROSSBOW': 'Hafif Arbalet',
    'MAIN_DAGGER': 'Hançer', '2H_DAGGERPAIR': 'Çifte Hançer', '2H_CLAWS': 'Pençeler', 'MAIN_RAPIER_SET1': 'Meç',
    'MAIN_SPEAR': 'Mızrak', '2H_SPEAR': 'Kargı', '2H_GLAIVE': 'Glaive',
    'MAIN_AXE': 'Savaş Baltası', '2H_AXE': 'Büyük Balta', '2H_HALBERD': 'Teber',
    'MAIN_FIRESTAFF': 'Ateş Asası', '2H_FIRESTAFF': 'Büyük Ateş Asası', '2H_INFERNOSTAFF': 'Cehennem Asası',
    'MAIN_HOLYSTAFF': 'Kutsal Değnek', '2H_HOLYSTAFF': 'Büyük Kutsal Değnek', '2H_DIVINESTAFF': 'İlahi Değnek',
    'MAIN_NATURESTAFF': 'Doğa Asası', '2H_NATURESTAFF': 'Büyük Doğa Asası', '2H_WILDSTAFF': 'Yabani Asa',

    // YENİ EKLENEN SİLAHLAR
    'MAIN_HAMMER': 'Çekiç', '2H_POLEHAMMER': 'Sırık Çekici', '2H_HAMMER': 'Büyük Çekiç',
    'MAIN_MACE': 'Gürz', '2H_MACE': 'Ağır Gürz', '2H_FLAIL': 'Flail',
    '2H_QUARTERSTAFF': 'Deynek', '2H_IRONCLADSTAFF': 'Demir Kaplı Deynek', '2H_DOUBLEBLADEDSTAFF': 'Çift Bıçaklı Deynek',
    'MAIN_FROSTSTAFF': 'Buz Asası', '2H_FROSTSTAFF': 'Büyük Buz Asası', '2H_GLACIALSTAFF': 'Buzul Asası',
    'MAIN_CURSESTAFF': 'Lanetli Asa', '2H_CURSESTAFF': 'Büyük Lanetli Asa', '2H_DEMONICSTAFF': 'Demonik Asa',
    'MAIN_ARCANESTAFF': 'Arkana Asası', '2H_ARCANESTAFF': 'Büyük Arkana Asası', '2H_ENIGMATICSTAFF': 'Enigmatik Asa',
    '2H_KNUCKLES_SET1': 'Dövüşçü Eldiveni', '2H_KNUCKLES_SET2': 'Savaş Kollukları', '2H_KNUCKLES_SET3': 'Dikenli Eldiven',
    '2H_SHAPESHIFTER_SET1': 'Prowling Staff', '2H_SHAPESHIFTER_SET2': 'Rootbound Staff', '2H_SHAPESHIFTER_SET3': 'Primal Staff',

    // TOPLAYICI EKİPMANLARI (GATHERING GEAR)
    'HEAD_GATHERER_FIBER': 'Hasatçı Şapkası', 'ARMOR_GATHERER_FIBER': 'Hasatçı Kıyafeti', 'SHOES_GATHERER_FIBER': 'Hasatçı Ayakkabısı',
    'HEAD_GATHERER_HIDE': 'Deri Yüzücü Şapkası', 'ARMOR_GATHERER_HIDE': 'Deri Yüzücü Ceketi', 'SHOES_GATHERER_HIDE': 'Deri Yüzücü Botları',
    'HEAD_GATHERER_ORE': 'Madenci Şapkası', 'ARMOR_GATHERER_ORE': 'Madenci Kıyafeti', 'SHOES_GATHERER_ORE': 'Madenci Botları',
    'HEAD_GATHERER_ROCK': 'Taşçı Şapkası', 'ARMOR_GATHERER_ROCK': 'Taşçı Kıyafeti', 'SHOES_GATHERER_ROCK': 'Taşçı Botları',
    'HEAD_GATHERER_WOOD': 'Oduncu Şapkası', 'ARMOR_GATHERER_WOOD': 'Oduncu Kıyafeti', 'SHOES_GATHERER_WOOD': 'Oduncu Botları',
    'HEAD_GATHERER_FISH': 'Balıkçı Şapkası', 'ARMOR_GATHERER_FISH': 'Balıkçı Kıyafeti', 'SHOES_GATHERER_FISH': 'Balıkçı Botları',

    // YENİ EKLENEN YAN ELLER (OFF-HAND)
    'OFF_SHIELD': 'Kalkan', 'OFF_TOWER_SHIELD': 'Kule Kalkanı',
    'OFF_BOOK': 'Büyü Kitabı', 'OFF_ORB_MORGANA': 'Sırlar Gözü',
    'OFF_TORCH': 'Meşale', 'OFF_HORN_KEEPER': 'Sis Çağıran',
    'OFF_TOTEM_KEEPER': 'Tapuroot',

    // YENİ EKLENEN PELERİNLER
    'CAPE': 'Pelerin',
    'BAG': 'Çanta'
};

const itemNames = {
    // --- ACEMİ (TIER 1) ---
    "T1_MAIN_SWORD": "Acemi Geniş Kılıcı",
    "T1_OFF_SHIELD": "Acemi Kalkanı",
    "T1_HEAD_LEATHER_SET1": "Acemi Başlığı",
    "T1_ARMOR_LEATHER_SET1": "Acemi Ceketi",
    "T1_SHOES_LEATHER_SET1": "Acemi Ayakkabısı",
    "T1_PICKAXE": "Acemi Kazması",
    "T1_STONEHAMMER": "Acemi Taş Çekici",
    "T1_AXE": "Acemi Baltası",
    "T1_SICKLE": "Acemi Orağı",
    "T1_SKINNINGKNIFE": "Acemi Deri Yüzme Bıçağı",
    "T1_OFF_BOOK": "Acemi Büyü Kitabı",
    "T1_MAIN_FIRESTAFF": "Acemi Ateş Asası",

    // --- KALFA (TIER 3) ---
    "T3_TRACKINGTOOL": "Kalfa İz Sürme Aleti",
    "T3_FARM_COW_BABY": "Kalfa Buzağısı",
    "T3_FARM_HORSE_BABY": "Kalfa Tayı",
    "T3_SHIELD": "Kalfa Kalkanı",
    "T3_BOOK": "Kalfa Büyü Kitabı",
    "T3_TORCH": "Kalfa Meşalesi",
    "T3_CAPE": "Kalfa Pelerini",
    "T3_BAG": "Kalfa Çantası",
    "T3_PICKAXE": "Kalfa Kazması",
    "T3_STONEHAMMER": "Kalfa Taş Çekici",
    "T3_AXE": "Kalfa Baltası",
    "T3_SICKLE": "Kalfa Orağı",
    "T3_SKINNINGKNIFE": "Kalfa Deri Yüzme Bıçağı",
    "T3_FISHINGROD": "Kalfa Oltası",
    "T3_MOUNT_HORSE": "Kalfa Binek Atı",
    "T3_MOUNT_OX": "Kalfa Yük Öküzü",
    "T3_BOW": "Kalfa Yayı",
    "T3_CROSSBOW": "Kalfa Arbeleti",
    "T3_MAIN_CURSESTAFF": "Kalfa Lanetli Asası",
    "T3_MAIN_FIRESTAFF": "Kalfa Ateş Asası",
    "T3_MAIN_FROSTSTAFF": "Kalfa Buz Asası",
    "T3_MAIN_ARCANESTAFF": "Kalfa Arkana Asası",
    "T3_MAIN_NATURESTAFF": "Kalfa Doğa Asası",

    // --- PELERİNLER VE ÇANTALAR (ENCHANTED) ---
    "T4_CAPE": "Ehil Pelerini",
    "T4_CAPE@1": "Ehil Pelerini (Yeşil)",
    "T4_CAPE@2": "Ehil Pelerini (Mavi)",
    "T4_CAPE@3": "Ehil Pelerini (Mor)",
    "T5_CAPE": "Uzman Pelerini",
    "T5_CAPE@1": "Uzman Pelerini (Yeşil)",
    "T5_CAPE@2": "Uzman Pelerini (Mavi)",
    "T6_CAPE": "Usta Pelerini",
    "T4_BAG": "Ehil Çantası",
    "T4_BAG@1": "Ehil Çantası (Yeşil)",
    "T4_BAG@2": "Ehil Çantası (Mavi)",
    "T4_BAG@3": "Ehil Çantası (Mor)",
    "T5_BAG": "Uzman Çantası",
    "T5_BAG@1": "Uzman Çantası (Yeşil)",
    "T5_BAG@2": "Uzman Çantası (Mavi)",
    "T6_BAG": "Usta Çantası",
    "T6_BAG@1": "Usta Çantası (Yeşil)",
    "T6_BAG@2": "Usta Çantası (Mavi)",

    // --- BİNEKLER ---
    "T4_MOUNT_HORSE": "Ehil Binek Atı",
    "T5_MOUNT_HORSE": "Uzman Binek Atı",
    "T5_MOUNT_ARMORED_HORSE": "Uzman Zırhlı Atı",
    "T4_MOUNT_OX": "Ehil Yük Öküzü",
    "T5_MOUNT_OX": "Uzman Yük Öküzü",
    "T6_MOUNT_OX": "Usta Yük Öküzü",

    // --- YEMEKLER ---
    "T3_MEAL_SOUP": "Buğday Çorbası",
    "T5_MEAL_SOUP": "Lahana Çorbası",
    "T6_MEAL_SALAD": "Patates Salatası",
    "T7_MEAL_SALAD_FISH": "Kraken Salatası",
    "T3_MEAL_PIE": "Tavuk Turtası",
    "T5_MEAL_PIE": "Kaz Turtası",
    "T7_MEAL_PIE": "Domuz Etli Turtası",
    "T4_MEAL_STEW": "Koyun Yahnisi",
    "T6_MEAL_STEW": "Sığır Yahnisi",
    "T7_MEAL_STEW_FISH": "Yılan Balığı Yahnisi",
    "T4_MEAL_SANDWICH": "Koyun Sandviçi",
    "T6_MEAL_SANDWICH": "Sığır Etli Sandviç",
    "T5_MEAL_ROAST": "Kızartılmış Kaz",
    "T7_MEAL_ROAST": "Kızartılmış Domuz",
    "T7_MEAL_ROAST_FISH": "Kızartılmış Levreği",

    // --- İKSİRLER ---
    "T4_POTION_HEAL": "İyileşme İksiri (Zayıf)",
    "T6_POTION_HEAL": "İyileşme İksiri",
    "T8_POTION_HEAL": "İyileşme İksiri (Güçlü)",
    "T4_POTION_ENERGY": "Enerji İksiri (Zayıf)",
    "T6_POTION_ENERGY": "Enerji İksiri",
    "T8_POTION_ENERGY": "Enerji İksiri (Güçlü)",
    "T4_POTION_GROWTH": "Devleşme İksiri (Zayıf)",
    "T6_POTION_GROWTH": "Devleşme İksiri",
    "T8_POTION_GROWTH": "Devleşme İksiri (Güçlü)",
    "T4_POTION_RESIST": "Direnç İksiri (Zayıf)",
    "T6_POTION_RESIST": "Direnç İksiri",
    "T8_POTION_RESIST": "Direnç İksiri (Güçlü)",
    "T4_POTION_STICKY": "Yapışkan İksir (Zayıf)",
    "T6_POTION_STICKY": "Yapışkan İksir",
    "T8_POTION_STICKY": "Yapışkan İksir (Güçlü)",
    "T4_POTION_POISON": "Zehir İksiri (Zayıf)",
    "T6_POTION_POISON": "Zehir İksiri",
    "T8_POTION_POISON": "Zehir İksiri (Güçlü)",
    "T6_POTION_INVIS": "Görünmezlik İksiri",
    "T4_POTION_SLOW": "Sakinleştirici İksir (Zayıf)",
    "T6_POTION_SLOW": "Sakinleştirici İksir",
    "T8_POTION_SLOW": "Sakinleştirici İksir (Güçlü)",
    "T4_POTION_CLEANSE": "Arındırma İksiri (Zayıf)",
    "T6_POTION_CLEANSE": "Arındırma İksiri",
    "T8_POTION_CLEANSE": "Arındırma İksiri (Güçlü)",
    "T4_POTION_ACID": "Asit İksiri (Zayıf)",
    "T6_POTION_ACID": "Asit İksiri",
    "T8_POTION_ACID": "Asit İksiri (Güçlü)",
    "T4_POTION_FIRE": "Cehennem Ateşi (Zayıf)",
    "T6_POTION_FIRE": "Cehennem Ateşi",
    "T8_POTION_FIRE": "Cehennem Ateşi (Güçlü)",
    "T4_POTION_GATHER": "Toplayıcılık İksiri (Zayıf)",
    "T6_POTION_GATHER": "Toplayıcılık İksiri",
    "T8_POTION_GATHER": "Toplayıcılık İksiri (Güçlü)",
    "T4_POTION_TORNADO": "Şişelenmiş Hortum (Zayıf)",
    "T6_POTION_TORNADO": "Şişelenmiş Hortum",
    "T8_POTION_TORNADO": "Şişelenmiş Hortum (Güçlü)",

    // --- KİTAPLAR VE ALETLER ---
    "T4_JOURNAL_FIBER": "Ehil Lif Hasatçısı Kitabı",
    "T4_JOURNAL_HIDE": "Ehil Deri Yüzücü Kitabı",
    "T4_JOURNAL_ORE": "Ehil Cevher Madencisi Kitabı",
    "T4_JOURNAL_STONE": "Ehil Taş Ocağı İşçisi Kitabı",
    "T4_JOURNAL_WOOD": "Ehil Oduncu Kitabı",
    "T4_TRACKINGTOOL": "Ehil İz Sürme Aleti",
    "T5_TRACKINGTOOL": "Uzman İz Sürme Aleti",
    "T6_TRACKINGTOOL": "Usta İz Sürme Aleti",
    "T1_FISHINGBAIT": "Basit Balık Yemi",
    "T2_FISHINGBAIT": "Süslü Balık Yemi",
    "T3_FISHINGBAIT": "Özel Balık Yemi",
    "T4_PICKAXE": "Ehil Kazması",
    "T5_PICKAXE": "Uzman Kazması",
    "T6_PICKAXE": "Usta Kazması",
    "T4_PICKAXE_AVALON": "Ehil Avalon Kazması",
    "T4_STONEHAMMER": "Ehil Taş Çekici",
    "T5_STONEHAMMER": "Uzman Taş Çekici",
    "T6_STONEHAMMER": "Usta Taş Çekici",
    "T4_STONEHAMMER_AVALON": "Ehil Avalon Taş Çekici",
    "T4_AXE": "Ehil Baltası",
    "T5_AXE": "Uzman Baltası",
    "T6_AXE": "Usta Baltası",
    "T4_AXE_AVALON": "Ehil Avalon Baltası",
    "T4_SICKLE": "Ehil Orağı",
    "T5_SICKLE": "Uzman Orağı",
    "T6_SICKLE": "Usta Orağı",
    "T4_SICKLE_AVALON": "Ehil Avalon Orağı",
    "T4_SKINNINGKNIFE": "Ehil Deri Yüzme Bıçağı",
    "T5_SKINNINGKNIFE": "Uzman Deri Yüzme Bıçağı",
    "T6_SKINNINGKNIFE": "Usta Deri Yüzme Bıçağı",
    "T4_SKINNINGKNIFE_AVALON": "Ehil Avalon Deri Yüzme Bıçağı",
    "T4_FISHINGROD": "Ehil Oltası",
    "T5_FISHINGROD": "Uzman Oltası",
    "T6_FISHINGROD": "Usta Oltası",
    "T4_FISHINGROD_AVALON": "Ehil Avalon Oltası",

    // --- HAMMADDELER ---
    // T1
    "T1_WOOD": "İşlenmemiş Kütükler",
    "T1_ROCK": "Kaba Taş",
    "T1_HIDE": "Post Parçaları",
    // T2
    "T2_WOOD": "Huş Kütüğü", "T2_ROCK": "Kireç Taşı", "T2_ORE": "Bakır Cevheri", "T2_HIDE": "Sert Post", "T2_FIBER": "Pamuk",
    "T2_PLANKS": "Huş Kalas", "T2_STONEBLOCK": "Kireç Taşı Bloğu", "T2_METALBAR": "Bakır Külçe", "T2_LEATHER": "Katı Deri", "T2_CLOTH": "Pamuk Kumaş",
    
    // T3
    "T3_WOOD": "Kestane Kütüğü", "T3_ROCK": "Kum Taşı", "T3_ORE": "Kalay Cevheri", "T3_HIDE": "İnce Post", "T3_FIBER": "Keten",
    "T3_PLANKS": "Kestane Kalas", "T3_STONEBLOCK": "Kum Taşı Bloğu", "T3_METALBAR": "Bronz Külçe", "T3_LEATHER": "Kalın Deri", "T3_CLOTH": "Keten Kumaş",

    // --- EKLENEN HAMMADDELER (T4-T8) ---
    // DERİ / POST (KÜRK)
    "T4_HIDE": "Orta Boy Post (Kürk)",
    "T5_HIDE": "Ağır Post (Kürk)",
    "T6_HIDE": "Sağlam Post (Kürk)",
    "T7_HIDE": "Kalın Post (Kürk)",
    "T8_HIDE": "Dayanıklı Post (Kürk)",
    "T4_LEATHER": "İşlenmiş Deri",
    "T5_LEATHER": "Tabaklanmış Deri",
    "T6_LEATHER": "Sertleştirilmiş Deri",
    "T7_LEATHER": "Güçlendirilmiş Deri",
    "T8_LEATHER": "Zırhlı Deri",

    // ODUN / KALAS
    "T4_WOOD": "Çam Kütüğü",
    "T5_WOOD": "Sedir Kütüğü",
    "T6_WOOD": "Kanlı Meşe Kütüğü",
    "T7_WOOD": "Dişbudak Kütüğü",
    "T8_WOOD": "Beyaz Yaprak Kütüğü",
    "T4_PLANKS": "Çam Kalas",
    "T5_PLANKS": "Sedir Kalas",
    "T6_PLANKS": "Kanlı Meşe Kalas",
    "T7_PLANKS": "Dişbudak Kalas",
    "T8_PLANKS": "Beyaz Yaprak Kalas",

    // CEVHER / KÜLÇE
    "T4_ORE": "Demir Cevheri",
    "T5_ORE": "Titanyum Cevheri",
    "T6_ORE": "Rünit Cevheri",
    "T7_ORE": "Göktaşı Cevheri",
    "T8_ORE": "Adamantiyum Cevheri",
    "T4_METALBAR": "Çelik Külçe",
    "T5_METALBAR": "Titanyum Çelik Külçe",
    "T6_METALBAR": "Rünit Çelik Külçe",
    "T7_METALBAR": "Göktaşı Çelik Külçe",
    "T8_METALBAR": "Adamantiyum Çelik Külçe",

    // LİF / KUMAŞ
    "T4_FIBER": "Kenevir",
    "T5_FIBER": "Gök Çiçeği",
    "T6_FIBER": "Kehribar Yaprağı",
    "T7_FIBER": "Güneş Keten",
    "T8_FIBER": "Hayalet Kenevir",
    "T4_CLOTH": "Kenevir Kumaş",
    "T5_CLOTH": "Gök Çiçeği Kumaş",
    "T6_CLOTH": "Kehribar Kumaş",
    "T7_CLOTH": "Güneş Keten Kumaş",
    "T8_CLOTH": "Hayalet Kenevir Kumaş",

    // TAŞ / BLOK
    "T4_ROCK": "Traverten",
    "T5_ROCK": "Granit",
    "T6_ROCK": "Arduvaz",
    "T7_ROCK": "Bazalt",
    "T8_ROCK": "Mermer",
    "T4_STONEBLOCK": "Traverten Bloğu",
    "T5_STONEBLOCK": "Granit Bloğu",
    "T6_STONEBLOCK": "Arduvaz Bloğu",
    "T7_STONEBLOCK": "Bazalt Bloğu",
    "T8_STONEBLOCK": "Mermer Bloğu",

    "T2_CARROT": "Havuçlar",
    "T3_BEAN": "Fasulyeler",
    "T4_WHEAT": "Buğday Demeti",
    "T5_TURNIP": "Turplar",
    "T6_CABBAGE": "Lahana",
    "T7_POTATO": "Patates",
    "T8_CORN": "Mısır Yığını",
    "T3_EGG": "Tavuk Yumurtaları"
};

const META_BASE_ITEMS = [
    'HEAD_CLOTH_SET1', 'ARMOR_CLOTH_SET1', 'SHOES_CLOTH_SET1',
    'HEAD_CLOTH_SET2', 'ARMOR_CLOTH_SET2', 'SHOES_CLOTH_SET2',
    'HEAD_CLOTH_SET3', 'ARMOR_CLOTH_SET3', 'SHOES_CLOTH_SET3',
    'HEAD_LEATHER_SET1', 'ARMOR_LEATHER_SET1', 'SHOES_LEATHER_SET1',
    'HEAD_LEATHER_SET2', 'ARMOR_LEATHER_SET2', 'SHOES_LEATHER_SET2',
    'HEAD_LEATHER_SET3', 'ARMOR_LEATHER_SET3', 'SHOES_LEATHER_SET3',
    'HEAD_PLATE_SET1', 'ARMOR_PLATE_SET1', 'SHOES_PLATE_SET1',
    'HEAD_PLATE_SET2', 'ARMOR_PLATE_SET2', 'SHOES_PLATE_SET2',
    'HEAD_PLATE_SET3', 'ARMOR_PLATE_SET3', 'SHOES_PLATE_SET3',
    'MAIN_SWORD', '2H_CLAYMORE', '2H_DUALSWORDS',
    '2H_BOW', '2H_LONGBOW', '2H_WARBOW',
    '2H_CROSSBOW', 'MAIN_1HCROSSBOW',
    'MAIN_DAGGER', '2H_DAGGERPAIR', '2H_CLAWS', 'MAIN_RAPIER_SET1',
    'MAIN_SPEAR', '2H_SPEAR', '2H_GLAIVE',
    'MAIN_AXE', '2H_AXE', '2H_HALBERD',
    'MAIN_FIRESTAFF', '2H_FIRESTAFF', '2H_INFERNOSTAFF',
    'MAIN_HOLYSTAFF', '2H_HOLYSTAFF', '2H_DIVINESTAFF',
    'MAIN_NATURESTAFF', '2H_NATURESTAFF', '2H_WILDSTAFF',
    // EKLENEN SİLAHLAR
    'MAIN_HAMMER', '2H_POLEHAMMER', '2H_HAMMER',
    'MAIN_MACE', '2H_MACE', '2H_FLAIL',
    '2H_QUARTERSTAFF', '2H_IRONCLADSTAFF', '2H_DOUBLEBLADEDSTAFF',
    'MAIN_FROSTSTAFF', '2H_FROSTSTAFF', '2H_GLACIALSTAFF',
    'MAIN_CURSESTAFF', '2H_CURSESTAFF', '2H_DEMONICSTAFF',
    'MAIN_ARCANESTAFF', '2H_ARCANESTAFF', '2H_ENIGMATICSTAFF',
    '2H_KNUCKLES_SET1', '2H_KNUCKLES_SET2', '2H_KNUCKLES_SET3',
    // EKLENEN YAN ELLER
    'OFF_SHIELD', 'OFF_TOWER_SHIELD',
    'OFF_BOOK', 'OFF_ORB_MORGANA',
    'OFF_TORCH', 'OFF_HORN_KEEPER',
    // EKLENEN DİĞER
    'CAPE', 'BAG',
    // TOPLAYICI SETLERİ
    'HEAD_GATHERER_FIBER', 'ARMOR_GATHERER_FIBER', 'SHOES_GATHERER_FIBER',
    'HEAD_GATHERER_HIDE', 'ARMOR_GATHERER_HIDE', 'SHOES_GATHERER_HIDE',
    'HEAD_GATHERER_ORE', 'ARMOR_GATHERER_ORE', 'SHOES_GATHERER_ORE',
    'HEAD_GATHERER_ROCK', 'ARMOR_GATHERER_ROCK', 'SHOES_GATHERER_ROCK',
    'HEAD_GATHERER_WOOD', 'ARMOR_GATHERER_WOOD', 'SHOES_GATHERER_WOOD',
    'HEAD_GATHERER_FISH', 'ARMOR_GATHERER_FISH', 'SHOES_GATHERER_FISH'
];

// Büyülenebilir Kaynaklar (Enchantable Resources)
const ENCHANTABLE_RESOURCES = ['WOOD', 'ORE', 'HIDE', 'FIBER', 'PLANKS', 'METALBAR', 'LEATHER', 'CLOTH'];
// Büyülenemeyen Kaynaklar (Taş ve Bloklar)
const FLAT_RESOURCES = ['ROCK', 'STONEBLOCK'];

const generatedItems = [];
for (let t = 4; t <= 8; t++) {
    META_BASE_ITEMS.forEach(base => {
        generatedItems.push(`T${t}_${base}`);
        generatedItems.push(`T${t}_${base}@1`);
        generatedItems.push(`T${t}_${base}@2`);
        generatedItems.push(`T${t}_${base}@3`); // Seviye 3 (Mor) eklendi
        generatedItems.push(`T${t}_${base}@4`); // Seviye 4 (Altın) eklendi
    });

    // Kaynakları da oluştur (T4-T8)
    ENCHANTABLE_RESOURCES.forEach(res => {
        generatedItems.push(`T${t}_${res}`);
        generatedItems.push(`T${t}_${res}@1`);
        generatedItems.push(`T${t}_${res}@2`);
        generatedItems.push(`T${t}_${res}@3`);
        generatedItems.push(`T${t}_${res}@4`);
    });

    FLAT_RESOURCES.forEach(res => {
        generatedItems.push(`T${t}_${res}`);
    });
}

const allItems = [...new Set([...Object.keys(itemNames), ...generatedItems])];

function getItemName(itemId) {
    let turkceIsim = itemNames[itemId];
    if (!turkceIsim) {
        const parts = itemId.split('@');
        const fullBaseName = parts[0]; 
        const enchantLevel = parts.length > 1 ? parts[1] : 0;
        
        const match = fullBaseName.match(/^T(\d+)_(.+)$/);
        
        if (match) {
            const tier = parseInt(match[1]);
            const baseType = match[2];
            
            const enchantSuffix = enchantLevel > 0 ? ` (Seviye ${enchantLevel})` : "";
            
            // Eğer düz halinin (T4_WOOD) özel bir ismi varsa onu kullan (Örn: Çam Kütüğü)
            if (itemNames[fullBaseName]) {
                turkceIsim = `${itemNames[fullBaseName]}${enchantSuffix}`;
            } else {
                // Yoksa genel isimlendirme yap
                const tierName = tierNames[tier] || `T${tier}`;
                const baseNameTR = baseItemNames[baseType] || baseType;
                turkceIsim = `${tierName} ${baseNameTR}${enchantSuffix}`;
            }
        } else {
            turkceIsim = itemId;
        }
    }
    return turkceIsim;
}

function findItemByName(query) {
    query = query.toLowerCase().trim();
    let exactMatch = null;
    let partialMatches = [];
    let bestSuggestion = { name: "", id: "", dist: Infinity };

    for (const id of allItems) {
        const name = getItemName(id);
        const lowerName = name.toLowerCase();

        if (lowerName === query) {
            exactMatch = { id, name };
            break;
        }

        if (lowerName.includes(query)) {
            partialMatches.push({ id, name });
        }

        if (partialMatches.length === 0) {
            const dist = levenshtein(query, lowerName);
            const tolerance = query.length < 5 ? 2 : 4;
            if (dist < bestSuggestion.dist && dist <= tolerance) {
                bestSuggestion = { name, id, dist };
            }
        }
    }

    if (exactMatch) return { type: 'exact', item: exactMatch };
    if (partialMatches.length > 0) return { type: 'partial', items: partialMatches };
    if (bestSuggestion.id) return { type: 'suggestion', item: bestSuggestion };
    return { type: 'none' };
}

module.exports = {
    allItems,
    getItemName,
    findItemByName,
    qualityNames,
    tierNames
};
