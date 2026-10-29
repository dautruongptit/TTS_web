# tts-web

Giao diện React cho dự án TTS (xem `../CLAUDE.md` ở thư mục gốc để biết bối cảnh và quy ước).

## Stack
- React 19, Vite 8, TypeScript (strict), Tailwind CSS v4 (`@tailwindcss/vite`), pnpm.
- Không router, không UI lib. Gọi API bằng `fetch` tới đường dẫn tương đối `/api/...`.

## Lệnh
- `pnpm dev` – dev server cổng 8020, proxy `/api` sang `http://localhost:8010` (đổi bằng `API_PROXY_TARGET`).
- `pnpm build` – build ra `dist/` (Dockerfile đưa vào nginx).
- `pnpm typecheck` – `tsc --noEmit`.

## Cấu trúc `src/`
- `components/` – component dùng chung, nhỏ.
- `api/` – client gọi `/api/...` (thêm khi nối backend).
- `hooks/` – hook (polling job, danh sách giọng...).
- `App.tsx`, `main.tsx`, `index.css` – entrypoint.

## Quy tắc
- Không hard-code domain/port; không bao giờ gọi thẳng vieneu-service.
- Global CSS đặt trong `@layer base` nếu là style cho phần tử.
