const formatDate = (dateString) => {
  if (!dateString) return 'Tidak diketahui';
  const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  return new Date(dateString).toLocaleDateString('id-ID', options);
};

export default formatDate;
