"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
export function Logout() {
  const router = useRouter();
  const [failed, setFailed] = useState(false);
  return (
    <>
      <button
        onClick={async () => {
          try {
            const r = await fetch("/api/v1/auth/logout", { method: "POST" });
            if (!r.ok) throw new Error();
            router.replace("/login");
            router.refresh();
          } catch {
            setFailed(true);
          }
        }}
      >
        Đăng xuất
      </button>
      {failed && (
        <span role="alert">Đăng xuất thất bại. Vui lòng thử lại.</span>
      )}
    </>
  );
}
