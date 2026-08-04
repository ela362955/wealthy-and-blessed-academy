export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

export const startLogin = async () => {
  const email = window.prompt("請輸入您的 Email，我們會寄送六位數驗證碼");
  if (!email) return;

  const request = await fetch("/api/auth/email/request", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email.trim() }),
  });

  if (!request.ok) {
    window.alert("驗證碼寄送失敗，請確認 Email 或稍後再試。");
    return;
  }

  const code = window.prompt("驗證碼已寄出，請輸入信件中的六位數字");
  if (!code) return;

  const verify = await fetch("/api/auth/email/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email: email.trim(), code: code.trim() }),
  });

  if (!verify.ok) {
    window.alert("驗證碼不正確或已逾期，請重新登入。");
    return;
  }

  window.location.assign("/dashboard");
};
