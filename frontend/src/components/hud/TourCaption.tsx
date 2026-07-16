import { useAppStore } from '../../stores/appStore';
import { TOUR_STEPS } from '../../hooks/useTour';
import styles from './TourCaption.module.css';

/* ═══════════════════════════════════════════════
   TourCaption — the 一键路演 lower-third

   A self-advancing caption card that narrates each tour
   step (title + one-liner), shows progress, and lets the
   presenter bail out at any time. The "翻盘时刻" (AI takes
   over) step is visually emphasised.
   ═══════════════════════════════════════════════ */

export function TourCaption() {
  const active = useAppStore((s) => s.tourActive);
  const step = useAppStore((s) => s.tourStep);
  const stopTour = useAppStore((s) => s.stopTour);

  if (!active) return null;
  const meta = TOUR_STEPS[step] ?? TOUR_STEPS[0];
  const isTurn = meta.key === 'ai';

  return (
    <div className={styles.wrap}>
      <div className={`${styles.card} ${isTurn ? styles.turn : ''}`}>
        <div className={styles.head}>
          <span className={styles.badge}>一键路演 · AUTO DEMO</span>
          <span className={styles.stepNo}>{step + 1} / {TOUR_STEPS.length}</span>
          <div className={styles.dots}>
            {TOUR_STEPS.map((s, i) => (
              <span
                key={s.key}
                className={`${styles.dot} ${i === step ? styles.dotActive : ''} ${i < step ? styles.dotDone : ''}`}
              />
            ))}
          </div>
          <button className={styles.stop} onClick={stopTour}>■ 结束</button>
        </div>
        <div className={styles.title}>{meta.title}</div>
        <div className={styles.sub}>{meta.sub}</div>
        <div className={styles.progress}>
          <div key={step} className={styles.progressFill} style={{ animationDuration: `${meta.ms}ms` }} />
        </div>
      </div>
    </div>
  );
}
