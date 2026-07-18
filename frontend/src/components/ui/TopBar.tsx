import { useAppStore } from '../../stores/appStore';
import styles from './TopBar.module.css';

export function TopBar() {
  const simRunning = useAppStore((s) => s.simRunning);
  const toggleSim = useAppStore((s) => s.toggleSim);
  const currentScene = useAppStore((s) => s.currentScene);
  const navigateTo = useAppStore((s) => s.navigateTo);
  const theme = useAppStore((s) => s.theme);
  const toggleTheme = useAppStore((s) => s.toggleTheme);
  const openRoiPanel = useAppStore((s) => s.openRoiPanel);
  const tourActive = useAppStore((s) => s.tourActive);
  const startTour = useAppStore((s) => s.startTour);
  const stopTour = useAppStore((s) => s.stopTour);
  const openAssistant = useAppStore((s) => s.openAssistant);
  const openBizPanel = useAppStore((s) => s.openBizPanel);

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
          className={tourActive ? styles.tourBtnActive : styles.tourBtn}
          onClick={tourActive ? stopTour : startTour}
          title="一键自动路演 L1 → L2 → L3"
        >
          {tourActive ? '■ 结束路演' : '▶ 一键路演'}
        </button>

        <button
          className={styles.roiBtn}
          onClick={openRoiPanel}
          title="数字员工降本增效测算"
        >
          📊 降本增效
        </button>

        <button
          className={styles.askBtn}
          onClick={openAssistant}
          title="向数字员工提问（离线，答案取自实时数据）"
        >
          💬 问数字员工
        </button>

        <button
          className={styles.bizBtn}
          onClick={openBizPanel}
          title="商业计划与落地承诺"
        >
          📈 商业计划
        </button>

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
