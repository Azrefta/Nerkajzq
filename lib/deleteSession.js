/*

Creator & Dev: Azrefta & Evelyn
Buy?
 - t.me/Azrefta
 - 6285179993021

*/ // Jangan di edit!

const fs = require('fs');
const path = require('path');

/**
 * Menghapus semua file di direktori sesi default.
 */
const cleanSessionPath = () => {
  const TARGET_DIR = path.join(__dirname, '..', 'Auth', 'default');

  try {
    const files = fs.readdirSync(TARGET_DIR);

    for (const file of files) {
      const fullPath = path.join(TARGET_DIR, file);
      const stat = fs.statSync(fullPath);

      if (stat.isFile()) {
        fs.unlinkSync(fullPath);
      }
    }
  } catch (err) {
    console.warn(`Gagal membersihkan sesi: ${err.message}`);
  }
};

module.exports = {
  cleanSessionPath
};