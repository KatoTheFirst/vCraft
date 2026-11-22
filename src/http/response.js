function success(res, data, message = 'Thành công', statusCode = 200) {
  return res.status(statusCode).json({ status: 'success', message, data });
}

module.exports = { success };
