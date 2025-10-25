Room Infor

This folder contains a simple management page and Firestore service for exam room information.

Schema for each room document (fields used by the UI):

- examDate: string (YYYY-MM-DD) — Ngày thi
- subject: string — Tên môn học
- examSession: string — Ca thi
- examTime: string — Thời gian
- examRoom: string — Phòng
- examLink: string — Link phòng (URL to group/room)

Files:
- RoomInforManagement.jsx — basic admin UI to list, add, edit, delete room records.
- roomInforService.js (in src/firebase) — Firestore CRUD for collection `room_infor`.

Notes:
- The management UI subscribes to realtime updates from Firestore.
- `examDate` is stored as a plain string (YYYY-MM-DD) for simplicity; you can adapt to Timestamp if needed.
