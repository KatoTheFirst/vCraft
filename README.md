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

Truy cập `/artisan/xuong-gom-demo`, `/trace/BATCH-001` hoặc `/api/v1/villages/bat-trang`. Seed thêm dữ liệu minh họa trong transaction, giữ nguyên các bản ghi đã có. Ba tài khoản demo dùng cho liên kết dữ liệu. Chức năng đăng nhập thuộc task 3.1.

## Kiểm tra và triển khai

Chạy `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`. Để kiểm tra tích hợp, trỏ `TEST_DATABASE_URL` tới PostgreSQL kiểm thử riêng đã migrate và seed rồi chạy lại `npm test`. Khi triển khai, cấp `DATABASE_URL` riêng cho từng môi trường, cài dependency, chạy migration trong release job, build và chạy `npm start`. Seed chỉ dành cho phát triển/kiểm thử.

Xem [kiến trúc và dữ liệu](docs/architecture.md) và [hợp đồng API](docs/api.md).
