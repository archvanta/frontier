import { useRef, useState } from 'react';
import { CODE_LENGTH } from '../../lib/account/config';

/** Persian (۰–۹) and Arabic-Indic (٠–٩) digits typed on a Persian keyboard become ASCII digits. */
export function normalizeDigits(raw: string): string {
  return raw
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/\D/g, '')
    .slice(0, CODE_LENGTH);
}

/**
 * Six-digit code field. One real <input> (so paste, SMS/email autofill and screen readers work)
 * sits over six decorative cells. Digits always read left to right, also in Persian.
 */
export function OtpInput({
  id,
  value,
  onChange,
  onComplete,
  label,
  describedBy,
  invalid,
  disabled,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  onComplete?: (v: string) => void;
  label: string;
  describedBy?: string;
  invalid?: boolean;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  const cells = Array.from({ length: CODE_LENGTH }, (_, i) => value[i] ?? '');
  const active = Math.min(value.length, CODE_LENGTH - 1);
  return (
    <div className={`otp ${invalid ? 'is-invalid' : ''} ${focused ? 'is-focused' : ''}`} dir="ltr">
      <input
        ref={ref}
        id={id}
        className="otp-input"
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]*"
        maxLength={CODE_LENGTH * 2}
        spellCheck={false}
        value={value}
        disabled={disabled}
        aria-label={label}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(e) => {
          const v = normalizeDigits(e.target.value);
          onChange(v);
          if (v.length === CODE_LENGTH && v !== value) onComplete?.(v);
        }}
      />
      <div className="otp-cells" aria-hidden="true">
        {cells.map((d, i) => (
          <span key={i} className={`otp-cell ${d ? 'is-filled' : ''} ${focused && i === active ? 'is-active' : ''}`}>
            {d}
          </span>
        ))}
      </div>
    </div>
  );
}
