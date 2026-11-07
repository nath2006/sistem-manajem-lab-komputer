export function filterTableData(data, searchTerm = '', relation) {
  if (!Array.isArray(data)) return [];
  if (relation?.fields?.length && Number.isSafeInteger(relation.id) && relation.id > 0) {
    data = data.filter(item => relation.fields.some(field => Number(field.split('.').reduce((value,key)=>value?.[key],item)) === relation.id));
  }
  if (!searchTerm.trim()) return data;
  const query = searchTerm.toLowerCase();
  return data.filter((item) =>
    Object.values(item).some((value) =>
      String(value).toLowerCase().includes(query)
    )
  );
}

export function getPaginationItems(totalPages, currentPage) {
  const last = Math.max(1, Math.trunc(totalPages));
  if (last <= 5) return Array.from({ length: last }, (_, index) => index + 1);
  const current = Math.min(last, Math.max(1, currentPage));
  const visible = [
    ...new Set([1, 2, current - 1, current, current + 1, last - 1, last]),
  ]
    .filter((page) => page >= 1 && page <= last)
    .sort((a, b) => a - b);
  const result = [];
  for (const page of visible) {
    const previous = result[result.length - 1];
    if (previous && page - previous > 1) result.push(`gap-${previous}-${page}`);
    result.push(page);
  }
  return result;
}
