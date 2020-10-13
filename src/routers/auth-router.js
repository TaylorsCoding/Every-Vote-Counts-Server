const express = require("express");
const AuthService = require("../services/auth-service");
const UsersService = require("../services/users-service");

// const JWTAuth = require("../middleware/jwt-auth");

const authRouter = express.Router();
const jsonBodyParser = express.json();

authRouter.post("/login", jsonBodyParser, (req, res, next) => {
  const { user_name, password } = req.body;
  const loginUser = { user_name, password };

  for (const [key, value] of Object.entries(loginUser))
    if (value == null)
      return res.status(400).json({
        error: `Missing '${key}' in request body`,
      });

  AuthService.getUserWithUserName(req.app.get("db"), loginUser.user_name)
    .then((dbUser) => {
      if (!dbUser)
        return res.status(400).json({
          error: "Incorrect user_name or password",
        });
      return AuthService.comparePasswords(
        loginUser.password,
        dbUser.password
      ).then((compareMatch) => {
        if (!compareMatch)
          return res.status(400).json({
            error: "Incorrect user_name or password",
          });

        // The following code makes a JWT from the user information,
        // which is later used to verify if tokens sent from the client are valid
        const sub = dbUser.user_name;
        const payload = { user_id: dbUser.id };
        res.send({
          authToken: AuthService.createJwt(sub, payload),
        });
      });
    })
    .catch(next);
});

// This is the route that the client sends to the server every time the app
// is started.
authRouter.get("/users/:token", (req, res, next) => {
  const token = req.params.token;
  const username = AuthService.verifyJwt(token).sub;

  // JWTAuth.requireAuth(req, res, next);

  AuthService.getUserWithUserName(req.app.get("db"), username)
    .then((user) => {
      if (!user) {
        return res.status(400).json({
          error: "Stored token does not match any user.",
        });
      }
      res.send({
        user: UsersService.serializeUser(user),
      });
    })
    .catch(next);
});

module.exports = authRouter;
