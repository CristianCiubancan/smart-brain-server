import connectRedis from "connect-redis";
import cors from "cors";
import "dotenv-safe/config";
import express from "express";
import session from "express-session";
import multer from "multer";
import path from "path";
import "reflect-metadata";
import { createConnection } from "typeorm";
import { COOKIE_NAME, __prod__ } from "./constants";
import { User } from "./entities/User";
import { redis } from "./redis";
import handleUploadedImage from "./routes/images/uploadedImage";
import handleUrlImage from "./routes/images/urlImage";
import handleLogin from "./routes/user/login";
import handleLogout from "./routes/user/logout";
import handleMe from "./routes/user/me";
import handleRank from "./routes/user/rank";
import handleRegister from "./routes/user/register";
import { Req } from "./types/networkingTypes";

const appid = process.env.APPID;

const main = async () => {
  await createConnection({
    type: "postgres",
    url: process.env.DATABASE_URL,
    logging: false,
    ssl: __prod__ ? { rejectUnauthorized: false } : false,
    // ssl: false,
    synchronize: true,
    migrations: [path.join(__dirname, "./migrations/*")],
    entities: [User],
  });

  // running migrations as synchronize:true is not reccomended
  // because it might break the db in prod
  // await conn.runMigrations() ;

  //initializing express app
  const app = express();

  //setup to store session inside Redis
  const RedisStore = connectRedis(session);

  //cors options for http and socket servers
  const serverCorse = {
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  };

  const redisClient = redis;

  //this is needed in order to get cookies working i guess
  app.set("trust proxy", 1);

  //cookie setup
  const sessionMiddleware = session({
    store: new RedisStore({
      client: redisClient,
      disableTouch: true,
    }),
    name: COOKIE_NAME,
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,

    // code below should be uncommented on a real app where you own the domain and both server and client are on the same domain

    cookie: {
      httpOnly: true,
      sameSite: "lax",
      // this doesn't work with cloudflare free ssl otherwise should be uncommented
      // secure: __prod__, //cookie only works in https
      domain: __prod__ ? ".happyoctopus.click" : undefined,
      maxAge: 1000 * 60 * 60 * 24 * 10, //10 days
    },
  } as any);

  //adding cors
  app.use(cors(serverCorse));

  //adding body parser
  app.use(express.json());

  //using cookie session
  app.use(sessionMiddleware);

  //http paths
  app.get("/", (_req: Req, res) => {
    res.json(`hello from ${appid}`);
  });

  app.get("/me", (req: Req, res) => {
    handleMe(req, res);
  });

  app.get("/getRank", (req: Req, res) => {
    handleRank(req, res);
  });

  app.get("/logout", (req: Req, res) => {
    handleLogout(req, res);
  });

  app.post("/register", (req, res) => {
    handleRegister(req, res);
  });

  app.post("/login", (req, res) => {
    handleLogin(req, res);
  });

  app.post("/detectFromUrl", (req, res) => {
    handleUrlImage(req, res);
  });

  //multer for file upload
  const upload = multer({});

  app.post("/uploadedImage", upload.single("file"), (req, res) => {
    handleUploadedImage(req, res);
  });

  app.listen(process.env.PORT, () => {
    console.log(`server listening at http://localhost:${process.env.PORT}`);
  });
};

main();
