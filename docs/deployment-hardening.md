# Production Hardening Checklist (DigitalOcean Droplet)

This checklist is designed for TempoEdu on Ubuntu 22.04/24.04 with Docker.

## 1) Initial Server Setup

1. Create a non-root sudo user.
2. Disable password login for SSH; use key auth only.
3. Keep OS up to date:

```bash
sudo apt update && sudo apt -y upgrade
sudo apt -y install ufw fail2ban
```

## 2) UFW Firewall

Allow only SSH, HTTP, HTTPS.

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status verbose
```

If you run SSH on a custom port, allow it before enabling UFW.

## 3) SSH Hardening

Edit `/etc/ssh/sshd_config`:

```text
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
ChallengeResponseAuthentication no
UsePAM yes
X11Forwarding no
MaxAuthTries 3
ClientAliveInterval 300
ClientAliveCountMax 2
```

Then restart SSH:

```bash
sudo systemctl restart ssh
```

## 4) Fail2ban

Create `/etc/fail2ban/jail.local`:

```ini
[sshd]
enabled = true
port = ssh
logpath = %(sshd_log)s
backend = systemd
maxretry = 5
findtime = 10m
bantime = 1h
```

Apply:

```bash
sudo systemctl enable fail2ban
sudo systemctl restart fail2ban
sudo fail2ban-client status sshd
```

## 5) Docker Security + Reliability

1. Keep Docker/Compose up to date.
2. Use `docker-compose.prod.yml` only for production.
3. Keep secrets in `.env.prod` on the server; never commit it.
4. Use least privilege users in containers (already configured for backend).
5. Use health checks and restart policy (already configured).
6. Monitor logs and disk usage regularly.

## 6) HTTPS (Strongly Recommended)

Use Caddy or Nginx + Certbot for TLS termination.

1. Point your domain A record to droplet IP.
2. Terminate TLS at reverse proxy.
3. Set `CORS_ORIGIN` to your HTTPS domain in `.env.prod`.

## 7) Backup + Recovery

Daily Mongo backups are created by `mongo-backup` service into `mongobackups` volume.

Check backups:

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml exec mongo-backup ls -lah /backups
```

Copy backup to host:

```bash
docker cp $(docker compose --env-file .env.prod -f docker-compose.prod.yml ps -q mongo-backup):/backups ./mongo-backups
```

Restore example:

```bash
# from a backup archive file on host
docker compose --env-file .env.prod -f docker-compose.prod.yml exec -T mongo mongorestore --archive --gzip --drop < ./mongo-backups/mongo-YYYYMMDD-HHMMSS.archive.gz
```

## 8) Operational Checklist

1. Check health: `docker compose --env-file .env.prod -f docker-compose.prod.yml ps`
2. Review logs: `docker compose --env-file .env.prod -f docker-compose.prod.yml logs --tail=200`
3. Update app: pull latest code and run compose up with build.
4. Reboot test once after setup to confirm auto restart works.

