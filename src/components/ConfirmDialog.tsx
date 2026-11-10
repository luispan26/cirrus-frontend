// Shared styled confirmation dialog for permanent-removal actions, replacing
// the mix of window.confirm() and no confirmation at all that used to vary
// page to page (Inventory's equipment delete had none; Design History and
// Validated Protocols each used the browser's native confirm()).
export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ open, title, message, confirmLabel = 'Delete', cancelLabel = 'Cancel', onConfirm, onCancel }: ConfirmDialogProps) {
  if (!open) return null;
  return (
    <div className="confirm-backdrop" role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title" onClick={onCancel}>
      <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-dialog-title" id="confirm-dialog-title">{title}</div>
        <p className="confirm-dialog-text">{message}</p>
        <div className="confirm-dialog-actions">
          <button type="button" className="btn-out" onClick={onCancel}>{cancelLabel}</button>
          <button type="button" className="confirm-dialog-danger" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
