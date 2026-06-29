"""Chuyển permission dạng "subject.action" thành abilities cho CASL (frontend).

Ví dụ: "users.index" -> {action: "index", subject: "User"}.
Frontend (Vue CASL / React) dùng abilities để ẩn/hiện nút theo quyền.
"""


def permissions_to_abilities(permissions: list[str]) -> list[dict[str, str]]:
    abilities: list[dict[str, str]] = []
    for perm in permissions:
        if "." not in perm:
            continue
        subject_raw, action = perm.split(".", 1)
        # users -> User, post-categories -> PostCategory
        subject = "".join(part.capitalize() for part in subject_raw.replace("_", "-").split("-"))
        # bỏ "s" số nhiều đơn giản
        if subject.endswith("s"):
            subject = subject[:-1]
        abilities.append({"action": action, "subject": subject})
    return abilities
