const jwt = require('jsonwebtoken');

const middleware = async (req, res, next) => {
  try {
    // Extract the token from the Authorization header
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
    
    if (!authHeader) {
      return res.status(401).send({ success: false, message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).send({ success: false, message: 'Invalid token format' });
    }

    // Verify the token
    jwt.verify(token, process.env.JWT_SECRET_KEY, (err, decode) => {
      if (err) {
        return res.status(401).send({ success: false, message: 'Auth failed' });
      } else {
        req.body.userId = decode.id; // Attach the decoded user ID to the request
        next();
      }
    });
  } catch (error) {
    console.log(error.message);
    return res.status(401).send({ success: false, message: 'Auth failed' });
  }
};

module.exports = middleware;
