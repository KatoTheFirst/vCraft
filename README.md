# vCraft Làng gốm Bát Tràng

Nền tảng triển lãm số dành cho Ban quản lý làng nghề, nghệ nhân và khách mua hàng. Bản bàn giao này thực hiện ba task đầu của Trần Tuấn Đạt trong bảng phân công Nhóm 9, theo thứ tự 1.1, 1.2 và 1.3.

| Task | Kết quả |
| --- | --- |
| 1.1 | Phân tích nghiệp vụ, sơ đồ MVC/Repository, cấu trúc thư mục, mã mẫu có comment và quy ước JSON |
| 1.2 | Migration 11 bảng, model OOP, Repository CRUD, transaction và seed ba vai trò |
| 1.3 | Router clean URL, API `/api/v1`, middleware lỗi JSON, tài liệu endpoint |

Đã chọn Node.js, Express 5, Sequelize 6 và SQLite để chạy local. Sequelize tách thao tác dữ liệu khỏi dialect. Có cấu hình chuyển sang PostgreSQL hoặc MySQL, cần cài driver và kiểm thử trên hệ quản trị đích.

## Chạy local

Cần Node.js 22 trở lên và npm.

```powershell
npm ci
Copy-Item .env.example .env
npm run setup
npm start
```

Mở [trang chính local](http://127.0.0.1:3000), [trang xưởng mẫu](http://127.0.0.1:3000/artisan/xuong-gom-an-nhien) hoặc [trang lô mẫu](http://127.0.0.1:3000/trace/BT-2026-001).

`npm run setup` chạy migration và seed. Migration đã áp dụng được SequelizeMeta ghi nhận. Seed chạy lại giữ các bản ghi cùng ID và giữ nguyên mật khẩu. Tất cả seed được ghi trong một transaction.

Nếu npm gặp lỗi quyền cache khi tải sqlite3 trên Windows, chạy `npm ci --cache ./storage/npm-cache`.

## Tài khoản seed

| Vai trò | Email |
| --- | --- |
| Admin | admin@vcraft.test |
| Artisan đã duyệt | artisan@vcraft.test |
| Buyer | buyer@vcraft.test |
| Artisan đã duyệt thứ hai | moc@vcraft.test |
| Artisan chờ duyệt | pending@vcraft.test |

Đặt `DEMO_PASSWORD` trong `.env` trước lần seed đầu để chọn mật khẩu, hoặc dùng mật khẩu ngẫu nhiên mà script in ra. Mật khẩu được băm bcrypt, cost 12. Đăng nhập và phân quyền đầy đủ thuộc task 3.1 và 3.2.

Dữ liệu gồm một làng nghề, ba hồ sơ xưởng, sáu sản phẩm, hai lô, sáu mốc nhật ký, một yêu cầu báo giá, hai người nhận, hai chào giá và một bản tin. Tên người, xưởng, giá, tọa độ xưởng và câu chuyện đều là dữ liệu minh họa. Mảng ảnh để trống, nhóm có thể bổ sung ảnh thật khi làm module upload.

## Cấu trúc

```text
database/
  migrations/           Lịch sử thay đổi CSDL
  schema-v1.js          Snapshot lược đồ ban đầu
  seed.js               Dữ liệu Bát Tràng minh họa
src/
  config/               Cấu hình môi trường và dialect
  database/             Lớp Database và transaction
  models/               Các lớp Sequelize.Model và quan hệ
  repositories/         CRUD OOP
  services/             Quy tắc công khai dữ liệu
  controllers/          Nhận request, gọi service, trả JSON hoặc render
  routes/               Khai báo đường dẫn và HTTP method
  middleware/           Xử lý lỗi tập trung
  http/                 Envelope JSON, lỗi HTTP, kiểm tra query
  views/                View EJS mẫu
  app.js                Ghép dependency, không mở cổng
  server.js             Khởi động HTTP server
docs/
  architecture.md       Phân tích nghiệp vụ và sơ đồ kiến trúc
  database.md           ERD và quy ước dữ liệu
  api.md                API đã có và cách tích hợp
tests/                  Kiểm tra foundation bằng CSDL SQLite thực
storage/                SQLite và dữ liệu local, được gitignore
```

## Kiểm tra và thao tác CSDL

```powershell
npm test
npm run db:migrate
npm run db:seed
```

`npm run db:undo` xóa toàn bộ bảng của migration ban đầu cùng dữ liệu bên trong. Chỉ dùng khi chủ động muốn rollback CSDL đó.

Bộ kiểm tra bao phủ migration up/down, seed chạy lại, hash mật khẩu, CRUD, rollback, foreign key, clean URL, lọc/phân trang, nhật ký và các lỗi HTTP. Test dùng SQLite trong bộ nhớ, tách khỏi CSDL local.

Các view hiện là mẫu nối Controller với Service. Giao diện triển lãm hoàn chỉnh thuộc task 2.1, module QR thuộc task 4.4 và xử lý nghiệp vụ báo giá thuộc task 6.1–6.2.
