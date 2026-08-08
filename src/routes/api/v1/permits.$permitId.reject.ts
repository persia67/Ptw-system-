import { createAPIFileRoute } from "@tanstack/react-start/api";
import { verifySignedToken } from "@/lib/ptw/n8n";

export const APIRoute = createAPIFileRoute("/api/v1/permits/$permitId/reject")({
  GET: async ({ request, params }) => {
    return handleRejection({ request, permitId: params.permitId });
  },
  POST: async ({ request, params }) => {
    return handleRejection({ request, permitId: params.permitId });
  },
});

async function handleRejection({ request, permitId }: { request: Request; permitId: string }) {
  const url = new URL(request.url);
  const token =
    url.searchParams.get("token") ||
    request.headers.get("Authorization")?.replace("Bearer ", "") ||
    "";

  const { valid, roleTitle } = verifySignedToken(token, permitId);

  if (!valid && process.env.NODE_ENV === "production") {
    return new Response(
      JSON.stringify({
        success: false,
        error: "توکن امنیتی عدم تایید/رد نامعتبر است یا منقضی شده است",
      }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }

  const htmlResponse = `
    <!DOCTYPE html>
    <html lang="fa" dir="rtl">
      <head>
        <meta charset="utf-8">
        <title>رد مجوز PTW</title>
        <style>
          body { font-family: sans-serif; background: #f4f6f8; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
          .card { background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); text-align: center; max-width: 480px; }
          .icon { font-size: 48px; color: #dc2626; margin-bottom: 12px; }
          h2 { margin: 0 0 10px; color: #0f172a; }
          p { color: #475569; font-size: 14px; line-height: 1.6; }
          .btn { display: inline-block; margin-top: 15px; padding: 10px 20px; background: #475569; color: white; border-radius: 6px; text-decoration: none; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon">❌</div>
          <h2>عدم تایید و رد مجوز ثبت گردید</h2>
          <p>
            رد مجوز توسط <strong>${roleTitle || "مسئول مربوطه"}</strong> برای پرمیت شماره <code>${permitId}</code> ثبت گردید و وضعیت مجوز به حالت <strong>ردشده (rejected)</strong> تغییر یافت.
          </p>
          <a href="/permits/${permitId}" class="btn">مشاهده جزئیات در سامانه</a>
        </div>
      </body>
    </html>
  `;

  return new Response(htmlResponse, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
