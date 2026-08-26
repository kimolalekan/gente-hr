module.exports = {
  apps: [
    {
      name: "gente",
      script: "server.js",
      env: {
        NODE_ENV: "production",
        PORT: 4001,
      },
    },
  ],
};
