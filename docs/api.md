# API JSON v1

Các Route Handler đọc công khai nhận GET hoặc HEAD. GET trả JSON UTF-8. HEAD trả cùng mã trạng thái, không có body. OPTIONS trả 204 và header Allow. Các endpoint chi tiết không nhận query string.

| GET                     | data khi trả 200                                                   |
| ----------------------- | ------------------------------------------------------------------ |
| /api/v1/villages/{slug} | id, slug, name của làng                                            |
| /api/v1/artisans/{slug} | slug, name, story, isOpen, village.name của xưởng công khai        |
| /api/v1/batches/{code}  | code, quantity, product.name và logs gồm title, occurredAt, images |

Slug gồm chữ thường ASCII, chữ số, phân tách bằng dấu gạch ngang. Mã lô chấp nhận chữ ASCII, số, gạch ngang và gạch dưới. Giới hạn 100 ký tự. Thời điểm nhật ký là ISO 8601 UTC.

```json
{
  "status": "success",
  "message": "Thành công",
  "data": { "id": "demo", "slug": "bat-trang", "name": "Làng gốm Bát Tràng" }
}
```

Lỗi dùng cùng ba trường với status bằng error và data bằng null. Tham số sai trả 400, bản ghi thiếu, chưa công khai hoặc URL API v1 không tồn tại trả 404. POST, PATCH, PUT và DELETE trả 405 kèm Allow. Lỗi nội bộ trả 500 với thông báo chung.

```js
const response = await fetch("/api/v1/batches/BATCH-001");
const result = await response.json();
if (!response.ok) throw new Error(result.message);
console.log(result.data.logs);
```

Các trang HTML tương ứng là /artisan/{slug} và /trace/{code}. Trang gọi trực tiếp service trên server.

## Xác thực, phân quyền và hồ sơ

| Phương thức và URL         | Đầu vào                                                                                | Kết quả                                                   |
| -------------------------- | -------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| POST /api/v1/auth/register | JSON name, email, phone, password, role (BUYER hoặc ARTISAN)                           | 201 và role. Nghệ nhân có xưởng PENDING                   |
| POST /api/v1/auth/login    | JSON email, password                                                                   | 200 và role, đặt cookie phiên HttpOnly                    |
| POST /api/v1/auth/logout   | Cookie phiên                                                                           | 200, thu hồi phiên trên server                            |
| GET /api/v1/workshop       | Cookie nghệ nhân                                                                       | 200, hồ sơ của chính người dùng và version                |
| PUT /api/v1/workshop       | name, story, familyHistory, latitude, longitude, isOpen, images, certificates, version | 200, hồ sơ mới. Gửi hai tọa độ cùng nhau hoặc cả hai null |
| POST /api/v1/uploads       | multipart/form-data với purpose và trường files lặp lại                                | 201, mảng id, url, thumbnailUrl, width, height, bytes     |
| GET /media/{id}/{variant}  | variant bằng web hoặc thumb                                                            | Ảnh WebP hoặc 404                                         |

Login và register giới hạn 10 lượt mỗi email mỗi thao tác trong cửa sổ 15 phút (429). Cookie hết hạn sau 7 ngày, SameSite=Lax, Secure ở production. API ghi từ trình duyệt kiểm tra Origin. Xử lý lỗi theo hợp đồng JSON, gồm 400 dữ liệu sai, 401 thiếu phiên hoặc sai đăng nhập, 403 thiếu quyền, 409 trùng tài khoản hoặc hồ sơ đã thay đổi, 413 quá dung lượng và 415 sai loại nội dung.

Upload nhận 1–6 JPEG, PNG hoặc WebP tĩnh, tối đa 5 MiB và 24 megapixel mỗi ảnh. WebP hiển thị tối đa 1600 px, thumbnail 320 px, giữ tỷ lệ. Purpose nhận workshop, certificate, product hoặc production-log. Lưu url vào đúng trường ảnh của đối tượng sở hữu. Ảnh chưa gắn chỉ chủ xưởng xem được. Công khai ảnh khi gắn vào hồ sơ đã duyệt hoặc sản phẩm/lô công khai thuộc đúng xưởng.

Module sản phẩm và chào giá gọi workshopId(true) ngay trên server trước khi thực hiện thao tác nghiệp vụ, kiểm tra quyền sở hữu đối tượng trong transaction khi ghi. Module quản trị duyệt xưởng cập nhật ArtisanProfile.approval. Mỗi yêu cầu đọc lại vai trò và trạng thái duyệt từ PostgreSQL. API artisans/{slug} bổ sung familyHistory, latitude, longitude, images và certificates.
