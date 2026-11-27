"use client";
export default function AdminError({ reset }: { reset: () => void }) {
  return (
    <section role="alert">
      <h1>Không tải được trang quản trị</h1>
      <p>Có lỗi khi đọc dữ liệu. Thử lại, nếu vẫn lỗi hãy báo kỹ thuật.</p>
      <button type="button" onClick={reset}>
        Thử lại
      </button>
    </section>
  );
}
