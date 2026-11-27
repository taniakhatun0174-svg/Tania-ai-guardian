import pg from 'pg';
import bcrypt from 'bcryptjs';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';

const { Pool } = pg;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function configureFounderDashboard(app) {
  const databaseUrl = process.env.DATABASE_URL;
  const sessionSecret = process.env.SESSION_SECRET;
  const founderEmail = process.env.FOUNDER_EMAIL?.trim().toLowerCase();
  const founderHash = process.env.FOUNDER_PASSWORD_HASH;

  if (!databaseUrl || !sessionSecret || !founderEmail || !founderHash) {
    console.warn('Founder Dashboard is not configured: required environment variables are missing.');
    return;
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000
  });

  pool.on('error', (error) => {
    console.error('Neon database connection error:', error.message);
  });

  try {
    await pool.query('SELECT 1');
    console.log('Neon database connection: SUCCESS');
  } catch (error) {
    console.warn('Neon database temporarily unavailable:', error.message);
    console.warn('Server will continue; database routes may be temporarily unavailable.');
  }

  const PgStore = connectPgSimple(session);
  app.set('trust proxy', 1);

  app.use(session({
    name: 'tania_founder_session',
    store: new PgStore({
      pool,
      tableName: 'founder_sessions',
      createTableIfMissing: true,
      pruneSessionInterval: 15 * 60
    }),
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 8 * 60 * 60 * 1000
    }
  }));

  const attempts = new Map();

  function sameOrigin(req, res, next) {
    const origin = req.get('origin');
    if (origin) {
      try {
        if (new URL(origin).host !== req.get('host')) {
          return res.status(403).json({ ok: false, error: 'অনুমোদিত অনুরোধ নয়।' });
        }
      } catch {
        return res.status(403).json({ ok: false, error: 'অনুমোদিত অনুরোধ নয়।' });
      }
    }
    next();
  }

  function requireFounder(req, res, next) {
    if (req.session?.founder === true) return next();
    return res.status(401).json({ ok: false, error: 'প্রথমে Founder Login করুন।' });
  }

  app.post('/api/founder/login', sameOrigin, async (req, res) => {
    const ip = req.ip || 'unknown';
    const now = Date.now();
    const record = attempts.get(ip) || { count: 0, until: now + 15 * 60 * 1000 };

    if (now > record.until) {
      record.count = 0;
      record.until = now + 15 * 60 * 1000;
    }

    if (record.count >= 10) {
      return res.status(429).json({ ok: false, error: 'অনেকবার চেষ্টা হয়েছে। ১৫ মিনিট পর আবার চেষ্টা করুন।' });
    }

    const email = typeof req.body?.email === 'string'
      ? req.body.email.trim().toLowerCase()
      : '';
    const password = typeof req.body?.password === 'string'
      ? req.body.password
      : '';

    let valid = false;
    if (email === founderEmail && password.length > 0 && password.length <= 200) {
      try {
        valid = await bcrypt.compare(password, founderHash);
      } catch {
        valid = false;
      }
    }

    if (!valid) {
      record.count += 1;
      attempts.set(ip, record);
      return res.status(401).json({ ok: false, error: 'ইমেইল অথবা পাসওয়ার্ড সঠিক নয়।' });
    }

    attempts.delete(ip);

    req.session.regenerate((error) => {
      if (error) {
        return res.status(500).json({ ok: false, error: 'নিরাপদ সেশন তৈরি করা যায়নি।' });
      }

      req.session.founder = true;
      req.session.save((saveError) => {
        if (saveError) {
          return res.status(500).json({ ok: false, error: 'Login সেশন সংরক্ষণ করা যায়নি।' });
        }
        return res.json({ ok: true, message: 'Founder Login সফল হয়েছে।' });
      });
    });
  });

  app.get('/api/founder/me', requireFounder, (_req, res) => {
    res.json({ ok: true, founder: true });
  });

  app.post('/api/founder/logout', sameOrigin, requireFounder, (req, res) => {
    req.session.destroy((error) => {
      if (error) return res.status(500).json({ ok: false });
      res.clearCookie('tania_founder_session', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      });
      return res.json({ ok: true });
    });
  });

  app.post('/api/usage', sameOrigin, async (req, res) => {
    const installationId = req.body?.installationId;
    const featureId = String(req.body?.featureId ?? '');

    if (typeof installationId !== 'string' || !UUID_RE.test(installationId)) {
      return res.status(400).json({ ok: false, error: 'Installation ID সঠিক নয়।' });
    }
    if (!/^(?:[1-9]|1[0-6])$/.test(featureId)) {
      return res.status(400).json({ ok: false, error: 'Feature ID সঠিক নয়।' });
    }

    try {
      await pool.query(
        `INSERT INTO app_installations (installation_id, last_seen_at)
         VALUES ($1, NOW())
         ON CONFLICT (installation_id)
         DO UPDATE SET last_seen_at = NOW()`,
        [installationId]
      );
      await pool.query(
        'INSERT INTO usage_events (installation_id, feature_id) VALUES ($1, $2)',
        [installationId, featureId]
      );
      return res.json({ ok: true });
    } catch (error) {
      console.error('Usage event could not be saved:', error.message);
      return res.status(503).json({ ok: false, error: 'তথ্য সংরক্ষণ করা যায়নি।' });
    }
  });

  app.post('/api/feedback', sameOrigin, async (req, res) => {
    const installationId = req.body?.installationId;
    const rating = req.body?.rating;
    const feedbackText = typeof req.body?.feedbackText === 'string'
      ? req.body.feedbackText.trim()
      : '';

    if (typeof installationId !== 'string' || !UUID_RE.test(installationId)) {
      return res.status(400).json({ ok: false, error: 'Installation ID সঠিক নয়।' });
    }
    if (rating !== null && rating !== undefined &&
        (!Number.isInteger(rating) || rating < 1 || rating > 5)) {
      return res.status(400).json({ ok: false, error: 'Rating ১ থেকে ৫-এর মধ্যে দিন।' });
    }
    if (feedbackText.length > 1000 || (rating == null && !feedbackText)) {
      return res.status(400).json({ ok: false, error: 'Feedback সঠিকভাবে লিখুন।' });
    }

    try {
      await pool.query(
        `INSERT INTO app_installations (installation_id, last_seen_at)
         VALUES ($1, NOW())
         ON CONFLICT (installation_id)
         DO UPDATE SET last_seen_at = NOW()`,
        [installationId]
      );
      await pool.query(
        `INSERT INTO user_feedback (installation_id, rating, feedback_text)
         VALUES ($1, $2, $3)`,
        [installationId, rating ?? null, feedbackText || null]
      );
      return res.json({ ok: true, message: 'আপনার মতামত সংরক্ষিত হয়েছে।' });
    } catch (error) {
      console.error('Feedback could not be saved:', error.message);
      return res.status(503).json({ ok: false, error: 'Feedback সংরক্ষণ করা যায়নি।' });
    }
  });

  app.get('/api/founder/dashboard', requireFounder, async (_req, res) => {
    try {
      const [active, daily, total, ratings, feedback] = await Promise.all([
        pool.query(
          `SELECT COUNT(DISTINCT installation_id)::int AS count
           FROM app_installations
           WHERE last_seen_at >= NOW() - INTERVAL '24 hours'`
        ),
        pool.query(
          `SELECT COUNT(DISTINCT installation_id)::int AS count
           FROM app_installations
           WHERE last_seen_at AT TIME ZONE 'Asia/Dhaka' >=
             date_trunc('day', NOW() AT TIME ZONE 'Asia/Dhaka')`
        ),
        pool.query('SELECT COUNT(*)::int AS count FROM app_installations'),
        pool.query(
          `SELECT COUNT(rating)::int AS count,
                  COALESCE(ROUND(AVG(rating)::numeric, 2), 0) AS average
           FROM user_feedback`
        ),
        pool.query(
          `SELECT id, rating, feedback_text, created_at
           FROM user_feedback
           ORDER BY created_at DESC
           LIMIT 100`
        )
      ]);

      return res.json({
        ok: true,
        metrics: {
          activeUsers: active.rows[0].count,
          dailyUsers: daily.rows[0].count,
          totalUsers: total.rows[0].count,
          ratingCount: ratings.rows[0].count,
          averageRating: Number(ratings.rows[0].average)
        },
        feedback: feedback.rows
      });
    } catch (error) {
      console.error('Founder dashboard query failed:', error.message);
      return res.status(503).json({ ok: false, error: 'Dashboard তথ্য পাওয়া যায়নি।' });
    }
  });

  console.log('Founder Dashboard security and database routes are ready.');
}
