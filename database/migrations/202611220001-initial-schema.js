const { DataTypes: T } = require('sequelize');
const { schemaV1, indexes } = require('../schema-v1');

module.exports = {
  async up(queryInterface) {
    const create = async transaction => {
      // Thứ tự đảm bảo bảng được tham chiếu luôn tồn tại trước bảng con.
      for (const [table, attributes] of Object.entries(schemaV1())) {
        await queryInterface.createTable(table, {
          id: { type: T.UUID, primaryKey: true, allowNull: false },
          ...attributes,
          created_at: { type: T.DATE, allowNull: false },
          updated_at: { type: T.DATE, allowNull: false },
        }, { transaction });
        for (const index of indexes[table] || []) {
          const options = Array.isArray(index) ? { fields: index } : index;
          await queryInterface.addIndex(table, { ...options, transaction });
        }
      }
    };
    // MySQL DDL tự commit. SQLite/PostgreSQL rollback được cả quá trình tạo bảng.
    if (queryInterface.sequelize.getDialect() === 'mysql') {
      await create(undefined);
    } else {
      await queryInterface.sequelize.transaction(create);
    }
  },

  async down(queryInterface) {
    for (const table of Object.keys(schemaV1()).reverse()) {
      await queryInterface.dropTable(table);
    }
  },
};
