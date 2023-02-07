
# GoFundHer Website Backend Project

# Requirements
- Linux
- Node.js
- Npm
- Nginx
- MySQL
- SSL certification and key files

# Installation

## Connect to AWS EC instance
Using Putty or XShell to connect AWS EC2 instance that the project will be deployed on.

## Clone Code Repository
> git clone git@github.com:gofundher/gofundher-web-backend.git

> cd gofundher-web-backend

> npm install

## Copy build folder from GoFundHer-web-client
- copy build folder from [GoFundHer-web-frontend](https://github.com/gofundher/gofundher-web-frontend "GoFundHer-web-frontend")

## Copy build folder from GoFundHer-web-admin
- copy build folder from [GoFundHer-web-admin](https://github.com/gofundher/gofundher-web-admin "GoFundHer-web-admin") and rename it to admin


## Database
- Create a database named "gofundher" in MySQL Server
- Backup Database
If you have a backup of your database, then you can restore it following command line.
> mysql -h localhost -u root -p gofundher < [backupfile]

## Configure Nginx
Navigate into gofundher-web repository in the server. For example,
> cd /etc/nginx

> sudo nano sites-enabled/default

There, replace with following content

```
server {
    listen [::]:80 default_server;

    server_name gofundher.com

    #root /var/www/example.com;
    #index index.html;

        client_max_body_size 20M;

    location / {
        proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header Host $http_host;
      proxy_set_header X-NginX-Proxy true;

      proxy_pass http://localhost:8000;
      proxy_redirect off;

      proxy_http_version 1.1;
      proxy_set_header Upgrade $http_upgrade;
      proxy_set_header Connection "Upgrade";
      proxy_connect_timeout       500000;
      proxy_send_timeout          500000;
      proxy_read_timeout          500000;
      send_timeout                500000;
    }

        listen 443 ssl;
        ssl_certificate /home/ubuntu/git/ssl/2022/gd_bundle-g2-g1.crt;
        ssl_certificate_key /home/ubuntu/git/ssl/2022/gofundher.com.key;

        if ($scheme = http) {
        return 301 https://$server_name$request_uri;
        }
}

```

Update the crt, key file path.

# Setup firewall
> sudo ufw allow 22

> sudo ufw allow 443

> sudo ufw allow 80

> sudo ufw allow 8000

> sudo ufw enable

> sudo ufw reload

# Running the server
> sudo pm2 start "sudo npm run build"
