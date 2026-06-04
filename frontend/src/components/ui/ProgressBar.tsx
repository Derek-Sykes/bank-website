interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
}

const clampPercent = (value: number, max: number) => {
  if (!Number.isFinite(value) || !Number.isFinite(max) || max <= 0) return 0;
  return Math.min(100, Math.max(0, (value / max) * 100));
};

const ProgressBar = ({ value, max = 100, label }: ProgressBarProps) => {
  const percent = clampPercent(value, max);

  return (
    <div className="progressWrap" aria-label={label}>
      <div className="progressMeta">
        {label && <span>{label}</span>}
        <strong>{Math.round(percent)}%</strong>
      </div>
      <div className="progressTrack" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(percent)}>
        <span className="progressFill" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
};

export default ProgressBar;
