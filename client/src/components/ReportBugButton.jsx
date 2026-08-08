import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './icons.jsx';
import { fetchBugReports, submitBugReport } from '../lib/api.js';

function formatDate(ts) {
  return new Date(ts).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function ReportBugButton({ page }) {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [reports, setReports] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setReportsLoading(true);
    fetchBugReports()
      .then(setReports)
      .catch(() => setReports([]))
      .finally(() => setReportsLoading(false));
  }, [open]);

  function close() {
    setOpen(false);
    setError(null);
    setSuccess(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSubmitting(true);
    try {
      setReports(await submitBugReport({ description, page }));
      setDescription('');
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button type="button" className="sidebar-nav-item" onClick={() => setOpen(true)}>
        <span className="sidebar-nav-icon">
          <Icon name="bug" size={18} />
        </span>
        <span className="sidebar-nav-label">Report a bug</span>
      </button>

      {open &&
        createPortal(
          <div className="modal-overlay" onClick={close}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Report a bug</h2>
                <button className="icon-button" onClick={close} aria-label="Close">
                  <Icon name="x" size={16} />
                </button>
              </div>

              <div className="settings-section">
                <div className="settings-section-desc">
                  Tell us what happened — the more detail, the easier it is to track down.
                </div>
                <form className="bug-report-form" onSubmit={handleSubmit}>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What went wrong? What were you doing right before it happened?"
                    rows={5}
                    maxLength={2000}
                    required
                  />
                  {error && <div className="form-error">{error}</div>}
                  {success && <div className="form-success">Thanks — your report was logged.</div>}
                  <button type="submit" className="secondary-button" disabled={submitting || !description.trim()}>
                    {submitting ? 'Submitting…' : 'Submit report'}
                  </button>
                </form>
              </div>

              {(reportsLoading || reports.length > 0) && (
                <>
                  <div className="settings-divider" />
                  <div className="settings-section">
                    <div className="settings-section-title">Your past reports</div>
                    {reportsLoading ? (
                      <p className="empty-state">Loading…</p>
                    ) : (
                      <div className="alerts-list">
                        {reports.map((r) => (
                          <div className="alert-row" key={r.id}>
                            <span>
                              {r.description}
                              <span className="row-subtext"> · {formatDate(r.createdAt)}</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
