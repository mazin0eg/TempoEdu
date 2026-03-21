FROM alpine:3.20

RUN apk add --no-cache mongodb-tools tzdata bash

COPY backup.sh /usr/local/bin/backup.sh
COPY crontab /etc/crontabs/root

RUN chmod +x /usr/local/bin/backup.sh && touch /var/log/cron.log

CMD ["crond", "-f", "-l", "8"]
