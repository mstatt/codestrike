from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from flask_login import UserMixin
from app import db

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256))
    is_admin = db.Column(db.Boolean, default=False)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

class Team(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    members = db.relationship('TeamMember', backref='team', lazy=True)
    submission = db.relationship('Submission', backref='team', lazy=True, uselist=False)

class TeamMember(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    team_id = db.Column(db.Integer, db.ForeignKey('team.id'), nullable=False)

class Submission(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    team_id = db.Column(db.Integer, db.ForeignKey('team.id'), nullable=False)
    project_name = db.Column(db.String(100), nullable=False)
    github_repo = db.Column(db.String(255), nullable=False, unique=True)
    demo_video = db.Column(db.String(255), nullable=False)
    live_demo_url = db.Column(db.String(255), nullable=False)
    demo_username = db.Column(db.String(100))
    demo_password = db.Column(db.String(100))
    submitted_at = db.Column(db.DateTime, default=datetime.utcnow)

class Winner(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    team_id = db.Column(db.Integer, db.ForeignKey('team.id'), nullable=False)
    points = db.Column(db.Integer, nullable=False)
    rank = db.Column(db.Integer, unique=True)
    team = db.relationship('Team', backref=db.backref('winner', uselist=False))

class HackathonDetails(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    deadline = db.Column(db.DateTime, nullable=False)
    rules = db.Column(db.JSON)
    prizes = db.Column(db.JSON)
    image_path = db.Column(db.String(255))