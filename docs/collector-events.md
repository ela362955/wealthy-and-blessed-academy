# 有錢又好命學院 Collector 事件規格

Collector 以 `Authorization: Bearer <COLLECTOR_SECRET>` 驗證，事件入口為 `POST /api/collector/events`。

```json
{
  "version": "1.0",
  "type": "member.upserted",
  "source": "wix",
  "occurredAt": "2026-08-04T00:00:00.000Z",
  "memberEmail": "learner@example.com",
  "externalId": "optional-source-id",
  "payload": {}
}
```

支援來源：`direct`、`wix`、`skool`、`richark`、`csv`、`nextos`。

建議事件名稱：

- `member.upserted`：建立或更新會員。
- `member.login`：會員登入。
- `course.registered`：課程報名完成。
- `course.completed`：課程完成。
- `planner.completed`：完成一份財務規劃。

批次名單可送至 `POST /api/collector/webhooks/:source`，格式為 `{ "members": [...] }`。NextOS 使用 `GET /api/collector/overview`，只會取得去識別化統計，不會取得 Email、電話或財務內容。
