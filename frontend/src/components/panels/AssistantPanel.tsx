import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../../stores/appStore';
import type { AgentType } from '../../types';
import { answer, assistantSuggestions, type AssistantContext } from '../../sim/assistant';
import styles from './AssistantPanel.module.css';

/* ═══════════════════════════════════════════════
   AssistantPanel — 数字员工问答 (Ask the Workforce)

   A chat surface where the digital employees answer
   natural-language questions from the REAL live state
   (see sim/assistant.ts). Grounded, offline, deterministic
   — safe to demo on stage, no key, no network. Feeds the
   创新性 / 可交互 score.
   ═══════════════════════════════════════════════ */

const AVATAR: Record<AgentType, { icon: string; name: string; color: string }> = {
  data: { icon: '📋', name: '单证数字员工', color: 'var(--color-ocean)' },
  stowage: { icon: '📦', name: '配载数字员工', color: 'var(--color-crane)' },
  safety: { icon: '🛡️', name: '安全数字员工', color: 'var(--color-safety)' },
  dispatch: { icon: '🚦', name: '调度数字员工', color: 'var(--color-agv)' },
  execution: { icon: '⚡', name: '执行数字员工', color: 'var(--color-exec)' },
};

interface Msg {
  role: 'user' | 'agent';
  agent?: AgentType;
  text: string;
  tags?: string[];
}

const GREETING: Msg = {
  role: 'agent',
  agent: 'stowage',
  text: '你好，我是配载数字员工，代表班组回答。所有回答都取自当前真实的仿真与优化数据。想问什么，直接问，或点下面的推荐问题。',
};

function buildContext(): AssistantContext {
  const s = useAppStore.getState();
  return {
    metrics: s.metrics,
    processCounts: s.processCounts,
    baseline: s.stowageBaseline,
    optimized: s.stowageOptimized,
    agents: s.agents.map((a) => ({ type: a.type, name: a.name, role: a.role, status: a.status })),
  };
}

export function AssistantPanel() {
  const open = useAppStore((s) => s.assistantOpen);
  const close = useAppStore((s) => s.closeAssistant);
  const [messages, setMessages] = useState<Msg[]>([GREETING]);
  const [input, setInput] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, open]);

  if (!open) return null;

  const send = (raw: string) => {
    const q = raw.trim();
    if (!q) return;
    const reply = answer(q, buildContext());
    setMessages((m) => [
      ...m,
      { role: 'user', text: q },
      { role: 'agent', agent: reply.agent, text: reply.text, tags: reply.tags },
    ]);
    setInput('');
  };

  return (
    <div className={styles.backdrop} onClick={close}>
      <div className={styles.page} onClick={(e) => e.stopPropagation()}>
        <div className={styles.top}>
          <div className={styles.titleBlock}>
            <div className={styles.eyebrow}>数字员工 · ASK THE WORKFORCE</div>
            <div className={styles.title}><span className={styles.emoji}>💬</span> 数字员工问答</div>
            <div className={styles.sub}>答案取自实时仿真与优化数据 · 离线可用，路演零翻车</div>
          </div>
          <button className={styles.close} onClick={close}>← 返回</button>
        </div>

        <div className={styles.list} ref={listRef}>
          {messages.map((m, i) =>
            m.role === 'user' ? (
              <div key={i} className={styles.userRow}>
                <div className={styles.userBubble}>{m.text}</div>
              </div>
            ) : (
              <div key={i} className={styles.agentRow}>
                <span
                  className={styles.avatar}
                  style={{ ['--ac' as string]: AVATAR[m.agent ?? 'data'].color }}
                >
                  {AVATAR[m.agent ?? 'data'].icon}
                </span>
                <div className={styles.agentBody}>
                  <div className={styles.agentName} style={{ color: AVATAR[m.agent ?? 'data'].color }}>
                    {AVATAR[m.agent ?? 'data'].name}
                  </div>
                  <div className={styles.agentBubble}>{m.text}</div>
                  {m.tags && m.tags.length > 0 && (
                    <div className={styles.tags}>
                      {m.tags.map((t, j) => (
                        <span key={j} className={styles.tag}>{t}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          )}
        </div>

        <div className={styles.suggestions}>
          {assistantSuggestions().map((s) => (
            <button key={s} className={styles.chip} onClick={() => send(s)}>{s}</button>
          ))}
        </div>

        <div className={styles.inputRow}>
          <input
            className={styles.input}
            value={input}
            placeholder="问问数字员工，例如：AI 比人工配载好多少？"
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') send(input);
            }}
          />
          <button className={styles.send} onClick={() => send(input)}>发送</button>
        </div>
      </div>
    </div>
  );
}
