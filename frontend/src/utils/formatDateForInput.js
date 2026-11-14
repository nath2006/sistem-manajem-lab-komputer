// Helper function to format ISO date to yyyy-MM-dd
const formatDateForInput = (dateString) => {
    if (!dateString) return "";
    
    try {
        const date = new Date(dateString);
        // Check if date is valid
        if (isNaN(date.getTime())) return "";
        
        // Format to YYYY-MM-DD while preserving the date
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        
        return `${year}-${month}-${day}`;
    } catch (error) {
        console.error("Error formatting date:", error);
        return "";
    }
};

export default formatDateForInput;
