# Đưa vCraft lên Supabase PostgreSQL

[Dashboard Supabase của vCraft](https://supabase.com/dashboard/project/wnnfshywubkycmiihjvh)

Bộ cài dành cho một project Supabase mới, tương ứng ba migration hiện tại. Trang web tiếp tục xác thực bằng cookie của Next.js và truy cập PostgreSQL bằng Prisma ở server.

1. Trong Supabase, mở **SQL Editor**, chạy toàn bộ [01-schema.sql](01-schema.sql) một lần. File tạo 13 bảng, khóa ngoại, index, ràng buộc số lượng và trigger đồng bộ phân bổ. RLS được bật cho cả 13 bảng. Quyền trực tiếp của hai role trình duyệt được thu hồi.
2. Muốn nạp triển lãm minh họa, chạy [02-bat-trang-data.sql](02-bat-trang-data.sql) sau khi bước 1 thành công. Muốn bắt đầu với dữ liệu vận hành của nhóm, chỉ chạy bước 1. File dữ liệu chạy trong một transaction, gặp ID trùng sẽ rollback. Làng có slug `bat-trang` được tái sử dụng.
3. Chạy [03-verify.sql](03-verify.sql). Với bộ mẫu đầy đủ, các cột kiểm tra vi phạm đều bằng 0, mỗi trạng thái báo giá có 120 đơn và cả 13 bảng phải có RLS.
4. Trong **Connect**, lấy URL Session pooler cổng 5432 (hoặc Direct connection nếu máy hỗ trợ IPv6). Đặt URL vào biến server `DATABASE_URL` của môi trường triển khai, dùng TLS và URL-encode ký tự đặc biệt trong mật khẩu. Backend cần kết nối bằng role sở hữu các bảng hoặc role backend được cấp quyền phù hợp với RLS. Dùng profile môi trường Supabase riêng khi chạy Prisma CLI. Với serverless, có thể dùng Transaction pooler cho runtime; giữ URL Direct/Session cho lệnh migration. [Supabase và Prisma](https://supabase.com/docs/guides/database/prisma)
5. Khi cài schema bằng SQL Editor, ghi nhận baseline một lần từ thư mục dự án bằng các lệnh dưới đây với `DATABASE_URL` **đang trỏ đúng project Supabase**. Giữ Data API tắt khi ứng dụng chỉ dùng Prisma, kể cả khi Prisma tạo bảng lịch sử migration. [Cấu hình Data API](https://supabase.com/docs/guides/api/securing-your-api)

```sh
npx prisma migrate resolve --applied 202611240001_foundation
npx prisma migrate resolve --applied 202611240002_auth_workshop
npx prisma migrate resolve --applied 202611240003_project_database
npx prisma migrate status
```

Từ lần nâng cấp kế tiếp dùng `npm run db:migrate` với migration mới. File 01 là bản cài mới và sẽ báo lỗi nếu đối tượng vCraft đã tồn tại. Nếu database đích đã chạy các migration cũ, dùng luồng nâng cấp Prisma của repo và áp dụng phần bật RLS, thu hồi quyền ở cuối file 01 trước khi mở quyền truy cập.

## Dữ liệu cho buổi demo

Mốc mô phỏng là ngày 24/11/2026. Có 1 ban quản lý, 24 chủ xưởng và 240 người mua. Trong 24 xưởng có 20 xưởng đã duyệt, 2 đang chờ, 1 bị khóa và 1 bị từ chối. Tên người, tọa độ ghim, lịch sử xưởng, giá VND và giao dịch đều được tạo cho bài tập. Email dùng miền dành cho thử nghiệm; tài khoản mẫu có passwordHash bằng NULL. Người dùng thử luồng đăng nhập tự đăng ký qua ứng dụng. Tài khoản quản trị thực tế được cấp riêng theo quy trình của nhóm.

Danh mục gồm trà cụ, đồ bàn ăn, bình hoa, cốc và tách, gốm trang trí, chậu cây, đồ gia dụng. Mỗi lô có sáu mốc từ luyện đất đến phân loại thành phẩm. Có thể mở `/artisan/bat-trang-01` và `/trace/BT-2025-01-010-1`. Đơn đã chốt được chia cho hai xưởng theo tỷ lệ 2/3 và 1/3. Đơn đang sản xuất có tiến độ dở dang, đơn đã giao có đủ sản lượng.

Ảnh và chứng nhận cần file thật. Các mảng ảnh ban đầu rỗng; tải ảnh qua chức năng upload của ứng dụng để tạo metadata và thumbnail hợp lệ. Phiên đăng nhập và bộ đếm giới hạn đăng nhập được sinh bởi lưu lượng thật. Supabase ở đây lưu PostgreSQL; backend ảnh hiện tại vẫn cần volume bền vững theo README chính.
