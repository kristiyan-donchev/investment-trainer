import { Icon } from './icons.jsx';

// The one reusable "log in to unlock this" placeholder — swapped in for real
// content wherever a guest hits something that needs an account. `compact`
// is for small inline spots (e.g. where a form/button would normally sit);
// the default is a full panel replacing a whole page or section.
export default function GuestGate({ title, description, onRequestLogin, compact = false }) {
  return (
    <div className={compact ? 'guest-gate guest-gate-compact' : 'guest-gate'}>
      <span className="guest-gate-icon" aria-hidden="true">
        <Icon name="lock" size={compact ? 18 : 26} />
      </span>
      <div className="guest-gate-text">
        <div className="guest-gate-title">{title}</div>
        {description && <p className="guest-gate-desc">{description}</p>}
      </div>
      <div className="guest-gate-actions">
        <button type="button" className="primary-button" onClick={onRequestLogin}>
          Log in
        </button>
        <button type="button" className="secondary-button" onClick={onRequestLogin}>
          Sign up
        </button>
      </div>
    </div>
  );
}
