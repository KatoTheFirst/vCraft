const { Sequelize } = require('sequelize');
const configurations = require('../config/database');

// Chỉ lớp kết nối biết cấu hình hệ quản trị. Các tầng trên dùng Model/Repository.
class Database {
  constructor(config = configurations[process.env.NODE_ENV || 'development']) {
    if (!config) throw new Error('NODE_ENV không được hỗ trợ.');
    this.connection = new Sequelize(config);
  }

  connect() {
    return this.connection.authenticate();
  }

  transaction(work) {
    return this.connection.transaction(work);
  }

  close() {
    return this.connection.close();
  }
}

module.exports = Database;
