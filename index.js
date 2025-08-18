/*

Creator & Dev: Azrefta & Evelyn
Buy?
 - t.me/Azrefta
 - 6285179993021

*/ // Jangan di edit!

const { default: makeWASocket, DisconnectReason, makeCacheableSignalKeyStore, areJidsSameUser, jidDecode, generateWAMessage, proto, fetchLatestBaileysVersion, makeInMemoryStore } = require('@whiskeysockets/baileys');
const { cleanSessionPath } = require('./lib/deleteSession');
const { useMultiFileAuthState } = require('./lib/ElyvAuth');
const { compressChatID } = require('./lib/whisperID');
const msgRetryCounterCache = new Map();
const { Boom } = require('@hapi/boom');
const readline = require("readline");
const https = require("https");
const chalk = require('chalk');
const path = require('path');
const http = require("http");
const P = require('pino');
const fs = require('fs');

const { Append } = require('./lib/MyFunc');

const usePairingCode = true;

const isAsrarFileExist = fs.existsSync(path.join(__dirname, './Auth/default/Asrar.elyv'));

// Bikin readline baru hanya saat dibutuhkan, lalu tutup saat selesai
const askPhoneNumber = async () => {
  return new Promise((resolve, reject) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const timer = setTimeout(() => {
      console.error(
        chalk
          .bgRgb(18, 18, 18)
          .whiteBright('  No input for 2 minutes. Script terminated. ') +
          chalk.reset(),
      );
      rl.close(); // pastikan ditutup
      process.exit(2);
    }, 120000);

    rl.question(
      `\n${chalk.bgRgb(18, 18, 18).whiteBright(' Enter your phone number (starting with 62): ')}${chalk.reset()}\n`,
      (answer) => {
        clearTimeout(timer);
        rl.close(); // close setelah selesai input
        resolve(answer);
      }
    );
  });
};

function printSessionDetails(client) {
  try {
    const boxColor = chalk.hex('#2563EB');
    const labelColor = chalk.hex('#FFFFFF');
    const valueColor = chalk.hex('#D1D5DB');
    const statusColor = chalk.hex('#FACC15').bold;
    const idHighlight = chalk.hex('#2563EB');
    const footerNote = chalk.hex('#6366F1').italic;

const name = client?.user?.name?.toString().trim() || "Unknown Name";
const id = client?.user?.id?.toString().trim() || "0";
    const shortId = compressChatID(id.split(':')[0]) + "@s";

    const output = [
      boxColor.bold('┌─────────────────────────────────────┐'),
      boxColor.bold('│') + ' ' + labelColor.bold('SESSION DETAIL'.padEnd(31)),
      boxColor.bold('├─────────────────────────────────────┤'),
      boxColor('│ ') + labelColor('User  ') + ': ' + valueColor(name.padEnd(27)),
      boxColor('│ ') + labelColor('ID    ') + ': ' + idHighlight(shortId.padEnd(27)),
      boxColor('│ ') + labelColor('Status') + ': ' + statusColor('ONLINE'.padEnd(27)),
      boxColor.bold('└─────────────────────────────────────┘')
    ];

    console.log(chalk.bgRgb(10, 10, 10)(output.join('\n')) + footerNote('\n» Sedang memuat Chat, Tunggu 5 menit...'));
  } catch (err) {
    console.error(chalk.red.bold('\n[ERROR] printSessionDetails failed:\n'), err.stack || err.message || err);
  }
}
function handleConnectionUpdates(client) {
    client.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, receivedPendingNotifications } = update;

        // Handle disconnection events
        if (connection === 'close') {
            const reason = new Boom(lastDisconnect?.error)?.output.statusCode;

            const messages = {
                [DisconnectReason.connectionLost]: 'Connection to server lost. Initiating retry.',
                [DisconnectReason.connectionClosed]: 'Remote host closed the session. Reconnecting.',
                [DisconnectReason.restartRequired]: 'Session requires restart. Preparing...',
                [DisconnectReason.timedOut]: 'Connection timeout. Attempting to reestablish.',
                [DisconnectReason.badSession]: 'Corrupted session detected. Manual re-authentication required.',
                [DisconnectReason.connectionReplaced]: 'Session replaced by another instance. Logging out.',
                [DisconnectReason.loggedOut]: 'User logged out. Session reset required.',
                [DisconnectReason.Multidevicemismatch]: 'Multi-device inconsistency. Session clearance needed.',
            };

            const message = messages[reason];

            if (message) {
                const isRetry = [
                    DisconnectReason.connectionLost,
                    DisconnectReason.connectionClosed,
                    DisconnectReason.restartRequired,
                    DisconnectReason.timedOut,
                ].includes(reason);

                const isFatal = [
                    DisconnectReason.badSession,
                    DisconnectReason.loggedOut,
                    DisconnectReason.Multidevicemismatch,
                ].includes(reason);

                const isReplaced = reason === DisconnectReason.connectionReplaced;

                const statusTag = isRetry ? '[notice]' : isFatal ? '[fatal]' : '[info]';
                const color = isRetry
                    ? chalk.hex('#FF6400')
                    : isFatal
                        ? chalk.hex('#FF0000')
                        : chalk.hex('#00B8B8');

                console.log(
                    chalk.bgRgb(27, 31, 42).hex('#DCDCDC')(statusTag) +
                    ' ' +
                    color(message) +
                    chalk.reset()
                );

                if (isFatal) {
                    if (reason === DisconnectReason.badSession) {
                        process.exit(1);
                    }

                    if (reason === DisconnectReason.loggedOut || reason === DisconnectReason.Multidevicemismatch) {
                        cleanSessionPath();
                        process.exit(reason === DisconnectReason.Multidevicemismatch ? 0 : 1);
                    }

                } else if (isReplaced) {
                    client.logout();

                } else if (isRetry) {
                    await client.retryConnection(); printSessionDetails(client);
                }

            } else {
                console.log(
                    chalk.bgRgb(27, 31, 42).hex('#FF4D4D')('[error] ') +
                    chalk.bgRgb(27, 31, 42).hex('#DCDCDC')(`Unidentified disconnect reason: ${reason || 'Unknown'}`) +
                    chalk.reset()
                );
                await client.retryConnection(); printSessionDetails(client);
            }
        }

        // Handle connection open event
        if (connection === 'open') {
            printSessionDetails(client);
        }

        // Handle pending notifications
        else if (receivedPendingNotifications === 'true') {
            console.log(
                chalk.bgRgb(27, 31, 42).hex('#00FFFF')('[sync] ') +
                chalk.bgRgb(27, 31, 42).hex('#DCDCDC')('Pending notifications are being processed.') +
                chalk.reset()
            );
        }
    });
}

const runConnection = async ({ BOT_QR = true } = {}) => {
  const store = makeInMemoryStore({
    logger: P().child({ level: 'silent', stream: 'store' }),
  });
  const { version } = await fetchLatestBaileysVersion();
  const { state, saveCreds } = await useMultiFileAuthState(
    `./Auth/default`,
  );
  const logger = P({ level: 'silent' });
  let client = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    syncFullHistory: false,
    logger,
    keepAliveIntervalMs: 30000,
    printQRInTerminal: BOT_QR,
    markOnlineOnConnect: false,
    connectTimeoutMs: 60000,
    retryRequestDelayMs: 10,
    maxMsgRetryCount: 15,
    defaultQueryTimeoutMs: undefined,
    generateHighQualityLinkPreview: true,
    transactionOpts: {
      maxCommitRetries: 10,
      delayBetweenTriesMs: 10,
    },
    msgRetryCounterCache,
    browser: ['Linux', 'Edge', '124.0.2478.67-linux6.1'],
    getMessage: async (key) => {
      const msg = await store?.loadMessage(key.remoteJid, key.id);
      return msg?.message ?? { conversation: 'client' };
    },
  });

  if (!BOT_QR && !client.authState.creds.registered) {
    cleanSessionPath();

    let phoneNumber = await askPhoneNumber();

    if (!/^\d+$/.test(phoneNumber)) {
      console.error(
        chalk.bgRgb(18, 18, 18).whiteBright(' Only digits are allowed. ') +
          chalk.reset(),
      );
      process.exit(2);
    }

    let code = await client.requestPairingCode(phoneNumber, 'QWERTYUI');
    if (code)
      console.log(
        chalk.bgRgb(18, 18, 18).whiteBright(' Pairing Code › ') +
          chalk.reset() +
          `${code.match(/.{1,4}/g).join('-')}\n`,
      );
  }
    store?.bind(client.ev);

if (isAsrarFileExist) {
  void client;
}
    store.bind(client.ev);

    client.decodeJid = (jid) => {
        if (!jid) return jid;
        if (/:\d+@/gi.test(jid)) {
            let decode = jidDecode(jid) || {};
            return decode.user && decode.server && decode.user + '@' + decode.server || jid;
        } else return jid;
    };

    client.ev.on('contacts.update', update => {
        for (let contact of update) {
            let id = client.decodeJid(contact.id);
            if (store && store.contacts) store.contacts[id] = { id, name: contact.notify };
        }
    });
    
client.retryConnection = async () => {
  console.log(
    chalk.bgRgb(27, 31, 42).hex('#FFD900')('[system] ') +
    chalk.bgRgb(27, 31, 42).hex('#DCDCDC')('Attempting reconnection in 3s...') +
    chalk.reset()
  );

  setTimeout(() => {
    runConnection();
  }, 3000);
};
    
handleConnectionUpdates(client);
    
client.handleInteractiveResponseMessage = async (m, msg) => {
    if (
        m.type === 'interactiveResponseMessage' &&
        m.msg?.nativeFlowResponseMessage?.paramsJson &&
        m.message?.interactiveResponseMessage?.contextInfo?.quotedMessage &&
        m.message?.interactiveResponseMessage?.contextInfo?.participant
    ) {
        try {
        	m.sender = await client.decodeJid(m.fromMe ? client.user.id : (m.key.participant || m.chat || '')) || '';
        	m.chat = m.key?.remoteJid ?? '';
        	m.mentionedJid = m.msg.contextInfo?.mentionedJid || []; m.expiration = m.msg.contextInfo?.expiration || 0;
            const quoted = {
                key: {
                    remoteJid: m.chat,
                    fromMe: areJidsSameUser(
                        m.message.interactiveResponseMessage.contextInfo.participant,
                        client.user.id
                    ),
                    id: m.message.interactiveResponseMessage.contextInfo.stanzaId,
                },
                message: m.message.interactiveResponseMessage.contextInfo.quotedMessage,
            };

            const parsedParams = JSON.parse(m.msg.nativeFlowResponseMessage.paramsJson);
            const responseText = parsedParams?.id || 'Tidak ada ID';

            const newMsg = await generateWAMessage(m.chat, {
                text: responseText,
                mentions: m.mentionedJid || []
            }, {
                userJid: client.user.id,
                quoted
            });

            newMsg.key = m.key;
            newMsg.key.fromMe = areJidsSameUser(m.sender, client.user.id);
            if (m.isGroup) newMsg.participant = m.sender;

            client.ev.emit('messages.upsert', {
                ...msg,
                messages: [proto.WebMessageInfo.fromObject(newMsg)],
                type: 'append'
            });

        } catch (err) {
            console.error('Gagal memproses interactiveResponseMessage:', err);
        }
    }
};

client.setNet = function(input) {
  if (!input) return undefined;

  if (Array.isArray(input)) {
    return input.map(item => this.setNet(item));
  }

  if (typeof input === 'number') input = String(input);
  if (typeof input !== 'string') return undefined;

  if (input.includes('@newsletter')) {
    return input;
  }

  if (input.endsWith('@g.us') && /^[0-9]+@g\.us$/.test(input)) {
    return input;
  }

  const cleanedNumber = input.replace(/\D/g, '');
  if (!cleanedNumber) return undefined;

  return `${cleanedNumber}@s.whatsapp.net`;
};

client.getBuffer = (url, options = {}) => {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith("https") ? https : http;

    const req = lib.get(url, { headers: { 'DNT': 1, 'Upgrade-Insecure-Request': 1, ...(options.headers || {}) } }, (res) => {
      if (res.statusCode < 200 || res.statusCode >= 300) {
        return reject(new Error("Status Code: " + res.statusCode));
      }

      const data = [];
      res.on("data", (chunk) => data.push(chunk));
      res.on("end", () => resolve(Buffer.concat(data)));
    });

    req.on("error", reject);
    req.end();
  });
};

client.checkBaileysId = (id) => {
  return (
    !!id &&
    (
      id.length < 17 ||
      ['3EB0', 'FELZ', 'BAE5', 'CHIO'].some(prefix => id.startsWith(prefix)) ||
      /[^a-zA-Z0-9]/.test(id) ||
      /[a-z]/.test(id)
    )
  );
};

client.extractMessage = (m) => {
  const type = Object.keys(m.message || {})[0] || '';
  const isViewOnce = /viewOnceMessage/i.test(type);
  const msg = isViewOnce
    ? m.message[type]?.message?.[Object.keys(m.message[type]?.message || {})[0]]
    : m.message[type] || m.message?.conversation || '';

  m.text =
    msg?.text ||
    msg?.caption ||
    msg?.contentText ||
    msg?.selectedDisplayText ||
    msg?.title ||
    m.message?.conversation ||
    '';

  m.body =
    m.message?.conversation ||
    msg?.text ||
    msg?.caption ||
    msg?.selectedButtonId ||
    msg?.singleSelectReply?.selectedRowId ||
    msg?.selectedId ||
    msg?.contentText ||
    msg?.selectedDisplayText ||
    msg?.title ||
    msg?.name ||
    '';

  return { text: m.text, body: m.body };
};

client.ev.on('messages.upsert', async (chatUpdate) => {
  try {
    let msg = chatUpdate.messages[0];
    if (!msg.message) return;

    msg.message =
      Object.keys(msg.message)[0] === 'ephemeralMessage'
        ? msg.message.ephemeralMessage.message
        : msg.message;

let m = await Append(client, msg, store);

if (msg.key) {
  await client.readMessages([msg.key]).catch(console.error);
}

await client.handleInteractiveResponseMessage(m, msg);
    require("./case")(client, m, store);
  } catch (err) {
    console.error(err);
  }
});
    
    client.ev.on('creds.update', saveCreds);
    return client;
}

runConnection({ BOT_QR: false });

let file = require.resolve(__filename);
require('fs').watchFile(file, () => {
    require('fs').unwatchFile(file);
    console.log('\x1b[0;32m' + __filename + ' \x1b[1;32mupdated!\x1b[0m');
    delete require.cache[file];
    require(file);
});
