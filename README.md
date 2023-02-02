
# GoFundHer Website Project

![](https://pandao.github.io/editor.md/images/logos/editormd-logo-180x180.png)

#Requirements
- Linux
- Node.js
- MySQL
- SSL certification and key files

#Installation

## Connect to AWS EC instance
Using Putty or XShell to connect AWS EC2 instance that the project will be deployed on.

## Clone Code Repository
> git clone git@github.com:gofundher/gofundher-web-backend.git
> cd gofundher-web-backend

## Copy build folder from GoFundHer-web-client
- copy build folder from [GoFundHer-web-frontend](https://github.com/gofundher/gofundher-web-frontend "GoFundHer-web-frontend")

## Database
- Create a database named "gofundher" in MySQL Server
- Backup Database
If you have a backup of your database, then you can restore it following command line.
> mysql -h localhost -u root -p gofundher < [backupfile]

## Setup SSL
Navigate into gofundher-web repository in the server. For example,
> cd /home/ubuntu/gofundher-web
> sudo nano bin/www

There, you can find following lines:

    var server = https.createServer(
        {
          key: fs.readFileSync("/etc/nginx/ssl/2022/gofundher.com.key"),
          cert: fs.readFileSync("/etc/nginx/ssl/2022/gd_bundle-g2-g1.crt"),
        },
        app
      );

Update the crt, key file path.

# Setup firewall
> sudo ufw allow 22
> sudo ufw allow 443
> sudo ufw enable
> sudo ufw reload

# Running the server
> sudo pm2 start "sudo npm run build"
