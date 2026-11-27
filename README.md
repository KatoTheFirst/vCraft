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

Ảnh tải lên nhưng không gắn vào hồ sơ xưởng, sản phẩm hay mốc sản xuất nào sẽ nằm lại trong `MEDIA_STORAGE_DIR`. Dọn bằng:

```sh
npm run media:cleanup                     # chạy thử: chỉ liệt kê ảnh không dùng quá 7 ngày
npm run media:cleanup -- --days 30        # đổi ngưỡng tuổi ảnh
npm run media:cleanup -- --apply          # xóa thật: bản ghi MediaAsset và hai file web/thumb
```

Tuổi ảnh tính theo thời gian sửa file vì `MediaAsset` không lưu ngày tạo. Ảnh còn được tham chiếu trong `ArtisanProfile.images`, `ArtisanProfile.certificates`, `Product.images` hoặc `ProductionLog.images` không bao giờ bị xóa. Script dùng `DATABASE_URL` và `MEDIA_STORAGE_DIR` của môi trường hiện tại. Chỉ chạy khi thư mục ảnh thuộc đúng database đó; nếu nhiều database dùng chung một thư mục, ảnh của database kia sẽ bị coi là không dùng. Khi module mới thêm trường ảnh, cập nhật `referencedIds` trong `src/services/media-cleanup.ts`.

Để chạy kiểm thử HTTP, khởi động app với database kiểm thử riêng, thư mục ảnh kiểm thử riêng và SESSION_SECRET, rồi chạy npm test với TEST_DATABASE_URL trỏ cùng database và TEST_BASE_URL trỏ tới app đó. Bài kiểm thử tạo tài khoản và ảnh riêng cho từng lần chạy.

## Cơ sở dữ liệu Bát Tràng

Schema chính nằm trong [prisma/schema.prisma](prisma/schema.prisma). Chạy `npm run db:migrate` trên database cần cài đặt hoặc nâng cấp, sau đó chạy `npm run db:seed` cho môi trường phát triển. Lịch sử migration bao gồm khóa ngoại, index và các trigger kiểm soát tổng phân bổ khi nhiều xưởng cùng nhận một đơn.

| Phân hệ                   | Bảng và dữ liệu                                                                                                                                                   |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tài khoản                 | User, LoginSession, AuthAttempt lưu ba vai trò, phiên và bộ đếm giới hạn đăng nhập                                                                                |
| Xưởng, bản đồ, kiểm duyệt | CraftVillage, ArtisanProfile, MediaAsset lưu làng, vị trí ghim, trạng thái mở cửa, nội dung xưởng, ảnh, chứng nhận và quyết định duyệt gần nhất                   |
| Triển lãm và QR           | Product, ProductionBatch, ProductionLog lưu danh mục, mã lô duy nhất, ngày cấp QR, thời điểm và ảnh từng công đoạn                                                |
| Mua sỉ và điều phối       | QuoteRequest, QuoteRecipient, QuoteBid lưu quy cách, số lượng, ngân sách dự kiến (VND), thời hạn, hộ được mời, giá chào và số lượng nhận/sản xuất/đã giao theo hộ |
| Bảng tin                  | CommunityNews lưu tác giả, bài viết, thời điểm công khai và cờ ghim                                                                                               |

Mỗi ghim lấy tọa độ từ hồ sơ xưởng. Mỗi tem QR dùng mã lô; module QR ghi qrIssuedAt khi phát hành. Chữ ký QR có thể tính từ mã lô và khóa bí mật phía server. Dashboard thống kê trực tiếp từ các bảng nghiệp vụ. Dữ liệu cũ được gán thời gian migration cho các cột thời gian mới bắt buộc.

Khi chốt số lượng, cập nhật các QuoteBid của cùng đơn trong một transaction. PostgreSQL kiểm tra tổng phân bổ ≤ số lượng đặt và số đã giao ≤ số đã sản xuất ≤ số đã nhận ≤ năng lực chào. Trigger ghi version của đơn khi thêm bid hoặc cập nhật số lượng nhận. Service cần kiểm tra version trước khi ghi và lấy lại version sau transaction. Sáu bước chuyển trạng thái và quyền của người thao tác thuộc module báo giá.

Seed bổ sung một đơn mua sỉ 500 cốc, hai xưởng được mời, hai báo giá và một tin ghim. Tọa độ xưởng demo là dữ liệu minh họa.
