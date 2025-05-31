let authToken = null;

export const setToken = (token) => {
  authToken = token;
};

export const getToken = () => {
  return authToken;
};
