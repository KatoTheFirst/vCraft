const HttpError = require('../http/HttpError');
const { ValidationError, UniqueConstraintError, ForeignKeyConstraintError, OptimisticLockError } = require('sequelize');

function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  let statusCode = 500;
  let message = 'Lỗi máy chủ. Vui lòng thử lại sau.';
  let details = null;

  if (error instanceof HttpError) {
    ({ statusCode, message, details } = error);
  } else if (error instanceof UniqueConstraintError || error instanceof ForeignKeyConstraintError || error instanceof OptimisticLockError) {
    statusCode = 409;
    message = 'Dữ liệu xung đột hoặc đang được tham chiếu.';
  } else if (error instanceof ValidationError) {
    statusCode = 422;
    message = 'Dữ liệu không hợp lệ.';
    details = error.errors.map(item => ({ field: item.path, message: item.message }));
  } else if (error.type === 'entity.parse.failed') {
    statusCode = 400;
    message = 'Nội dung JSON không hợp lệ.';
  } else if (error.type === 'entity.too.large') {
    statusCode = 413;
    message = 'Nội dung yêu cầu vượt quá 1 MB.';
  } else if (error instanceof URIError) {
    statusCode = 400;
    message = 'URL không hợp lệ.';
  } else {
    console.error(error);
  }
  // Cùng định dạng cho cả route web và API khi có lỗi, không lộ stack/SQL.
  return res.status(statusCode).json({ status: 'error', message, data: details });
}

module.exports = errorHandler;
