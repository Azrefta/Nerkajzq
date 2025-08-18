/*

Creator & Dev: Azrefta & Evelyn
Buy?
 - t.me/Azrefta
 - 6285179993021

*/ // Jangan di edit!

const crypto = require('crypto');

const AUTHOR_CONST = (({ author }) => {
  let s = (author || "").replace(/[^a-zA-Z0-9]/g, "");
  while (s.length < 5) s += "1";
  return s;
})(require("../package.json"));

const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const BASE = ALPHABET.length;
const BASE_BIG = BigInt(BASE);
const MAX_SAFE = Number.MAX_SAFE_INTEGER;

const DOMAIN_MAP = {
  '@g': '@g.us',
  '@s': '@s.whatsapp.net',
  '@n': '@newsletter',
};

const generateStaticIdentityKey = async (input = AUTHOR_CONST) =>
  crypto.createHash('sha256').update((input.replace(/\D/g, '') || '1945')).digest();

function encodeBase62Number(num) {
  let result = '';
  while (num > 0) {
    result = ALPHABET[num % BASE] + result;
    num = Math.floor(num / BASE);
  }
  return result || '0';
}

function encodeBase62BigInt(num) {
  num = BigInt(num);
  let result = '';
  while (num > 0n) {
    result = ALPHABET[Number(num % BASE_BIG)] + result;
    num = num / BASE_BIG;
  }
  return result || '0';
}

function encodeBase62Auto(input) {
  if (typeof input === 'number' && input <= MAX_SAFE) {
    return encodeBase62Number(input);
  }
  return encodeBase62BigInt(input);
}

function decodeBase62(str) {
  return str.split('').reverse().reduce((acc, char, i) => {
    const value = BigInt(ALPHABET.indexOf(char));
    return acc + value * BASE_BIG ** BigInt(i);
  }, 0n);
}

function getShuffledAlphabet(seed = 'default') {
  const chars = ALPHABET.split('');
  const hash = crypto.createHash('sha256').update(seed).digest();
  for (let i = chars.length - 1; i > 0; i--) {
    const j = hash[i % hash.length] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

function encodeBase62WithSeed(num, seed = 'default') {
  const shuffled = getShuffledAlphabet(seed);
  const base = shuffled.length;
  let result = '';
  num = BigInt(num);
  while (num > 0n) {
    result = shuffled[Number(num % BigInt(base))] + result;
    num = num / BigInt(base);
  }
  return result || '0';
}

function decodeBase62WithSeed(str, seed = 'default') {
  const shuffled = getShuffledAlphabet(seed);
  const base = BigInt(shuffled.length);
  return str.split('').reverse().reduce((acc, char, i) => {
    const value = BigInt(shuffled.indexOf(char));
    return acc + value * base ** BigInt(i);
  }, 0n);
}

function compressChatID(input) {
  if (typeof input !== 'string') return '';
  let [userPart, domainPart] = input.includes(':')
    ? [input.split(':')[0], input.split('@')[1] || '']
    : [input.split('@')[0], input.split('@')[1] || ''];
  const encodedUser = encodeBase62Auto(userPart);
  let shortDomain = '';
  switch (`@${domainPart}`) {
    case '@g.us': shortDomain = '@g'; break;
    case '@s.whatsapp.net': shortDomain = '@s'; break;
    case '@newsletter': shortDomain = '@n'; break;
    default:
      shortDomain = domainPart ? `@${domainPart.split('.')[0]}` : '';
      break;
  }
  return `${encodedUser}${shortDomain}`;
}

function decompressChatID(input) {
  if (typeof input !== 'string') return '';
  const atIndex = input.lastIndexOf('@');
  if (atIndex === -1) return '';
  const encodedPart = input.slice(0, atIndex);
  const domainShort = input.slice(atIndex);
  const decodedNumber = decodeBase62(encodedPart);
  const originalDomain = DOMAIN_MAP[domainShort] || domainShort;
  return `${decodedNumber.toString()}${originalDomain}`;
}

function compressChatIDSecure(input, seed = 'default') {
  if (typeof input !== 'string') return '';
  let [userPart, domainPart] = input.includes(':')
    ? [input.split(':')[0], input.split('@')[1] || '']
    : [input.split('@')[0], input.split('@')[1] || ''];
  const encodedUser = encodeBase62WithSeed(userPart, seed);
  let shortDomain = '';
  switch (`@${domainPart}`) {
    case '@g.us': shortDomain = '@g'; break;
    case '@s.whatsapp.net': shortDomain = '@s'; break;
    case '@newsletter': shortDomain = '@n'; break;
    default:
      shortDomain = domainPart ? `@${domainPart.split('.')[0]}` : '';
      break;
  }
  return `${encodedUser}${shortDomain}`;
}

function decompressChatIDSecure(input, seed = 'default') {
  if (typeof input !== 'string') return '';
  const atIndex = input.lastIndexOf('@');
  if (atIndex === -1) return '';
  const encodedPart = input.slice(0, atIndex);
  const domainShort = input.slice(atIndex);
  const decodedNumber = decodeBase62WithSeed(encodedPart, seed);
  const originalDomain = DOMAIN_MAP[domainShort] || domainShort;
  return `${decodedNumber.toString()}${originalDomain}`;
}

function sha256ToBigInt(input) {
  const hash = crypto.createHash('sha256').update(input).digest('hex');
  return BigInt('0x' + hash);
}

function base62EncodeBigInt(num, alphabet = ALPHABET) {
  const base = BigInt(alphabet.length);
  let result = '';
  num = BigInt(num);
  while (num > 0n) {
    result = alphabet[Number(num % base)] + result;
    num = num / base;
  }
  return result || '0';
}

function hashCompress(input, seed = 'default', length = 12) {
  if (seed === 'default') {
    seed = generateStaticIdentityKey();
  }
  const big = sha256ToBigInt(input);
  const shuffled = getShuffledAlphabet(seed);
  const encoded = base62EncodeBigInt(big, shuffled);
  return encoded.slice(0, length);
}

module.exports = {
  encodeBase62Auto,
  decodeBase62,
  encodeBase62WithSeed,
  decodeBase62WithSeed,
  getShuffledAlphabet,
  compressChatID,
  decompressChatID,
  compressChatIDSecure,
  decompressChatIDSecure,
  generateStaticIdentityKey,
  sha256ToBigInt,
  base62EncodeBigInt,
  hashCompress,
};