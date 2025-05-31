/**
 * Sort data berdasarkan created_at in descending order (latest first)
 * @param {Array} data - The data array to be sorted
 * @returns {Array} - The sorted data array
 */
export const sortLatedData = (data) => {
    return data.sort((a, b) => {
        const dateA = new Date(a.created_at);
        const dateB = new Date(b.created_at);
        return dateB - dateA;
    });
};
