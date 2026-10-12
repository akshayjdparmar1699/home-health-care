# Yours Home Healthcare: Live (Production) Setup Guide

Ye guide batati hai ki **domain + server (VPS) + database** lene ke baad project ko live kaise karna hai.
Har step order me karo. Commands copy-paste kar sakte ho; jahan `yourdomain.com`, passwords etc. likha hai wahan apna daalo.

> Example me **Ubuntu 24.04 VPS** liya hai (DigitalOcean, Hostinger VPS, AWS Lightsail, Contabo kuch bhi).
> Shared hosting (cPanel) ke liye end me alag section hai.

---

## 0. Kya chahiye (pehle se)

| Cheez | Kya lena hai | Note |
|---|---|---|
| **Domain** | jaise `yourshomehealthcare.com` | GoDaddy / Hostinger / Namecheap |
| **Server (VPS)** | Ubuntu 24.04, **2 GB RAM**, 1-2 CPU, 40 GB disk | Isi server pe website + database dono chalenge |
| **Database** | MySQL 8 (server pe hi install karenge) | Alag paid database ki zaroorat nahi |
| **GitHub repo** | Project push ho chuka ho | `.env`, `vendor`, `node_modules`, `public/build`, staff documents GitHub pe **nahi** jaate (ye sahi hai) |

**HTTPS (SSL) zaroori hai.** Iske bina ye cheezein kaam nahi karengi: app install (PWA), phone notifications, GPS location, selfie camera.
SSL free hai (Let's Encrypt), step 10 me lagayenge.

---

## 1. Domain ko server se jodo (DNS)

Domain ke DNS settings me ye 2 record banao (server ka IP hosting dashboard me milega):

| Type | Name | Value |
|---|---|---|
| A | `@` | `SERVER_IP` |
| A | `www` | `SERVER_IP` |

DNS lagne me 5 minute se kuch ghante lag sakte hain. Check: `ping yourdomain.com` me server ka IP aana chahiye.

---

## 2. Server me login aur basic setup

Apne computer ke terminal se:

```bash
ssh root@SERVER_IP
```

Server pe:

```bash
apt update && apt upgrade -y
timedatectl set-timezone Asia/Kolkata

# Firewall: sirf SSH, HTTP, HTTPS khula rahe
ufw allow OpenSSH
ufw allow 'Nginx Full' 2>/dev/null || true
ufw --force enable
```

---

## 3. Zaroori software install karo

```bash
# Web server + PHP 8.3 (Laravel 13 ke liye) + extensions
apt install -y nginx git unzip curl software-properties-common
apt install -y php8.3-fpm php8.3-cli php8.3-mysql php8.3-mbstring php8.3-xml \
               php8.3-curl php8.3-zip php8.3-bcmath php8.3-intl php8.3-gd php8.3-gmp

# MySQL database
apt install -y mysql-server

# Composer (PHP packages)
curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer

# Node.js 22 (frontend build ke liye, Vite 8 ko Node 20.19+ chahiye)
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs

# Free SSL ke liye
apt install -y certbot python3-certbot-nginx

# Firewall me Nginx allow (ab nginx install ho gaya)
ufw allow 'Nginx Full'
```

Check:

```bash
php -v        # PHP 8.3.x
composer -V
node -v       # v22.x
mysql --version
```

---

## 4. Database banao

```bash
mysql_secure_installation     # sab "Y", strong root password
mysql -u root -p
```

MySQL ke andar (password apna strong rakho):

```sql
CREATE DATABASE yourshome CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'yourshome'@'localhost' IDENTIFIED BY 'StrongPassword@123';
GRANT ALL PRIVILEGES ON yourshome.* TO 'yourshome'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

---

## 5. Code GitHub se server pe lao

```bash
mkdir -p /var/www && cd /var/www
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git yourshome
cd /var/www/yourshome
```

> Private repo hai to GitHub password ki jagah **Personal Access Token** maangega
> (GitHub → Settings → Developer settings → Personal access tokens), ya server ki SSH key ko repo me **Deploy key** bana do.

---

## 6. `.env` file banao (sabse important)

```bash
cp .env.example .env
nano .env
```

Ye values set karo (baaki jaisi hain waisi rehne do):

```dotenv
APP_NAME="Yours Home Healthcare"
APP_ENV=production
APP_DEBUG=false
APP_URL=https://yourdomain.com
APP_TIMEZONE=Asia/Kolkata

LOG_CHANNEL=stack
LOG_LEVEL=error

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=yourshome
DB_USERNAME=yourshome
DB_PASSWORD="StrongPassword@123"

SESSION_DRIVER=database
CACHE_STORE=database
QUEUE_CONNECTION=sync
FILESYSTEM_DISK=local
```

**Dhyan rahe:**
- `APP_ENV=production` zaroori hai: isse demo staff / demo clients **nahi** banenge.
- `APP_DEBUG=false` zaroori hai: warna error me passwords dikh sakte hain.
- `APP_URL` me **https** aur apna domain. Phone notifications isi se chalte hain.
- `.env` kabhi GitHub pe mat daalna.

---

## 7. Project install karo

```bash
cd /var/www/yourshome

composer install --no-dev --optimize-autoloader
npm ci
npm run build

php artisan key:generate            # SIRF pehli baar
php artisan migrate --force         # saari tables banengi
php artisan db:seed --force         # sirf admin account banega (production me demo data nahi)
php artisan optimize                # config, routes, views cache

# Laravel ko storage me likhne ki permission
chown -R www-data:www-data storage bootstrap/cache
chmod -R 775 storage bootstrap/cache
```

**Admin login jo banega:**
- Email: `admin@homecare.com` (ya mobile `9999999999`)
- Password: `admin123`

**Live hote hi ye password badalna hai** (step 12).

---

## 8. PHP upload settings

Staff registration me selfie aur Aadhaar photo upload hoti hai:

```bash
nano /etc/php/8.3/fpm/php.ini
```

Ye lines dhoondh ke badlo:

```ini
upload_max_filesize = 8M
post_max_size = 16M
memory_limit = 256M
max_execution_time = 60
```

```bash
systemctl restart php8.3-fpm
```

---

## 9. Nginx (website) setup

```bash
nano /etc/nginx/sites-available/yourshome
```

Ye poora paste karo (`yourdomain.com` badal ke):

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    root /var/www/yourshome/public;
    index index.php;

    client_max_body_size 16M;
    charset utf-8;

    # Service worker hamesha fresh mile (app update turant pahunche)
    location = /sw.js {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        try_files $uri =404;
    }

    # Build files (JS/CSS) lambe time cache
    location /build/ {
        add_header Cache-Control "public, max-age=31536000, immutable";
        try_files $uri =404;
    }

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/run/php/php8.3-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
    }

    location ~ /\.(?!well-known).* {
        deny all;
    }
}
```

Enable karo:

```bash
ln -s /etc/nginx/sites-available/yourshome /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t                  # "syntax is ok" aana chahiye
systemctl reload nginx
```

Ab `http://yourdomain.com` pe login page dikhna chahiye.

---

## 10. SSL (HTTPS) lagao: free

```bash
certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

- Email daalo, terms accept karo.
- "Redirect HTTP to HTTPS" pucche to **Yes (2)** chuno.
- SSL apne aap har 90 din me renew hota hai. Check: `certbot renew --dry-run`

Ab site **https://yourdomain.com** pe chalegi.

---

## 11. Scheduler (duty reminders) chalu karo

Staff ko "duty start karo" ka reminder har minute check hota hai. Iske liye cron:

```bash
crontab -u www-data -e
```

Sabse neeche ye line add karo:

```cron
* * * * * cd /var/www/yourshome && php artisan schedule:run >> /dev/null 2>&1
```

Check (1-2 minute baad):

```bash
cd /var/www/yourshome && php artisan schedule:list
```

---

## 12. Live hone ke baad pehla kaam (zaroori)

1. **https://yourdomain.com/admin/login** kholo, `admin@homecare.com` / `admin123` se login karo.
2. **Settings → Change password**: naya strong password set karo.
3. **Settings → Business details**: naam, address, phone, GSTIN, Bank/UPI details (ye bill pe chhapte hain).
4. 🔔 ghanti → **"Turn on phone / desktop alerts"** (duty end aur payment approval ke notifications).
5. Phone pe admin panel kholo → **Install app** (home screen pe app).
6. **Staff ko link do:** `https://yourdomain.com/staff`
   - Naya staff yahan se **Register as staff** karega, aap **Applications** me approve karoge.
7. Staff ko bolo: app install kare aur **Earnings → Turn on** se notifications chalu kare.

**Links yaad rakho:**

| Kiske liye | Link |
|---|---|
| Owner / Admin | `https://yourdomain.com/admin` |
| Staff app | `https://yourdomain.com/staff` |
| Naya staff registration | `https://yourdomain.com/register` |

---

## 13. (Optional) Local computer ka data server pe le jana

Agar abhi tak ka asli data (staff, clients, duties) bhi live pe chahiye.

**Local computer pe:**

```bash
mysqldump -u waveland -p home_care_local > yourshome.sql
tar -czf private-files.tar.gz -C storage/app private      # staff documents + selfies
scp yourshome.sql private-files.tar.gz root@SERVER_IP:/root/
```

**Server pe** (step 7 ke `migrate` / `db:seed` ki jagah ye karo):

```bash
cd /var/www/yourshome
mysql -u yourshome -p yourshome < /root/yourshome.sql
tar -xzf /root/private-files.tar.gz -C storage/app
php artisan migrate --force          # agar koi nayi migration baaki ho
chown -R www-data:www-data storage
php artisan optimize
```

> Demo staff (Priya, Rahul, Neha, Amit, Sneha) bhi aa jayenge. Live pe nahi chahiye to admin panel se delete kar dena.

---

## 14. Naya code live karna (har update pe)

Local pe code badla → GitHub pe push kiya → server pe:

```bash
cd /var/www/yourshome
php artisan down                         # maintenance page
git pull origin main
composer install --no-dev --optimize-autoloader
npm ci && npm run build
php artisan migrate --force
php artisan optimize:clear && php artisan optimize
chown -R www-data:www-data storage bootstrap/cache
systemctl reload php8.3-fpm
php artisan up
```

Isko ek file me bhi rakh sakte ho: `nano /root/deploy.sh` → upar ki lines paste → `chmod +x /root/deploy.sh` → aage se bas `/root/deploy.sh`.

> `.env` badalne ke baad hamesha: `php artisan optimize:clear && php artisan optimize`

---

## 15. Backup (roz automatic)

Database + staff documents ka roz raat 2 baje backup, 14 din tak rakhna:

```bash
mkdir -p /root/backups
crontab -e
```

Ye line add karo (password apna):

```cron
0 2 * * * mysqldump -u yourshome -p'StrongPassword@123' yourshome | gzip > /root/backups/db-$(date +\%F).sql.gz && tar -czf /root/backups/files-$(date +\%F).tar.gz -C /var/www/yourshome/storage/app private && find /root/backups -mtime +14 -delete
```

Kabhi-kabhi backup apne computer pe bhi download kar lo:
`scp root@SERVER_IP:/root/backups/db-YYYY-MM-DD.sql.gz .`

---

## 16. Problem aaye to

| Problem | Kya karo |
|---|---|
| **500 Server Error** | `tail -50 /var/www/yourshome/storage/logs/laravel.log` me asli error dekho |
| **Blank page / "Vite manifest" error** | `npm ci && npm run build` |
| **Permission denied (storage)** | `chown -R www-data:www-data storage bootstrap/cache && chmod -R 775 storage bootstrap/cache` |
| **Photo upload pe "413 Too Large"** | Step 8 (php.ini) aur Nginx me `client_max_body_size 16M` check karo |
| **.env badla par asar nahi** | `php artisan optimize:clear && php artisan optimize` |
| **Phone notification nahi aate** | Site **https** pe ho, `.env` me `APP_URL=https://...`, user ne app me "Turn on" kiya ho |
| **GPS location nahi aati** | Sirf https pe chalti hai; phone me Location ON aur browser permission allow |
| **Duty reminder nahi aate** | Step 11 ka cron check: `crontab -u www-data -l`, `php artisan schedule:list` |
| **Login ke baad turant logout** | Server time sahi ho (`timedatectl`), `APP_URL` sahi domain |
| **Database connect error** | `.env` me `DB_*` sahi ho; `mysql -u yourshome -p yourshome` se login check |

---

## 17. Shared hosting (cPanel / Hostinger shared) pe

VPS ki jagah shared hosting lo to:

1. PHP version **8.3** select karo (cPanel → Select PHP Version), extensions: `intl, gd, bcmath, gmp, mbstring, pdo_mysql, zip`.
2. cPanel → **MySQL Databases** se database + user banao.
3. Code ko `public_html` ke **bahar** rakho (jaise `~/yourshome`), aur domain ka **Document Root** `~/yourshome/public` set karo.
4. Terminal (SSH) hai to step 7 ki commands chalao. Node nahi hai to `npm run build` **apne computer pe** chala ke `public/build` folder upload karo.
5. cPanel → **Cron Jobs** me har minute: `cd ~/yourshome && php artisan schedule:run >> /dev/null 2>&1`
6. cPanel → **SSL/TLS Status** se free SSL (AutoSSL) on karo.

### Hostinger (hPanel) Premium / Business ke liye khaas baatein

- **PHP:** hPanel → Advanced → **PHP Configuration** → version **8.3**; "PHP extensions" me `intl, gd, gmp, bcmath, fileinfo` on; "PHP options" me `upload_max_filesize = 8M`, `post_max_size = 16M`.
- **SSH:** hPanel → Advanced → **SSH Access** → Enable. Login: `ssh -p 65002 uXXXXXXX@SERVER_IP` (port aur user hPanel me dikhega). Composer wahan pehle se hota hai.
- **Code ki jagah:** project ko `~/domains/yourdomain.com/yourshome` me rakho, phir `public_html` ko Laravel ke `public` folder se jodo:
  ```bash
  cd ~/domains/yourdomain.com
  mv public_html public_html_old
  ln -s yourshome/public public_html
  ```
- **Build:** Premium me Node nahi hai, isliye apne computer pe `npm run build` chala ke `public/build` folder upload karo (File Manager ya `scp`).
- **Cron (duty reminders):** hPanel → Advanced → **Cron Jobs** → "Custom" → har minute (`* * * * *`), command me **sirf ye** (bina `cd`, `&&`, `>>` ke, kyunki Hostinger cron shell nahi chalata):
  ```
  /usr/bin/php /home/uXXXXXXX/domains/yourdomain.com/yourshome/artisan schedule:run
  ```
  (`uXXXXXXX` apna hPanel username. Path SSH me `pwd` se mil jayega.)
- **Daily DB backup** (Premium me sirf weekly backup hai): Cron Jobs me roz raat 2 baje (`0 2 * * *`):
  ```
  /usr/bin/php /home/uXXXXXXX/domains/yourdomain.com/yourshome/artisan db:backup
  ```
  Ya hPanel → **Backups** se kabhi bhi manual backup download karo.
- **SSL:** hPanel → Security → **SSL** → Install (free). Phir "Force HTTPS" on.

---

## Final checklist ✅

- [ ] Domain ka A record server IP pe
- [ ] PHP 8.3 + extensions, MySQL, Node 22, Composer installed
- [ ] Database + user bana
- [ ] `.env`: `APP_ENV=production`, `APP_DEBUG=false`, `APP_URL=https://...`, DB details
- [ ] `composer install`, `npm run build`, `key:generate`, `migrate`, `db:seed`, `optimize`
- [ ] `storage` aur `bootstrap/cache` ki permission `www-data`
- [ ] Nginx config + `nginx -t` OK
- [ ] SSL (https) laga
- [ ] Scheduler cron (`schedule:run` har minute)
- [ ] Backup cron
- [ ] Admin password badla, Business details bhare
- [ ] Admin + staff ne notifications "Turn on" kiye
