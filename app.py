import os
from datetime import datetime
from flask import Flask, render_template, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import DeclarativeBase
import logging

logging.basicConfig(level=logging.DEBUG)

class Base(DeclarativeBase):
    pass

db = SQLAlchemy(model_class=Base)
app = Flask(__name__)
app.secret_key = "hackathon_submission_secret_key"
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///submissions.db"
db.init_app(app)

from models import Submission

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/submit', methods=['POST'])
def submit():
    try:
        # Read deadline from file
        with open('deadline.txt', 'r') as f:
            deadline_str = f.read().strip()
            deadline = datetime.strptime(deadline_str, '%Y-%m-%d %H:%M:%S')
            
        if datetime.now() > deadline:
            return jsonify({'success': False, 'message': 'Submission deadline has passed'}), 400

        email = request.form.get('email')
        github = request.form.get('github')
        video = request.form.get('video')

        # Check if email already exists
        existing_submission = Submission.query.filter_by(email=email).first()
        if existing_submission:
            return jsonify({'success': False, 'message': 'Email already used for submission'}), 400

        # Create new submission
        submission = Submission(email=email, github_repo=github, demo_video=video)
        db.session.add(submission)
        db.session.commit()

        return jsonify({'success': True, 'message': 'Submission successful!'})
    except Exception as e:
        logging.error(f"Error in submission: {str(e)}")
        return jsonify({'success': False, 'message': 'An error occurred'}), 500

@app.route('/get_deadline')
def get_deadline():
    try:
        with open('deadline.txt', 'r') as f:
            deadline = f.read().strip()
        return jsonify({'deadline': deadline})
    except Exception as e:
        logging.error(f"Error reading deadline: {str(e)}")
        return jsonify({'error': 'Could not read deadline'}), 500

with app.app_context():
    db.create_all()
