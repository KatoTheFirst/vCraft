const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const bcrypt = require('bcryptjs');
const Database = require('../src/database/connection');
const { createApp, createContext } = require('../src/app');
const migration = require('../database/migrations/202611220001-initial-schema');
const { seed, id } = require('../database/seed');

let context;
let server;
let base;
before(async () => {
  context = createContext(new Database({ dialect: 'sqlite', storage: ':memory:', logging: false }));
  await migration.up(context.database.connection.getQueryInterface());
  await seed(context, 'Test-demo-2026!');
  server = createApp(context).listen(0, '127.0.0.1');
  await once(server, 'listening');
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  if (context) await context.database.close();
});

test('migration tạo đủ bảng, seed chạy lại an toàn và băm mật khẩu', async () => {
  await seed(context, 'Different-password!');
  const users = await context.repositories.users.list();
  assert.equal(users.length, 5);
  assert.deepEqual(new Set(users.map(user => user.role)), new Set(['admin', 'artisan', 'buyer']));
  assert.equal(users[0].password_hash, undefined);
  const user = await context.models.users.scope('withPassword').findByPk(id(1));
  assert.equal(await bcrypt.compare('Test-demo-2026!', user.password_hash), true);
  assert.equal((await context.repositories.production_logs.list()).length, 6);
});

test('Repository CRUD và rollback transaction dùng CSDL thực', async () => {
  const repo = context.repositories.categories;
  const category = await repo.create({ name: 'Thử nghiệm', slug: 'thu-nghiem' });
  await repo.update(category.id, { name: 'Đã sửa' });
  assert.equal((await repo.findById(category.id)).name, 'Đã sửa');
  assert.equal(await repo.delete(category.id), true);
  assert.equal(await repo.findById(category.id), null);
  await assert.rejects(context.database.transaction(async transaction => {
    await repo.create({ name: 'Rollback', slug: 'rollback' }, { transaction });
    throw new Error('rollback');
  }));
  assert.equal(await repo.findOne({ where: { slug: 'rollback' } }), null);
  await assert.rejects(context.repositories.products.create({
    artisan_id: id(999), category_id: id(30), name: 'Sai FK', slug: 'sai-fk', reference_price: 1,
  }));
  await assert.rejects(context.repositories.production_batches.create({
    product_id: id(40), code: 'NEGATIVE', quantity: -1, started_at: new Date(),
  }));
});

test('API phân trang, lọc xưởng mở cửa và sản phẩm theo hộ/phân loại', async () => {
  const artisans = await (await fetch(`${base}/api/v1/artisans?is_open=true`)).json();
  assert.equal(artisans.data.items.length, 1);
  const products = await (await fetch(`${base}/api/v1/products?artisan_id=${id(20)}&category_id=${id(30)}&limit=1`)).json();
  assert.equal(products.data.items.length, 1);
  assert.equal(products.data.pagination.total, 2);
  assert.equal(JSON.stringify(products).includes('password_hash'), false);
  const search = await (await fetch(`${base}/api/v1/products?q=${encodeURIComponent('Cốc')}`)).json();
  assert.equal(search.data.items.length, 1);
});

test('URL thân thiện và nhật ký theo đúng thứ tự', async () => {
  for (const path of ['/', '/artisan/xuong-gom-an-nhien', '/trace/BT-2026-001']) {
    const response = await fetch(base + path);
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /text\/html/);
  }
  const trace = await (await fetch(`${base}/api/v1/batches/BT-2026-001`)).json();
  assert.equal(trace.data.logs.length, 5);
  assert.equal(trace.data.logs[0].title, 'Nhào đất');
  assert.equal(trace.data.product.artisan.slug, 'xuong-gom-an-nhien');
});

test('Lỗi 400/404/405/413/422 trả cùng envelope JSON', async () => {
  const cases = [
    ['/api/v1/products?page=0', {}, 422],
    ['/api/v1/products?artisan_id=invalid', {}, 422],
    ['/api/v1/artisans?is_open=maybe', {}, 422],
    ['/api/v1/products?limit=101', {}, 422],
    ['/api/v1/products?limit=1&limit=2', {}, 422],
    ['/api/v1/products/khong-ton-tai', {}, 404],
    ['/artisan/xuong-cho-duyet', {}, 404],
    ['/api/v1/unknown', {}, 404],
    ['/api/v1/products', { method: 'POST' }, 405],
    ['/api/v1/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' }, 400],
    ['/api/v1/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ value: 'a'.repeat(1024 * 1024) }) }, 413],
  ];
  for (const [path, options, expected] of cases) {
    const response = await fetch(base + path, options);
    const body = await response.json();
    assert.equal(response.status, expected, path);
    assert.deepEqual(Object.keys(body), ['status', 'message', 'data']);
    assert.equal(body.status, 'error');
    if (expected === 405) assert.equal(response.headers.get('allow'), 'GET, HEAD');
  }
});

test('Xưởng bị khóa và sản phẩm nháp không lộ qua route công khai', async () => {
  await context.repositories.artisan_profiles.update(id(20), { approval_status: 'locked' });
  for (const path of ['/api/v1/products/coc-men-lam', '/api/v1/batches/BT-2026-001', '/trace/BT-2026-001']) {
    assert.equal((await fetch(base + path)).status, 404);
  }
  await context.repositories.artisan_profiles.update(id(20), { approval_status: 'approved' });
  await context.repositories.products.update(id(40), { status: 'draft' });
  assert.equal((await fetch(`${base}/api/v1/batches/BT-2026-001`)).status, 404);
  await context.repositories.products.update(id(40), { status: 'published' });
});

test('Migration down rồi up hoạt động trên CSDL rỗng', async () => {
  const database = new Database({ dialect: 'sqlite', storage: ':memory:', logging: false });
  try {
    const qi = database.connection.getQueryInterface();
    await migration.up(qi);
    await migration.down(qi);
    assert.equal((await qi.showAllTables()).length, 0);
    await migration.up(qi);
    assert.equal((await qi.showAllTables()).length, 11);
  } finally {
    await database.close();
  }
});
