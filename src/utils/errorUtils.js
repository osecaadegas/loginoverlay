const OBJECT_MESSAGE = '[object Object]';

export function getErrorMessage(error, fallback = 'Unknown error') {
  if (!error) return fallback;

  if (typeof error === 'string') {
    const message = error.trim();
    return message && message !== OBJECT_MESSAGE ? message : fallback;
  }

  if (error instanceof Error) {
    return getErrorMessage(error.message, fallback);
  }

  if (typeof error.message === 'string') {
    return getErrorMessage(error.message, fallback);
  }

  if (error.message) {
    return getErrorMessage(error.message, fallback);
  }

  if (typeof error.error === 'string') {
    return getErrorMessage(error.error, fallback);
  }

  if (error.error) {
    return getErrorMessage(error.error, fallback);
  }

  if (typeof error.details === 'string') {
    return getErrorMessage(error.details, fallback);
  }

  if (error.details) {
    const details = getErrorMessage(error.details, '');
    if (details) return details;
  }

  if (typeof error.hint === 'string') return error.hint;
  if (typeof error.description === 'string') return error.description;
  if (typeof error.code === 'string') return error.code;

  try {
    const json = JSON.stringify(error);
    return json && json !== '{}' ? json : fallback;
  } catch {
    return fallback;
  }
}

export function isDuplicateError(error) {
  const message = getErrorMessage(error, '').toLowerCase();
  return (
    message.includes('duplicate') ||
    message.includes('unique') ||
    message.includes('already exists') ||
    message.includes('23505')
  );
}
