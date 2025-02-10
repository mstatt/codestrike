import os
import json
import csv
from datetime import datetime
from flask import Flask, render_template, request, jsonify, session, redirect, url_for
import logging

logging.basicConfig(level=logging.DEBUG)

app = Flask(__name__)
app.secret_key = "a_much_stronger_secret_key" # Updated secret key for security

SUBMISSIONS_FILE = 'submissions.json'
REGISTERED_EMAILS_FILE = 'registered_emails.csv'
ADMIN_CREDENTIALS_FILE = 'admin_credentials.txt'

# Create admin credentials file with clear text for testing
with open(ADMIN_CREDENTIALS_FILE, 'w') as f:
    f.write('admin@hack.com:WhyN0tM3#')

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
            if len(stored_credentials) != 2:
                logging.error(f"Invalid credential format: {stored_credentials}")
                return False
            stored_email, stored_password = stored_credentials
            logging.debug(f"Login attempt - Email: {email}, Stored email: {stored_email}")
            return email == stored_email and password == stored_password
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
        with open('deadline.txt', 'r') as f:
            deadline_str = f.read().strip()
            deadline = datetime.strptime(deadline_str, '%m/%d/%Y, %I:%M:%S %p')

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

        submissions = load_submissions()

        if any(s['email'] == email for s in submissions):
            return jsonify({'success': False, 'message': 'Email already used for submission'}), 400

        if any(s['github_repo'] == github for s in submissions):
            return jsonify({'success': False, 'message': 'This GitHub repository has already been submitted'}), 400

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

        logging.debug(f"Admin login attempt with email: {email}")

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

@app.route('/admin/emails')
def get_registered_emails():
    if not session.get('admin'):
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401

    try:
        with open(REGISTERED_EMAILS_FILE, 'r') as f:
            reader = csv.DictReader(f)
            emails = [row['email'] for row in reader]
        return jsonify({'success': True, 'emails': emails})
    except Exception as e:
        logging.error(f"Error reading emails: {str(e)}")
        return jsonify({'success': False, 'message': 'Error reading emails'}), 500

@app.route('/admin/emails/add', methods=['POST'])
def add_email():
    if not session.get('admin'):
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401

    try:
        data = request.get_json()
        email = data.get('email')

        if not email:
            return jsonify({'success': False, 'message': 'Email is required'}), 400

        # Read existing emails
        existing_emails = []
        with open(REGISTERED_EMAILS_FILE, 'r') as f:
            reader = csv.DictReader(f)
            existing_emails = [row['email'].lower() for row in reader]

        if email.lower() in existing_emails:
            return jsonify({'success': False, 'message': 'Email already exists'}), 400

        # Append new email
        with open(REGISTERED_EMAILS_FILE, 'a', newline='') as f:
            writer = csv.writer(f)
            writer.writerow([email])

        return jsonify({'success': True, 'message': 'Email added successfully'})
    except Exception as e:
        logging.error(f"Error adding email: {str(e)}")
        return jsonify({'success': False, 'message': 'Error adding email'}), 500

@app.route('/admin/emails/update', methods=['POST'])
def update_email():
    if not session.get('admin'):
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401

    try:
        data = request.get_json()
        old_email = data.get('oldEmail')
        new_email = data.get('newEmail')

        if not old_email or not new_email:
            return jsonify({'success': False, 'message': 'Both old and new email are required'}), 400

        # Read all emails
        rows = []
        email_updated = False
        with open(REGISTERED_EMAILS_FILE, 'r') as f:
            reader = csv.DictReader(f)
            for row in reader:
                if row['email'].lower() == old_email.lower():
                    rows.append({'email': new_email})
                    email_updated = True
                else:
                    rows.append(row)

        if not email_updated:
            return jsonify({'success': False, 'message': 'Email not found'}), 404

        # Write back all emails
        with open(REGISTERED_EMAILS_FILE, 'w', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=['email'])
            writer.writeheader()
            writer.writerows(rows)

        return jsonify({'success': True, 'message': 'Email updated successfully'})
    except Exception as e:
        logging.error(f"Error updating email: {str(e)}")
        return jsonify({'success': False, 'message': 'Error updating email'}), 500

@app.route('/admin/emails/delete', methods=['POST'])
def delete_email():
    if not session.get('admin'):
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401

    try:
        data = request.get_json()
        email = data.get('email')

        if not email:
            return jsonify({'success': False, 'message': 'Email is required'}), 400

        # Read all emails except the one to delete
        rows = []
        email_found = False
        with open(REGISTERED_EMAILS_FILE, 'r') as f:
            reader = csv.DictReader(f)
            for row in reader:
                if row['email'].lower() != email.lower():
                    rows.append(row)
                else:
                    email_found = True

        if not email_found:
            return jsonify({'success': False, 'message': 'Email not found'}), 404

        # Write back remaining emails
        with open(REGISTERED_EMAILS_FILE, 'w', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=['email'])
            writer.writeheader()
            writer.writerows(rows)

        return jsonify({'success': True, 'message': 'Email deleted successfully'})
    except Exception as e:
        logging.error(f"Error deleting email: {str(e)}")
        return jsonify({'success': False, 'message': 'Error deleting email'}), 500

if __name__ == '__main__':
    app.run(debug=True)