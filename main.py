import os
from datetime import datetime, timedelta, date
from io import BytesIO

import bcrypt
from flask import (
    Flask, render_template, request, redirect, url_for, jsonify,
    session, send_file, flash, abort
)
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import func

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
)
from reportlab.lib import colors

from translations import STRINGS, t as _t, js_strings

app = Flask(__name__)

app.config["SECRET_KEY"] = os.environ.get("SESSION_SECRET", "dev-secret-change-me")

# Railway Postgres connection
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is missing. Please connect Postgres variables in Railway.")

# Railway sometimes gives postgres://, SQLAlchemy needs postgresql://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

app.config["SQLALCHEMY_DATABASE_URI"] = DATABASE_URL
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db = SQLAlchemy(app)

EMISSION_FACTORS = {
    "transport": {"car": 0.21, "bike": 0.10, "bus": 0.05, "train": 0.04, "walk": 0.0},
    "electricity": 0.82,
    # Food category retired from the calculator UI — kept here for backward compatibility
    # of historical logs only. New logs always store food = 0.
    "food": {"vegan": 1.5, "veg": 2.0, "non-veg": 5.0, "none": 0.0},
    # Waste split into biodegradable (organic, mostly methane in landfill)
    # and non-biodegradable (plastic/glass/metal/e-waste).
    "waste_bio": 0.7,
    "waste_nonbio": 2.9,
}

GLOBAL_AVG_KG_MONTH = 333
INDIA_AVG_KG_MONTH = 158

WEEKLY_CHALLENGES = [
    {"id": 1, "key": "ch1", "points": 30},
    {"id": 2, "key": "ch2", "points": 50},
    {"id": 3, "key": "ch3", "points": 20},
    {"id": 4, "key": "ch4", "points": 25},
    {"id": 5, "key": "ch5", "points": 60},
]


def localized_challenges(lang: str):
    return [
        {"id": c["id"], "points": c["points"],
         "title": _t(c["key"] + ".title", lang),
         "desc": _t(c["key"] + ".desc", lang)}
        for c in WEEKLY_CHALLENGES
    ]


class User(db.Model):
    __tablename__ = "users"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(160), unique=True, nullable=False, index=True)
    password = db.Column(db.String(200), nullable=False)
    points = db.Column(db.Integer, default=0)
    dark_mode = db.Column(db.Boolean, default=False)
    language = db.Column(db.String(5), default="en")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class FootprintLog(db.Model):
    __tablename__ = "footprint_logs"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    log_date = db.Column(db.Date, default=date.today, index=True)
    transport = db.Column(db.Float, default=0)
    energy = db.Column(db.Float, default=0)
    food = db.Column(db.Float, default=0)
    waste = db.Column(db.Float, default=0)
    total = db.Column(db.Float, default=0)
    transport_mode = db.Column(db.String(40))
    transport_km = db.Column(db.Float, default=0)
    energy_kwh = db.Column(db.Float, default=0)
    diet = db.Column(db.String(20))
    waste_kg = db.Column(db.Float, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class Goal(db.Model):
    __tablename__ = "goals"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), unique=True, nullable=False)
    target = db.Column(db.Float, default=200)
    month = db.Column(db.String(7), default=lambda: date.today().strftime("%Y-%m"))


class ChallengeProgress(db.Model):
    __tablename__ = "challenge_progress"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    challenge_id = db.Column(db.Integer, nullable=False)
    completed_on = db.Column(db.Date, default=date.today)


with app.app_context():
    db.create_all()
    from sqlalchemy import inspect, text
    _insp = inspect(db.engine)
    _user_cols = {c["name"] for c in _insp.get_columns("users")}
    if "language" not in _user_cols:
        with db.engine.begin() as _conn:
            _conn.execute(text("ALTER TABLE users ADD COLUMN language VARCHAR(5) DEFAULT 'en'"))


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def current_user():
    uid = session.get("user_id")
    if not uid:
        return None
    return db.session.get(User, uid)


def login_required_html(view):
    from functools import wraps

    @wraps(view)
    def wrapper(*args, **kwargs):
        if not current_user():
            return redirect(url_for("login_view"))
        return view(*args, **kwargs)
    return wrapper


def login_required_api(view):
    from functools import wraps

    @wraps(view)
    def wrapper(*args, **kwargs):
        if not current_user():
            return jsonify({"error": "unauthorized"}), 401
        return view(*args, **kwargs)
    return wrapper


def calc_footprint(transport_mode: str, transport_km: float, energy_kwh: float,
                   bio_kg: float, nonbio_kg: float):
    t_factor = EMISSION_FACTORS["transport"].get(transport_mode, 0)
    transport = round(t_factor * max(0.0, transport_km), 3)
    energy = round(EMISSION_FACTORS["electricity"] * max(0.0, energy_kwh), 3)
    # Food category was removed from the calculator; new logs store 0.
    food = 0.0
    waste_bio = EMISSION_FACTORS["waste_bio"] * max(0.0, bio_kg)
    waste_nonbio = EMISSION_FACTORS["waste_nonbio"] * max(0.0, nonbio_kg)
    waste = round(waste_bio + waste_nonbio, 3)
    total = round(transport + energy + food + waste, 3)
    return transport, energy, food, waste, total


def carbon_score(monthly_total: float) -> int:
    if monthly_total <= 0:
        return 100
    score = 100 - (monthly_total / GLOBAL_AVG_KG_MONTH) * 60
    return max(0, min(100, int(round(score))))


def badges_for(points: int):
    tiers = [
        ("Eco Beginner", 0, "leaf"),
        ("Green Sprout", 100, "sprout"),
        ("Eco Warrior", 300, "shield"),
        ("Planet Guardian", 700, "globe"),
        ("Carbon Hero", 1500, "trophy"),
    ]
    earned = [{"name": n, "min": m, "icon": i, "earned": points >= m} for n, m, i in tiers]
    return earned


def smart_suggestions(latest: dict, monthly_total: float, lang: str = "en"):
    tips = []
    if latest.get("transport", 0) > 5:
        tips.append({"icon": "bus", "text": _t("sug.transport", lang)})
    if latest.get("energy", 0) > 8:
        tips.append({"icon": "bulb", "text": _t("sug.energy", lang)})
    if latest.get("food", 0) >= 4:
        tips.append({"icon": "salad", "text": _t("sug.food", lang)})
    if latest.get("waste", 0) > 2:
        tips.append({"icon": "recycle", "text": _t("sug.waste", lang)})
    if monthly_total > GLOBAL_AVG_KG_MONTH:
        tips.append({"icon": "tree", "text": _t("sug.tree", lang)})
    if not tips:
        tips.append({"icon": "spark", "text": _t("sug.spark", lang)})
    return tips[:4]


def current_lang() -> str:
    user = current_user()
    if user and user.language in ("en", "hi"):
        return user.language
    sess_lang = session.get("lang")
    if sess_lang in ("en", "hi"):
        return sess_lang
    return "en"


@app.context_processor
def inject_user():
    user = current_user()
    lang = current_lang()
    return {
        "current_user": user,
        "dark_mode": user.dark_mode if user else False,
        "current_year": datetime.utcnow().year,
        "lang": lang,
        "t": lambda key: _t(key, lang),
        "js_i18n": js_strings(lang),
    }

@app.route("/health")
def health():
    return "EcoBuddy server is running"
@app.route("/")
def index():
    if current_user():
        return redirect(url_for("dashboard"))
    return render_template("welcome.html")


@app.route("/register", methods=["GET", "POST"])
def register():
    if request.method == "POST":
        name = (request.form.get("name") or "").strip()
        email = (request.form.get("email") or "").strip().lower()
        password = request.form.get("password") or ""
        if not name or not email or len(password) < 6:
            flash("Please enter a name, valid email and a password of at least 6 characters.", "error")
            return render_template("register.html")
        if User.query.filter_by(email=email).first():
            flash("An account with that email already exists.", "error")
            return render_template("register.html")
        u = User(name=name, email=email, password=hash_password(password))
        db.session.add(u)
        db.session.commit()
        db.session.add(Goal(user_id=u.id, target=200))
        db.session.commit()
        session["user_id"] = u.id
        session["lang"] = u.language or "en"
        return redirect(url_for("dashboard"))
    return render_template("register.html")


@app.route("/login", methods=["GET", "POST"])
def login_view():
    if request.method == "POST":
        email = (request.form.get("email") or "").strip().lower()
        password = request.form.get("password") or ""
        u = User.query.filter_by(email=email).first()
        if not u or not verify_password(password, u.password):
            flash("Invalid email or password.", "error")
            return render_template("login.html")
        session["user_id"] = u.id
        session["lang"] = u.language or "en"
        return redirect(url_for("dashboard"))
    return render_template("login.html")


@app.route("/logout")
def logout():
    session.pop("user_id", None)
    return redirect(url_for("login_view"))


@app.route("/forgot", methods=["GET", "POST"])
def forgot_password():
    if request.method == "POST":
        email = (request.form.get("email") or "").strip().lower()
        new_pw = request.form.get("password") or ""
        u = User.query.filter_by(email=email).first()
        if not u or len(new_pw) < 6:
            flash("Could not reset password. Check email and try a stronger password.", "error")
            return render_template("forgot.html")
        u.password = hash_password(new_pw)
        db.session.commit()
        flash("Password reset successful. Please log in.", "success")
        return redirect(url_for("login_view"))
    return render_template("forgot.html")


@app.route("/dashboard")
@login_required_html
def dashboard():
    return render_template("dashboard.html")


@app.route("/calculator")
@login_required_html
def calculator_page():
    return render_template("calculator.html")


@app.route("/analytics")
@login_required_html
def analytics_page():
    return render_template("analytics.html")


@app.route("/goals")
@login_required_html
def goals_page():
    return render_template("goals.html", challenges=localized_challenges(current_lang()))


@app.route("/profile")
@login_required_html
def profile_page():
    return render_template("profile.html")


@app.post("/api/calculate")
@login_required_api
def api_calculate():
    user = current_user()
    data = request.get_json(silent=True) or {}
    mode = (data.get("transport_mode") or "car").lower()
    km = float(data.get("transport_km") or 0)
    kwh = float(data.get("energy_kwh") or 0)
    bio_kg = float(data.get("bio_kg") or 0)
    nonbio_kg = float(data.get("nonbio_kg") or 0)
    waste_kg = bio_kg + nonbio_kg

    transport, energy, food, waste, total = calc_footprint(mode, km, kwh, bio_kg, nonbio_kg)

    today = date.today()
    log = FootprintLog.query.filter_by(user_id=user.id, log_date=today).first()
    if log:
        log.transport = transport
        log.energy = energy
        log.food = food
        log.waste = waste
        log.total = total
        log.transport_mode = mode
        log.transport_km = km
        log.energy_kwh = kwh
        log.diet = None
        log.waste_kg = waste_kg
    else:
        log = FootprintLog(
            user_id=user.id, log_date=today,
            transport=transport, energy=energy, food=food, waste=waste, total=total,
            transport_mode=mode, transport_km=km, energy_kwh=kwh, diet=None, waste_kg=waste_kg,
        )
        db.session.add(log)

    user.points = (user.points or 0) + max(1, int(10 - min(10, total / 5)))
    db.session.commit()

    return jsonify({
        "transport": transport, "energy": energy, "food": food, "waste": waste,
        "total": total, "saved": True
    })


def _monthly_total(user_id: int, month_start: date) -> float:
    next_month = (month_start.replace(day=28) + timedelta(days=4)).replace(day=1)
    q = db.session.query(func.coalesce(func.sum(FootprintLog.total), 0.0)).filter(
        FootprintLog.user_id == user_id,
        FootprintLog.log_date >= month_start,
        FootprintLog.log_date < next_month,
    )
    return float(q.scalar() or 0.0)


@app.get("/api/dashboard-data")
@login_required_api
def api_dashboard_data():
    user = current_user()
    today = date.today()
    month_start = today.replace(day=1)
    week_start = today - timedelta(days=6)

    today_log = FootprintLog.query.filter_by(user_id=user.id, log_date=today).first()
    week_total = float(db.session.query(func.coalesce(func.sum(FootprintLog.total), 0.0))
                       .filter(FootprintLog.user_id == user.id,
                               FootprintLog.log_date >= week_start).scalar() or 0)
    month_total = _monthly_total(user.id, month_start)

    cat_q = db.session.query(
        func.coalesce(func.sum(FootprintLog.transport), 0.0),
        func.coalesce(func.sum(FootprintLog.energy), 0.0),
        func.coalesce(func.sum(FootprintLog.food), 0.0),
        func.coalesce(func.sum(FootprintLog.waste), 0.0),
    ).filter(FootprintLog.user_id == user.id,
             FootprintLog.log_date >= month_start).first()
    transport_total, energy_total, food_total, waste_total = [float(v) for v in (cat_q or (0, 0, 0, 0))]

    series_days = 30
    start = today - timedelta(days=series_days - 1)
    rows = (db.session.query(FootprintLog.log_date, func.sum(FootprintLog.total))
            .filter(FootprintLog.user_id == user.id, FootprintLog.log_date >= start)
            .group_by(FootprintLog.log_date).all())
    by_date = {r[0]: float(r[1] or 0) for r in rows}
    series = []
    for i in range(series_days):
        d = start + timedelta(days=i)
        series.append({"date": d.isoformat(), "total": round(by_date.get(d, 0.0), 2)})

    goal = Goal.query.filter_by(user_id=user.id).first()
    target = goal.target if goal else 200.0
    progress_pct = min(100, int((month_total / target) * 100)) if target > 0 else 0

    latest = {
        "transport": float(today_log.transport) if today_log else 0.0,
        "energy": float(today_log.energy) if today_log else 0.0,
        "food": float(today_log.food) if today_log else 0.0,
        "waste": float(today_log.waste) if today_log else 0.0,
    }

    return jsonify({
        "name": user.name,
        "today_total": round(float(today_log.total) if today_log else 0.0, 2),
        "week_total": round(week_total, 2),
        "month_total": round(month_total, 2),
        "goal_target": round(float(target), 2),
        "goal_progress_pct": progress_pct,
        "score": carbon_score(month_total),
        "points": int(user.points or 0),
        "categories": {
            "transport": round(transport_total, 2),
            "energy": round(energy_total, 2),
            "food": round(food_total, 2),
            "waste": round(waste_total, 2),
        },
        "series": series,
        "latest": latest,
        "suggestions": smart_suggestions(latest, month_total, current_lang()),
        "compare": {
            "you": round(month_total, 2),
            "global": GLOBAL_AVG_KG_MONTH,
            "india": INDIA_AVG_KG_MONTH,
        },
        "badges": badges_for(int(user.points or 0)),
    })


@app.get("/api/analytics")
@login_required_api
def api_analytics():
    user = current_user()
    today = date.today()
    days = 90
    start = today - timedelta(days=days - 1)

    rows = (db.session.query(
        FootprintLog.log_date,
        func.sum(FootprintLog.transport),
        func.sum(FootprintLog.energy),
        func.sum(FootprintLog.food),
        func.sum(FootprintLog.waste),
        func.sum(FootprintLog.total),
    ).filter(FootprintLog.user_id == user.id, FootprintLog.log_date >= start)
     .group_by(FootprintLog.log_date).order_by(FootprintLog.log_date.asc()).all())

    by_date = {r[0]: r for r in rows}
    series = []
    for i in range(days):
        d = start + timedelta(days=i)
        r = by_date.get(d)
        if r:
            series.append({
                "date": d.isoformat(),
                "transport": round(float(r[1] or 0), 2),
                "energy": round(float(r[2] or 0), 2),
                "food": round(float(r[3] or 0), 2),
                "waste": round(float(r[4] or 0), 2),
                "total": round(float(r[5] or 0), 2),
            })
        else:
            series.append({"date": d.isoformat(), "transport": 0, "energy": 0, "food": 0, "waste": 0, "total": 0})

    month_total = _monthly_total(user.id, today.replace(day=1))
    return jsonify({
        "series": series,
        "score": carbon_score(month_total),
        "month_total": round(month_total, 2),
        "compare": {"you": round(month_total, 2), "global": GLOBAL_AVG_KG_MONTH, "india": INDIA_AVG_KG_MONTH},
        "suggestions": smart_suggestions(
            {"transport": series[-1]["transport"] if series else 0,
             "energy": series[-1]["energy"] if series else 0,
             "food": series[-1]["food"] if series else 0,
             "waste": series[-1]["waste"] if series else 0},
            month_total, current_lang(),
        ),
    })


@app.get("/api/leaderboard")
@login_required_api
def api_leaderboard():
    rows = User.query.order_by(User.points.desc()).limit(10).all()
    return jsonify([
        {"name": u.name, "points": int(u.points or 0), "is_you": u.id == session.get("user_id")}
        for u in rows
    ])


@app.post("/api/goal")
@login_required_api
def api_set_goal():
    user = current_user()
    data = request.get_json(silent=True) or {}
    target = float(data.get("target") or 0)
    if target <= 0:
        return jsonify({"error": "target must be positive"}), 400
    g = Goal.query.filter_by(user_id=user.id).first()
    if not g:
        g = Goal(user_id=user.id, target=target)
        db.session.add(g)
    else:
        g.target = target
    db.session.commit()
    return jsonify({"target": target})


@app.post("/api/challenge")
@login_required_api
def api_complete_challenge():
    user = current_user()
    data = request.get_json(silent=True) or {}
    cid = int(data.get("challenge_id") or 0)
    challenge = next((c for c in WEEKLY_CHALLENGES if c["id"] == cid), None)
    if not challenge:
        return jsonify({"error": "unknown challenge"}), 404
    today = date.today()
    week_start = today - timedelta(days=today.weekday())
    existing = ChallengeProgress.query.filter(
        ChallengeProgress.user_id == user.id,
        ChallengeProgress.challenge_id == cid,
        ChallengeProgress.completed_on >= week_start,
    ).first()
    if existing:
        return jsonify({"error": "already completed this week"}), 400
    db.session.add(ChallengeProgress(user_id=user.id, challenge_id=cid))
    user.points = (user.points or 0) + int(challenge["points"])
    db.session.commit()
    return jsonify({"points": user.points, "added": challenge["points"]})


@app.get("/api/challenges")
@login_required_api
def api_challenges_status():
    user = current_user()
    today = date.today()
    week_start = today - timedelta(days=today.weekday())
    done = {row.challenge_id for row in ChallengeProgress.query.filter(
        ChallengeProgress.user_id == user.id,
        ChallengeProgress.completed_on >= week_start
    ).all()}
    return jsonify([
        {**c, "completed": c["id"] in done} for c in localized_challenges(current_lang())
    ])


@app.post("/api/dark-mode")
@login_required_api
def api_dark_mode():
    user = current_user()
    data = request.get_json(silent=True) or {}
    user.dark_mode = bool(data.get("enabled"))
    db.session.commit()
    return jsonify({"enabled": user.dark_mode})


@app.post("/api/language")
def api_language():
    data = request.get_json(silent=True) or {}
    lang = (data.get("lang") or "en").lower()
    if lang not in ("en", "hi"):
        return jsonify({"error": "unsupported language"}), 400
    session["lang"] = lang
    user = current_user()
    if user:
        user.language = lang
        db.session.commit()
    return jsonify({"lang": lang})


@app.get("/set-language/<lang>")
def set_language(lang):
    """Public language switch that works without an account.

    Used by the small EN/HI toggle on the welcome, login, register
    and forgot-password pages. Honours the ?next=... param to send the
    user back where they came from.
    """
    lang = (lang or "en").lower()
    if lang not in ("en", "hi"):
        lang = "en"
    session["lang"] = lang
    user = current_user()
    if user:
        user.language = lang
        db.session.commit()
    nxt = request.args.get("next") or url_for("index")
    if not nxt.startswith("/"):
        nxt = url_for("index")
    return redirect(nxt)


@app.get("/api/export-pdf")
@login_required_api
def api_export_pdf():
    user = current_user()
    today = date.today()
    month_start = today.replace(day=1)
    month_total = _monthly_total(user.id, month_start)

    cat_q = db.session.query(
        func.coalesce(func.sum(FootprintLog.transport), 0.0),
        func.coalesce(func.sum(FootprintLog.energy), 0.0),
        func.coalesce(func.sum(FootprintLog.food), 0.0),
        func.coalesce(func.sum(FootprintLog.waste), 0.0),
    ).filter(FootprintLog.user_id == user.id, FootprintLog.log_date >= month_start).first()
    transport_total, energy_total, food_total, waste_total = [float(v) for v in (cat_q or (0, 0, 0, 0))]

    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, title="EcoBuddy Report")
    styles = getSampleStyleSheet()
    story = []
    story.append(Paragraph("EcoBuddy — Carbon Footprint Report", styles["Title"]))
    story.append(Spacer(1, 12))
    story.append(Paragraph(f"User: {user.name} ({user.email})", styles["Normal"]))
    story.append(Paragraph(f"Period: {month_start.isoformat()} to {today.isoformat()}", styles["Normal"]))
    story.append(Spacer(1, 16))

    data = [
        ["Category", "Emissions (kg CO₂)"],
        ["Transport", f"{transport_total:.2f}"],
        ["Energy", f"{energy_total:.2f}"],
        ["Food", f"{food_total:.2f}"],
        ["Waste", f"{waste_total:.2f}"],
        ["Total", f"{month_total:.2f}"],
    ]
    t = Table(data, hAlign="LEFT", colWidths=[200, 160])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#16a34a")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("BACKGROUND", (0, -1), (-1, -1), colors.HexColor("#dcfce7")),
        ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#86efac")),
        ("ALIGN", (1, 0), (1, -1), "RIGHT"),
        ("PADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(t)
    story.append(Spacer(1, 16))

    score = carbon_score(month_total)
    story.append(Paragraph(f"Carbon Score: <b>{score}/100</b>", styles["Heading2"]))
    story.append(Paragraph(
        f"Compared to global average of {GLOBAL_AVG_KG_MONTH} kg/month and India average of {INDIA_AVG_KG_MONTH} kg/month.",
        styles["Normal"]
    ))
    story.append(Spacer(1, 12))

    story.append(Paragraph("Carbon Offset Suggestions", styles["Heading2"]))
    trees = max(1, int(month_total / 21))
    story.append(Paragraph(
        f"Plant approximately <b>{trees}</b> trees to offset your monthly footprint. "
        "Each mature tree absorbs about 21 kg of CO₂ per year.", styles["Normal"]))
    story.append(Spacer(1, 6))
    story.append(Paragraph(
        "Tips: switch to public transit, replace bulbs with LEDs, reduce meat intake, compost waste.",
        styles["Normal"]
    ))

    doc.build(story)
    buf.seek(0)
    return send_file(
        buf,
        mimetype="application/pdf",
        as_attachment=True,
        download_name=f"ecobuddy-report-{today.isoformat()}.pdf",
    )


@app.errorhandler(404)
def not_found(_):
    return render_template("404.html"), 404


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)
