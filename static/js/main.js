document.addEventListener('DOMContentLoaded', function() {
    // Initialize bootstrap modals
    var modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        new bootstrap.Modal(modal);
    });

    // Form validation
    const projectSubmissionForm = document.getElementById('projectSubmissionForm');
    if (projectSubmissionForm) {
        projectSubmissionForm.addEventListener('submit', handleSubmission);
    }

    // Add admin-related event listeners
    const adminLoginForm = document.getElementById('adminLoginForm');
    if (adminLoginForm) {
        adminLoginForm.addEventListener('submit', function(event) {
            event.preventDefault();
            const email = document.getElementById('adminEmail').value;
            const password = document.getElementById('adminPassword').value;

            if (!email || !password) {
                showAlert('Please fill in all fields', 'danger');
                return;
            }

            handleAdminLogin(event);
        });
    }

    // Add event listener for winners modal
    const winnersModal = document.getElementById('winnersModal');
    if (winnersModal) {
        winnersModal.addEventListener('show.bs.modal', loadWinners);
    }

    // Initialize the page
    updateHackathonDeadlines();
    initializeCountdown();

    // Ensure proper modal cleanup on hide
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('hidden.bs.modal', function() {
            const forms = this.querySelectorAll('form');
            forms.forEach(form => form.reset());
            const alerts = this.querySelectorAll('.alert');
            alerts.forEach(alert => alert.remove());
        });
    });
});

function updateHackathonDeadlines() {
    fetch('/hackathon-details')
        .then(response => response.json())
        .then(data => {
            if (data.deadline) {
                const deadline = new Date(data.deadline.replace(/,/, '')); 
                const formattedDeadline = deadline.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });

                const deadlineDisplay = document.querySelector('.deadline-display');
                if (deadlineDisplay) {
                    deadlineDisplay.textContent = `Submission Deadline: ${formattedDeadline}`;
                }
            }
        })
        .catch(error => {
            console.error('Error loading hackathon details:', error);
            showAlert('Error loading hackathon details', 'danger');
        });
}

function initializeCountdown() {
    fetch('/get_deadline')
        .then(response => response.json())
        .then(data => {
            const countdown = document.getElementById('countdown');

            if (!data.deadline) {
                if (countdown) countdown.innerHTML = "No deadline set";
                return;
            }

            const deadline = new Date(data.deadline);
            if (isNaN(deadline.getTime())) {
                if (countdown) countdown.innerHTML = "Invalid deadline";
                return;
            }

            const deadlineTime = deadline.getTime();
            const timer = setInterval(() => {
                const now = new Date().getTime();
                const distance = deadlineTime - now;

                if (distance < 0) {
                    clearInterval(timer);
                    if (countdown) countdown.innerHTML = "Ended";
                    const submissionFormModal = document.getElementById('submissionFormModal');
                    if (submissionFormModal) {
                        submissionFormModal.classList.add('d-none');
                    }
                    return;
                }

                const days = Math.floor(distance / (1000 * 60 * 60 * 24));
                const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((distance % (1000 * 60)) / 1000);

                if (countdown) {
                    countdown.innerHTML = `${days}d ${hours}h ${minutes}m ${seconds}s`;
                }
            }, 1000);
        })
        .catch(error => {
            console.error('Error fetching deadline:', error);
            const countdown = document.getElementById('countdown');
            if (countdown) {
                countdown.innerHTML = "Error loading deadline";
            }
        });
}

function showAlert(message, type = 'danger') {
    const alertContainer = document.getElementById('alertContainer');
    if (!alertContainer) return;

    const alert = document.createElement('div');
    alert.className = `alert alert-${type} alert-dismissible fade show`;
    alert.role = 'alert';
    alert.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    alertContainer.appendChild(alert);

    setTimeout(() => {
        alert.classList.remove('show');
        setTimeout(() => alert.remove(), 150);
    }, 5000);
}

function handleSubmission(event) {
    event.preventDefault();
    const formData = new FormData(event.target);

    fetch('/submit', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showAlert(data.message, 'success');
            event.target.reset();

            // Close the modal after successful submission
            const modal = bootstrap.Modal.getInstance(document.getElementById('submissionFormModal'));
            if (modal) modal.hide();

            loadSubmissions();
        } else {
            showAlert(data.message, 'danger');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showAlert('An error occurred while submitting the form');
    });
}

function loadSubmissions() {
    fetch('/submissions')
        .then(response => response.json())
        .then(data => {
            const submissionsList = document.getElementById('submissionsList');
            if (!submissionsList) return;

            submissionsList.innerHTML = '';
            if (!data.submissions || data.submissions.length === 0) {
                submissionsList.innerHTML = '<div class="text-center">No submissions yet.</div>';
                return;
            }

            data.submissions
                .sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at))
                .forEach(submission => {
                    const submissionDate = new Date(submission.submitted_at).toLocaleString();
                    const item = document.createElement('div');
                    item.className = 'list-group-item';
                    item.innerHTML = `
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <h5 class="mb-2">${submission.team_name}</h5>
                                <p class="mb-2"><strong>Project:</strong> ${submission.project_name}</p>
                                <strong>Email:</strong> ${submission.email}<br>
                                <strong>GitHub:</strong> <a href="${submission.github_repo}" target="_blank">${submission.github_repo}</a><br>
                                <strong>Demo Video:</strong> <a href="${submission.demo_video}" target="_blank">View Demo</a><br>
                                <strong>Live Demo:</strong> <a href="${submission.live_demo_url}" target="_blank">View Live Demo</a>
                            </div>
                            <small class="text-muted">${submissionDate}</small>
                        </div>
                    `;
                    submissionsList.appendChild(item);
                });
        })
        .catch(error => {
            console.error('Error loading submissions:', error);
            showAlert('Error loading submissions');
        });
}

function handleAdminLogin(event) {
    const formData = new FormData(event.target);
    const adminModal = document.getElementById('adminModal');

    fetch('/admin/login', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            const modal = bootstrap.Modal.getInstance(adminModal);
            if (modal) {
                modal.hide();
                event.target.reset();
                showAlert('Successfully logged in as admin', 'success');

                // Refresh the page after successful login
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            }
        } else {
            showAlert(data.message || 'Invalid credentials', 'danger');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showAlert('An error occurred during login. Please try again.', 'danger');
    });
}

function loadWinners() {
    fetch('/winners')
        .then(response => response.json())
        .then(data => {
            const winnersList = document.getElementById('winnersList');
            if (!winnersList) return;

            winnersList.innerHTML = '';
            if (data.winners && data.winners.length > 0) {
                data.winners.forEach((winner, index) => {
                    const item = document.createElement('div');
                    item.className = 'list-group-item';
                    item.innerHTML = `
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <span class="badge bg-primary">${index + 1}${getOrdinal(index + 1)} Place</span>
                                <h5 class="mt-2">${winner.team_name}</h5>
                                <p>${winner.project_name}</p>
                            </div>
                        </div>
                    `;
                    winnersList.appendChild(item);
                });
            } else {
                winnersList.innerHTML = '<div class="text-center">Winners have not been announced yet.</div>';
            }
        })
        .catch(error => {
            console.error('Error loading winners:', error);
            showAlert('Error loading winners');
        });
}

function getOrdinal(n) {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
}