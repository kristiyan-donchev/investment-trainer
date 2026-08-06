import { useEffect, useState } from 'react';
import { fetchAlerts, cancelAlert } from '../lib/api.js';

const POLL_MS = 20000;

function formatDate(ts) {
  return new Date(ts).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function PriceAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    function load() {
      fetchAlerts()
        .then((list) => {
          if (!cancelled) setAlerts(list);
        })
        .catch((err) => {
          if (!cancelled) setError(err.message);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }
    load();
    const interval = setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  async function handleCancel(id) {
    try {
      setAlerts(await cancelAlert(id));
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <p className="empty-state">Loading alerts…</p>;
  if (error) return <div className="form-error">{error}</div>;
  if (alerts.length === 0) {
    return <p className="empty-state">No price alerts yet — set one from a stock or crypto's quote on the Dashboard.</p>;
  }

  const active = alerts.filter((a) => a.active);
  const triggered = alerts.filter((a) => !a.active);

  return (
    <div className="alerts-list">
      {active.length > 0 && (
        <>
          <h3 className="alerts-subheading">Active</h3>
          {active.map((a) => (
            <div className="alert-row" key={a.id}>
              <span>
                <strong>{a.symbol}</strong> {a.direction === 'above' ? 'rises above' : 'falls below'} $
                {a.targetPrice.toFixed(2)}
              </span>
              <button type="button" className="icon-button" aria-label="Cancel alert" onClick={() => handleCancel(a.id)}>
                ✕
              </button>
            </div>
          ))}
        </>
      )}

      {triggered.length > 0 && (
        <>
          <h3 className="alerts-subheading">Triggered</h3>
          {triggered.map((a) => (
            <div className={a.justTriggered ? 'alert-row alert-triggered' : 'alert-row'} key={a.id}>
              <span>
                🔔 <strong>{a.symbol}</strong> {a.direction === 'above' ? 'rose above' : 'fell below'} $
                {a.targetPrice.toFixed(2)} — hit ${a.triggeredPrice?.toFixed(2)} on {formatDate(a.triggeredAt)}
              </span>
              <button type="button" className="icon-button" aria-label="Dismiss alert" onClick={() => handleCancel(a.id)}>
                ✕
              </button>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
