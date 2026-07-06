interface MetricBarProps {
  label: string;
  value: number; // 0 to 100
  colorType?: 'accent' | 'dynamic';
}

export default function MetricBar({ label, value, colorType = 'dynamic' }: MetricBarProps) {
  // Determine color based on value
  const getColor = () => {
    if (colorType === 'accent') return 'var(--accent)';
    if (value >= 80) return 'var(--success)';
    if (value >= 60) return 'var(--warning)';
    return 'var(--danger)';
  };

  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '0.375rem',
        fontSize: '0.8125rem',
        fontWeight: 500
      }}>
        <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
        <span style={{ fontWeight: 600, color: getColor() }}>{value}%</span>
      </div>
      <div style={{
        height: '8px',
        backgroundColor: 'var(--border)',
        borderRadius: '4px',
        overflow: 'hidden'
      }}>
        <div style={{
          height: '100%',
          width: `${value}%`,
          backgroundColor: getColor(),
          borderRadius: '4px',
          transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
        }} />
      </div>
    </div>
  );
}
