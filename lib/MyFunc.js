/*

Creator & Dev: Azrefta & Evelyn
Buy?
 - t.me/Azrefta
 - 6285179993021

*/ // Jangan di edit!

const {
  proto,
  extractMessageContent,
  getContentType,
  downloadContentFromMessage,
  getDevice
} = require('@whiskeysockets/baileys');
const { compressChatID } = require('./whisperID');
const path = require('path');
const fs = require('fs');

const extractMentions = (input, version) => {
    if (!input) return [];
    const matches = input.match(/@\S+/g);
    if (!matches) return [];
    return matches.map((mention) => {
        const cleanedMention = mention.replace(/[^0-9]/g, "");
        return version === "@s"
            ? `${cleanedMention}@s.whatsapp.net`
            : cleanedMention;
    });
};

exports.Append = async (client, m, store) => {
  if (!m) return m;
  let botNumber;

  try {
    botNumber = await client.decodeJid(client.user.id);
  } catch (e) {
    console.error('Error decoding bot number:', e);
    botNumber = undefined;
  }

  try {
    if (m.key) {
      m.id = m.key?.id ?? '';
      m.chat = m.key?.remoteJid ?? '';
      m.fromMe = Boolean(m.key?.fromMe);
      m.botNumber = botNumber;
      m.isBaileys = client.checkBaileysId(m.id);
      m.device = getDevice(m.id) || 'Unknown';
      m.type = getContentType(m.message) || Object.keys(m.message || {})[0] || '';
      m.isGroup = typeof m.chat === 'string' && m.chat.endsWith('@g.us');
      m.sender = await client.decodeJid(m.fromMe ? client.user.id : (m.key.participant || m.chat || '')) || '';
      m.sid = compressChatID(m.sender) || '';
      m.from = compressChatID(m.chat) || '';
      m.gid = m.isGroup ? compressChatID(m.chat) : '';
      m.isNews = /newsletter/.test((m.chat || '') + (m.sender || ''));

      let name = m.pushName || '';
      if (!name) {
        try { name = await client.getName(m.sender) || ''; } catch {}
      }
      m.pushName = m.pushname = m.name = name;

      ['pushName', 'pushname'].forEach(k => 
        Object.defineProperty(m, k, { enumerable: false, writable: true, configurable: true, value: name })
      );
      Object.defineProperty(m, 'messageTimestamp', { value: m.messageTimestamp, writable: true, configurable: true, enumerable: false });

      try {
        if (m.message) {
          client.extractMessage(m);

          m.isMedia = Boolean(m?.msg?.mimetype || m?.msg?.thumbnailDirectPath) && /image|video|sticker|document/.test(m?.type || '');

          if (m.isMedia) {
            m.mimeType = typeof m?.msg?.mimetype === 'string' ? m.msg.mimetype : '';
            m.size = m.msg.fileLength || '';
            m.height = m.msg.height || '';
            m.width = m.msg.width || '';
            m.ratio = (() => {
              const w = m.msg.width, h = m.msg.height;
              if (!w || !h) return null;
              const gcd = (a, b) => b ? gcd(b, a % b) : a;
              const d = gcd(w, h);
              return `${Math.round(w / d)}:${Math.round(h / d)}`;
            })();

            if (/webp/i.test(m.mimeType)) {
              m.isAnimated = !!m.msg.isAnimated;
            }
          }

          // quoted
          try {
const rawQuoted = (m.isNews || m.type === 'interactiveResponseMessage') 
    ? '' 
    : m.msg?.contextInfo?.quotedMessage || '';
            if (rawQuoted) {
              const inner = extractMessageContent(rawQuoted) || rawQuoted;
              m.quoted = {
                message: inner,
                type: getContentType(inner) || Object.keys(inner)[0] || '',
                id: m.msg.contextInfo.stanzaId || ''
              };
              m.quoted.isMedia = Boolean(
                m?.quoted?.message?.[m.quoted?.type]?.mimetype ||
                m?.quoted?.message?.[m.quoted?.type]?.thumbnailDirectPath
              ) && /image|video|sticker|document/.test(m.quoted?.type || '');

              m.quoted.sender = await client.decodeJid(m.msg.contextInfo.participant || '') || '';
              m.quoted.fromMe = m.quoted.sender === botNumber;
              m.quoted.isBaileys = client.checkBaileysId(m.quoted.id);
              m.device = getDevice(m.quoted.id);

              if (m.quoted.isMedia) {
                const qmsg = m.quoted.message[m.quoted.type];
                m.quoted.mimeType = typeof qmsg?.mimetype === 'string' ? qmsg.mimetype : '';
                m.quoted.size = qmsg?.fileLength || '';
                m.quoted.height = qmsg?.height || '';
                m.quoted.width = qmsg?.width || '';
                m.quoted.ratio = (() => {
                  const w = qmsg?.width, h = qmsg?.height;
                  if (!w || !h) return null;
                  const gcd = (a, b) => b ? gcd(b, a % b) : a;
                  const d = gcd(w, h);
                  return `${Math.round(w / d)}:${Math.round(h / d)}`;
                })();
              }

              m.quoted.text = inner.caption || inner.conversation || inner.contentText || '';
              m.quoted.fakeObj = proto.WebMessageInfo.fromObject({
                key: { remoteJid: m.chat, fromMe: m.quoted.fromMe, id: m.quoted.id },
                message: inner,
                ...(m.isGroup ? { participant: m.quoted.sender } : {})
              });
              m.quoted.mentions = m.msg.contextInfo.mentionedJid || [];
            } else {
              m.quoted = null;
            }
          } catch (qerr) {
            console.error('Error parsing quoted message:', qerr);
            m.quoted = null;
          }
        }
      } catch (err) {
        console.error('Error in message content section:', err);
      }
    }
  } catch (e) {
    console.error('General serialization error:', e);
  }

  // reply function
m.reply = (inputText, options = {}) => {
	(async () => {
      try {
        let text = Array.isArray(inputText)
          ? (typeof acak === 'function' ? acak(inputText) : inputText[0] || '')
          : String(inputText);

        const mentionsFound = typeof extractMentions === 'function'
          ? extractMentions(text, '@s') : [];

        mentionsFound.forEach(men => {
          text = text.replace(men, `@${men.split('@')[0]}`);
        });

        const customMentions = Array.isArray(options.mentions)
          ? options.mentions : options.mentions ? [options.mentions] : [];

        const allMentions = [...new Set([...customMentions, ...mentionsFound, m.sender])];

const contextInfo = {
  externalAdReply: {
    title: 'Grow A Garden',
    body:  'By Azrefta',
    thumbnail: await client.getBuffer("https://azrefta.github.io/Zeraaa/assets/media/roffi_online/GrowAGrden.png"),
    thumbnailUrl: 'https://www.roblox.com/share?code=176a00dd9aa70f4b9768b0fa724cc877&type=Server',
    mediaType: 1,
    previewType: 0,
    renderLargerThumbnail: options.renderLargerThumbnail || false
  },
  forwardingScore: options.forwardingScore ?? 1945,
  isForwarded: options.isForwarded ?? true,
  mentionedJid: allMentions,
  ...options.contextInfo
};

        let payload;
        if (options.buttons) {
          const footer = options.footer || global.footer;
          const viewOnce = options.viewOnce ?? true;
          const headerType = options.headerType ?? 1;

          payload = options.type && options.type !== 'text' ? {
            [options.type]: { url: options.mediaUrl || '' },
            caption: text, footer, buttons: options.buttons,
            contextInfo, viewOnce, headerType,
            ...(options.mime && { mimetype: options.mime })
          } : {
            text, footer, buttons: options.buttons,
            contextInfo, viewOnce, headerType
          };

        } else {
          payload = options.type && options.type !== 'text' ? {
            [options.type]: { url: options.mediaUrl || '' },
            caption: text, contextInfo,
            ...(options.mime && { mimetype: options.mime })
          } : {
            text, mentions: allMentions,
            ...(options.simple ? {} : { contextInfo })
          };
        }

        return await client.sendMessage(client.setNet(options.sender || m.chat), payload);
      } catch (e) {
        console.error(e);
        return '';
      }
      })();
    };

  return m;
};

let file = require.resolve(__filename);
require('fs').watchFile(file, () => {
  require('fs').unwatchFile(file);
  console.log('\x1b[0;32m' + __filename + ' \x1b[1;32mupdated!\x1b[0m');
  delete require.cache[file];
  require(file);
});