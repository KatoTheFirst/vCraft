import { AccountForm } from "@/components/account-form";
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ registered?: string }>;
}) {
  return (
    <>
      {(await searchParams).registered === "1" && (
        <p role="status">Đã tạo tài khoản. Bạn có thể đăng nhập.</p>
      )}
      <AccountForm />
    </>
  );
}
