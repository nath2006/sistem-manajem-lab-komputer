/**
 * Sort data berdasarkan created_at in descending 
 * @param {Array} data - Data array yang berisi objek dengan properti created_at
 * @returns {Array} - Data yang sudah diurutkan berdasarkan created_at terbaru ke terlama
 */
export const sortLatedData = (data) => {
    return data.sort((a, b) => {
        const dateA = new Date(a.created_at);
        const dateB = new Date(b.created_at);
        return dateB - dateA;
    });
};
