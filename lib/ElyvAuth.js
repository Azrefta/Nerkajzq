/*

Creator & Dev: Azrefta & Evelyn
Buy?
 - t.me/Azrefta
 - 6285179993021

*/ // Jangan di edit!

const fs = require('fs/promises');
const path = require('path');
const { Mutex } = require('async-mutex');
const { proto, initAuthCreds } = require('@whiskeysockets/baileys');
const crypto = require('crypto');
const zlib = require('zlib');

const AUTHOR_CONST = (({ author }) => {
  let s = (author || "").replace(/[^a-zA-Z0-9]/g, "");
  while (s.length < 5) s += "1";
  return s;
})(require("../package.json"));

function compressJson(jsonString) {
  return zlib.gzipSync(Buffer.from(jsonString, 'utf8'));
}

function decompressJson(compressedBuffer) {
  const decompressed = zlib.gunzipSync(compressedBuffer);
  return decompressed.toString('utf8');
}

const generateStaticIdentityKey = async (input = AUTHOR_CONST) =>
  crypto.createHash('sha256').update((input.replace(/\D/g, '') || '1945')).digest();

async function encryptJsonAESZlib(jsonString) {
  const key = await generateStaticIdentityKey();
  const iv = crypto.randomBytes(16);
  const compressed = compressJson(jsonString);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  const encrypted = Buffer.concat([cipher.update(compressed), cipher.final()]);
  return Buffer.concat([iv, encrypted]);
}

async function decryptJsonAESZlib(buffer) {
  const key = await generateStaticIdentityKey();
  const iv = buffer.slice(0, 16);
  const encrypted = buffer.slice(16);
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  const decryptedCompressed = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decompressJson(decryptedCompressed);
}

const BufferJSON = {
  replacer: (_, value) =>
    typeof value === 'object' && value !== null && Buffer.isBuffer(value)
      ? { type: 'Buffer', data: Array.from(value) }
      : value,
  reviver: (_, value) =>
    typeof value === 'object' && value?.type === 'Buffer'
      ? Buffer.from(value.data)
      : value,
};

const fileLocks = new Map();
const getFileLock = (filePath) => {
  if (!fileLocks.has(filePath)) {
    fileLocks.set(filePath, new Mutex());
  }
  return fileLocks.get(filePath);
};

const fixFileName = (file) =>
  file?.replace(/\//g, '__')?.replace(/:/g, '-');

const applyElyvExt = file => file.endsWith('.elyv') ? file : `${file}.elyv`;

async function useMultiFileAuthState(folder) {
  const cachePath = path.join(folder, 'cache.elyv');
  let cacheStore = {};

  // Load all non-Asrar data
  const loadCacheStore = async () => {
    try {
      const compressed = await fs.readFile(cachePath);
      const jsonString = decompressJson(compressed);
      cacheStore = JSON.parse(jsonString, BufferJSON.reviver);
    } catch {
      cacheStore = {};
    }
  };

  const saveCacheStore = async () => {
    try {
      const jsonString = JSON.stringify(cacheStore, BufferJSON.replacer);
      const compressed = compressJson(jsonString);
      await fs.writeFile(cachePath, compressed);
    } catch (e) {
      console.error('[AuthState] Failed saving cache.elyv:', e);
    }
  };

  const writeData = async (data, file) => {
    const isAsrarLike = !file.includes('-');
    const filePath = path.join(folder, applyElyvExt(fixFileName(file)));
    const jsonStr = JSON.stringify(data, BufferJSON.replacer);

    if (isAsrarLike) {
      const encryptedBuffer = await encryptJsonAESZlib(jsonStr);
      const mutex = getFileLock(filePath);
      return mutex.runExclusive(() => fs.writeFile(filePath, encryptedBuffer));
    } else {
      cacheStore[file] = data;
      await saveCacheStore();
    }
  };

  const readData = async (file) => {
    const isAsrarLike = !file.includes('-');
    const filePath = path.join(folder, applyElyvExt(fixFileName(file)));

    try {
      if (isAsrarLike) {
        const encryptedBuffer = await getFileLock(filePath).runExclusive(() => fs.readFile(filePath));
        const jsonString = await decryptJsonAESZlib(encryptedBuffer);
        return JSON.parse(jsonString, BufferJSON.reviver);
      } else {
        return cacheStore[file] || null;
      }
    } catch {
      return null;
    }
  };

  const removeData = async (file) => {
    const isAsrarLike = !file.includes('-');
    const filePath = path.join(folder, applyElyvExt(fixFileName(file)));

    if (isAsrarLike) {
      try {
        await getFileLock(filePath).runExclusive(() => fs.unlink(filePath));
      } catch {}
    } else {
      delete cacheStore[file];
      await saveCacheStore();
    }
  };

  // Pastikan folder ada
  try {
    const info = await fs.stat(folder);
    if (!info.isDirectory()) throw new Error(`${folder} is not a directory`);
  } catch {
    await fs.mkdir(folder, { recursive: true });
  }

  await loadCacheStore();

  const creds = await readData('Asrar') || initAuthCreds();

  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          const data = {};
          await Promise.all(ids.map(async (id) => {
            const file = `${type}-${id}`;
            let value = await readData(file);
            if (type === 'app-state-sync-key' && value) {
              value = proto.Message.AppStateSyncKeyData.fromObject(value);
            }
            data[id] = value;
          }));
          return data;
        },
        set: async (data) => {
          const tasks = [];
          for (const category in data) {
            for (const id in data[category]) {
              const value = data[category][id];
              const file = `${category}-${id}`;
              tasks.push(value ? writeData(value, file) : removeData(file));
            }
          }
          await Promise.all(tasks);
        }
      }
    },
    saveCreds: async () => {
      await writeData(creds, 'Asrar'); // Jangan ubah nama ini
    }
  };
}

module.exports = { useMultiFileAuthState };