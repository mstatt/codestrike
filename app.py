import os
import json
from datetime import datetime
from flask import Flask, render_template, request, jsonify
import logging

logging.basicConfig(level=logging.DEBUG)

app = Flask(__name__)
app.secret_key = "hackathon_submission_secret_key"

SUBMISSIONS_FILE = 'submissions.json'

def load_submissions():
    if os.path.exists(SUBMISSIONS_FILE):
        with open(SUBMISSIONS_FILE, 'r') as f:
            return json.load(f)
    return []

def save_submission(submission):
    submissions = load_submissions()
    submission['submitted_at'] = datetime.now().isoformat()
    submissions.append(submission)
    with open(SUBMISSIONS_FILE, 'w') as f:
        json.dump(submissions, f, indent=2)

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

        # Load existing submissions
        submissions = load_submissions()

        # Check if email already exists
        if any(s['email'] == email for s in submissions):
            return jsonify({'success': False, 'message': 'Email already used for submission'}), 400

        # Check if GitHub repository already exists
        if any(s['github_repo'] == github for s in submissions):
            return jsonify({'success': False, 'message': 'This GitHub repository has already been submitted'}), 400

        # Create new submission
        submission = {
            'email': email,
            'github_repo': github,
            'demo_video': video
        }
        save_submission(submission)

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