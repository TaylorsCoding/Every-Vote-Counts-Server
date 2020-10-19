const express = require("express");
const path = require("path");
const UsersService = require("../services/users-service");
const AuthService = require("../services/auth-service");

const usersRouter = express.Router();
const jsonBodyParser = express.json();

usersRouter.post("/", jsonBodyParser, (req, res, next) => {
  for (const field of ["full_name", "user_name", "password"])
    if (!req.body[field])
      return res.status(400).json({
        error: `Missing '${field}' in request body`,
      });

  const { password, user_name, full_name } = req.body;

  const passwordError = UsersService.validatePassword(password);
  if (passwordError) return res.status(400).json({ error: passwordError });

  UsersService.hasUserWithUserName(req.app.get("db"), user_name)
    .then((hasUserWithUserName) => {
      if (hasUserWithUserName)
        return res.status(400).json({ error: `Username already taken` });

      return UsersService.hashPassword(password).then((hashedPassword) => {
        const newUser = {
          user_name,
          password: hashedPassword,
          full_name,
          date_created: "now()",
        };

        return UsersService.insertUser(req.app.get("db"), newUser).then(
          (user) => {
            return UsersService.deleteAllAddresses(
              req.app.get("db"),
              user.user_name
            ).then((user) => {
              res
                .status(201)
                .location(path.posix.join(req.originalUrl, `/${user.id}`))
                .json(UsersService.serializeUser(user));
            });
          }
        );
      });
    })
    .catch(next);
});

usersRouter.post("/saveaddress", jsonBodyParser, (req, res, next) => {
  if (!req.body["address"])
    return res.status(400).json({
      error: `Missing address in request body`,
    });
  if (!req.body["user_name"])
    return res.status(400).json({
      error: `Cannot save address if not logged in.`,
    });

  const { address } = req.body;

  const user_name = AuthService.verifyJwt(req.body.user_name).sub;

  AuthService.getUserWithUserName(req.app.get("db"), user_name)
    .then((user) => {
      if (!user) {
        return res.status(400).json({
          error:
            "Stored token does not match any user. Must be logged in to save address.",
        });
      }
      UsersService.insertAddress(req.app.get("db"), user_name, address).then(
        (user) => {
          UsersService.getUserById(req.app.get("db"), user).then((user) => {
            res.send({ user: UsersService.serializeUser(user[0]) });
          });
        }
      );
    })
    .catch(next);
});

usersRouter.delete("/addresses", jsonBodyParser, (req, res, next) => {
  const user_name = AuthService.verifyJwt(req.body.user_name).sub;

  AuthService.getUserWithUserName(req.app.get("db"), user_name).then((user) => {
    if (!user) {
      return res.status(400).json({
        error:
          "Stored token does not match any user. Must be logged in to save address.",
      });
    }
    UsersService.deleteAllAddresses(req.app.get("db"), user_name).then(
      (user) => {
        UsersService.getUserById(req.app.get("db"), user).then((user) => {
          res.send({ user: UsersService.serializeUser(user[0]) });
        });
      }
    );
  });
});

usersRouter.delete("/address", jsonBodyParser, (req, res, next) => {
  const user_name = AuthService.verifyJwt(req.body.user_name).sub;
  const address = req.body.address;

  AuthService.getUserWithUserName(req.app.get("db"), user_name).then((user) => {
    if (!user) {
      return res.status(400).json({
        error:
          "Stored token does not match any user. Must be logged in to save address.",
      });
    }
    console.log(user);
    UsersService.getAddresses(req.app.get("db"), user_name).then(
      (addresses) => {
        const changed = addresses[0].addresses;

        for (let i = 0; i < changed.length; i++) {
          if (changed[i] === address) {
            changed.splice(i, 1);
            break;
          }
        }

        UsersService.updateAddresses(
          req.app.get("db"),
          user_name,
          changed
        ).then((user) => {
          UsersService.getUserById(req.app.get("db"), user).then((user) => {
            res.send({ user: UsersService.serializeUser(user[0]) });
          });
        });
      }
    );
  });
});

module.exports = usersRouter;
