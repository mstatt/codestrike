from app import db

class Submission(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    github_repo = db.Column(db.String(255), nullable=False)
    demo_video = db.Column(db.String(255), nullable=False)
    submitted_at = db.Column(db.DateTime, server_default=db.func.now())
