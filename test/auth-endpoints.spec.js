const { expect } = require("chai");
const knex = require("knex");
const app = require("../src/app");
const bcrypt = require("bcryptjs");

const AuthService = require("../src/services/auth-service");

describe.only("Auth Endpoints", function () {
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

  describe("POST /login", () => {
    context("Given that the username doesn't exist", () => {
      it("responds with 400 and an error message", () => {
        const request = {
          user_name: "test",
          password: "test",
        };
        return supertest(app)
          .post("/api/auth/login")
          .send(request)
          .expect(400)
          .expect((res) => {
            expect(res.body.error).to.eql("Incorrect user_name or password");
          });
      });
    });

    context(
      "Given that either the username or the password aren't included fields",
      () => {
        it("responds with 400 and an error message when password isn't included", () => {
          const request1 = {
            user_name: "test",
          };

          return supertest(app)
            .post("/api/auth/login")
            .send(request1)
            .expect(400)
            .expect((res) => {
              expect(res.body.error).to.eql(
                "Missing 'password' in request body"
              );
            });
        });

        it("responds with 400 and an error message when user_name isn't included", () => {
          const request2 = {
            password: "test",
          };

          return supertest(app)
            .post("/api/auth/login")
            .send(request2)
            .expect(400)
            .expect((res) => {
              expect(res.body.error).to.eql(
                "Missing 'user_name' in request body"
              );
            });
        });
      }
    );
    context("Given that the user exists", () => {
      const password = bcrypt.hash("Tester12!", 12);
      const testUser = {
        user_name: "tester",
        full_name: "tester t",
        password: password,
      };

      it("responds with 400 and an error message if the password is incorrect", () => {
        const request1 = {
          user_name: "tester",
          password: "wrong_password",
        };
        return supertest(app)
          .post("/api/auth/login")
          .send(request1)
          .expect(400)
          .expect((res) => {
            expect(res.body.error).to.eql("Incorrect user_name or password");
          });
      });
      this.beforeEach("insert user", () => {
        return db.insert(testUser).into("votersdb_users");
      });
      it("responds with 200 and a JWT token if the password is correct", () => {
        const request1 = {
          user_name: "tester",
          password: "Tester12!",
        };
        const sub = "tester";
        const payload = { user_id: 1 };
        const userName = AuthService.createJwt(sub, payload);
        return supertest(app).post("/api/auth/login").send(request1);
      });
    });
  });

  describe("GET users/:token", () => {
    const password = bcrypt.hash("Tester12!", 12);
    const testUser = {
      user_name: "tester",
      full_name: "tester t",
      password: password,
    };
    this.beforeEach("insert user", () => {
      return db.insert(testUser).into("votersdb_users");
    });
    it("responds with 200 and a serialized user object", () => {
      const sub = "tester";
      const payload = { user_id: 1 };
      const userName = AuthService.createJwt(sub, payload);
      return supertest(app).get(`/api/auth/users/${userName}`).expect(200);
    });
  });
});
