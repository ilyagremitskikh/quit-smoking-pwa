# QuitKit SQLite backup

Run the backup script from cron on the host or from a small sidecar container:

```sh
DATA_DIR=/data BACKUP_DIR=/backup/quitkit BACKUP_KEEP=14 sh server/scripts/backup-sqlite.sh
```

It copies `quitkit.db` plus `quitkit.db-wal` and `quitkit.db-shm` when they exist, then keeps the latest `BACKUP_KEEP` timestamped snapshots.

To restore, stop the app, copy the three files from one snapshot back into `DATA_DIR`, then start the app again.
