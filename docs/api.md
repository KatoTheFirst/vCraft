# API vCraft phiên bản 1

Base URL local là `http://127.0.0.1:3000/api/v1`. Endpoint dưới đây đã được triển khai và dùng dữ liệu CSDL. Các endpoint hiện tại đọc dữ liệu công khai.

## Hợp đồng JSON

Thành công dùng HTTP 200.

```json
{
  "status": "success",
  "message": "Thành công",
  "data": { "items": [], "pagination": { "page": 1, "limit": 20, "total": 0, "total_pages": 0 } }
}
```

Lỗi trả status error, thông báo tiếng Việt và data null hoặc chi tiết validation.

```json
{
  "status": "error",
  "message": "Không tìm thấy sản phẩm.",
  "data": null
}
```

| HTTP code | Ý nghĩa |
| --- | --- |
| 200 | GET thành công |
| 400 | JSON hoặc URL sai cú pháp |
| 404 | Route hoặc dữ liệu công khai không tồn tại |
| 405 | Method không hỗ trợ, kèm header Allow |
| 409 | Unique, foreign key hoặc optimistic lock xung đột |
| 413 | JSON body lớn hơn 1 MB |
| 422 | Tham số hoặc dữ liệu sai định dạng |
| 500 | Lỗi nội bộ, nội dung trả về ẩn stack và SQL |
| 503 | Health check không truy cập được CSDL hoặc chưa migrate |

Khi nhóm thêm endpoint ghi, dùng helper success với 201 cho tạo mới, 200 cho cập nhật/xóa có JSON và HttpError cho các lỗi nghiệp vụ. Các mã 409 được middleware hỗ trợ, sẽ xuất hiện trên HTTP khi có endpoint ghi dữ liệu.

## Endpoint đã triển khai

| Method | Đường dẫn | Query | data |
| --- | --- | --- | --- |
| GET | /health | — | service, database |
| GET | /villages | — | Mảng làng nghề |
| GET | /categories | — | Mảng phân loại |
| GET | /artisans | page, limit, village_id, is_open | items và pagination |
| GET | /artisans/:slug | — | Hồ sơ xưởng công khai |
| GET | /products | page, limit, artisan_id, category_id, q | items và pagination |
| GET | /products/:slug | — | Sản phẩm, artisan, category |
| GET | /batches/:code | — | Lô, product, artisan và mảng logs |
| GET | /news | page, limit, village_id | items và pagination |

`page` mặc định 1, `limit` mặc định 20 và tối đa 100. `*_id` là UUID. `is_open` nhận chuỗi true hoặc false. `q` dài 1–100 ký tự, hỗ trợ Unicode và từ chối wildcard %, _ hoặc dấu gạch chéo ngược. Các danh sách phân trang từ chối query lạ và query lặp. Tìm kiếm dùng so khớp LIKE theo collation của CSDL, khả năng phân biệt hoa/thường phụ thuộc dialect.

Mảng artisans có latitude, longitude, is_open, workshop_name và slug để nhóm dựng pin bản đồ. Danh mục chỉ trả xưởng approved, user artisan active và sản phẩm published. Truy xuất lô áp dụng cùng quy tắc công khai. Tin cộng đồng chỉ trả bản tin đã có published_at và thời điểm công bố đã đến.

## URL web đã triển khai

| URL | Chức năng |
| --- | --- |
| / | Trang dẫn tới dữ liệu mẫu |
| /artisan/xuong-gom-an-nhien | Render hồ sơ xưởng qua Controller và Service |
| /trace/BT-2026-001 | Render nhật ký lô theo thời gian |

Express trực tiếp xử lý clean URL. Khi dùng reverse proxy, chuyển các đường dẫn này về tiến trình Node. Các View EJS là mẫu tích hợp để nhóm tiếp tục thiết kế.

## Mẫu fetch cho danh mục

```javascript
async function loadProducts({ artisanId, categoryId, keyword, page = 1 }) {
  const query = new URLSearchParams({ page: String(page), limit: '20' });
  if (artisanId) query.set('artisan_id', artisanId);
  if (categoryId) query.set('category_id', categoryId);
  if (keyword) query.set('q', keyword);
  const response = await fetch(`/api/v1/products?${query}`);
  const result = await response.json();
  if (!response.ok) throw new Error(result.message);
  return result.data;
}
```

Khi cập nhật DOM, dùng textContent cho tên và câu chuyện. Chỉ dùng các URL ảnh đã được module upload xác thực.

## Hướng tích hợp các task tiếp theo

Đăng ký route mới trong src/routes, tổ chức handler vào Controller riêng, nghiệp vụ trong Service và dữ liệu qua Repository. Các module xác thực, quản lý hồ sơ, upload, QR và báo giá cần tự khai báo endpoint khi triển khai. Route ghi cần middleware xác thực và phân quyền trước Controller. Model và seed hiện có để nhóm dùng chung hợp đồng dữ liệu từ đầu.
