"""Module Organizations — cây tổ chức (đại lý/CTV nhiều cấp).

Quản lý tổ chức dạng cây (cha–con), gán người dùng vào tổ chức.
Dùng cho mô hình multi-tenant: request mang header X-Organization-Id
để giới hạn dữ liệu theo tổ chức hiện hành.
"""
