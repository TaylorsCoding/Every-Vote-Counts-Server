const { expect } = require("chai");
const jwt = require("jsonwebtoken");
const knex = require("knex");
const app = require("../src/app");
const bcrypt = require("bcryptjs");

const AuthService = require("../src/services/auth-service");

describe.only("Users Endpoints", function () {
  let db;

  before("make knex instance", () => {
    db = knex({
      client: "pg",
      connection: process.env.TEST_DATABASE_URL,
    });
    app.set("db", db);
  });

  after("disconnect from db", () => db.destroy());

  before("clean the table", () =>
    db.raw("TRUNCATE votersdb_users RESTART IDENTITY CASCADE")
  );

  afterEach("cleanup", () =>
    db.raw("TRUNCATE votersdb_users RESTART IDENTITY CASCADE")
  );

  describe("POST /users", () => {
    context(
      "All the information is provided and the password is valid.",
      () => {
        const testUser = {
          user_name: "tester1",
          full_name: "tester t",
          password: "Tester12!",
        };
        it("responds with 201", () => {
          return supertest(app).post("/api/users/").send(testUser).expect(201);
        });
      }
    );
  });

  describe("POST /saveaddress", () => {
    const testUser = {
      user_name: "tester",
      full_name: "tester t",
      password: bcrypt.hash("Tester12!", 12),
    };
    context("An address is provided and the user is logged in.", () => {
      this.beforeEach("insert user", () => {
        return db.into("votersdb_users").insert(testUser);
      });
      it("responds with the serialized user object", () => {
        const sub = "tester";
        const payload = { user_id: 1 };
        const userName = AuthService.createJwt(sub, payload);
        const request = {
          user_name: userName,
          address: "1600 Pennsylvania Avenue NW, Washington, DC 20500",
        };
        return supertest(app)
          .post("/api/users/saveaddress/")
          .send(request)
          .expect(200);
      });
    });
  });

  describe("DELETE /addresses", () => {
    const testUser = {
      user_name: "tester",
      full_name: "tester t",
      password: bcrypt.hash("Tester12!", 12),
    };
    this.beforeEach("insert user", () => {
      return db.into("votersdb_users").insert(testUser);
    });
    it("responds with an updated user (without addresses)", () => {
      const sub = "tester";
      const payload = { user_id: 1 };
      const userName = AuthService.createJwt(sub, payload);
      const request = {
        user_name: userName,
      };
      return supertest(app)
        .delete("/api/users/addresses/")
        .send(request)
        .expect(200)
        .expect((res) => {
          expect(res.body.user.addresses.length).to.be.eql(0);
        });
    });
  });

  describe("DELETE /address", () => {
    const testUser = {
      user_name: "tester",
      full_name: "tester t",
      password: bcrypt.hash("Tester12!", 12),
    };
    this.beforeEach("insert user", () => {
      return db.into("votersdb_users").insert(testUser);
    });

    this.beforeEach("insert user", () => {
      return db("votersdb_users")
        .where("user_name", testUser.user_name)
        .update({
          addresses: db.raw("array_append(addresses, ?)", ["a"]),
        });
    });
    this.beforeEach("insert user", () => {
      return db("votersdb_users")
        .where("user_name", testUser.user_name)
        .update({
          addresses: db.raw("array_append(addresses, ?)", ["b"]),
        });
    });
    this.beforeEach("insert user", () => {
      return db("votersdb_users")
        .where("user_name", testUser.user_name)
        .update({
          addresses: db.raw("array_append(addresses, ?)", ["c"]),
        });
    });
    it("responds with the updated user (without the selected address", () => {
      const sub = "tester";
      const payload = { user_id: 1 };
      const userName = AuthService.createJwt(sub, payload);
      const request = {
        user_name: userName,
        address: "b",
      };
      return supertest(app)
        .delete("/api/users/address")
        .send(request)
        .expect(200)
        .expect((res) => {
          expect(res.body.user.addresses[1]).to.be.eql("c");
        });
    });
  });
});
