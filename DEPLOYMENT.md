# Production Deployment

## Persistent uploads

Product photos, product variant photos, profile photos, and platform branding
are stored on Laravel's private local disk at `/app/storage/app/private`.
Database rows only retain their relative paths.

For Dokploy or another container platform, mount a persistent volume at:

```text
/app/storage/app/private
```

Every web and worker replica must use the same mounted storage. Without this
volume, replacing a container removes uploaded files while the database paths
remain, and multiple replicas can intermittently return `404` for an image.

After configuring the volume, upload a new product photo and verify its image
URL still returns `200` after a redeploy. Files already lost from an earlier
container must be uploaded again or restored from backup.
