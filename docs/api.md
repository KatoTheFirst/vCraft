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
