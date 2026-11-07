import React, { useId } from 'react';
import useDialog from '../../utils/useDialog';

const ModalContainer = ({
  title,
  subtitle,
  children,
  onClose,
  primaryButton,
  secondaryButton,
  isBusy = false,
}) => {
  const titleId = useId();
  const closeDisabled =
    isBusy ||
    (React.isValidElement(secondaryButton) &&
      Boolean(secondaryButton.props.disabled));
  const requestClose = () => {
    if (!closeDisabled) onClose?.();
  };
  const dialogRef = useDialog(true, requestClose);
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-2 sm:p-4">
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-dialog-root="true"
        tabIndex={-1}
        className="flex min-h-0 w-full min-w-0 max-w-4xl max-h-[calc(100dvh-1rem)] flex-col rounded-xl bg-white shadow-2xl outline-none sm:max-h-[90dvh]"
      >
        <header className="flex shrink-0 items-start gap-3 rounded-t-xl border-b bg-white p-4 sm:p-6">
          <div className="min-w-0 flex-1">
            <h2
              id={titleId}
              className="break-words text-lg font-bold text-maroon sm:text-2xl"
            >
              {title}
            </h2>
            {subtitle && (
              <p className="mt-1 break-words text-sm text-gray-500">
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={requestClose}
            disabled={closeDisabled}
            aria-label="Tutup dialog"
            className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-2xl text-maroon hover:bg-maroon/10 focus-visible:ring-2 focus-visible:ring-maroon disabled:opacity-50"
          >
            <span aria-hidden="true">×</span>
          </button>
        </header>
        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6">
          {children}
        </div>
        <footer className="shrink-0 rounded-b-xl border-t bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6">
          {secondaryButton ? (
            <div className="flex w-full flex-col-reverse justify-end gap-3 sm:flex-row">
              <div className="w-full sm:w-1/2">{secondaryButton}</div>
              <div className="w-full sm:w-1/2">{primaryButton}</div>
            </div>
          ) : (
            <button
              type="button"
              onClick={requestClose}
              disabled={closeDisabled}
              className="min-h-11 w-full bg-maroon text-white px-6 py-3 rounded-lg hover:bg-maroon/90 hover:shadow-md active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon focus-visible:ring-offset-2 transition-all duration-150 font-medium disabled:opacity-50"
            >
              Tutup
            </button>
          )}
        </footer>
      </section>
    </div>
  );
};

export default ModalContainer;
