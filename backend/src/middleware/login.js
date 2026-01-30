const z = require("zod");

const loginMiddleware = (req, res, next) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
    }

    const emailSchema = z.string().email();

    try {
        emailSchema.parse(email);
        next();
    } catch (err) {
        return res.status(400).json({ message: "Invalid email format" });
    }
}

module.exports = loginMiddleware;
