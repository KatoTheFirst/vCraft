# vCraft · Làng gốm Bát Tràng

Nền tảng cho triển lãm xưởng gốm, truy xuất lô sản xuất và điều phối đơn mua sỉ. Ba task 1.1–1.3 thiết lập kiến trúc, dữ liệu và định tuyến. Phạm vi từng lần phát triển theo sheet **Requirements Tracker** trong bảng chia task Nhóm 9.

## Chạy local

Dùng Node.js 22.12+ và một database PostgreSQL riêng đã tạo cho dự án. Chép `.env.example` thành `.env`, đặt `DATABASE_URL` bằng chuỗi kết nối của môi trường hiện tại. Với dịch vụ cloud, dùng tùy chọn TLS và pool theo hướng dẫn của nhà cung cấp.

```sh
npm ci
npm run db:migrate
npm run db:seed
npm run dev
```

Truy cập `/artisan/xuong-gom-demo`, `/trace/BATCH-001` hoặc `/api/v1/villages/bat-trang`. Seed thêm dữ liệu minh họa trong transaction, giữ nguyên các bản ghi đã có. Ba tài khoản demo dùng cho liên kết dữ liệu. Để bật đăng nhập cho các tài khoản demo local, đặt DEMO_PASSWORD trước khi seed. Script chỉ đặt mật khẩu cho các tài khoản demo chưa có mật khẩu.

## Kiểm tra và triển khai

Chạy `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`. Để kiểm tra tích hợp, trỏ `TEST_DATABASE_URL` tới PostgreSQL kiểm thử riêng đã migrate và seed rồi chạy lại `npm test`. Khi triển khai, cấp `DATABASE_URL` riêng cho từng môi trường, cài dependency, chạy migration trong release job, build và chạy `npm start`. Seed chỉ dành cho phát triển/kiểm thử.

Xem [kiến trúc và dữ liệu](docs/architecture.md) và [hợp đồng API](docs/api.md).

## Tài khoản và xưởng

Trước khi chạy ứng dụng, đặt SESSION_SECRET thành một giá trị ngẫu nhiên riêng cho môi trường, tối thiểu 32 ký tự (có thể sinh bằng lệnh bên dưới). Dùng HTTPS trong production. Trang /register nhận khách hàng hoặc nghệ nhân. Tài khoản quản trị chỉ được cấp qua quy trình quản trị. Trang /login dẫn đến dashboard theo vai trò. Xưởng mới chờ duyệt có thể hoàn thiện hồ sơ.

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
```

Ảnh được lưu bên ngoài public, metadata nằm trong PostgreSQL. Khi phát triển, mặc định dùng .vcraft-media. Khi triển khai, đặt MEDIA_STORAGE_DIR tới đường dẫn tuyệt đối của volume bền vững, có quyền ghi cho tiến trình ứng dụng. Các instance phải dùng chung volume và sao lưu cùng CSDL. Đặt giới hạn request ở reverse proxy đủ cho multipart tối đa 30 MiB cộng 64 KiB. Máy chủ serverless chỉ có ổ tạm cần backend lưu trữ bền vững trước khi bật upload.

Để chạy kiểm thử HTTP, khởi động app với database kiểm thử riêng, thư mục ảnh kiểm thử riêng và SESSION_SECRET, rồi chạy npm test với TEST_DATABASE_URL trỏ cùng database và TEST_BASE_URL trỏ tới app đó. Bài kiểm thử tạo tài khoản và ảnh riêng cho từng lần chạy.
