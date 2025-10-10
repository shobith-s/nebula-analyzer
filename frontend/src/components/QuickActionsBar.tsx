import React, { useState } from 'react';
import { VscRocket, VscGraph, VscListOrdered, VscFilter, VscClose } from 'react-icons/vsc';

//export type QuickActionKey = 'summary' | 'correlation' | 'count_by' | 'top_n';
// add these near the top
export const QUICK_ACTIONS = ['summary', 'correlation', 'count_by', 'top_n'] as const;
export type QuickActionKey = typeof QUICK_ACTIONS[number];


interface QuickActionsBarProps {
  onRun: (action: QuickActionKey, payload?: Record<string, string>) => void;
}

/**
 * Floating quick-actions palette that anchors inside the Results panel.
 * It triggers deterministic prompts to your /chat router.
 */
const QuickActionsBar: React.FC<QuickActionsBarProps> = ({ onRun }) => {
  const [open, setOpen] = useState(false);
  const [countByCol, setCountByCol] = useState('');
  const [topByCol, setTopByCol] = useState('');
  const [topK, setTopK] = useState('5');

  return (
    <>
      {/* Floating action button */}
      <button
        className={`quick-fab ${open ? 'active' : ''}`}
        aria-label="Open quick actions"
        onClick={() => setOpen(o => !o)}
        title="Quick actions"
      >
        <VscRocket size={18} />
      </button>

      {/* Palette */}
      <div className={`quick-palette ${open ? 'show' : ''}`} aria-hidden={!open}>
        <div className="qp-head">
          <div className="qp-title">Quick Actions</div>
          <button className="qp-close" onClick={() => setOpen(false)} aria-label="Close quick actions">
            <VscClose size={16} />
          </button>
        </div>

        <div className="qp-group">
          <button className="qp-item" onClick={() => onRun('summary')}>
            <VscRocket /> <span>Summary</span>
          </button>
          <button className="qp-item" onClick={() => onRun('correlation')}>
            <VscGraph /> <span>Correlation</span>
          </button>
        </div>

        <div className="qp-divider" />

        <div className="qp-group">
          <div className="qp-field">
            <label>Count by column</label>
            <input
              placeholder="Department"
              value={countByCol}
              onChange={e => setCountByCol(e.target.value)}
            />
          </div>
          <button
            className="qp-item solid"
            disabled={!countByCol.trim()}
            onClick={() => onRun('count_by', { column: countByCol.trim() })}
            title="Count non-null rows grouped by selected column"
          >
            <VscListOrdered /> <span>Count by</span>
          </button>
        </div>

        <div className="qp-group">
          <div className="qp-field">
            <label>Top-N by column</label>
            <div className="qp-row">
              <input
                placeholder="Salary"
                value={topByCol}
                onChange={e => setTopByCol(e.target.value)}
              />
              <input
                className="n"
                placeholder="N"
                value={topK}
                onChange={e => setTopK(e.target.value)}
              />
            </div>
          </div>
          <button
            className="qp-item"
            disabled={!topByCol.trim() || !topK.trim()}
            onClick={() => onRun('top_n', { column: topByCol.trim(), k: topK.trim() })}
            title="Top-N rows ordered by a numeric column"
          >
            <VscListOrdered /> <span>Top-N</span>
          </button>
        </div>

        <div className="qp-divider" />

        <div className="qp-note">
          <VscFilter /> Pro tip: still use the left panel for custom prompts.
        </div>
      </div>
    </>
  );
};

export default QuickActionsBar;
