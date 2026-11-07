const parseIdParam = (rawId) => {
  const id = Number.parseInt(rawId, 10);
  if(Number.isNaN(id)){
    const error = new Error("Paremeter ID harus berupa angka");
    error.status = 400;
    throw error;
  }
  return id;
}

export default parseIdParam;
