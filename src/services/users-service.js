const xss = require("xss");
const bcrypt = require("bcryptjs");
const knex = require("knex");

const REGEX_UPPER_LOWER_NUMBER_SPECIAL = /(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&])[\S]+/;

const UsersService = {
  getUserById(db, user_id) {
    return db("votersdb_users")
      .where("id", user_id)
      .select("*")
      .then((user) => user);
  },
  hasUserWithUserName(db, user_name) {
    return db("votersdb_users")
      .where({ user_name })
      .first()
      .then((user) => !!user);
  },
  insertUser(db, newUser) {
    return db
      .insert(newUser)
      .into("votersdb_users")
      .returning("*")
      .then(([user]) => user);
  },
  insertAddress(db, user_name, address) {
    return db("votersdb_users")
      .where("user_name", user_name)
      .update({
        addresses: db.raw("array_append(addresses, ?)", [address]),
      })
      .then((user) => {
        return user;
      });
  },
  getAddresses(db, user_name) {
    return db("votersdb_users")
      .where("user_name", user_name)
      .select("addresses")
      .then((user) => user);
  },
  updateAddresses(db, user_name, addresses) {
    return db("votersdb_users")
      .where("user_name", user_name)
      .update({ addresses: addresses })
      .then((user) => user);
  },
  deleteAllAddresses(db, user_name) {
    return db("votersdb_users")
      .where("user_name", user_name)
      .update({
        addresses: [],
      })
      .then((user) => {
        return user;
      });
  },
  validatePassword(password) {
    if (password.length < 8) {
      return "Password must be longer than 8 characters";
    }
    if (password.length > 72) {
      return "Password must be less than 72 characters";
    }
    if (password.startsWith(" ") || password.endsWith(" ")) {
      return "Password must not start or end with empty spaces";
    }
    if (!REGEX_UPPER_LOWER_NUMBER_SPECIAL.test(password)) {
      return "Password must contain 1 upper case, lower case, number and special character";
    }
    return null;
  },
  hashPassword(password) {
    return bcrypt.hash(password, 12);
  },
  serializeUser(user) {
    return {
      id: user.id,
      full_name: xss(user.full_name),
      user_name: xss(user.user_name),
      addresses: user.addresses,
      date_created: new Date(user.date_created),
    };
  },
};

module.exports = UsersService;
