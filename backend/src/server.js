const prisma = require("./config/prisma")

prisma.$connect()
  .then(() => console.log("Neon DB connected"))
  .catch(err => console.error(err))
