const HttpError = require('./HttpError');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function queryOptions(query, allowed = []) {
  const permitted = new Set(['page', 'limit', ...allowed]);
  for (const key of Object.keys(query)) {
    if (!permitted.has(key) || typeof query[key] !== 'string') {
      throw new HttpError(422, `Tham số ${key} không hợp lệ.`);
    }
  }
  const page = query.page ?? '1';
  const limit = query.limit ?? '20';
  if (!/^[1-9]\d*$/.test(page) || !/^[1-9]\d*$/.test(limit)
      || Number(limit) > 100 || !Number.isSafeInteger(Number(page) * Number(limit))) {
    throw new HttpError(422, 'page phải là số nguyên dương, limit từ 1 đến 100.');
  }
  const options = { page: Number(page), limit: Number(limit), offset: (Number(page) - 1) * Number(limit) };
  for (const key of allowed) {
    const value = query[key];
    if (value === undefined) continue;
    if (key.endsWith('_id') && !UUID.test(value)) throw new HttpError(422, `${key} phải là UUID.`);
    if (key === 'is_open') {
      if (!['true', 'false'].includes(value)) throw new HttpError(422, 'is_open phải là true hoặc false.');
      options[key] = value === 'true';
    } else {
      if (key === 'q' && (value.trim().length === 0 || value.length > 100 || /[%_\\]/.test(value))) {
        throw new HttpError(422, 'q dài 1–100 ký tự và không chứa ký tự wildcard %, _, \\.');
      }
      options[key] = value.trim();
    }
  }
  return options;
}

module.exports = queryOptions;
