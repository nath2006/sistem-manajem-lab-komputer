let toolsPromise;

// Share in-flight imports, but allow a later print to retry a failed download.
export function loadPdfTools() {
  if (!toolsPromise) {
    toolsPromise = Promise.all([import('jspdf'), import('jspdf-autotable')])
      .then(([pdf, table]) => ({ jsPDF: pdf.jsPDF, autoTable: table.autoTable }))
      .catch(error => { toolsPromise = undefined; throw error; });
  }
  return toolsPromise;
}
