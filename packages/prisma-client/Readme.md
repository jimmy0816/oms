# .env 吃不到的時候
 $env:DATABASE_URL="postgresql://username:postgrespassword@localhost:5433/newoms"; npx prisma migrate dev