import { useState } from 'react';
import { Icon } from './icons.jsx';
import { createAlert } from '../lib/api.js';

export default function CreateAlertForm({ symbol, name }) {
  const [open, setOpen] = useState(false);
  const [direction, setDirection] = useState('above');
  const [targetPrice, setTargetPrice] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSaving(true);
    try {
      await createAlert({ symbol, name, direction, targetPrice: Number(targetPrice) });
      setSuccess(true);
      setTargetPrice('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button type="button" className="secondary-button alert-toggle" onClick={() => setOpen(true)}>
        <Icon name="bell" size={14} /> Set price alert
      </button>
    );
  }

  return (
    <form className="alert-form" onSubmit={handleSubmit}>
      <select value={direction} onChange={(e) => setDirection(e.target.value)}>
        <option value="above">Rises above</option>
        <option value="below">Falls below</option>
      </select>
      <input
        type="number"
        min="0"
        step="any"
        placeholder="Target price"
        value={targetPrice}
        onChange={(e) => setTargetPrice(e.target.value)}
        required
      />
      <button type="submit" className="secondary-button" disabled={saving}>
        {saving ? 'Saving…' : 'Create alert'}
      </button>
      <button type="button" className="icon-button" aria-label="Cancel" onClick={() => setOpen(false)}>
        <Icon name="x" size={16} />
      </button>
      {error && <div className="form-error">{error}</div>}
      {success && <div className="form-success">Alert created — check the Watchlist page.</div>}
    </form>
  );
}
