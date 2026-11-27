# API JSON v1

Các Route Handler đọc công khai nhận GET hoặc HEAD. GET trả JSON UTF-8. HEAD trả cùng mã trạng thái, không có body. OPTIONS trả 204 và header Allow. Các endpoint chi tiết không nhận query string.

| GET                     | data khi trả 200                                                                                                                                                |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| /api/v1/villages/{slug} | id, slug, name của làng                                                                                                                                         |
| /api/v1/artisans/{slug} | slug, name, story, isOpen, village.name của xưởng công khai                                                                                                     |
| /api/v1/batches/{code}  | code, quantity, qrIssuedAt, product (id, name, category, story, images, artisan.slug, artisan.name, artisan.village.name) và logs gồm title, occurredAt, images |

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

## Sản phẩm và nhật ký sản xuất (4.3)

Mọi endpoint ghi yêu cầu cookie của nghệ nhân có xưởng đã duyệt (APPROVED), body JSON và kiểm tra Origin như trên. Quyền sở hữu sản phẩm/lô/mốc được kiểm tra trong cùng transaction với thao tác ghi. Sản phẩm, lô hoặc mốc của xưởng khác trả 404 như bản ghi không tồn tại.

| Phương thức và URL                   | Đầu vào                                                              | Kết quả                                                  |
| ------------------------------------ | -------------------------------------------------------------------- | -------------------------------------------------------- |
| POST /api/v1/products                | name, category, price (VND, số nguyên ≥ 0), story, images, published | 201, id, name, category, price, story, images, published |
| PUT /api/v1/products/{id}            | Như POST, gửi đủ các trường                                          | 200, sản phẩm sau khi lưu                                |
| POST /api/v1/products/{id}/batches   | quantity (1–1.000.000)                                               | 201, code, quantity, qrIssuedAt. Mã lô do server sinh    |
| POST /api/v1/batches/{code}/logs     | occurredAt (ISO 8601 có múi giờ, không ở tương lai), title, images   | 201, id, occurredAt, title, images                       |
| PUT /api/v1/batches/{code}/logs/{id} | Như POST                                                             | 200, mốc sau khi lưu                                     |

Giới hạn: name 2–120 ký tự, category 1–60, story tối đa 5000, title 2–120. images của sản phẩm tối đa 24 URL, của mốc tối đa 12; URL trùng được gộp. Mỗi URL phải có dạng `/media/{id}/web` lấy từ POST /api/v1/uploads của chính xưởng, với purpose `product` cho sản phẩm và `production-log` cho mốc; sai trả 400.

Mốc của một lô luôn được trả theo `occurredAt` tăng dần, cùng thời điểm thì theo id. Thứ tự này là thứ tự các bước chế tác trên trang chi tiết sản phẩm và trang truy xuất.

Trang công khai `/products/{id}` chỉ hiển thị sản phẩm `published` của xưởng đã duyệt, gồm 20 lô mới nhất và timeline từng lô. Ảnh sản phẩm và ảnh mốc trở thành công khai theo quy tắc ảnh ở trên.

## Mã QR theo lô và trang truy xuất (4.4)

Mỗi lô có một mã duy nhất do server sinh (`BT-` + 10 ký tự hex). Mọi sản phẩm cùng lô in chung một QR. Nội dung QR là `{PUBLIC_APP_URL}/trace/{code}`; thiếu hoặc sai `PUBLIC_APP_URL` thì endpoint tải QR trả 500. Tạo lô sẽ phát hành QR ngay và ghi `qrIssuedAt`.

| Phương thức và URL                            | Đầu vào                           | Kết quả                                                                           |
| --------------------------------------------- | --------------------------------- | --------------------------------------------------------------------------------- |
| GET /api/v1/batches/{code}/qr?format=png\|svg | Cookie nghệ nhân đã duyệt, chủ lô | 200 ảnh PNG 1024 px hoặc SVG để in (tải về). 409 nếu lô chưa phát hành QR         |
| POST /api/v1/batches/{code}/qr                | Cookie nghệ nhân đã duyệt, chủ lô | 200, code, qrIssuedAt, traceUrl. Phát hành QR cho lô cũ; gọi lại giữ mốc đầu tiên |

Lô của xưởng khác trả 404. `format` mặc định là png, giá trị khác trả 400.

Trang công khai `/trace/{code}` và GET /api/v1/batches/{code} dùng chung một truy vấn. Chỉ lô thuộc sản phẩm `published` của xưởng đã duyệt mới hiển thị, ngoài ra trả 404. Trang kể lại hành trình theo thứ tự `occurredAt` kèm ảnh minh chứng từng bước. Có thể thêm route ký `/trace/{code}/{signature}` sau này (B.3) bằng cách render cùng component `TraceView` và nối chữ ký trong `traceUrl`.

## Báo giá mua sỉ (6.1, 6.2)

Dashboard Buyer và Artisan dẫn tới /dashboard/quotes. Tất cả endpoint yêu cầu cookie phiên. Dữ liệu trả về dùng hợp đồng JSON v1.

| Phương thức               | Ý nghĩa                                                                                                                                             |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET /api/v1/quotes?page=1 | Trả items và hasNext, 10 yêu cầu mỗi trang. Buyer xem yêu cầu của mình cùng các báo giá. Nghệ nhân đã duyệt xem lời mời và báo giá của chính xưởng. |
| POST /api/v1/quotes       | Buyer lưu nháp với category, description, quantity, budget (VND hoặc null), deadline (ISO 8601 có múi giờ). Trả 201.                                |
| PATCH /api/v1/quotes/{id} | Gửi JSON gồm action, version hiện tại và dữ liệu bên dưới. Trả id, state, version mới.                                                              |

| action  | Người thực hiện và dữ liệu                                                                                                                                                            |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| edit    | Buyer sở hữu đơn, gửi lại các trường bản nháp.                                                                                                                                        |
| send    | Buyer gửi nháp còn hạn. Hệ thống xác định xưởng đã duyệt có sản phẩm công khai cùng phân loại, so khớp chính xác và bỏ qua hoa thường. Nếu chưa có xưởng phù hợp, giữ đơn ở bản nháp. |
| bid     | Xưởng được mời tạo/sửa đơn giá VND unitPrice, năng lực quantity và ngày hoàn thành completionDate. Lần đầu chuyển đơn sang ARTISANS_BIDDING.                                          |
| accept  | Buyer gửi bidId để chọn một chào giá còn hiệu lực, đủ số lượng của đơn.                                                                                                               |
| start   | Xưởng được chọn chuyển BUYER_ACCEPTED sang IN_PRODUCTION.                                                                                                                             |
| deliver | Xưởng xác nhận đã giao phần được nhận. Đơn chuyển DELIVERED khi tất cả phần đã nhận đều giao đủ.                                                                                      |

Mỗi thay đổi chạy trong transaction và khóa dòng QuoteRequest trước khi đọc trạng thái. Phiên bản cũ hoặc thao tác sai trạng thái trả 409. Client tải lại danh sách để lấy phiên bản mới. Dữ liệu không hợp lệ trả 400, thiếu phiên trả 401, sai quyền trả 403 và đơn không thuộc Buyer trả 404.

## Kiểm duyệt hộ gia đình (7.1, Admin)

Trang `/admin/workshops` (danh sách) và `/admin/workshops/{id}` (chi tiết) chỉ dành cho ADMIN. Chưa đăng nhập bị chuyển về `/login`, vai trò khác về dashboard của mình. Điều hướng chung của khu quản trị nằm ở `src/app/admin/layout.tsx`. Task 7.2 và B.4 thêm link vào đó.

| Phương thức và URL                 | Đầu vào                                                                                              | Kết quả                                                                                                                     |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| GET /api/v1/admin/workshops        | Query `status` (PENDING mặc định, APPROVED, REJECTED, SUSPENDED), `q` (tên xưởng hoặc email), `page` | 200, status, q, page, hasNext, items (20 hồ sơ mỗi trang, cũ nhất trước)                                                    |
| GET /api/v1/admin/workshops/{id}   | —                                                                                                    | 200, hồ sơ đầy đủ: chủ hộ, email, SĐT, làng, lịch sử, câu chuyện, tọa độ, ảnh, chứng nhận, ngày đăng ký, lần duyệt gần nhất |
| PATCH /api/v1/admin/workshops/{id} | JSON `approval`, `version` (đang xem), `reviewNote`                                                  | 200, hồ sơ sau khi cập nhật, version mới                                                                                    |

Bảng chuyển trạng thái (ngoài bảng trả 409):

| Từ        | Sang được           |
| --------- | ------------------- |
| PENDING   | APPROVED, REJECTED  |
| APPROVED  | SUSPENDED           |
| SUSPENDED | APPROVED            |
| REJECTED  | — (quyết định cuối) |

Từ chối (REJECTED) và khóa (SUSPENDED) bắt buộc `reviewNote` từ 5 đến 1000 ký tự, thiếu trả 400. Mỗi lần đổi trạng thái ghi `reviewedById`, `reviewedAt`, `reviewNote` và tăng `version`. Cập nhật chỉ thành công khi hồ sơ vẫn đúng trạng thái và `version` mà admin đang xem. Nếu nghệ nhân vừa lưu hồ sơ (PUT /api/v1/workshop cũng tăng `version`) hoặc admin khác vừa quyết định, API trả 409 và admin cần tải lại. Chỉ hồ sơ thuộc tài khoản ARTISAN được kiểm duyệt. API không đổi vai trò người dùng và không chạm tài khoản Admin. Lỗi: 401 chưa đăng nhập, 403 không phải Admin hoặc Origin lạ, 404 không có hồ sơ.

Quyết định có hiệu lực ở request kế tiếp vì mỗi request đọc lại trạng thái duyệt từ PostgreSQL. Xưởng SUSPENDED/REJECTED không tạo hay sửa sản phẩm, lô, mốc, không chào giá; trang `/artisan/{slug}`, `/products/{id}`, `/trace/{code}` và ảnh công khai của xưởng trả 404. Schema chỉ lưu quyết định gần nhất, chưa có bảng lịch sử duyệt.
