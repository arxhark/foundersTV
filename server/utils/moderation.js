// Basic profanity filter. The banned-word list is configurable via the
// BANNED_WORDS env var (comma-separated); a small default list is used
// otherwise. Matched words are replaced with asterisks before a message is
// delivered to the recipient.
const DEFAULT_BANNED = ['spam', 'scam'];

const bannedWords = (process.env.BANNED_WORDS
  ? process.env.BANNED_WORDS.split(',')
  : DEFAULT_BANNED
).map((w) => w.trim().toLowerCase()).filter(Boolean);

const cleanText = (text = '') => {
  if (!bannedWords.length) return text;
  let result = text;
  for (const word of bannedWords) {
    const re = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    result = result.replace(re, (m) => '*'.repeat(m.length));
  }
  return result;
};

module.exports = { cleanText, bannedWords };
