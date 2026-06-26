import { User, MapPin, Linkedin, Github, Twitter, Globe, BadgeCheck } from 'lucide-react';
import { STAGE_COLORS } from '../../utils/constants';

// Renders a founder's public profile. Used in the dashboard sidebar,
// contacts grid, and as the in-call overlay (compact).
export default function FounderCard({ founder, compact = false }) {
  if (!founder) return null;

  const stageColor = STAGE_COLORS[founder.stage] || 'bg-gray-500/10 text-gray-400 border-gray-500/20';
  const links = [
    { url: founder.linkedin, icon: Linkedin, label: 'LinkedIn' },
    { url: founder.github, icon: Github, label: 'GitHub' },
    { url: founder.twitter, icon: Twitter, label: 'Twitter' },
    { url: founder.website, icon: Globe, label: 'Website' },
  ].filter((l) => l.url);

  return (
    <div className={`card ${compact ? 'p-4' : 'p-6'}`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          {founder.photo ? (
            <img
              src={founder.photo}
              alt={founder.name}
              className={`rounded-full object-cover border-2 border-border-subtle ${compact ? 'w-10 h-10' : 'w-14 h-14'}`}
            />
          ) : (
            <div className={`rounded-full bg-blue-electric/20 border-2 border-border-subtle
                            flex items-center justify-center ${compact ? 'w-10 h-10' : 'w-14 h-14'}`}>
              <User size={compact ? 18 : 24} className="text-blue-electric" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h3 className={`font-semibold text-text-primary truncate ${compact ? 'text-sm' : 'text-base'}`}>
              {founder.name}
            </h3>
            {founder.isVerified && <BadgeCheck size={14} className="text-blue-electric flex-shrink-0" />}
            {founder.country && (
              <span className="text-text-muted text-xs flex items-center gap-1">
                <MapPin size={10} />{founder.country}
              </span>
            )}
          </div>

          {founder.title && (
            <p className={`text-text-secondary mt-0.5 truncate ${compact ? 'text-xs' : 'text-sm'}`}>
              {founder.title}
            </p>
          )}

          {founder.projectBio && !compact && (
            <p className="text-text-secondary text-sm mt-1.5 leading-snug">{founder.projectBio}</p>
          )}

          <div className="flex flex-wrap gap-1.5 mt-2">
            {founder.stage && (
              <span className={`badge border ${stageColor} ${compact ? 'text-[10px] py-0' : ''}`}>
                {founder.stage}
              </span>
            )}
            {(founder.tags || []).slice(0, compact ? 2 : 5).map((tag) => (
              <span
                key={tag}
                className={`badge bg-blue-electric/10 text-blue-electric border border-blue-electric/20 font-mono
                           ${compact ? 'text-[10px] py-0' : ''}`}
              >
                #{tag}
              </span>
            ))}
          </div>

          {founder.lookingFor?.length > 0 && !compact && (
            <p className="text-text-muted text-xs mt-2">
              Looking for: <span className="text-green-connected">{founder.lookingFor.join(', ')}</span>
            </p>
          )}

          {links.length > 0 && (
            <div className="flex gap-2 mt-2.5">
              {links.map(({ url, icon: Icon, label }) => (
                <a
                  key={label}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-text-muted hover:text-blue-electric transition-colors"
                  title={label}
                >
                  <Icon size={compact ? 14 : 16} />
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
