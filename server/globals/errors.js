export const fieldError = (field) => {
  return `Missing field ${field}`;
};

export const operationNotAllowed = (msg) => {
  return `Operation not allowed: ${msg}`;
};
