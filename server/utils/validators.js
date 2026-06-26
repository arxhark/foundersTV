// Centralized input validation + sanitization for user-supplied data.
// Used by controllers before any DB write. Pairs with express-mongo-sanitize
// (which strips $/. operators) to prevent NoSQL injection, while this layer
// enforces types, lengths, enums and formats.

const ENUMS = {
  role: ['founder', 'developer', 'investor', 'designer', 'pm', 'marketing', 'student'],
  stage: ['idea', 'validating', 'pre-revenue', 'revenue', 'scaling', 'corporate'],
  lookingFor: ['cofounder', 'investment', 'feedback', 'mentorship', 'clients', 'tech', 'networking'],
  language: ['es', 'en', 'pt'],
  tags: ['AI/ML', 'Web3', 'SaaS', 'Fintech', 'Edtech', 'B2B', 'B2C', 'DevTools', 'No-code', 'Hardware'],
  postType: ['update', 'search', 'milestone', 'question'],
  reportReason: ['spam', 'inappropriate', 'bot', 'harassment', 'other'],
};

const URL_RE = /^https?:\/\/[^\s]+\.[^\s]+$/;

// Trim and hard-cap a string; reject non-strings
const cleanString = (val, max) => {
  if (typeof val !== 'string') return null;
  const trimmed = val.trim();
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
};

const isValidUrl = (val) => typeof val === 'string' && val.length <= 300 && URL_RE.test(val);

// Validates a profile-update payload. Returns { value, errors }.
// Only known fields survive; unknown/protected keys are dropped.
const validateProfile = (body = {}) => {
  const errors = {};
  const value = {};

  if ('name' in body) {
    const v = cleanString(body.name, 60);
    if (!v || v.length < 2) errors.name = 'Name must be 2–60 characters';
    else value.name = v;
  }

  if ('title' in body) value.title = cleanString(body.title, 80) || '';

  if ('projectBio' in body) {
    const v = cleanString(body.projectBio, 140);
    value.projectBio = v || '';
  }

  if ('country' in body) value.country = cleanString(body.country, 56) || '';

  if ('role' in body) {
    if (!ENUMS.role.includes(body.role)) errors.role = 'Invalid role';
    else value.role = body.role;
  }

  if ('stage' in body) {
    if (!ENUMS.stage.includes(body.stage)) errors.stage = 'Invalid stage';
    else value.stage = body.stage;
  }

  if ('language' in body) {
    if (!ENUMS.language.includes(body.language)) errors.language = 'Invalid language';
    else value.language = body.language;
  }

  if ('lookingFor' in body) {
    const arr = Array.isArray(body.lookingFor) ? body.lookingFor : [body.lookingFor];
    const filtered = arr.filter((x) => ENUMS.lookingFor.includes(x));
    value.lookingFor = [...new Set(filtered)];
  }

  if ('tags' in body) {
    const arr = Array.isArray(body.tags) ? body.tags : [body.tags];
    const filtered = arr.filter((x) => ENUMS.tags.includes(x));
    if (filtered.length > 5) errors.tags = 'Maximum 5 tags';
    else value.tags = [...new Set(filtered)];
  }

  // Social links: optional, but if present must be valid URLs
  for (const key of ['linkedin', 'github', 'twitter', 'website']) {
    if (key in body && body[key]) {
      if (!isValidUrl(body[key])) errors[key] = 'Must be a valid URL (https://…)';
      else value[key] = body[key].trim();
    } else if (key in body) {
      value[key] = ''; // explicit clear
    }
  }

  return { value, errors, valid: Object.keys(errors).length === 0 };
};

const validatePost = (body = {}) => {
  const errors = {};
  const value = {};

  const text = cleanString(body.text, 2000);
  if (!text || text.length < 1) errors.text = 'Post text is required';
  else value.text = text;

  value.type = ENUMS.postType.includes(body.type) ? body.type : 'update';
  if ('image' in body && body.image) {
    if (!isValidUrl(body.image)) errors.image = 'Invalid image URL';
    else value.image = body.image;
  }

  return { value, errors, valid: Object.keys(errors).length === 0 };
};

const validateMessage = (body = {}) => {
  const text = cleanString(body.text, 2000);
  if (!text) return { valid: false, errors: { text: 'Message cannot be empty' } };
  return { value: { text }, errors: {}, valid: true };
};

module.exports = { ENUMS, cleanString, isValidUrl, validateProfile, validatePost, validateMessage };
