"use client";
import { useState } from "react";
import Link from "next/link";
export function AccountForm({ register = false }: { register?: boolean }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <section className="panel">
      <h1>{register ? "Tạo tài khoản" : "Đăng nhập"}</h1>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const values = Object.fromEntries(new FormData(e.currentTarget));
          setBusy(true);
          setMessage("");
          try {
            const r = await fetch(
              "/api/v1/auth/" + (register ? "register" : "login"),
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(values),
              },
            );
            const body = await r.json();
            if (!r.ok) throw new Error(body.message);
            location.assign(register ? "/login?registered=1" : "/dashboard");
          } catch (error) {
            setMessage(
              error instanceof Error ? error.message : "Không thể kết nối.",
            );
            setBusy(false);
          }
        }}
      >
        {register && (
          <>
            <label>
              Họ và tên
              <input
                name="name"
                autoComplete="name"
                required
                minLength={2}
                maxLength={100}
              />
            </label>
            <label>
              Số điện thoại
              <input
                name="phone"
                type="tel"
                autoComplete="tel"
                placeholder="0912345678"
                required
              />
            </label>
            <label>
              Loại tài khoản
              <select name="role">
                <option value="BUYER">Khách hàng</option>
                <option value="ARTISAN">Nghệ nhân đăng ký mở xưởng</option>
              </select>
            </label>
          </>
        )}
        <label>
          Email
          <input name="email" type="email" autoComplete="email" required />
        </label>
        <label>
          Mật khẩu
          <input
            name="password"
            type="password"
            autoComplete={register ? "new-password" : "current-password"}
            minLength={register ? 10 : 1}
            required
          />
        </label>
        {register && (
          <small>Ít nhất 10 ký tự, gồm chữ và số, tối đa 72 byte.</small>
        )}
        <button disabled={busy}>
          {busy ? "Đang xử lý…" : register ? "Đăng ký" : "Đăng nhập"}
        </button>
        <p role="status">{message}</p>
      </form>
      <Link href={register ? "/login" : "/register"}>
        {register ? "Đã có tài khoản? Đăng nhập" : "Tạo tài khoản mới"}
      </Link>
    </section>
  );
}
