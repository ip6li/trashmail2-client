Nginx
=====

This is a real life example for a Nginx configuration.

```
user  www-data;
worker_processes  auto;

error_log  /var/log/nginx/error.log;
#error_log  /var/log/nginx/error.log  notice;
#error_log  /var/log/nginx/error.log  info;

pid        /var/run/nginx/nginx.pid;

events {
    worker_connections  1024;
}

http {
    include       mime.types;
    default_type  application/octet-stream;

    log_format  main  '$remote_addr - $remote_user [$time_local] "$request" '
                      '$status $body_bytes_sent "$http_referer" '
                      '"$http_user_agent" "$http_x_forwarded_for"';

    access_log  /var/log/nginx/access.log  main;

    sendfile        on;

    keepalive_timeout  65;

    server_tokens off;

    brotli on;
    brotli_static on;
    brotli_buffers 16 8k;
    brotli_comp_level 6;
    brotli_types *;

    upstream trashmail {
        ip_hash;
        server <your trashmail2-client-ip>:3000;
    }

    map $sent_http_content_type $expires {
        default                       31d;
        text/css                      42d;
        application/javascript        42d;
        application/x-javascript      42d;
        application/ecmascript        42d;
        ~images/                      max;
    }

    # redirect to https
    server {
        listen       80;
        listen       [::]:80;
        server_name  example.com;
        server_name  www.example.com;

	    expires $expires;

        location / {
            rewrite ^(.*)$ https://example.com$1 permanent;
        }

        #error_page  404              /404.html;

        # redirect server error pages to the static page /50x.html
        #
        error_page   500 502 503 504  /50x.html;
        location = /50x.html {
            root   html;
        }

    }

    # HTTPS server
    server {
        listen       443 ssl http2;
        listen       [::]:443 ssl http2;
        server_name  example.com;
        server_name  www.example.com;

	    expires $expires;

        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 10m;
        ssl_prefer_server_ciphers   on;
	    ssl_protocols  TLSv1 TLSv1.1 TLSv1.2 TLSv1.3;

        ssl_ciphers ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-CHACHA20-POLY1305:RSA-PSK-CHACHA20-POLY1305:DHE-PSK-CHACHA20-POLY1305:ECDHE-PSK-CHACHA20-POLY1305:PSK-CHACHA20-POLY1305:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-AES256-GCM-SHA384:DHE-RSA-AES128-GCM-SHA256:DHE-DSS-AES128-GCM-SHA256:kEDH+AESGCM:ECDHE-RSA-AES128-SHA256:ECDHE-ECDSA-AES128-SHA256:ECDHE-RSA-AES128-SHA:ECDHE-ECDSA-AES128-SHA:ECDHE-RSA-AES256-SHA384:ECDHE-ECDSA-AES256-SHA384:ECDHE-RSA-AES256-SHA:ECDHE-ECDSA-AES256-SHA:DHE-RSA-AES128-SHA256:DHE-RSA-AES128-SHA:DHE-DSS-AES128-SHA256:DHE-RSA-AES256-SHA256:DHE-DSS-AES256-SHA:DHE-RSA-AES256-SHA:ECDHE-RSA-DES-CBC3-SHA:ECDHE-ECDSA-DES-CBC3-SHA:AES128-GCM-SHA256:AES256-GCM-SHA384:AES128-SHA256:AES256-SHA256:AES128-SHA:AES256-SHA:AES:CAMELLIA:DES-CBC3-SHA:!aNULL:!eNULL:!EXPORT:!DES:!RC4:!MD5:!PSK:!aECDH:!EDH-DSS-DES-CBC3-SHA:!EDH-RSA-DES-CBC3-SHA:!KRB5-DES-CBC3-SHA;

        ssl_certificate      /etc/letsencrypt/live/example.com/fullchain.pem;
        ssl_certificate_key  /etc/letsencrypt/live/example.com/privkey.pem;

        ssl_stapling on;
        ssl_stapling_verify on;
        ssl_trusted_certificate /etc/letsencrypt/live/example.com/chain.pem;
        resolver_timeout 10s;

        add_header Strict-Transport-Security "max-age=31556926; includeSubDomains; preload" always;

        location @trashmail {
            proxy_pass http://trashmail;
            ## Block Software download user agents ##
            if ($http_user_agent ~* LWP::Simple|BBBike|wget|pycurl) {
                return 403;
            }
        }

        location / {
            proxy_http_version 1.1;

            proxy_set_header Proxy "";
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header Host $http_host;
            proxy_set_header X-NginX-Proxy true;
            proxy_set_header X-Forwarded-Proto https;
            proxy_set_header X-Forwarded-Host $host;
            proxy_set_header X-Forwarded-Server $host;

            proxy_cookie_path / "/; secure";

            proxy_pass http://trashmail;
            proxy_redirect off;

            add_header	Content-Security-Policy	"script-src 'self' 'unsafe-inline' https://cdn.example.com" always;
            add_header	X-Xss-Protection	"1; mode=block" always;
            add_header	Referrer-Policy		"same-origin" always;
            add_header	Feature-Policy		"sync-xhr 'self'" always;
            add_header	Expect-CT   		"max-age=0, report-uri='https://report-uri.example.com/ct/reportOnly'";
        }

    }

    # Cloudflare stuff
    set_real_ip_from 103.21.244.0/22;
    set_real_ip_from 103.22.200.0/22;
    set_real_ip_from 103.31.4.0/22;
    set_real_ip_from 104.16.0.0/12;
    set_real_ip_from 108.162.192.0/18;
    set_real_ip_from 131.0.72.0/22;
    set_real_ip_from 141.101.64.0/18;
    set_real_ip_from 162.158.0.0/15;
    set_real_ip_from 172.64.0.0/13;
    set_real_ip_from 173.245.48.0/20;
    set_real_ip_from 188.114.96.0/20;
    set_real_ip_from 190.93.240.0/20;
    set_real_ip_from 197.234.240.0/22;
    set_real_ip_from 198.41.128.0/17;

    set_real_ip_from 2400:cb00::/32;
    set_real_ip_from 2405:8100::/32;
    set_real_ip_from 2405:b500::/32;
    set_real_ip_from 2606:4700::/32;
    set_real_ip_from 2803:f800::/32;
    set_real_ip_from 2c0f:f248::/32;
    set_real_ip_from 2a06:98c0::/29;

    # use any of the following two
    real_ip_header CF-Connecting-IP;

}
```
