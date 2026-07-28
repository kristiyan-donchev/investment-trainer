import { useState } from 'react';

export default function Tooltip({ term, children }) {
  const [open, setOpen] = useState(false);

  return (
    <span
      className="tooltip-wrap"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onClick={() => setOpen((o) => !o)}
    >
      <span className="tooltip-trigger">{children}</span>
      <span className="tooltip-icon" aria-hidden="true">
        ?
      </span>
      {open && <span className="tooltip-bubble">{term}</span>}
    </span>
  );
}
