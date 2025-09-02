require('dotenv').config({ path: '../.env'});
const jwt = require('jsonwebtoken');
const secret = process.env.JWT_SECRET;

function authenticateToken (req, res, next) {
    const authHeader = req.headers['authorization'] || req.headers['Authorization']; // 支持大小写

    console.log('Auth Header:', authHeader); // 日志：检查接收的 header

    const token = authHeader && authHeader.split(' ')[1];

    console.log('Extracted Token:', token); // 日志：检查提取的 token

    if (!token || token.trim() === '') { // 添加 trim 检查空
        return res.status(401).json({ error: 'No valid token provided' });
    }

    jwt.verify(token, secret, (err, user) => {
        console.log('Verify Error:', err); // 日志：验证错误
        console.log('Decoded User:', user); // 日志：解码用户

        if (err) {
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({ error: 'Token expired' });
            }
            return res.status(403).json({ error: 'Invalid token' });
        }
        
        if (user.temp && (req.path === '/verify' || req.path === '/recover')) {
            req.user = user;
            next();
        } else if (!user.temp) {
            req.user = user;
            next();
        } else {
            return res.status(403).json({ error: 'Invalid token type' });
        }
    });
}

module.exports = authenticateToken;