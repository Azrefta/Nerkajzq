/*

Creator & Dev: Azrefta & Evelyn
Buy?
 - t.me/Azrefta
 - 6285179993021

*/ // Jangan di edit!

const fs = require('fs');
const {
    BufferJSON,
    WA_DEFAULT_EPHEMERAL,
    generateWAMessageFromContent,
    proto,
    prepareWAMessageMedia
} = require("@whiskeysockets/baileys");
const pathDB = "./db/target.json";
if (!fs.existsSync(pathDB)) fs.writeFileSync(pathDB, JSON.stringify([]));

const normal = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const fancyCodes = [
  0x1D670, 0x1D671, 0x1D672, 0x1D673, 0x1D674, 0x1D675, 0x1D676, 0x1D677,
  0x1D678, 0x1D679, 0x1D67A, 0x1D67B, 0x1D67C, 0x1D67D, 0x1D67E, 0x1D67F,
  0x1D680, 0x1D681, 0x1D682, 0x1D683, 0x1D684, 0x1D685, 0x1D686, 0x1D687,
  0x1D688, 0x1D689, // A-Z
  0x1D68A, 0x1D68B, 0x1D68C, 0x1D68D, 0x1D68E, 0x1D68F, 0x1D690, 0x1D691,
  0x1D692, 0x1D693, 0x1D694, 0x1D695, 0x1D696, 0x1D697, 0x1D698, 0x1D699,
  0x1D69A, 0x1D69B, 0x1D69C, 0x1D69D, 0x1D69E, 0x1D69F, 0x1D6A0, 0x1D6A1,
  0x1D6A2, 0x1D6A3 // a-z
];

const hardFont = (text) =>
  [...text].map(c => {
    const idx = normal.indexOf(c);
    return idx !== -1 ? String.fromCodePoint(fancyCodes[idx]) : c;
  }).join("");

// formatStock.js
function formatStock(input) {
  if (!input) return "";

  // --- fallback hardFont jika tidak tersedia di scope ---
  if (typeof hardFont === "undefined") {
    // fallback: kembalikan isi tapi pakai karakter tebal semu (bisa diganti)
    globalThis.hardFont = function (s) { return s; };
  }
  
input = input.replace(/Common Summer/g, "xxdfr");

  // Urutan kustom (semua lowercased)
  const eggOrder = ["common", "xxdfr", "rare", "mythical", "paradise", "bug"].map(s => s.toLowerCase());
  const gearOrder = [
    "watering", "trading", "trowel", "recall", "basic", "advanced", "medium toy", "medium treat",
    "godly", "magnifying", "master", "cleaning", "favorite", "harvest", "friendship",
    "grandmaster", "levelup"
  ].map(s => s.toLowerCase());
  const seedOrder = [
    "carrot", "strawberry", "blueberry", "orange", "tomato", "corn", "daffodil", "watermelon",
    "pumpkin", "apple", "bamboo", "coconut", "cactus", "dragon", "mango", "grape", "mushroom",
    "pepper", "cacao", "beanstalk", "ember lily", "sugar apple", "burning bud", "giant pinecone",
    "elder strawberry", "romanesco"
  ].map(s => s.toLowerCase());

  // utility helpers
  const normalizeKey = s => (s || "").toString().trim().toLowerCase();

  // strip diacritics & punctuation/emoji for robust alphabetical compare
  const stripForCompare = s => {
    if (!s) return "";
    try {
      // remove diacritics, then remove non letter/number/space
      return s
        .normalize && s.normalize("NFKD")
        .replace(/\p{Diacritic}/gu, "")
        .replace(/[^\p{L}\p{N}\s]/gu, "")
        .trim()
        .toLowerCase();
    } catch (e) {
      // fallback simple
      return s.replace(/[^\w\s]/g, "").trim().toLowerCase();
    }
  };

  // find if hay contains any exact word from needles (use whole-word-ish matching)
  const containsAnyWholeWord = (hay, needles) => {
    if (!hay) return -1;
    hay = hay.toLowerCase();
    for (let i = 0; i < needles.length; i++) {
      const needle = needles[i].toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(`(^|[^\\p{L}\\p{N}])${needle}([^\\p{L}\\p{N}]|$)`, "iu");
      if (re.test(hay)) return i;
    }
    return -1;
  };

  // hasil parsiran sementara
  const lines = input.split(/\r?\n/);
  let resultLines = [];

  // state for current section
  let currentSection = null; // { rawTitle, normalizedTitle, itemsMap, itemOrderSeq }

  function startNewSection(titleLine, titleInner) {
    finalizeSection();
    const titleTextNoStars = titleLine.replace(/[*]/g, "").trim();
    const normalizedTitle = titleTextNoStars.toLowerCase();
    currentSection = {
      rawTitleLine: titleLine,
      titleInner: titleInner,
      normalizedTitle,
      itemsMap: new Map(), // key -> { name, key, qty, prefixes:Set, originalNames:Set, orderHintIndex }
      itemOrderSeq: [] // to preserve insertion order when needed
    };
    resultLines.push(titleLine.replace(/^(.*?)(\*.+\*)/, (m, p1, p2) => {
      const inner = p2.replace(/\*/g, "");
      return `${p1}*${hardFont(inner)}*`;
    }));
  }

  function addItemToCurrentSection(prefix, rawName, qty) {
    if (!currentSection) {
      startNewSection("*Unknown*", "Unknown");
    }
    const key = normalizeKey(rawName);
    const entry = currentSection.itemsMap.get(key);
    if (entry) {
      entry.qty += qty;
      if (prefix && prefix.includes(">")) entry.prefixes.add(">");
      if (rawName && rawName.length > entry.name.length) entry.name = rawName;
      entry.originalNames.add(rawName);
    } else {
      const newE = {
        name: rawName,
        key,
        qty,
        prefixes: new Set(prefix && prefix.includes(">") ? [">"] : []),
        originalNames: new Set([rawName]),
        orderHintIndex: -1
      };
      currentSection.itemsMap.set(key, newE);
      currentSection.itemOrderSeq.push(key);
    }
  }

  function finalizeSection() {
    if (!currentSection) return;

    const arr = Array.from(currentSection.itemsMap.values());
    const t = currentSection.normalizedTitle;

    // more robust category detection (whole word)
    const isEgg = /\begg(s)?\b/i.test(t);
    const isGear = /\bgear(s)?\b/i.test(t);
    const isSeed = /\bseed(s)?\b/i.test(t);
    const isTravel = /\btraveling\b|\btravelling\b|\bmerchant\b/i.test(t);
    const isCosmetic = /\bcosmet(ic|ics)?\b/i.test(t);

    let orderList = null;
    let alphabetical = false;

    // priority: egg -> gear -> seed -> traveling -> cosmetic
    if (isEgg) orderList = eggOrder;
    else if (isGear) orderList = gearOrder;
    else if (isSeed) orderList = seedOrder;
    else if (isTravel) alphabetical = true;
    else if (isCosmetic) alphabetical = true;

    // compute order index hint for each item when orderList exists
    if (orderList) {
      arr.forEach(item => {
        item.orderHintIndex = containsAnyWholeWord(item.key, orderList);
      });
    } else {
      arr.forEach(item => item.orderHintIndex = -1);
    }

    // prepare collator for stable locale-aware compare
    const collator = new Intl.Collator(undefined, { sensitivity: "base", numeric: true });

    // Sorting comparator
    arr.sort((a, b) => {
      // 1) both have explicit order hints
      if (a.orderHintIndex >= 0 && b.orderHintIndex >= 0) {
        if (a.orderHintIndex !== b.orderHintIndex) return a.orderHintIndex - b.orderHintIndex;
        if (a.name.length !== b.name.length) return b.name.length - a.name.length;
        return collator.compare(stripForCompare(a.name), stripForCompare(b.name));
      }

      // 2) one has hint => hint first
      if (a.orderHintIndex >= 0 && b.orderHintIndex < 0) return -1;
      if (b.orderHintIndex >= 0 && a.orderHintIndex < 0) return 1;

      // 3) alphabetical sections (explicit)
      if (alphabetical) {
        const sa = stripForCompare(a.key);
        const sb = stripForCompare(b.key);
        const cmp = collator.compare(sa, sb);
        if (cmp !== 0) return cmp;
        // tie-breaker: prefer longer original display name
        if (a.name.length !== b.name.length) return b.name.length - a.name.length;
        return 0;
      }

      // 4) neither in orderList: preserve insertion order if possible
      const ai = currentSection.itemOrderSeq.indexOf(a.key);
      const bi = currentSection.itemOrderSeq.indexOf(b.key);
      if (ai >= 0 && bi >= 0) return ai - bi;
      if (ai >= 0) return -1;
      if (bi >= 0) return 1;

      // final fallback alphabetical on cleaned keys
      const ca = stripForCompare(a.key);
      const cb = stripForCompare(b.key);
      const finalCmp = collator.compare(ca, cb);
      if (finalCmp !== 0) return finalCmp;
      return b.name.length - a.name.length;
    });

    // push sorted items to resultLines
    for (const it of arr) {
      const useArrow = it.prefixes.has(">");
      const displayName = it.name;
      const qty = it.qty;

      if (useArrow) {
        resultLines.push(`> *${displayName}* ×${qty}`);
      } else {
        resultLines.push(`- ${displayName} ×${qty}`);
      }
    }

    currentSection = null;
  }

  // Main parse loop
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // TITLE detection: memiliki dua '*' dan bukan line item (- atau > di awal)
    if ((line.match(/\*/g) || []).length >= 2 && !line.trimStart().startsWith("-") && !line.trimStart().startsWith(">")) {
      const match = line.match(/^(.*?)(\*.+\*)/);
      if (match) {
        const emojiPart = match[1] || "";
        const textPart = match[2];
        const innerText = textPart.replace(/\*/g, "");
        startNewSection(`${emojiPart}*${innerText}*`, innerText);
      } else {
        startNewSection(line, line.replace(/\*/g, ""));
      }
      continue;
    }

    // Item detection: optional prefix (->, >, -, or nothing), name, ' x' number
    const itemMatch = line.match(/^\s*([>\-]?)\s*(.+?)\s+x(\d+)\s*$/i);
    if (itemMatch) {
      const prefix = itemMatch[1] || "";
      const rawName = itemMatch[2].trim();
      const qty = parseInt(itemMatch[3], 10) || 0;
      addItemToCurrentSection(prefix, rawName, qty);
      continue;
    }

    // blank line -> separator
    if (line.trim() === "") {
      finalizeSection();
      resultLines.push("");
      continue;
    }

    // other lines -> keep as-is
    finalizeSection();
    resultLines.push(line);
  }

  // finalize last section if any
  finalizeSection();

  // join and final replace copyright
let out = resultLines.join("\n").replace("xxdfr", "Common Summer");
    if (/`Copyright © growagarden\.info`/.test(out)) {
        out = out.replace(/`Copyright © growagarden\.info`/g, "~ Footage From *© Grow A Garden*");
    } else {
        out = out.trimEnd() + "\n\n~ Footage From *© Grow A Garden*";
    }
  return out;
}

function weatherInfo(input) {
    if (!input) return "";
    let updated = input.replace("Weather Event Alert!", hardFont("Weather Event Alert!"));
    if (/`Copyright © growagarden\.info`/.test(updated)) {
        updated = updated.replace(/`Copyright © growagarden\.info`/g, "~ Footage From *© Grow A Garden*");
    } else {
        updated = updated.trimEnd() + "\n\n~ Footage From *© Grow A Garden*";
    }
    return updated;
}

let targets = JSON.parse(fs.readFileSync(pathDB, "utf-8"));

module.exports = client = async (client, m, store) => {
try {
console.log(m);
const fkontak = {
    key: {
        fromMe: false,
        participant: `0@s.whatsapp.net`,
        ...({ remoteJid: "status@broadcast" })
    },
    message: {
        contactMessage: {
            displayName: `"I ain't feeling good"`,
            vcard: `BEGIN:VCARD
VERSION:3.0
N:XL;Azrefta;;;
FN:${m.name}
item1.TEL;waid=6288991593021:6288991593021
item1.X-ABLabel:Ponsel
END:VCARD`
        }
    }
};

const ids = [
  '120363417721042596@newsletter', // primary 
  '120363271605687655@newsletter'  // fallback
];

let lastActivePeriod = null; // periode terakhir ids[0] aktif
let activeId = ids[0];       // default selalu primary

// Cache Egg
let eggSentBlocks = {}; // key = "YYYY-MM-DD HH:MM", value = true

// ==========================
// Fungsi untuk hitung periode 5 menit
function getCurrentPeriod() {
  const now = new Date();
  const rounded = Math.floor(now.getMinutes() / 5) * 5;
  return `${now.getFullYear()}-${now.getMonth()+1}-${now.getDate()} ${now.getHours()}:${String(rounded).padStart(2,"0")}`;
}

// Fungsi untuk hitung blok 30 menit
function getEggBlock() {
  const now = new Date();
  const minutes = now.getMinutes();
  const blockMinutes = minutes < 30 ? "00" : "30";
  return `${now.getFullYear()}-${now.getMonth()+1}-${now.getDate()} ${now.getHours()}:${blockMinutes}`;
}

// ==========================
// Pembersih cache Egg, dijalankan setiap jam
function cleanEggCache() {
  const now = new Date();
  const currentHour = now.getHours();
  const currentDate = `${now.getFullYear()}-${now.getMonth()+1}-${now.getDate()}`;
  
  for (const block in eggSentBlocks) {
    if (!block.startsWith(currentDate + " " + currentHour)) {
      delete eggSentBlocks[block]; // hapus blok yang tidak aktif di jam ini
    }
  }
  console.log(`[Egg Cache] Dibersihkan, sisa blok: ${Object.keys(eggSentBlocks).length}`);
}

// Set interval pembersih setiap jam
setInterval(cleanEggCache, 60 * 60 * 1000); // 1 jam

// ==========================
// Handler pesan utama
async function handleMessage(m) {
  const text = m.body.toLowerCase();
  const currentPeriod = getCurrentPeriod();

  // Update lastActivePeriod & activeId
  if (m.chat === ids[0] || m.sender === ids[0]) {
    lastActivePeriod = currentPeriod;
    activeId = ids[0];
  } else if ((m.chat === ids[1] || m.sender === ids[1]) && lastActivePeriod !== currentPeriod) {
    activeId = ids[1];
  }

  // Hanya proses jika pesan dari activeId
  if (!(m.chat === activeId || m.sender === activeId)) return;

  const stockKeywords = ["🥕","🫐","🍓","🍅","common egg","cosmetic","strawberry"];
  const targets = ["egg", "carrot", "strawberry", "tomato"]; // contoh target items

  // Stock Notification
  if (text.includes("🥚") && text.includes("stock") && stockKeywords.some(k => text.includes(k))) {
    const matchedItems = targets.filter(item => new RegExp(item, "i").test(text));
    
    if (matchedItems.length > 0) {
      const eggBlock = getEggBlock();
      const filteredItems = matchedItems.filter(item => {
        if (item.toLowerCase().includes("egg")) {
          // hanya kirim sekali per blok 30 menit
          if (eggSentBlocks[eggBlock]) return false;
          eggSentBlocks[eggBlock] = true;
          return true;
        }
        return true;
      });

      if (filteredItems.length === 0) return; // tidak ada item yang boleh dikirim

      const itemListText = filteredItems.join("\n- ");

      try {
        m.meta = await client.groupMetadata("120363321707002812@g.us");
      } catch (e) {
        m.meta = {};
      }

      await client.sendMessage(
        "120363321707002812@g.us",
        {
          text: `*Stock Notification!!* 📢\n\n🚀 Stock Available!!\n- ${itemListText}\n\n@120363321707002812@g.us`,
          contextInfo: {
            mentionedJid: m.meta.participants
              .filter(a => a.id.endsWith('@s.whatsapp.net'))
              .map(a => a.id),
            groupMentions: [
              {
                groupJid: "120363321707002812@g.us",
                groupSubject: "everyone"
              }
            ]
          }
        },
        { quoted: fkontak }
      );
    }

    await client.sendMessage("120363422344034424@newsletter", { text: formatStock(m.body) });
  }

  // Weather Notification
  else if (text.includes("copyright © growagarden.info") && text.includes("mutation") && text.includes("weather")) {
    await client.sendMessage("120363422344034424@newsletter", { text: weatherInfo(m.body) });
  }
}

// ==========================
// Jalankan pembersih pertama kali saat start
cleanEggCache();
const prefa = ["!", ".", "#"];
const usePrefa = true;

const body = (m?.body && m.body.length > 0) ? m.body : " ";
const botNumber = m?.botNumber || "0";
const sender = m?.sender || "unknown";

const prefix = usePrefa 
  ? (prefa.find(p => body.startsWith(p)) || ".")
  : "";

const isCmd = usePrefa 
  ? body.startsWith(prefix) 
  : true;

const [cmd, ...args] = body.slice(prefix.length).trim().split(/ +/);
const command = (cmd || "").toLowerCase();
const query = args.join(" ");
const op = [m.botNumber].map(v => v.replace(/[^0-9]/g, '') + '@s.whatsapp.net').includes(m.sender);

switch (command) {
case "add":
    if (!query) {
        await m.reply("⚠️ You must provide a target to add. Example: `.target add <name>`");
        break;
    }
    if (!targets.includes(query)) {
        targets.push(query);
        fs.writeFileSync(pathDB, JSON.stringify(targets, null, 2));
        await m.reply(`✅ Added target: ${query}`);
    } else {
        await m.reply(`⚠️ Target "${query}" already exists.`);
    }
    break;

case "del":
    if (!query) {
        await m.reply("⚠️ You must provide a target to remove. Example: `.target del <name>`");
        break;
    }
    if (targets.some(item => item.toLowerCase() === query.toLowerCase())) {
        targets = targets.filter(item => item.toLowerCase() !== query.toLowerCase());
        fs.writeFileSync(pathDB, JSON.stringify(targets, null, 2));
        await m.reply(`🗑️ Removed target: ${query}`);
    } else {
        await m.reply(`⚠️ Target "${query}" not found.`);
    }
    break;

case "list":
    if (targets.length === 0) {
        await m.reply(`⚠️ No targets added yet!`);
    } else {
        let listText = targets.map((t, i) => `- ${t}`).join("\n");
        await m.reply(`📋 Current Targets:\n${listText}`);
    }
    break;

default:
  if (m.body.startsWith('>') && op) {
    try {
      let evaled = await eval(m.body.slice(2))
      m.reply(typeof evaled === 'string' ? evaled : require('util').inspect(evaled))
    } catch (e) {
      m.reply(String(e))
    }
  }

if (m.body.startsWith('<') && op) {
  try {
    const kode = m.body.trim().split(/ +/)[0];
    const q = m.body.trim().slice(kode.length).trim();
    const teks = await eval(`(async()=>{${kode === '>>' ? 'return ' : ''}${q}})()`);
    await m.reply(require("util").format(teks));
  } catch (e) {
    await m.reply(require("util").format(e));
  }
}

}

  } catch (err) {
    console.log(require("util").format(err));
  }
};

let file = require.resolve(__filename);
require('fs').watchFile(file, () => {
  require('fs').unwatchFile(file);
  console.log('\x1b[0;32m' + __filename + ' \x1b[1;32mupdated!\x1b[0m');
  delete require.cache[file];
  require(file);
});
