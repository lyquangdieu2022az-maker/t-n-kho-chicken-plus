# Kho Chicken Plus Hậu Nghĩa

Web kiểm tồn kho cho Chicken Plus Hậu Nghĩa.

## Chạy local

```bash
npm install
npm start
```

Mở `http://localhost:4173`.

## Đồng bộ dữ liệu

- Khi chạy local chưa có `DATABASE_URL`, app lưu vào `data/state.json`.
- Khi deploy Render bằng `render.yaml`, app dùng Render PostgreSQL qua `DATABASE_URL`.
- Nếu tài khoản Render đã có database free đang dùng, dùng database đó và đặt `DATABASE_URL` thủ công cho web service.
- App lưu riêng trong bảng `chicken_plus_inventory_state`, không dùng chung bảng với app cũ.
- Sau khi app chạy trên Render, máy tính và điện thoại dùng chung dữ liệu trên server.
- Nếu đã nhập dữ liệu ở `localhost`, dùng nút `Sao lưu` để xuất JSON, mở web Render rồi bấm `Nhập` một lần.

## Deploy Render

Repo có sẵn `render.yaml` để tạo web service và PostgreSQL bằng Render Blueprint.

Nếu dùng database Render có sẵn:

1. Mở database cũ trong Render.
2. Copy `Internal Database URL`.
3. Mở web service `chicken-plus-inventory`.
4. Vào `Environment`, thêm `DATABASE_URL` bằng URL vừa copy.
5. Redeploy web service.

Nếu máy đã có Git/GitHub CLI:

```bash
git init
git add .
git commit -m "Deploy Chicken Plus inventory"
gh repo create chicken-plus-inventory --private --source . --remote origin --push
```

Sau đó vào Render Dashboard, tạo Blueprint từ repo này.
