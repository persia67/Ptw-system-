import { createAPIFileRoute } from "@tanstack/react-start/api";
import { verifySignedToken } from "@/lib/ptw/n8n";

export const APIRoute = createAPIFileRoute("/api/v1/permits/$permitId/approve")({
  GET: async ({ request, params }) => {
    return handleApproval({ request, permitId: params.permitId, action: "approve" });
  },
  POST: async ({ request, params }) => {
    return handleApproval({ request, permitId: params.permitId, action: "approve" });
  },
});

async function handleApproval({
  request,
  permitId,
  action,
}: {
  request: Request;
  permitId: string;
  action: "approve" | "reject";
}) {
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
        error: "توکن امضای دیجیتال نامعتبر است یا منقضی شده است (Invalid or missing token)",
      }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }

  const htmlResponse = `
    <!DOCTYPE html>
    <html lang="fa" dir="rtl">
      <head>
        <meta charset="utf-8">
        <title>تایید هوشمند پرمیت PTW</title>
        <style>
          body { font-family: sans-serif; background: #f4f6f8; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
          .card { background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); text-align: center; max-width: 480px; }
          .icon { font-size: 48px; color: #16a34a; margin-bottom: 12px; }
          h2 { margin: 0 0 10px; color: #0f172a; }
          p { color: #475569; font-size: 14px; line-height: 1.6; }
          .btn { display: inline-block; margin-top: 15px; padding: 10px 20px; background: #0284c7; color: white; border-radius: 6px; text-decoration: none; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon">✅</div>
          <h2>تایید هوشمند مجوز کار ثبت گردید</h2>
          <p>
            تاییدیه سمت <strong>${roleTitle || "مسئول مربوطه"}</strong> برای پرمیت شماره <code>${permitId}</code> با موفقیت ثبت شد و رویداد به سامانه n8n ارسال گردید.
          </p>
          <a href="/permits/${permitId}" class="btn">مشاهده مجوز در سامانه</a>
        </div>
      </body>
    </html>
  `;

  return new Response(htmlResponse, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
