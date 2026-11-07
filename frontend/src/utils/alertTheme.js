// Shared SweetAlert styling follows the school brand at display time.
export const alertTheme = {
  buttonsStyling: false,
  customClass: {
    popup: 'border-t-4 border-maroon',
    confirmButton:
      'min-h-11 px-5 py-2 text-sm font-semibold text-center border-2 border-maroon rounded-md bg-maroon text-white hover:bg-maroon/90 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon focus-visible:ring-offset-2 disabled:opacity-50',
    cancelButton:
      'min-h-11 px-5 py-2 text-sm font-semibold text-center bg-white border-2 rounded-md text-maroon border-maroon hover:bg-maroon/10 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon focus-visible:ring-offset-2 disabled:opacity-50',
    actions: 'flex justify-center gap-4 mt-2',
  },
};

// Only warning confirmations opt into a branded icon; success/error stay semantic.
export const deleteAlertTheme = {
  ...alertTheme,
  iconColor: 'var(--color-maroon)',
};
