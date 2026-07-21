import { AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = '¿Estás seguro?',
  description,
  confirmText = 'Confirmar',
  loading = false,
  danger = true,
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            variant={danger ? 'danger' : 'primary'}
            onClick={onConfirm}
            loading={loading}
          >
            {confirmText}
          </Button>
        </>
      }
    >
      <div className="flex gap-3">
        {danger && (
          <div className="mt-0.5 rounded-full bg-red-50 p-2 dark:bg-red-500/10">
            <AlertTriangle className="h-5 w-5 text-red-500" />
          </div>
        )}
        <p className="text-sm text-slate-600 dark:text-slate-300">{description}</p>
      </div>
    </Modal>
  );
}
