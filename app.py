import os
import json
import csv
from datetime import datetime
from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from werkzeug.security import check_password_hash, generate_password_hash
import logging

logging.basicConfig(level=logging.DEBUG)

app = Flask(__name__)
app.secret_key = "hackathon_submission_secret_key"

SUBMISSIONS_FILE = 'submissions.json'
REGISTERED_EMAILS_FILE = 'registered_emails.csv'
ADMIN_CREDENTIALS_FILE = 'admin_credentials.txt'

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

def is_registered_email(email):
    try:
        with open(REGISTERED_EMAILS_FILE, 'r') as f:
            reader = csv.DictReader(f)
            registered_emails = [row['email'].lower() for row in reader]
            return email.lower() in registered_emails
    except Exception as e:
        logging.error(f"Error checking registered emails: {str(e)}")
        return False

def verify_admin_credentials(email, password):
    try:
        with open(ADMIN_CREDENTIALS_FILE, 'r') as f:
            stored_credentials = f.read().strip().split(':')
            stored_email = stored_credentials[0]
            stored_password_hash = stored_credentials[1]
            return email == stored_email and check_password_hash(stored_password_hash, password)
    except Exception as e:
        logging.error(f"Error verifying admin credentials: {str(e)}")
        return False

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/verify_email', methods=['POST'])
def verify_email():
    try:
        email = request.form.get('email')
        if not email:
            return jsonify({'success': False, 'message': 'Email is required'}), 400

        if is_registered_email(email):
            return jsonify({'success': True, 'message': 'Email verified successfully'})
        else:
            return jsonify({'success': False, 'message': 'Email not found in registered list'}), 400
    except Exception as e:
        logging.error(f"Error in email verification: {str(e)}")
        return jsonify({'success': False, 'message': 'An error occurred'}), 500

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
        live_demo_url = request.form.get('live_demo_url')
        demo_username = request.form.get('demo_username')
        demo_password = request.form.get('demo_password')

        if not is_registered_email(email):
            return jsonify({'success': False, 'message': 'Email not registered for the hackathon'}), 400

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
            'demo_video': video,
            'live_demo_url': live_demo_url,
            'demo_credentials': {
                'username': demo_username,
                'password': demo_password
            } if demo_username and demo_password else None
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

@app.route('/submissions')
def get_submissions():
    try:
        submissions = load_submissions()
        return jsonify({'submissions': submissions})
    except Exception as e:
        logging.error(f"Error loading submissions: {str(e)}")
        return jsonify({'error': 'Could not load submissions'}), 500

@app.route('/admin/login', methods=['POST'])
def admin_login():
    try:
        email = request.form.get('email')
        password = request.form.get('password')

        if verify_admin_credentials(email, password):
            session['admin'] = True
            return jsonify({'success': True})
        return jsonify({'success': False, 'message': 'Invalid credentials'}), 401
    except Exception as e:
        logging.error(f"Error in admin login: {str(e)}")
        return jsonify({'success': False, 'message': 'An error occurred'}), 500

@app.route('/admin/update', methods=['POST'])
def admin_update():
    if not session.get('admin'):
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401

    try:
        deadline = request.form.get('deadline')
        if deadline:
            with open('deadline.txt', 'w') as f:
                f.write(deadline)

        new_email = request.form.get('new_email')
        if new_email:
            with open(REGISTERED_EMAILS_FILE, 'a', newline='') as f:
                writer = csv.writer(f)
                writer.writerow([new_email])

        return jsonify({'success': True, 'message': 'Updates successful'})
    except Exception as e:
        logging.error(f"Error in admin update: {str(e)}")
        return jsonify({'success': False, 'message': 'An error occurred'}), 500

@app.route('/admin/logout')
def admin_logout():
    session.pop('admin', None)
    return redirect(url_for('index'))