declare namespace NodeJS {
  interface ProcessEnv {
    SESSION_SECRET: string;
    CORS_ORIGIN: string;
    CLARIFAI_AUTH: string;
  }
}