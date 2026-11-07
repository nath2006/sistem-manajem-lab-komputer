import React from 'react';

const FormContainer = ({
  title = 'Form',
  description = '',
  error = '',
  isSubmitting = false,
  onSubmit,
  onCancel,
  children,
}) => {
  return (
    <div className="w-full min-w-0 bg-white rounded-lg shadow-md">
      <div className="p-4 sm:p-6 border-b">
        <h2 className="text-xl font-semibold text-maroon">{title}</h2>
        {description && (
          <p className="text-sm text-gray-600 mt-1 break-words">
            {description}
          </p>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="mx-4 sm:mx-6 mt-4 p-3 bg-red-100 text-red-700 rounded-md"
        >
          {error}
        </div>
      )}

      <form
        onSubmit={onSubmit}
        aria-busy={isSubmitting}
        className="min-w-0 p-4 sm:p-6 space-y-6 text-gray-600"
      >
        {children}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end mt-6 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-11 w-full sm:w-auto px-5 py-2 text-sm font-semibold text-center bg-white border-2 rounded-md text-maroon border-maroon hover:bg-maroon/10 hover:shadow-sm active:scale-95 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none"
            disabled={isSubmitting}
          >
            Batal
          </button>
          <button
            type="submit"
            className="min-h-11 w-full sm:w-auto px-5 py-2 text-sm font-semibold text-center rounded-md bg-maroon text-white hover:bg-maroon/90 hover:shadow-md active:scale-95 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default FormContainer;
