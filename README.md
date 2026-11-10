<div align="center">

# ⏱️ Chronos

**Ứng dụng desktop theo dõi thời gian, lấy stopwatch làm trung tâm.**
Ghi lại từng phút bạn dành cho các project dài hạn và dự báo ngày bạn sẽ hoàn thành.

![Tauri](https://img.shields.io/badge/Tauri-2-24C8DB?logo=tauri&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)
![Rust](https://img.shields.io/badge/Rust-1.77+-000000?logo=rust&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-local-003B57?logo=sqlite&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-green)

</div>

---

## Mục lục

- [Giới thiệu](#giới-thiệu)
- [Tính năng](#tính-năng)
- [Cài đặt & chạy](#cài-đặt--chạy)
- [Hướng dẫn sử dụng](#hướng-dẫn-sử-dụng)
- [Cách tính dự báo](#cách-tính-dự-báo)
- [Kiến trúc](#kiến-trúc)
- [Cơ sở dữ liệu](#cơ-sở-dữ-liệu)
- [Cấu trúc thư mục](#cấu-trúc-thư-mục)
- [Xuất dữ liệu](#xuất-dữ-liệu)
- [Phát triển](#phát-triển)
- [Lộ trình](#lộ-trình)
- [Giấy phép](#giấy-phép)

## Giới thiệu

Chronos dành cho những ai theo đuổi các mục tiêu dài hơi: học một ngôn ngữ, viết một cuốn sách, ôn thi, xây một side project... Bạn chỉ cần bấm **Play** khi bắt đầu và **Stop** khi dừng. Chronos lo phần còn lại:

- Cộng dồn giờ làm cho từng project và so với số giờ mục tiêu.
- Tính tốc độ làm việc gần đây và **dự báo ngày hoàn thành**.
- Đặt **chỉ tiêu mỗi ngày**, ghi lại **lý do** những hôm không đạt, rồi thống kê xem điều gì cản trở bạn nhiều nhất.

Mọi dữ liệu nằm trong một file SQLite trên máy bạn. Không cần tài khoản, không có cloud, không có telemetry.

## Tính năng

### ⏱️ Timer
- Mỗi project có một timer. **Tại một thời điểm chỉ một timer được chạy**, ràng buộc này được đảm bảo ở tầng cơ sở dữ liệu.
- Khi dừng timer, app hỏi *"vừa làm gì?"* để bạn ghi chú cho session.
- **Phím tắt toàn cục** `Ctrl+Shift+Space` bật/tắt timer gần nhất, kể cả khi cửa sổ đang ẩn.
- **Phát hiện rời máy**: nếu không có thao tác bàn phím/chuột quá 10 phút trong lúc timer chạy, Chronos đưa cửa sổ lên trước và hỏi bạn muốn giữ hay bỏ khoảng thời gian rảnh đó.

### 📁 Project
- Tên, màu (bảng màu thân thiện với người mù màu), số giờ mục tiêu, ngày bắt đầu và hạn chót (tuỳ chọn).
- Thanh tiến độ, giờ đã làm, giờ còn lại và **ngày hoàn thành dự kiến**.
- Mỗi project có **todo list** (kéo thả để sắp xếp) và một **ghi chú** riêng.
- **Kéo thả** thẻ project ở trang chủ để sắp xếp thứ tự.
- Lưu trữ (archive) hoặc xoá vĩnh viễn.

### 📊 Dashboard
- Thời gian hôm nay và **chuỗi ngày liên tục** (streak).
- **Heatmap** 12 tuần gần nhất.
- Báo cáo có 2 tab, xem theo Tuần / Tháng / Năm:
  - **Thời gian**: biểu đồ cột chồng theo project. Bấm vào phần cột của một project để ghi **hôm đó đã làm gì** (có gợi ý từ ghi chú lúc dừng timer).
  - **Nguyên nhân**: tỉ lệ ngày đạt (so với kỳ trước), số ngày chưa đạt và mức hụt trung bình, cùng bảng xếp hạng nguyên nhân kiểu Pareto (theo nhãn hoặc nhóm) làm nổi bật nhóm nguyên nhân chiếm khoảng 80% số lần được ghi.

### 🎯 Chỉ tiêu hằng ngày
- Đặt tổng số phút mỗi ngày và/hoặc mức tối thiểu cho từng project.
- Chỉ tiêu có **lịch sử**: đổi chỉ tiêu hôm nay không làm thay đổi cách đánh giá những ngày đã qua.
- Ngày không đủ thời gian cần đạt có dấu chấm dưới cột trên biểu đồ. Bấm vào để gắn **lý do theo ngày** bằng nhãn (có sẵn như *Mất tập trung*, *Việc đột xuất*, *Ngủ dậy muộn*… hoặc nhãn và nhóm tự tạo), kèm ghi chú nếu cần.
- **Nhắc nhở**: báo những ngày gần đây chưa ghi lý do, và mời tổng kết ngày vào giờ bạn chọn.

### 📈 Thống kê (Insights)
- Xem theo 7 / 30 / 90 ngày hoặc toàn bộ.
- Số ngày đạt trọn chỉ tiêu, số lượt không đạt, tổng số phút còn thiếu.
- Xếp hạng lý do hay gặp nhất và project bị ảnh hưởng nhiều nhất.
- Thống kê theo từng nhóm công việc và các ghi chú gần đây.

### 🗂️ Lịch sử
- Lọc session theo project và khoảng ngày.
- Thêm session thủ công, sửa hoặc xoá session.

### 🖥️ Tích hợp hệ thống
- **Khay hệ thống**: tooltip hiển thị timer đang chạy theo từng giây; menu có Start/Stop nhanh.
- Bấm đóng cửa sổ thì app **thu xuống khay** thay vì thoát. Chọn *Thoát* trong menu khay để tắt hẳn.
- **Khởi động cùng Windows** (chạy ẩn dưới khay).
- **Một phiên bản duy nhất**: mở app lần nữa chỉ đưa cửa sổ đang chạy lên trước.

### 💾 Dữ liệu
- Xuất **JSON** (toàn bộ dữ liệu) hoặc **CSV** (bảng session, UTF-8 BOM để Excel hiển thị đúng tiếng Việt).

## Cài đặt & chạy

### Yêu cầu

| Công cụ | Phiên bản |
|---|---|
| [Node.js](https://nodejs.org/) | 20 trở lên |
| [Rust](https://rustup.rs/) | 1.77.2 trở lên |
| Phụ thuộc hệ thống của Tauri | Xem [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) (trên Windows: Microsoft C++ Build Tools và WebView2) |

### Chạy ở chế độ phát triển

```bash
git clone https://github.com/HieuXiao/chronos.git
```

```bash
cd chronos
```

```bash
npm install
```

```bash
npm run tauri dev
```

Lệnh này khởi động Vite tại `http://localhost:1420` rồi mở cửa sổ Tauri với hot reload.

### Build bản cài đặt

```bash
npm run tauri build
```

File cài đặt trên Windows nằm trong `src-tauri/target/release/bundle/`: `nsis/Chronos_<version>_x64-setup.exe` và `msi/Chronos_<version>_x64_en-US.msi`.

## Hướng dẫn sử dụng

1. **Tạo project**: đặt tên, chọn màu, nhập số giờ mục tiêu (ví dụ 200 giờ cho "Học tiếng Nhật N3").
2. **Bấm Play** khi bắt đầu làm. Bấm **Stop** (hoặc `Ctrl+Shift+Space`) khi dừng, rồi ghi chú ngắn nếu muốn.
3. Sau khoảng **7 ngày** có dữ liệu, thẻ project bắt đầu hiển thị **ngày hoàn thành dự kiến**.
4. Mở **Cài đặt** để đặt chỉ tiêu mỗi ngày và giờ nhắc tổng kết.
5. Cuối ngày, ghi lý do cho các chỉ tiêu chưa đạt. Trang **Thống kê** sẽ cho bạn thấy xu hướng.

### Phím tắt

| Phím | Chức năng |
|---|---|
| `Ctrl+Shift+Space` | Bật/tắt timer gần nhất (hoạt động toàn hệ thống) |

## Cách tính dự báo

```
velocity  = số giờ đã làm trong 14 ngày gần nhất / 14   (tính cả ngày nghỉ)
remaining = target_hours − số giờ đã làm
eta       = hôm nay + ceil(remaining / velocity) ngày
```

Chronos **không** đưa ra ngày dự kiến khi:
- project chưa có giờ mục tiêu,
- đã đạt mục tiêu (hiển thị *Đã hoàn thành*),
- tốc độ bằng 0, hoặc lịch sử ít hơn **7 ngày**. Trong trường hợp này app báo *chưa đủ dữ liệu* thay vì đưa ra một ngày gây hiểu nhầm.

Logic nằm trong [src/lib/forecast.ts](src/lib/forecast.ts).

## Kiến trúc

```
┌──────────────────────────── Frontend (WebView) ───────────────────────────┐
│  React 18 + React Router · Zustand store · Tailwind CSS 4 · Radix UI       │
│                                                                            │
│  pages/ ─ components/ ─ hooks/ ─ lib/ (stats, forecast, goals, insights)   │
│                     │                                                      │
│               db/queries/*  ──►  @tauri-apps/plugin-sql                    │
└─────────────────────┼──────────────────────────────────────────────────────┘
                      │ IPC
┌─────────────────────▼──────────── Backend (Rust / Tauri 2) ───────────────┐
│  tauri-plugin-sql (SQLite + migrations)   tray.rs   (khay, tooltip, menu)  │
│  global-shortcut · autostart · dialog     system.rs (idle time, ghi file)  │
│  single-instance                                                           │
└────────────────────────────────────────────────────────────────────────────┘
```

- **Frontend** truy vấn SQLite trực tiếp qua `tauri-plugin-sql`. Toàn bộ logic nghiệp vụ (thống kê, dự báo, đánh giá chỉ tiêu) là các hàm thuần trong `src/lib/`.
- **Backend Rust** giữ ở mức tối thiểu: đăng ký plugin, chạy migration, quản lý khay hệ thống, đọc thời gian rảnh của hệ điều hành (`GetLastInputInfo` trên Windows) và ghi file xuất.

### Tech stack

| Tầng | Công nghệ |
|---|---|
| Desktop shell | Tauri 2 |
| UI | React 18, TypeScript, Tailwind CSS 4, Radix UI, lucide-react, sonner |
| State | Zustand |
| Kéo thả | dnd-kit |
| Lưu trữ | SQLite qua `tauri-plugin-sql` |
| Build | Vite 7 |

## Cơ sở dữ liệu

File dữ liệu: `data.db` trong thư mục cấu hình của app (trên Windows là `%APPDATA%\chronos\data.db`).

| Bảng | Mô tả |
|---|---|
| `projects` | Project: tên, màu, giờ mục tiêu, ngày bắt đầu/kết thúc, trạng thái lưu trữ, thứ tự hiển thị (`order_index`) |
| `sessions` | Các phiên làm việc. `ended_at = NULL` nghĩa là timer đang chạy |
| `todos` | Todo theo project, có thứ tự |
| `notes` | Một ghi chú cho mỗi project |
| `daily_goals` | Lịch sử chỉ tiêu ngày (`project_id = NULL` là chỉ tiêu tổng) |
| `miss_reasons` | Có `project_id`: hôm đó đã làm gì cho project. `project_id` và `group_id` đều `NULL`: lý do ngày chưa đạt |
| `reason_labels`, `reason_label_links` | Nhãn lý do (2 cấp: nhóm → nhãn) và nhãn gắn với từng lý do |
| `settings` | Cài đặt dạng key/value |

**Quy ước thời gian**
- Mốc thời gian (`started_at`, `created_at`…) luôn lưu ở dạng **ISO 8601 UTC**. Chỉ đổi sang giờ địa phương khi hiển thị.
- Ngày lịch (`start_date`, `effective_from`, `day`…) lưu ở dạng `YYYY-MM-DD` theo **ngày địa phương** của người dùng.

Migration nằm trong [src/db/migrations/](src/db/migrations/) và được đăng ký ở [src-tauri/src/db.rs](src-tauri/src/db.rs).

## Cấu trúc thư mục

```
chronos/
├── src/                      # Frontend React
│   ├── pages/                # Home, History, Insights
│   ├── components/
│   │   ├── dashboard/        # Dashboard, heatmap, biểu đồ hoạt động
│   │   ├── goals/            # Chỉ tiêu ngày, dialog tổng kết
│   │   ├── history/          # Dialog sửa/thêm session
│   │   ├── layout/           # TopBar, Settings, Export
│   │   ├── projects/         # Dialog project, tiến độ
│   │   ├── sidebar/          # Todo list, ghi chú
│   │   ├── timers/           # Thẻ timer, dialog idle/stop
│   │   └── ui/               # Component nền (shadcn/Radix)
│   ├── db/
│   │   ├── migrations/       # File .sql
│   │   └── queries/          # Truy vấn theo từng bảng
│   ├── hooks/                # Idle watcher, tích hợp hệ thống, nhắc nhở...
│   ├── lib/                  # Logic thuần: stats, forecast, goals, insights, export
│   ├── store/                # Zustand store (app + UI)
│   └── types/
└── src-tauri/                # Backend Rust
    └── src/
        ├── lib.rs            # Đăng ký plugin, xử lý vòng đời cửa sổ
        ├── db.rs             # Khai báo migration
        ├── tray.rs           # Khay hệ thống
        └── system.rs         # Thời gian rảnh, ghi file
```

## Xuất dữ liệu

Từ menu **Xuất** trên thanh trên cùng:

- **JSON**: toàn bộ project, session, todo và ghi chú, kèm `formatVersion` để dùng cho việc nhập lại sau này.
- **CSV**: bảng session với các cột `id, project_id, project_name, started_at, ended_at, duration_sec, duration_hours, note, source`.

## Phát triển

| Lệnh | Mô tả |
|---|---|
| `npm run tauri dev` | Chạy app với hot reload |
| `npm run dev` | Chỉ chạy frontend Vite (các API của Tauri sẽ không hoạt động) |
| `npm run typecheck` | Kiểm tra kiểu TypeScript |
| `npm run build` | Build frontend vào `dist/` |
| `npm run tauri build` | Build bản cài đặt |

**Thêm migration mới**
1. Tạo file `src/db/migrations/00N_ten_migration.sql`.
2. Thêm một `Migration { version: N, ... }` vào [src-tauri/src/db.rs](src-tauri/src/db.rs).
3. Không sửa migration đã phát hành. Mọi thay đổi schema đều đi qua migration mới.

**Lưu ý nền tảng**: phát hiện thời gian rảnh hiện chỉ hỗ trợ Windows. Trên macOS/Linux hàm này trả về `0`, nên dialog rời máy sẽ không xuất hiện.

## Lộ trình

- [ ] Phát hiện thời gian rảnh trên macOS và Linux
- [ ] Nhập lại dữ liệu từ file JSON
- [ ] Tuỳ chỉnh phím tắt toàn cục
- [ ] Giao diện sáng (light theme)

## Giấy phép

Phát hành theo giấy phép [MIT](LICENSE) © 2026 Ngo Minh Hieu.
