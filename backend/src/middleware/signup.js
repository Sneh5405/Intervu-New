const z = require("zod");
const prisma = require("../config/prisma");

const signupMiddleware = async (req, res, next) => {
    console.log(">>> LOADED SIGNUP MIDDLEWARE V3 - WITH PRISMA IMPORT <<<");
    console.log("Signup Middleware: Processing request");
    const { email, password, name, role } = req.body;
    if (!email || !password || !name || !role) {
        return res.status(400).json({ message: "All fields are required" });
    }
    const emailSchema = z.string().email();

    try {
        emailSchema.parse(email)
    } catch (err) {
        return res.status(400).json({
            message: "Invalid email format"
        })
    }

    try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (user) {
            return res.status(400).json({ message: "User already exists" });
        }
        next();
    } catch (err) {
        console.error("Middleware Prisma Error:", err);
        return res.status(500).json({ message: "Internal Server Error checking user" });
    }
}

module.exports = signupMiddleware;