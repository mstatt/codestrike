import os
import json
import csv
import shutil
from datetime import datetime
from flask import Flask, render_template, request, jsonify, session, redirect, url_for
import logging

logging.basicConfig(level=logging.DEBUG)

app = Flask(__name__)
app.secret_key = "a_much_stronger_secret_key"  # Updated secret key for security

HACKATHONS_DIR = 'hackathons'
SUBMISSIONS_FILE = 'submissions.json'
REGISTERED_EMAILS_FILE = 'registered_emails.csv'
ADMIN_CREDENTIALS_FILE = 'admin_credentials.txt'

# Create hackathons directory if it doesn't exist
os.makedirs(HACKATHONS_DIR, exist_ok=True)

def get_active_hackathon():
    """Returns the active hackathon directory name or None if no active hackathon exists."""
    try:
        for dirname in os.listdir(HACKATHONS_DIR):
            if dirname.endswith('_active'):
                return dirname
        return None
    except Exception as e:
        logging.error(f"Error getting active hackathon: {str(e)}")
        return None

def get_hackathon_path(dirname=None):
    """Returns the path to the current hackathon directory."""
    active_dir = dirname or get_active_hackathon()
    return os.path.join(HACKATHONS_DIR, active_dir) if active_dir else None

def create_hackathon_directory(name):
    """Creates a new hackathon directory with required files."""
    dirname = f"{name}_active"
    dirpath = os.path.join(HACKATHONS_DIR, dirname)
    os.makedirs(dirpath, exist_ok=True)

    # Create empty submissions file
    with open(os.path.join(dirpath, SUBMISSIONS_FILE), 'w') as f:
        json.dump([], f)

    # Create emails file with header
    with open(os.path.join(dirpath, REGISTERED_EMAILS_FILE), 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['email'])

    return dirname

def archive_hackathon(active_dirname):
    """Archives the current hackathon by renaming its directory with the end date."""
    try:
        old_path = os.path.join(HACKATHONS_DIR, active_dirname)
        new_name = active_dirname.replace('_active', f"_ended_{datetime.now().strftime('%Y%m%d')}")
        new_path = os.path.join(HACKATHONS_DIR, new_name)
        os.rename(old_path, new_path)
        return True
    except Exception as e:
        logging.error(f"Error archiving hackathon: {str(e)}")
        return False

def load_submissions():
    active_dir = get_hackathon_path()
    if active_dir and os.path.exists(os.path.join(active_dir, SUBMISSIONS_FILE)):
        with open(os.path.join(active_dir, SUBMISSIONS_FILE), 'r') as f:
            return json.load(f)
    return []

def save_submission(submission):
    active_dir = get_hackathon_path()
    if not active_dir:
        raise Exception("No active hackathon found")

    submissions = load_submissions()
    submission['submitted_at'] = datetime.now().isoformat()
    submissions.append(submission)

    with open(os.path.join(active_dir, SUBMISSIONS_FILE), 'w') as f:
        json.dump(submissions, f, indent=2)

def is_registered_email(email):
    try:
        active_dir = get_hackathon_path()
        if not active_dir:
            return False

        emails_file = os.path.join(active_dir, REGISTERED_EMAILS_FILE)
        if not os.path.exists(emails_file):
            return False

        with open(emails_file, 'r') as f:
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
    active_hackathon = get_active_hackathon()
    return render_template('index.html', has_active_hackathon=bool(active_hackathon))

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
        active_dir = get_hackathon_path()
        if not active_dir:
            return jsonify({'success': False, 'message': 'No active hackathon found'}), 400

        deadline_file = os.path.join(active_dir, 'deadline.txt')
        with open(deadline_file, 'r') as f:
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
        active_dir = get_hackathon_path()
        if not active_dir:
            return jsonify({'error': 'Could not read deadline'}), 500
        deadline_file = os.path.join(active_dir, 'deadline.txt')
        with open(deadline_file, 'r') as f:
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
        hackathon_name = request.form.get('hackathon_name')
        deadline = request.form.get('deadline')

        if not hackathon_name or not deadline:
            return jsonify({'success': False, 'message': 'Hackathon name and deadline are required'}), 400

        # Check if there's an active hackathon
        active_hackathon = get_active_hackathon()

        # If there's an active hackathon and it's different from the current one,
        # archive it and create a new one
        if active_hackathon and not active_hackathon.startswith(hackathon_name + '_'):
            archive_hackathon(active_hackathon)
            create_hackathon_directory(hackathon_name)
        elif not active_hackathon:
            create_hackathon_directory(hackathon_name)

        # Update deadline
        active_dir = get_hackathon_path()
        with open(os.path.join(active_dir, 'deadline.txt'), 'w') as f:
            f.write(deadline)

        return jsonify({'success': True, 'message': 'Hackathon updated successfully'})
    except Exception as e:
        logging.error(f"Error in admin update: {str(e)}")
        return jsonify({'success': False, 'message': 'An error occurred'}), 500

@app.route('/get_hackathon_status')
def get_hackathon_status():
    active_dir = get_active_hackathon()
    if not active_dir:
        return jsonify({
            'active': False,
            'message': 'No active hackathon'
        })

    try:
        deadline_file = os.path.join(get_hackathon_path(), 'deadline.txt')
        with open(deadline_file, 'r') as f:
            deadline = f.read().strip()

        name = active_dir.replace('_active', '')
        return jsonify({
            'active': True,
            'name': name,
            'deadline': deadline
        })
    except Exception as e:
        logging.error(f"Error getting hackathon status: {str(e)}")
        return jsonify({
            'active': False,
            'message': 'Error getting hackathon status'
        })

@app.route('/admin/logout')
def admin_logout():
    session.pop('admin', None)
    return redirect(url_for('index'))

@app.route('/admin/emails')
def get_registered_emails():
    if not session.get('admin'):
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401

    try:
        active_dir = get_hackathon_path()
        if not active_dir:
            return jsonify({'success': True, 'emails': []})

        emails_file = os.path.join(active_dir, REGISTERED_EMAILS_FILE)
        with open(emails_file, 'r') as f:
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
        active_dir = get_hackathon_path()
        if not active_dir:
            return jsonify({'success': False, 'message': 'No active hackathon found'}), 400

        data = request.get_json()
        email = data.get('email')

        if not email:
            return jsonify({'success': False, 'message': 'Email is required'}), 400

        # Read existing emails
        existing_emails = []
        emails_file = os.path.join(active_dir, REGISTERED_EMAILS_FILE)
        with open(emails_file, 'r') as f:
            reader = csv.DictReader(f)
            existing_emails = [row['email'].lower() for row in reader]

        if email.lower() in existing_emails:
            return jsonify({'success': False, 'message': 'Email already exists'}), 400

        # Append new email
        with open(emails_file, 'a', newline='') as f:
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
        active_dir = get_hackathon_path()
        if not active_dir:
            return jsonify({'success': False, 'message': 'No active hackathon found'}), 400

        data = request.get_json()
        old_email = data.get('oldEmail')
        new_email = data.get('newEmail')

        if not old_email or not new_email:
            return jsonify({'success': False, 'message': 'Both old and new email are required'}), 400

        # Read all emails
        rows = []
        email_updated = False
        emails_file = os.path.join(active_dir, REGISTERED_EMAILS_FILE)
        with open(emails_file, 'r') as f:
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
        with open(emails_file, 'w', newline='') as f:
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
        active_dir = get_hackathon_path()
        if not active_dir:
            return jsonify({'success': False, 'message': 'No active hackathon found'}), 400

        data = request.get_json()
        email = data.get('email')

        if not email:
            return jsonify({'success': False, 'message': 'Email is required'}), 400

        # Read all emails except the one to delete
        rows = []
        email_found = False
        emails_file = os.path.join(active_dir, REGISTERED_EMAILS_FILE)
        with open(emails_file, 'r') as f:
            reader = csv.DictReader(f)
            for row in reader:
                if row['email'].lower() != email.lower():
                    rows.append(row)
                else:
                    email_found = True

        if not email_found:
            return jsonify({'success': False, 'message': 'Email not found'}), 404

        # Write back remaining emails
        with open(emails_file, 'w', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=['email'])
            writer.writeheader()
            writer.writerows(rows)

        return jsonify({'success': True, 'message': 'Email deleted successfully'})
    except Exception as e:
        logging.error(f"Error deleting email: {str(e)}")
        return jsonify({'success': False, 'message': 'Error deleting email'}), 500

# Add these new route handlers after the existing routes

@app.route('/admin/hackathons')
def get_hackathons():
    if not session.get('admin'):
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401

    try:
        hackathons = []
        active_hackathon = get_active_hackathon()

        for dirname in os.listdir(HACKATHONS_DIR):
            if dirname.endswith('_active'):
                name = dirname.replace('_active', '')
                hackathons.append({
                    'name': name,
                    'status': 'active'
                })
            elif dirname.endswith('_ended'):
                name = dirname.split('_ended_')[0]
                hackathons.append({
                    'name': name,
                    'status': 'ended'
                })
            elif '_deactivated_' in dirname:
                name = dirname.split('_deactivated_')[0]
                hackathons.append({
                    'name': name,
                    'status': 'deactivated'
                })

        return jsonify({'success': True, 'hackathons': hackathons})
    except Exception as e:
        logging.error(f"Error getting hackathons: {str(e)}")
        return jsonify({'success': False, 'message': 'Error getting hackathons'}), 500

@app.route('/admin/hackathons/activate', methods=['POST'])
def activate_hackathon():
    if not session.get('admin'):
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401

    try:
        data = request.get_json()
        name = data.get('name')

        if not name:
            return jsonify({'success': False, 'message': 'Hackathon name is required'}), 400

        # Check if there's already an active hackathon
        active_hackathon = get_active_hackathon()
        if active_hackathon:
            return jsonify({
                'success': False,
                'message': 'Another hackathon is already active. Please deactivate it first.'
            }), 400

        # Find the deactivated hackathon directory
        deactivated_dirname = None
        for dirname in os.listdir(HACKATHONS_DIR):
            if dirname.startswith(name + '_deactivated_'):
                deactivated_dirname = dirname
                break

        if not deactivated_dirname:
            return jsonify({'success': False, 'message': 'Hackathon not found'}), 404

        # Rename the directory to make it active
        old_path = os.path.join(HACKATHONS_DIR, deactivated_dirname)
        new_dirname = f"{name}_active"
        new_path = os.path.join(HACKATHONS_DIR, new_dirname)
        os.rename(old_path, new_path)

        return jsonify({'success': True, 'message': 'Hackathon activated successfully'})
    except Exception as e:
        logging.error(f"Error activating hackathon: {str(e)}")
        return jsonify({'success': False, 'message': 'Error activating hackathon'}), 500

@app.route('/admin/hackathons/deactivate', methods=['POST'])
def deactivate_hackathon():
    if not session.get('admin'):
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401

    try:
        data = request.get_json()
        name = data.get('name')

        if not name:
            return jsonify({'success': False, 'message': 'Hackathon name is required'}), 400

        # Find the active hackathon directory
        active_dirname = get_active_hackathon()
        if not active_dirname or not active_dirname.startswith(name + '_'):
            return jsonify({'success': False, 'message': 'Hackathon not found or not active'}), 404

        # Rename the directory to deactivated with timestamp
        old_path = os.path.join(HACKATHONS_DIR, active_dirname)
        new_dirname = f"{name}_deactivated_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        new_path = os.path.join(HACKATHONS_DIR, new_dirname)
        os.rename(old_path, new_path)

        return jsonify({'success': True, 'message': 'Hackathon deactivated successfully'})
    except Exception as e:
        logging.error(f"Error deactivating hackathon: {str(e)}")
        return jsonify({'success': False, 'message': 'Error deactivating hackathon'}), 500

if __name__ == '__main__':
    app.run(debug=True)