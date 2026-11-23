import { verifyToken } from "../utils/jwt.js";
export function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({
            success: false,
            message: "Unauthorized",
        });
        return;
    }
    const token = authHeader.slice("Bearer ".length).trim();
    if (!token) {
        res.status(401).json({
            success: false,
            message: "Unauthorized",
        });
        return;
    }
    try {
        const payload = verifyToken(token);
        if (!payload.userId) {
            res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
            return;
        }
        req.userId = payload.userId;
        next();
    }
    catch {
        res.status(401).json({
            success: false,
            message: "Unauthorized",
        });
    }
}
