const { Model, DataTypes } = require('sequelize');
const { schemaV1 } = require('../../database/schema-v1');

function createModels(connection) {
  const models = {};
  for (const [table, attributes] of Object.entries(schemaV1())) {
    // Mỗi model là lớp OOP riêng, dùng cùng hợp đồng CRUD của Sequelize.Model.
    class Entity extends Model {}
    Entity.init({
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      ...attributes,
    }, {
      sequelize: connection, modelName: table, tableName: table,
      timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at',
      ...(table === 'users' ? {
        defaultScope: { attributes: { exclude: ['password_hash'] } },
        scopes: { withPassword: { attributes: { include: ['password_hash'] } } },
      } : {}),
      ...(table === 'quote_requests' ? { version: 'version' } : {}),
    });
    models[table] = Entity;
  }

  const relates = (child, parent, foreignKey, as) => {
    models[child].belongsTo(models[parent], { foreignKey, as });
  };
  relates('artisan_profiles', 'users', 'user_id', 'user');
  relates('artisan_profiles', 'craft_villages', 'village_id', 'village');
  relates('products', 'artisan_profiles', 'artisan_id', 'artisan');
  relates('products', 'categories', 'category_id', 'category');
  relates('production_batches', 'products', 'product_id', 'product');
  relates('production_logs', 'production_batches', 'batch_id', 'batch');
  relates('quote_requests', 'users', 'buyer_id', 'buyer');
  relates('quote_requests', 'craft_villages', 'village_id', 'village');
  relates('quote_requests', 'categories', 'category_id', 'category');
  relates('quote_bids', 'quote_requests', 'request_id', 'request');
  relates('quote_bids', 'artisan_profiles', 'artisan_id', 'artisan');
  relates('quote_request_recipients', 'quote_requests', 'request_id', 'request');
  relates('quote_request_recipients', 'artisan_profiles', 'artisan_id', 'artisan');
  relates('community_news', 'users', 'author_id', 'author');
  relates('community_news', 'craft_villages', 'village_id', 'village');
  models.production_batches.hasMany(models.production_logs, { foreignKey: 'batch_id', as: 'logs' });
  return models;
}

module.exports = createModels;
