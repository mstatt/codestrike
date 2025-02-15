import os
import json
import csv
from datetime import datetime
from flask import Flask, render_template, request, jsonify, session, redirect, url_for
import logging
from werkzeug.utils import secure_filename

logging.basicConfig(level=logging.DEBUG)

app = Flask(__name__)
app.secret_key = "a_much_stronger_secret_key"

# Add custom datetime filter
@app.template_filter('parse_datetime')
def parse_datetime(date_string):
    if not date_string:
        return None
    try:
        return datetime.strptime(date_string, '%m/%d/%Y, %I:%M:%S %p')
    except ValueError:
        return None

SUBMISSIONS_FILE = 'submissions.json'
USERS_AND_TEAMS_FILE = 'users_and_teams.json'
ADMIN_CREDENTIALS_FILE = 'admin_credentials.txt'
HACKATHON_DETAILS_FILE = 'hackathon_details.json'

UPLOAD_FOLDER = 'static/images'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'svg'}

# Create users and teams file if it doesn't exist
if not os.path.exists(USERS_AND_TEAMS_FILE):
    with open(USERS_AND_TEAMS_FILE, 'w') as f:
        json.dump({'teams': [], 'users': []}, f, indent=2)

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

def load_users_and_teams():
    try:
        with open(USERS_AND_TEAMS_FILE, 'r') as f:
            data = json.load(f)
            return data.get('teams', []), data.get('users', [])
    except Exception as e:
        logging.error(f"Error loading users and teams: {str(e)}")
        return [], []

def save_users_and_teams(teams, users):
    try:
        with open(USERS_AND_TEAMS_FILE, 'w') as f:
            json.dump({'teams': teams, 'users': users}, f, indent=2)
    except Exception as e:
        logging.error(f"Error saving users and teams: {str(e)}")

def is_registered_email(email):
    try:
        teams, users = load_users_and_teams()
        return any(user['email'].lower() == email.lower() for user in users)
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

def load_hackathon_details():
    try:
        if os.path.exists(HACKATHON_DETAILS_FILE):
            with open(HACKATHON_DETAILS_FILE, 'r') as f:
                return json.load(f)
        return {
            "title": "FALCONS.AI Hack-a-thon",
            "description": "Join us for an exciting hackathon!",
            "deadline": "",
            "rules": [],
            "prizes": {"first": "$5,000", "second": "$3,000", "third": "$2,000"}
        }
    except Exception as e:
        logging.error(f"Error loading hackathon details: {str(e)}")
        return {}

def save_hackathon_details(details):
    try:
        with open(HACKATHON_DETAILS_FILE, 'w') as f:
            json.dump(details, f, indent=2)
        return True
    except Exception as e:
        logging.error(f"Error saving hackathon details: {str(e)}")
        return False

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/')
def index():
    hackathon_details = load_hackathon_details()
    return render_template('index.html', 
                         hackathon_details=hackathon_details,
                         now=datetime.now())

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
        details = load_hackathon_details()
        deadline_str = details.get('deadline', '')
        if deadline_str:
            deadline = datetime.strptime(deadline_str, '%m/%d/%Y, %I:%M:%S %p')
            if datetime.now() > deadline:
                return jsonify({'success': False, 'message': 'Submission deadline has passed'}), 400

        email = request.form.get('email')
        team_name = request.form.get('team_name')
        project_name = request.form.get('project_name')  
        github = request.form.get('github')
        video = request.form.get('video')
        live_demo_url = request.form.get('live_demo_url')
        demo_username = request.form.get('demo_username')
        demo_password = request.form.get('demo_password')

        if not all([email, team_name, project_name, github, video, live_demo_url]):  
            return jsonify({'success': False, 'message': 'All required fields must be filled'}), 400

        if not is_registered_email(email):
            return jsonify({'success': False, 'message': 'Email not registered for the hackathon'}), 400

        submissions = load_submissions()

        if any(s['email'] == email for s in submissions):
            return jsonify({'success': False, 'message': 'Email already used for submission'}), 400

        if any(s['github_repo'] == github for s in submissions):
            return jsonify({'success': False, 'message': 'This GitHub repository has already been submitted'}), 400

        submission = {
            'email': email,
            'team_name': team_name,
            'project_name': project_name,  
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
        details = load_hackathon_details()
        return jsonify({'deadline': details.get('deadline', '')})
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
        # Load current details
        current_details = load_hackathon_details()

        # Handle image upload
        if 'logo' in request.files:
            file = request.files['logo']
            if file and file.filename and allowed_file(file.filename):
                filename = secure_filename(file.filename)
                file.save(os.path.join(UPLOAD_FOLDER, filename))
                current_details['image'] = filename

        # Update deadline if provided
        deadline = request.form.get('deadline')
        if deadline:
            try:
                parsed_deadline = datetime.strptime(deadline, '%Y-%m-%dT%H:%M')
                formatted_deadline = parsed_deadline.strftime('%m/%d/%Y, %I:%M:%S %p')
                current_details['deadline'] = formatted_deadline
            except ValueError as e:
                return jsonify({'success': False, 'message': 'Invalid deadline format'}), 400

        # Update other fields if provided
        if request.form.get('title'):
            current_details['title'] = request.form.get('title')
        if request.form.get('description'):
            current_details['description'] = request.form.get('description')
        if request.form.get('rules'):
            current_details['rules'] = request.form.get('rules').split('\n')

        # Update prizes
        prizes = current_details.get('prizes', {})
        if request.form.get('first_prize'):
            prizes['first'] = request.form.get('first_prize')
        if request.form.get('second_prize'):
            prizes['second'] = request.form.get('second_prize')
        if request.form.get('third_prize'):
            prizes['third'] = request.form.get('third_prize')
        current_details['prizes'] = prizes

        # Save updated details
        if save_hackathon_details(current_details):
            return jsonify({
                'success': True, 
                'message': 'Updates successful',
                'details': current_details
            })
        return jsonify({'success': False, 'message': 'Failed to save updates'}), 500

    except Exception as e:
        logging.error(f"Error in admin update: {str(e)}")
        return jsonify({'success': False, 'message': 'An error occurred'}), 500

@app.route('/admin/teams', methods=['GET'])
def get_teams():
    if not session.get('admin'):
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401

    try:
        teams, _ = load_users_and_teams()
        return jsonify({'success': True, 'teams': teams})
    except Exception as e:
        logging.error(f"Error loading teams: {str(e)}")
        return jsonify({'success': False, 'message': 'Error loading teams'}), 500

@app.route('/admin/teams/add', methods=['POST'])
def add_team():
    if not session.get('admin'):
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401

    try:
        data = request.get_json()
        team_name = data.get('team_name')

        if not team_name:
            return jsonify({'success': False, 'message': 'Team name is required'}), 400

        teams, users = load_users_and_teams()
        if team_name in teams:
            return jsonify({'success': False, 'message': 'Team already exists'}), 400

        teams.append(team_name)
        save_users_and_teams(teams, users)

        return jsonify({'success': True, 'message': 'Team added successfully'})
    except Exception as e:
        logging.error(f"Error adding team: {str(e)}")
        return jsonify({'success': False, 'message': 'Error adding team'}), 500

@app.route('/admin/teams/update', methods=['POST'])
def update_team():
    if not session.get('admin'):
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401

    try:
        data = request.get_json()
        old_team_name = data.get('old_team_name')
        new_team_name = data.get('new_team_name')

        if not old_team_name or not new_team_name:
            return jsonify({'success': False, 'message': 'Both old and new team names are required'}), 400

        teams, users = load_users_and_teams()
        if old_team_name not in teams:
            return jsonify({'success': False, 'message': 'Team not found'}), 404

        if new_team_name in teams:
            return jsonify({'success': False, 'message': 'New team name already exists'}), 400

        # Update team name in teams list
        teams[teams.index(old_team_name)] = new_team_name

        # Update team name in users' assignments
        for user in users:
            if user.get('team') == old_team_name:
                user['team'] = new_team_name

        save_users_and_teams(teams, users)

        return jsonify({'success': True, 'message': 'Team updated successfully'})
    except Exception as e:
        logging.error(f"Error updating team: {str(e)}")
        return jsonify({'success': False, 'message': 'Error updating team'}), 500

@app.route('/admin/teams/delete', methods=['POST'])
def delete_team():
    if not session.get('admin'):
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401

    try:
        data = request.get_json()
        team_name = data.get('team_name')

        if not team_name:
            return jsonify({'success': False, 'message': 'Team name is required'}), 400

        teams, users = load_users_and_teams()
        if team_name not in teams:
            return jsonify({'success': False, 'message': 'Team not found'}), 404

        teams.remove(team_name)

        # Remove team assignment from users
        for user in users:
            if user.get('team') == team_name:
                user['team'] = ''

        save_users_and_teams(teams, users)

        return jsonify({'success': True, 'message': 'Team deleted successfully'})
    except Exception as e:
        logging.error(f"Error deleting team: {str(e)}")
        return jsonify({'success': False, 'message': 'Error deleting team'}), 500

@app.route('/admin/emails/add', methods=['POST'])
def add_email():
    if not session.get('admin'):
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401

    try:
        data = request.get_json()
        email = data.get('email')
        team = data.get('team', '')

        if not email:
            return jsonify({'success': False, 'message': 'Email is required'}), 400

        teams, users = load_users_and_teams()
        if team and team not in teams:
            return jsonify({'success': False, 'message': 'Invalid team'}), 400

        if any(user['email'].lower() == email.lower() for user in users):
            return jsonify({'success': False, 'message': 'Email already exists'}), 400

        users.append({'email': email, 'team': team})
        save_users_and_teams(teams, users)

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
        old_email = data.get('old_email')
        new_email = data.get('new_email')
        team = data.get('team', '')

        if not old_email or not new_email:
            return jsonify({'success': False, 'message': 'Both old and new email are required'}), 400

        teams, users = load_users_and_teams()
        if team and team not in teams:
            return jsonify({'success': False, 'message': 'Invalid team'}), 400

        user_found = False
        for user in users:
            if user['email'].lower() == old_email.lower():
                user['email'] = new_email
                if team:
                    user['team'] = team
                user_found = True
                break

        if not user_found:
            return jsonify({'success': False, 'message': 'Email not found'}), 404

        save_users_and_teams(teams, users)

        return jsonify({'success': True, 'message': 'Email updated successfully'})
    except Exception as e:
        logging.error(f"Error updating email: {str(e)}")
        return jsonify({'success': False, 'message': 'Error updating email'}), 500

@app.route('/admin/emails/update-team', methods=['POST'])
def update_email_team():
    if not session.get('admin'):
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401

    try:
        data = request.get_json()
        email = data.get('email')
        team = data.get('team', '')

        if not email:
            return jsonify({'success': False, 'message': 'Email is required'}), 400

        teams, users = load_users_and_teams()
        if team and team not in teams:
            return jsonify({'success': False, 'message': 'Invalid team'}), 400

        user_found = False
        for user in users:
            if user['email'].lower() == email.lower():
                user['team'] = team
                user_found = True
                break

        if not user_found:
            return jsonify({'success': False, 'message': 'Email not found'}), 404

        save_users_and_teams(teams, users)

        return jsonify({'success': True, 'message': 'Team assignment updated successfully'})
    except Exception as e:
        logging.error(f"Error updating team assignment: {str(e)}")
        return jsonify({'success': False, 'message': 'Error updating team assignment'}), 500


@app.route('/admin/emails/delete', methods=['POST'])
def delete_email():
    if not session.get('admin'):
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401

    try:
        data = request.get_json()
        email = data.get('email')

        if not email:
            return jsonify({'success': False, 'message': 'Email is required'}), 400

        teams, users = load_users_and_teams()
        users = [user for user in users if user['email'].lower() != email.lower()]
        save_users_and_teams(teams, users)

        return jsonify({'success': True, 'message': 'Email deleted successfully'})
    except Exception as e:
        logging.error(f"Error deleting email: {str(e)}")
        return jsonify({'success': False, 'message': 'Error deleting email'}), 500

@app.route('/admin/emails')
def get_registered_emails():
    if not session.get('admin'):
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401

    try:
        _, users = load_users_and_teams()
        return jsonify({'success': True, 'emails': users})
    except Exception as e:
        logging.error(f"Error reading emails: {str(e)}")
        return jsonify({'success': False, 'message': 'Error reading emails'}), 500

@app.route('/winners')
def get_winners():
    try:
        with open('winners.csv', 'r') as f:
            reader = csv.DictReader(f)
            winners = list(reader)
            for winner in winners:
                winner['points'] = int(winner['points'])
            winners.sort(key=lambda x: x['points'], reverse=True)
        return jsonify({'winners': winners})
    except Exception as e:
        logging.error(f"Error loading winners: {str(e)}")
        return jsonify({'error': 'Could not load winners'}), 500

@app.route('/admin/winners', methods=['GET'])
def get_admin_winners():
    if not session.get('admin'):
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401

    try:
        with open('winners.csv', 'r') as f:
            reader = csv.DictReader(f)
            winners = list(reader)
        return jsonify({'success': True, 'winners': winners})
    except Exception as e:
        logging.error(f"Error reading winners: {str(e)}")
        return jsonify({'success': False, 'message': 'Error reading winners'}), 500

@app.route('/admin/winners/add', methods=['POST'])
def add_winner():
    if not session.get('admin'):
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401

    try:
        data = request.get_json()
        team_name = data.get('team_name')
        project_name = data.get('project_name')
        points = data.get('points')

        if not all([team_name, project_name, points]):
            return jsonify({'success': False, 'message': 'All fields are required'}), 400

        winners = []
        with open('winners.csv', 'r') as f:
            reader = csv.DictReader(f)
            winners = list(reader)

        winners.append({
            'team_name': team_name,
            'project_name': project_name,
            'points': points
        })

        with open('winners.csv', 'w', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=['team_name', 'project_name', 'points'])
            writer.writeheader()
            writer.writerows(winners)

        return jsonify({'success': True, 'message': 'Winner added successfully'})
    except Exception as e:
        logging.error(f"Error adding winner: {str(e)}")
        return jsonify({'success': False, 'message': 'Error adding winner'}), 500

@app.route('/admin/winners/update', methods=['POST'])
def update_winner():
    if not session.get('admin'):
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401

    try:
        data = request.get_json()
        old_team_name = data.get('old_team_name')
        team_name = data.get('team_name')
        project_name = data.get('project_name')
        points = data.get('points')

        if not all([old_team_name, team_name, project_name, points]):
            return jsonify({'success': False, 'message': 'All fields are required'}), 400

        winners = []
        winner_updated = False
        with open('winners.csv', 'r') as f:
            reader = csv.DictReader(f)
            for row in reader:
                if row['team_name'] == old_team_name:
                    winners.append({
                        'team_name': team_name,
                        'project_name': project_name,
                        'points': points
                    })
                    winner_updated = True
                else:
                    winners.append(row)

        if not winner_updated:
            return jsonify({'success': False, 'message': 'Winner not found'}), 404

        with open('winners.csv', 'w', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=['team_name', 'project_name', 'points'])
            writer.writeheader()
            writer.writerows(winners)

        return jsonify({'success': True, 'message': 'Winner updated successfully'})
    except Exception as e:
        logging.error(f"Error updating winner: {str(e)}")
        return jsonify({'success': False, 'message': 'Error updating winner'}), 500

@app.route('/admin/winners/delete', methods=['POST'])
def delete_winner():
    if not session.get('admin'):
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401

    try:
        data = request.get_json()
        team_name = data.get('team_name')

        if not team_name:
            return jsonify({'success': False, 'message': 'Team name is required'}), 400

        winners = []
        winner_found = False
        with open('winners.csv', 'r') as f:
            reader = csv.DictReader(f)
            for row in reader:
                if row['team_name'] != team_name:
                    winners.append(row)
                else:
                    winner_found = True

        if not winner_found:
            return jsonify({'success': False, 'message': 'Winner not found'}), 404

        with open('winners.csv', 'w', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=['team_name', 'project_name', 'points'])
            writer.writeheader()
            writer.writerows(winners)

        return jsonify({'success': True, 'message': 'Winner deleted successfully'})
    except Exception as e:
        logging.error(f"Error deleting winner: {str(e)}")
        return jsonify({'success': False, 'message': 'Error deleting winner'}), 500

@app.route('/admin/logout')
def admin_logout():
    session.pop('admin', None)
    return jsonify({'success': True, 'message': 'Logged out successfully'})

@app.route('/hackathon-details')
def get_hackathon_details():
    try:
        details = load_hackathon_details()
        return jsonify(details)
    except Exception as e:
        logging.error(f"Error getting hackathon details: {str(e)}")
        return jsonify({'error': 'Could not load hackathon details'}), 500

@app.route('/check_github', methods=['POST'])
def check_github():
    try:
        github = request.form.get('github', '').strip()
        
        if not github:
            return jsonify({'success': False, 'message': 'GitHub URL is required'}), 400

        submissions = load_submissions()
        
        # Check if GitHub URL already exists in submissions
        if any(s.get('github_repo') == github for s in submissions):
            return jsonify({'success': False, 'message': 'GitHub repository already submitted'}), 400

        return jsonify({'success': True, 'message': 'GitHub URL is unique'}), 200
    except Exception as e:
        logging.error(f"Error checking GitHub URL: {str(e)}")
        return jsonify({'success': False, 'message': 'Error checking GitHub URL'}), 500

if __name__ == '__main__':
    app.run(debug=True)