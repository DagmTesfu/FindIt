import type { ReactNode } from "react";
import { statusLabels, type RequestStatus } from "../domain/models";
export function Badge({ status }: { status: RequestStatus }) {
  return <span className={`badge ${status}`}>{statusLabels[status]}</span>;
}
export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
export function Empty({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty-mark">↗</div>
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}
export function ImageField({ onChange }: { onChange: (file?: File) => void }) {
  return (
    <Field
      label="Photo (optional)"
      hint="JPG, PNG, or WebP · up to 5 MB. Use a photo you have permission to share."
    >
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={(event) => onChange(event.target.files?.[0])}
      />
    </Field>
  );
}
