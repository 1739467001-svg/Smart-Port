import { useAppStore } from '../../stores/appStore';
import styles from './MetricsHUD.module.css';

const METRIC_CONFIG = [
  { key: 'throughputTEU', label: 'TEU/日', color: 'var(--color-ocean)', format: (v: number) => v.toString() },
  { key: 'craneUtilization', label: '岸桥利用率', color: 'var(--color-crane)', format: (v: number) => v.toFixed(1) + '%' },
  { key: 'agvTrips', label: 'AGV 行程', color: 'var(--color-agv)', format: (v: number) => v.toString() },
  { key: 'safetyScore', label: '安全评分', color: 'var(--color-safety)', format: (v: number) => v.toFixed(1) },
] as const;

export function MetricsHUD() {
  const metrics = useAppStore((s) => s.metrics);

  return (
    <div className={styles.container}>
      {METRIC_CONFIG.map((cfg) => (
        <div
          key={cfg.key}
          className={styles.card}
          style={{ borderColor: cfg.color + '33' }}
        >
          <div className={styles.label}>{cfg.label}</div>
          <div className={styles.value} style={{ color: cfg.color }}>
            {cfg.format(metrics[cfg.key] as number)}
          </div>
        </div>
      ))}
    </div>
  );
}
