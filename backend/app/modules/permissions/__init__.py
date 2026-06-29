"""Module Permissions — vai trò (Role) & quyền (Permission) cho RBAC.

Liệt kê toàn bộ quyền, CRUD vai trò và gán permission cho từng vai trò.
Quyền theo định dạng "subject.action" (vd users.index), được chuyển thành
abilities cho CASL phía frontend qua core.abilities.
"""
