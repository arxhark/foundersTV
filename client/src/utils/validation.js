import { VALID } from './constants';

// Client-side mirror of server validation (server is the source of truth).
// Returns an errors object keyed by field; empty object means valid.

const URL_RE = /^https?:\/\/[^\s]+\.[^\s]+$/;

export const isUrl = (v) => !v || URL_RE.test(v.trim());

export function validateProfileForm(form) {
  const errors = {};

  if (!form.name || form.name.trim().length < 2) {
    errors.name = 'Name must be at least 2 characters';
  } else if (form.name.trim().length > 60) {
    errors.name = 'Name is too long (max 60)';
  }

  if (form.title && form.title.length > 80) errors.title = 'Max 80 characters';
  if (form.projectBio && form.projectBio.length > 140) errors.projectBio = 'Max 140 characters';

  if (form.role && !VALID.roles.includes(form.role)) errors.role = 'Invalid role';
  if (form.stage && !VALID.stages.includes(form.stage)) errors.stage = 'Invalid stage';
  if (form.language && !VALID.languages.includes(form.language)) errors.language = 'Invalid language';

  if (form.tags?.length > 5) errors.tags = 'Maximum 5 tags';

  for (const key of ['linkedin', 'github', 'twitter', 'website']) {
    if (form[key] && !isUrl(form[key])) errors[key] = 'Must be a valid URL (https://…)';
  }

  return errors;
}

export const hasErrors = (errors) => Object.keys(errors).length > 0;
