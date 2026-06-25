import { User, MapPin, Linkedin } from 'lucide-react';
import { STAGE_COLORS } from '../../utils/constants';

export default function FounderCard({ founder, compact = false }) {
  if (!founder) return null;

  const stageColor = STAGE_COLORS[founder.stage] || 'bg-gray-500/10 text-gray-400 border-gray-500/20';

  return (
    <div className={`card p-4 ${compact ? '' : 'p-6'}`}>
      <div className="flex items-start gap-3">
        {/* Avatar */}
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
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className={`font-semibold text-text-primary truncate ${compact ? 'text-sm' : 'text-base'}`}>
              {founder.name}
            </h3>
            {founder.country && (
              <span className="text-text-muted text-xs flex items-center gap-1">
                <MapPin size={10} />
                {founder.country}
              </span>
            )}
          </div>

          {founder.startup && (
            <p className={`text-text-secondary mt-0.5 truncate ${compact ? 'text-xs' : 'text-sm'}`}>
              {founder.startup}
            </p>
          )}

          <div className="flex flex-wrap gap-1.5 mt-2">
            {founder.stage && (
              <span className={`badge border ${stageColor} ${compact ? 'text-[10px] py-0' : ''}`}>
                {founder.stage}
              </span>
            )}
            {founder.sector && (
              <span className={`badge-sector ${compact ? 'text-[10px] py-0' : ''}`}>
                {founder.sector}
              </span>
            )}
            {founder.looking_for?.slice(0, compact ? 1 : 2).map((lf) => (
              <span key={lf} className={`badge-looking ${compact ? 'text-[10px] py-0' : ''}`}>
                {lf}
              </span>
            ))}
          </div>
        </div>

        {!compact && founder.linkedin && (
          <a
            href={founder.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            className="text-text-muted hover:text-blue-electric transition-colors"
            title="LinkedIn"
          >
            <Linkedin size={18} />
          </a>
        )}
      </div>
    </div>
  );
}
