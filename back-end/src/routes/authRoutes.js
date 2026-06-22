export function registerAuthRoutes(
  app,
  {
    verifyPasswordLogin,
    getGoogleOAuthConfigError,
    GOOGLE_CLIENT_ID,
    GOOGLE_REDIRECT_URI,
    GOOGLE_ALLOWED_DOMAIN,
    exchangeGoogleCode,
    getGoogleUserInfo,
    buildFrontendLoginUrl
  }
) {
  app.post("/api/auth/password/login", async (req, res) => {
    try {
      const result = await verifyPasswordLogin(req.body || {});

      if (!result.ok) {
        return res.status(result.status).json({ error: result.error });
      }

      res.json({
        accessGranted: true,
        provider: "password",
        user: result.user,
        requiresFirstLoginSetup: !result.user.firstLoginCompleted
      });
    } catch (error) {
      console.error("Password login failed:", error);
      res.status(500).json({ error: "Could not validate credentials" });
    }
  });

  app.get("/api/auth/google/start", (req, res) => {
    const configError = getGoogleOAuthConfigError();
    if (configError) {
      return res.status(503).json({ error: configError });
    }

    const state = String(req.query.state || "").trim();
    if (!state) {
      return res.status(400).json({ error: "state is required" });
    }

    const googleAuthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    googleAuthUrl.searchParams.set("client_id", GOOGLE_CLIENT_ID);
    googleAuthUrl.searchParams.set("redirect_uri", GOOGLE_REDIRECT_URI);
    googleAuthUrl.searchParams.set("response_type", "code");
    googleAuthUrl.searchParams.set("scope", "openid email profile");
    googleAuthUrl.searchParams.set("state", state);
    googleAuthUrl.searchParams.set("prompt", "select_account");

    if (GOOGLE_ALLOWED_DOMAIN) {
      googleAuthUrl.searchParams.set("hd", GOOGLE_ALLOWED_DOMAIN);
    }

    res.redirect(googleAuthUrl.toString());
  });

  async function handleGoogleCallback(req, res) {
    const configError = getGoogleOAuthConfigError();
    const state = String(req.query.state || "").trim();

    if (configError) {
      return res.redirect(buildFrontendLoginUrl(req, { googleAuth: "error", reason: configError, state }));
    }

    if (req.query.error) {
      return res.redirect(buildFrontendLoginUrl(req, { googleAuth: "error", reason: String(req.query.error), state }));
    }

    const code = String(req.query.code || "").trim();
    if (!code) {
      return res.redirect(buildFrontendLoginUrl(req, { googleAuth: "error", reason: "Missing Google authorization code", state }));
    }

    try {
      const tokenResponse = await exchangeGoogleCode(code);
      const profile = await getGoogleUserInfo(tokenResponse.access_token);

      res.redirect(buildFrontendLoginUrl(req, {
        googleAuth: "success",
        state,
        email: profile.email,
        name: profile.name || profile.email,
        picture: profile.picture || ""
      }));
    } catch (error) {
      console.error("Google OAuth callback failed:", error);
      res.redirect(buildFrontendLoginUrl(req, { googleAuth: "error", reason: error.message, state }));
    }
  }

  app.get("/api/auth/google/callback", handleGoogleCallback);
  app.get("/api/auth_google_callback.php", handleGoogleCallback);
}
