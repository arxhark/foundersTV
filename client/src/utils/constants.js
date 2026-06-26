export const ROLES = [
  { value: 'founder', label: 'Founder' },
  { value: 'developer', label: 'Developer' },
  { value: 'investor', label: 'Investor' },
  { value: 'designer', label: 'Designer' },
  { value: 'pm', label: 'Product Manager' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'student', label: 'Student' },
];

export const STAGES = [
  { value: 'idea', label: 'Idea' },
  { value: 'validating', label: 'Validating' },
  { value: 'pre-revenue', label: 'Pre-revenue' },
  { value: 'revenue', label: 'With revenue' },
  { value: 'scaling', label: 'Scaling' },
  { value: 'corporate', label: 'Corporate' },
];

export const LOOKING_FOR = [
  { value: 'cofounder', label: 'Co-founder' },
  { value: 'investment', label: 'Investment' },
  { value: 'feedback', label: 'Feedback' },
  { value: 'mentorship', label: 'Mentorship' },
  { value: 'clients', label: 'Clients' },
  { value: 'tech', label: 'Tech talent' },
  { value: 'networking', label: 'Networking' },
];

export const TAGS = [
  'AI/ML', 'Web3', 'SaaS', 'Fintech', 'Edtech',
  'B2B', 'B2C', 'DevTools', 'No-code', 'Hardware',
];

export const LANGUAGES = [
  { value: 'es', label: '🇪🇸 Español' },
  { value: 'en', label: '🇬🇧 English' },
  { value: 'pt', label: '🇵🇹 Português' },
];

export const STAGE_COLORS = {
  idea: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  validating: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  'pre-revenue': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  revenue: 'bg-green-500/10 text-green-400 border-green-500/20',
  scaling: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  corporate: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
};

// Valid enum value sets used by client-side validation
export const VALID = {
  roles: ROLES.map((r) => r.value),
  stages: STAGES.map((s) => s.value),
  lookingFor: LOOKING_FOR.map((l) => l.value),
  tags: TAGS,
  languages: LANGUAGES.map((l) => l.value),
};
