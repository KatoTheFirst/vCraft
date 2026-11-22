const { DataTypes: T } = require('sequelize');

// Snapshot lược đồ migration đầu tiên. Giữ nguyên file này khi thêm migration mới.
const requiredText = (length = 255) => ({ type: T.STRING(length), allowNull: false });
const text = () => ({ type: T.TEXT, allowNull: false, defaultValue: '' });
const ref = (table, allowNull = false) => ({
  type: T.UUID, allowNull,
  references: { model: table, key: 'id' },
  onUpdate: 'CASCADE', onDelete: 'RESTRICT',
});
const choice = (values, defaultValue) => ({
  ...requiredText(32), defaultValue, validate: { isIn: [values] },
});
const jsonArray = () => ({
  type: T.JSON, allowNull: false, defaultValue: [],
  validate: { array(value) { if (!Array.isArray(value)) throw new Error('Giá trị phải là mảng.'); } },
});
const positiveInteger = () => ({ type: T.INTEGER, allowNull: false, validate: { isInt: true, min: 1 } });
const money = () => ({ type: T.DECIMAL(15, 2), allowNull: false, validate: { min: 0, isDecimal: true } });
const slug = () => ({ ...requiredText(160), unique: true, validate: { is: /^[a-z0-9]+(?:-[a-z0-9]+)*$/ } });

function schemaV1() {
  return {
    users: {
      name: requiredText(120),
      email: { ...requiredText(254), unique: true, validate: { isEmail: true } },
      password_hash: requiredText(),
      phone: { type: T.STRING(25), allowNull: true },
      role: choice(['admin', 'artisan', 'buyer'], 'buyer'),
      status: choice(['active', 'locked'], 'active'),
    },
    craft_villages: {
      name: requiredText(120), slug: slug(), description: text(), address: requiredText(),
      latitude: { type: T.DOUBLE, allowNull: false, validate: { min: -90, max: 90 } },
      longitude: { type: T.DOUBLE, allowNull: false, validate: { min: -180, max: 180 } },
    },
    artisan_profiles: {
      user_id: { ...ref('users'), unique: true }, village_id: ref('craft_villages'),
      workshop_name: requiredText(160), slug: slug(), family_history: text(), story: text(),
      address: requiredText(),
      latitude: { type: T.DOUBLE, allowNull: false, validate: { min: -90, max: 90 } },
      longitude: { type: T.DOUBLE, allowNull: false, validate: { min: -180, max: 180 } },
      is_open: { type: T.BOOLEAN, allowNull: false, defaultValue: false },
      approval_status: choice(['pending', 'approved', 'rejected', 'locked'], 'pending'),
      images: jsonArray(), certificates: jsonArray(),
    },
    categories: { name: requiredText(100), slug: slug() },
    products: {
      artisan_id: ref('artisan_profiles'), category_id: ref('categories'),
      name: requiredText(160), slug: slug(), story: text(), reference_price: money(), images: jsonArray(),
      status: choice(['draft', 'published', 'archived'], 'draft'),
    },
    production_batches: {
      product_id: ref('products'), code: { ...requiredText(80), unique: true },
      quantity: positiveInteger(),
      status: choice(['in_production', 'completed'], 'in_production'),
      started_at: { type: T.DATE, allowNull: false },
      completed_at: { type: T.DATE, allowNull: true },
    },
    production_logs: {
      batch_id: ref('production_batches'), title: requiredText(160), description: text(),
      occurred_at: { type: T.DATE, allowNull: false },
      position: { type: T.INTEGER, allowNull: false, validate: { min: 0, isInt: true } },
      images: jsonArray(),
    },
    quote_requests: {
      buyer_id: ref('users'), village_id: ref('craft_villages'), category_id: ref('categories'),
      title: requiredText(160), specifications: text(), quantity: positiveInteger(),
      budget: { ...money(), allowNull: true }, deadline: { type: T.DATEONLY, allowNull: false },
      status: choice(['draft', 'sent_to_artisans', 'artisans_bidding', 'buyer_accepted', 'in_production', 'delivered'], 'draft'),
      version: { type: T.INTEGER, allowNull: false, defaultValue: 0 },
    },
    quote_request_recipients: {
      request_id: ref('quote_requests'), artisan_id: ref('artisan_profiles'),
    },
    quote_bids: {
      request_id: ref('quote_requests'), artisan_id: ref('artisan_profiles'),
      unit_price: money(), quantity: positiveInteger(),
      completion_date: { type: T.DATEONLY, allowNull: false }, notes: text(),
      status: choice(['submitted', 'accepted', 'rejected'], 'submitted'),
    },
    community_news: {
      author_id: ref('users'), village_id: ref('craft_villages'),
      title: requiredText(160), slug: slug(), content: text(),
      is_pinned: { type: T.BOOLEAN, allowNull: false, defaultValue: false },
      published_at: { type: T.DATE, allowNull: true },
    },
  };
}

const indexes = {
  artisan_profiles: [['village_id', 'approval_status']],
  products: [['artisan_id', 'status'], ['category_id', 'status']],
  production_logs: [{ fields: ['batch_id', 'position'], unique: true }],
  quote_requests: [['buyer_id', 'status']],
  quote_request_recipients: [{ fields: ['request_id', 'artisan_id'], unique: true }],
  quote_bids: [{ fields: ['request_id', 'artisan_id'], unique: true }],
  community_news: [['village_id', 'published_at']],
};

module.exports = { schemaV1, indexes };
