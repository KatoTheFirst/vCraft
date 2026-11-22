const { randomBytes } = require('node:crypto');
const bcrypt = require('bcryptjs');
const { createContext } = require('../src/app');

const id = number => `00000000-0000-4000-8000-${String(number).padStart(12, '0')}`;

async function seed(context, password) {
  const hash = await bcrypt.hash(password, 12);
  const data = {
    users: [
      { id: id(1), name: 'Ban quản lý demo', email: 'admin@vcraft.test', role: 'admin', password_hash: hash },
      { id: id(2), name: 'Nghệ nhân An Nhiên demo', email: 'artisan@vcraft.test', role: 'artisan', password_hash: hash },
      { id: id(3), name: 'Khách mua sỉ demo', email: 'buyer@vcraft.test', role: 'buyer', password_hash: hash },
      { id: id(4), name: 'Nghệ nhân Mộc demo', email: 'moc@vcraft.test', role: 'artisan', password_hash: hash },
      { id: id(5), name: 'Nghệ nhân chờ duyệt demo', email: 'pending@vcraft.test', role: 'artisan', password_hash: hash },
    ],
    craft_villages: [{ id: id(10), name: 'Làng gốm Bát Tràng', slug: 'bat-trang',
      description: 'Triển lãm số gốm Bát Tràng. Các xưởng trong bộ seed là dữ liệu giả lập.',
      address: 'Bát Tràng, Hà Nội', latitude: 20.9763, longitude: 105.9134 }],
    artisan_profiles: [
      { id: id(20), user_id: id(2), village_id: id(10), workshop_name: 'Xưởng gốm An Nhiên (demo)',
        slug: 'xuong-gom-an-nhien', family_history: 'Gia đình làm gốm qua nhiều thế hệ. Nội dung minh họa.',
        story: 'Xưởng demo chuyên cốc và bộ đồ ăn vẽ tay.', address: 'Vị trí minh họa tại Bát Tràng',
        latitude: 20.9764, longitude: 105.9132, is_open: true, approval_status: 'approved' },
      { id: id(21), user_id: id(4), village_id: id(10), workshop_name: 'Xưởng gốm Mộc (demo)',
        slug: 'xuong-gom-moc', family_history: 'Hồ sơ gia đình minh họa.', story: 'Xưởng demo chuyên bình hoa.',
        address: 'Vị trí minh họa tại Bát Tràng', latitude: 20.9771, longitude: 105.9141,
        is_open: false, approval_status: 'approved' },
      { id: id(22), user_id: id(5), village_id: id(10), workshop_name: 'Xưởng chờ duyệt (demo)',
        slug: 'xuong-cho-duyet', address: 'Vị trí minh họa tại Bát Tràng',
        latitude: 20.9758, longitude: 105.9138, approval_status: 'pending' },
    ],
    categories: [
      { id: id(30), name: 'Cốc và tách', slug: 'coc-va-tach' },
      { id: id(31), name: 'Bát và đĩa', slug: 'bat-va-dia' },
      { id: id(32), name: 'Bình hoa', slug: 'binh-hoa' },
    ],
    products: [
      { id: id(40), artisan_id: id(20), category_id: id(30), name: 'Cốc men lam', slug: 'coc-men-lam', reference_price: 85000, status: 'published', story: 'Cốc vẽ tay, có thể đặt in logo theo lô.' },
      { id: id(41), artisan_id: id(20), category_id: id(31), name: 'Bát men ngọc', slug: 'bat-men-ngoc', reference_price: 65000, status: 'published' },
      { id: id(42), artisan_id: id(20), category_id: id(31), name: 'Đĩa hoa sen', slug: 'dia-hoa-sen', reference_price: 120000, status: 'published' },
      { id: id(43), artisan_id: id(21), category_id: id(32), name: 'Bình hoa dáng bầu', slug: 'binh-hoa-dang-bau', reference_price: 350000, status: 'published' },
      { id: id(44), artisan_id: id(21), category_id: id(32), name: 'Bình hoa men rạn', slug: 'binh-hoa-men-ran', reference_price: 450000, status: 'published' },
      { id: id(45), artisan_id: id(20), category_id: id(30), name: 'Tách trà men trắng', slug: 'tach-tra-men-trang', reference_price: 55000, status: 'published' },
    ],
    production_batches: [
      { id: id(50), product_id: id(40), code: 'BT-2026-001', quantity: 300, status: 'completed', started_at: '2026-11-01', completed_at: '2026-11-15' },
      { id: id(51), product_id: id(43), code: 'BT-2026-002', quantity: 50, started_at: '2026-11-16' },
    ],
    production_logs: [
      ...['Nhào đất', 'Tạo hình', 'Vẽ và tráng men', 'Nung', 'Kiểm tra thành phẩm'].map((title, position) => ({
        id: id(60 + position), batch_id: id(50), title, position,
        occurred_at: `2026-11-${String(1 + position * 3).padStart(2, '0')}T08:00:00+07:00`,
        description: `Mốc ${title.toLowerCase()} của lô cốc demo.`,
        // Mảng URL ảnh sẵn sàng cho module upload. Bộ seed chưa có ảnh chứng minh thật.
        images: [],
      })),
      { id: id(65), batch_id: id(51), title: 'Tạo hình bình', position: 0, occurred_at: '2026-11-16T08:00:00+07:00' },
    ],
    quote_requests: [{ id: id(70), buyer_id: id(3), village_id: id(10), category_id: id(30),
      title: 'Đặt 500 cốc in logo', specifications: 'Cốc 300 ml, logo một màu, đóng hộp riêng.',
      quantity: 500, budget: 40000000, deadline: '2026-12-20', status: 'artisans_bidding' }],
    quote_request_recipients: [
      { id: id(71), request_id: id(70), artisan_id: id(20) },
      { id: id(72), request_id: id(70), artisan_id: id(21) },
    ],
    quote_bids: [
      { id: id(73), request_id: id(70), artisan_id: id(20), unit_price: 75000, quantity: 300, completion_date: '2026-12-15' },
      { id: id(74), request_id: id(70), artisan_id: id(21), unit_price: 78000, quantity: 200, completion_date: '2026-12-18' },
    ],
    community_news: [{ id: id(80), author_id: id(1), village_id: id(10), title: 'Thông báo triển lãm gốm demo',
      slug: 'trien-lam-gom-demo', content: 'Bản tin minh họa cho cộng đồng Bát Tràng.', is_pinned: true,
      published_at: '2026-11-20T08:00:00+07:00' }],
  };

  // Một transaction cho toàn bộ seed. Chạy lại giữ dữ liệu và mật khẩu đã tồn tại.
  await context.database.transaction(async transaction => {
    for (const [table, rows] of Object.entries(data)) {
      const repository = context.repositories[table];
      for (const row of rows) {
        if (!await repository.findById(row.id, { transaction })) {
          await repository.create(row, { transaction });
        }
      }
    }
  });
}

async function main() {
  const context = createContext();
  const password = process.env.DEMO_PASSWORD || randomBytes(18).toString('base64url');
  try {
    await seed(context, password);
    console.log('Seed thành công. Tài khoản admin@vcraft.test, artisan@vcraft.test, buyer@vcraft.test.');
    console.log('Mật khẩu cho tài khoản được tạo mới trong lần seed này:', password);
    console.log('Tài khoản có sẵn giữ nguyên mật khẩu. Chức năng đăng nhập thuộc task 3.1.');
  } finally {
    await context.database.close();
  }
}

if (require.main === module) main().catch(error => {
  console.error('Seed thất bại:', error.message);
  process.exitCode = 1;
});

module.exports = { seed, id };
