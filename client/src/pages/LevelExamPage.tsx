import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Star, ChevronRight, Trophy, Zap, CheckCircle2, Play } from 'lucide-react';
import api from '../lib/api';

interface SubLevelInfo {
  subLevel: number;
  isPassed: boolean;
  stars: number;
  score: number;
  correctAnswers: number;
  totalQuestions: number;
}

interface LevelInfo {
  id: number;
  levelNumber: number;
  subLevelCount: number;
  questionsPerSublevel: number;
  easyWeight: number;
  mediumWeight: number;
  hardWeight: number;
  isActive: boolean;
  subLevels: SubLevelInfo[];
  levelCompleted: boolean;
  totalStars: number;
  passedSubLevels: number;
}

function difficultyLabel(easy: number, medium: number, hard: number): { label: string; color: string } {
  if (easy >= 80) return { label: 'Beginner', color: '#22c55e' };
  if (easy >= 40) return { label: 'Easy', color: '#84cc16' };
  if (medium >= 80) return { label: 'Medium', color: '#f59e0b' };
  if (medium >= 40) return { label: 'Intermediate', color: '#f97316' };
  if (hard >= 80) return { label: 'Hard', color: '#ef4444' };
  return { label: 'Expert', color: '#7c3aed' };
}

function StarRow({ count, total }: { count: number; total: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: total }).map((_, i) => (
        <Star
          key={i}
          className="h-3 w-3"
          fill={i < count ? '#f59e0b' : 'none'}
          stroke={i < count ? '#f59e0b' : '#d1d5db'}
        />
      ))}
    </div>
  );
}

export default function LevelExamPage() {
  const [levels, setLevels] = useState<LevelInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<LevelInfo | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/levels').then(r => {
      setLevels(r.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  function isLevelUnlocked(levelIndex: number): boolean {
    if (levelIndex === 0) return true;
    const prev = levels[levelIndex - 1];
    return prev?.levelCompleted ?? false;
  }

  function isSubLevelUnlocked(level: LevelInfo, subIndex: number): boolean {
    const levelIndex = levels.findIndex(l => l.levelNumber === level.levelNumber);
    if (!isLevelUnlocked(levelIndex)) return false;
    if (subIndex === 0) return true;
    return level.subLevels[subIndex - 1]?.isPassed ?? false;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--warm-bg)' }}>
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-900" />
      </div>
    );
  }

  const totalStarsEarned = levels.reduce((s, l) => s + l.totalStars, 0);
  const maxPossibleStars = levels.reduce((s, l) => s + l.subLevelCount * 3, 0);
  const completedLevels = levels.filter(l => l.levelCompleted).length;

  return (
    <div className="min-h-screen pb-16" style={{ background: 'var(--warm-bg)' }}>
      {/* Header */}
      <div className="sticky top-0 z-10 px-4 py-4 flex items-center justify-between"
        style={{ background: 'var(--warm-cream)', borderBottom: '1px solid var(--warm-border)', backdropFilter: 'blur(8px)' }}>
        <div>
          <h1 className="text-lg font-extrabold" style={{ color: 'var(--warm-text)' }}>Level Challenge</h1>
          <p className="text-xs" style={{ color: 'var(--warm-muted)' }}>
            {completedLevels}/{levels.length} levels completed
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold"
            style={{ background: 'rgba(245,158,11,0.12)', color: '#d97706' }}>
            <Star className="h-4 w-4 fill-amber-400 stroke-amber-400" />
            {totalStarsEarned}<span className="font-normal text-xs opacity-60">/{maxPossibleStars}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold"
            style={{ background: 'rgba(99,102,241,0.1)', color: '#4f46e5' }}>
            <Trophy className="h-4 w-4" />
            {completedLevels}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 pt-6 flex gap-4">
        {/* Level Grid */}
        <div className="flex-1">
          {/* Group levels in rows of 5 */}
          <div className="grid grid-cols-5 gap-3">
            {levels.map((level, idx) => {
              const unlocked = isLevelUnlocked(idx);
              const diff = difficultyLabel(level.easyWeight, level.mediumWeight, level.hardWeight);
              const isSelected = selected?.levelNumber === level.levelNumber;
              return (
                <button
                  key={level.levelNumber}
                  onClick={() => unlocked ? setSelected(isSelected ? null : level) : undefined}
                  className={`relative rounded-2xl p-3 text-center transition-all border-2 ${
                    !unlocked ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:scale-105'
                  } ${isSelected ? 'border-blue-500 shadow-lg' : 'border-transparent'}`}
                  style={{
                    background: level.levelCompleted
                      ? 'linear-gradient(135deg, #fef3c7, #fde68a)'
                      : unlocked
                        ? 'var(--warm-card, white)'
                        : 'var(--warm-border, #e5e7eb)',
                    boxShadow: isSelected ? '0 0 0 3px rgba(59,130,246,0.3)' : unlocked ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                  }}
                >
                  {!unlocked && (
                    <Lock className="h-4 w-4 mx-auto mb-1" style={{ color: 'var(--warm-muted)' }} />
                  )}
                  {level.levelCompleted && (
                    <CheckCircle2 className="h-4 w-4 mx-auto mb-1 text-amber-500" />
                  )}
                  {unlocked && !level.levelCompleted && (
                    <Zap className="h-4 w-4 mx-auto mb-1" style={{ color: diff.color }} />
                  )}
                  <div className="text-xs font-bold" style={{ color: 'var(--warm-text)' }}>
                    {level.levelNumber}
                  </div>
                  <div className="text-[9px] font-medium mt-0.5" style={{ color: diff.color }}>
                    {diff.label}
                  </div>
                  {level.totalStars > 0 && (
                    <div className="flex justify-center mt-1">
                      <StarRow count={Math.min(level.totalStars, 3)} total={3} />
                    </div>
                  )}
                  <div className="text-[8px] mt-1" style={{ color: 'var(--warm-muted)' }}>
                    {level.passedSubLevels}/{level.subLevelCount}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Sub-level panel */}
        {selected && (
          <div className="w-72 shrink-0">
            <div className="warm-card p-5 sticky top-20">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-xs font-medium" style={{ color: 'var(--warm-muted)' }}>Level</div>
                  <div className="text-2xl font-extrabold" style={{ color: 'var(--warm-text)' }}>
                    {selected.levelNumber}
                  </div>
                </div>
                <div>
                  {(() => {
                    const d = difficultyLabel(selected.easyWeight, selected.mediumWeight, selected.hardWeight);
                    return (
                      <span className="px-2 py-1 rounded-full text-xs font-bold" style={{ background: d.color + '20', color: d.color }}>
                        {d.label}
                      </span>
                    );
                  })()}
                </div>
              </div>

              <div className="text-xs mb-3" style={{ color: 'var(--warm-muted)' }}>
                {selected.questionsPerSublevel} questions per sub-level &bull; {selected.subLevelCount} sub-levels
              </div>

              {/* Difficulty bar */}
              <div className="flex h-2 rounded-full overflow-hidden mb-4" style={{ background: 'var(--warm-border)' }}>
                {selected.easyWeight > 0 && <div style={{ width: `${selected.easyWeight}%`, background: '#22c55e' }} />}
                {selected.mediumWeight > 0 && <div style={{ width: `${selected.mediumWeight}%`, background: '#f59e0b' }} />}
                {selected.hardWeight > 0 && <div style={{ width: `${selected.hardWeight}%`, background: '#ef4444' }} />}
              </div>

              <div className="space-y-2">
                {selected.subLevels.map((sl, si) => {
                  const unlocked = isSubLevelUnlocked(selected, si);
                  const levelIdx = levels.findIndex(l => l.levelNumber === selected.levelNumber);
                  return (
                    <button
                      key={sl.subLevel}
                      onClick={() => unlocked && navigate(`/levels/${selected.levelNumber}/sublevel/${sl.subLevel}`)}
                      disabled={!unlocked}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all"
                      style={{
                        background: sl.isPassed ? 'rgba(34,197,94,0.08)' : unlocked ? 'var(--warm-bg)' : 'var(--warm-border)',
                        opacity: unlocked ? 1 : 0.5,
                        cursor: unlocked ? 'pointer' : 'not-allowed',
                        border: '1px solid var(--warm-border)',
                      }}
                    >
                      <div className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                        style={{
                          background: sl.isPassed ? '#22c55e' : unlocked ? 'var(--kec-blue, #1e40af)' : '#9ca3af',
                          color: 'white',
                        }}>
                        {sl.isPassed ? '✓' : sl.subLevel}
                      </div>
                      <div className="flex-1 text-left">
                        <div className="text-xs font-semibold" style={{ color: 'var(--warm-text)' }}>
                          Sub-level {sl.subLevel}
                        </div>
                        {sl.isPassed && (
                          <StarRow count={sl.stars} total={3} />
                        )}
                      </div>
                      {unlocked && !sl.isPassed && (
                        <Play className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--kec-blue, #1e40af)' }} />
                      )}
                      {!unlocked && (
                        <Lock className="h-3 w-3 shrink-0" style={{ color: '#9ca3af' }} />
                      )}
                    </button>
                  );
                })}
              </div>

              {selected.levelCompleted && (
                <div className="mt-4 text-center py-2 rounded-xl text-xs font-bold"
                  style={{ background: 'rgba(245,158,11,0.1)', color: '#d97706' }}>
                  <Trophy className="h-4 w-4 inline mr-1" />
                  Level Complete! {selected.totalStars}/{selected.subLevelCount * 3} stars
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Help text */}
      {!selected && (
        <div className="max-w-4xl mx-auto px-4 mt-6 text-center text-xs" style={{ color: 'var(--warm-muted)' }}>
          Click a level to see its sub-levels &bull; Complete all 6 sub-levels to unlock the next level &bull; Score &ge;50% to pass
        </div>
      )}
    </div>
  );
}
