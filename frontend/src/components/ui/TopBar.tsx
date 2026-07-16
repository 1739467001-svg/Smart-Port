import { useAppStore } from '../../stores/appStore';
import styles from './TopBar.module.css';

export function TopBar() {
  const simRunning = useAppStore((s) => s.simRunning);
  const toggleSim = useAppStore((s) => s.toggleSim);
  const currentScene = useAppStore((s) => s.currentScene);
  const navigateTo = useAppStore((s) => s.navigateTo);
  const theme = useAppStore((s) => s.theme);
  const toggleTheme = useAppStore((s) => s.toggleTheme);

  return (
    <header className={styles.bar}>
      <div className={styles.left}>
        <span className={styles.logo}>智港</span>
        <span className={styles.title}>数字员工协同平台</span>
        <span className={styles.version}>DIGITAL TWIN v3.0</span>
      </div>

      <nav className={styles.breadcrumb}>
        <button
          className={currentScene === 'port' ? styles.crumbActive : styles.crumb}
          onClick={() => navigateTo('port')}
        >
          全港总览
        </button>
        {currentScene !== 'port' && (
          <>
            <span className={styles.separator}>›</span>
            <button
              className={currentScene === 'yard' ? styles.crumbActive : styles.crumb}
              onClick={() => navigateTo('yard')}
            >
              堆场区
            </button>
          </>
        )}
        {currentScene === 'container' && (
          <>
            <span className={styles.separator}>›</span>
            <button className={styles.crumbActive}>集装箱</button>
          </>
        )}
      </nav>

      <div className={styles.right}>
        <button
          className={styles.simBtn}
          onClick={toggleTheme}
          title={theme === 'night' ? '切换到白天' : '切换到黑夜'}
        >
          {theme === 'night' ? '🌙 黑夜' : '☀️ 白天'}
        </button>

        <div className={styles.simStatus}>
          <span
            className={styles.statusDot}
            style={{
              background: simRunning ? '#5dcaa5' : '#666',
              boxShadow: simRunning ? '0 0 8px #5dcaa5' : 'none',
            }}
          />
          {simRunning ? 'SIM RUNNING' : 'PAUSED'}
        </div>
        <button className={styles.simBtn} onClick={toggleSim}>
          {simRunning ? 'PAUSE' : 'RESUME'}
        </button>
      </div>
    </header>
  );
}
