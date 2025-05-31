import React from "react";

const FormContainer = ({
  title = "Form",
  description = "",
  error = "",
  isSubmitting = false,
  onSubmit,
  onCancel,
  children,
}) => {
  return (
    <div className="w-full bg-white rounded-lg shadow-md">
      <div className="p-6 border-b">
        <h2 className="text-xl font-semibold">{title}</h2>
        {description && (
          <p className="text-sm text-gray-600 mt-1">{description}</p>
        )}
      </div>

      {error && (
        <div className="mx-6 mt-4 p-3 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}

      <form onSubmit={onSubmit} className="p-6 space-y-6 text-gray-600">
        {children}

        <div className="flex justify-end mt-6 pt-4 space-x-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2 text-sm font-semibold text-center bg-white border-2 rounded-md text-red-500 border-red-500 active:scale-95 focus:outline-none"
            disabled={isSubmitting}
          >
            Batal
          </button>
          <button
            type="submit"
            className="px-5 py-2 text-sm font-semibold text-center rounded-md bg-red-500 text-white active:scale-95 focus:outline-none"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default FormContainer;
